import os
import json
import uvicorn
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RevTutor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    userExplanation: str
    topic: str
    confusionLevel: int
    history: list[dict]
    apiKey: Optional[str] = None


class AnalysisRequest(BaseModel):
    topic: str
    history: list[dict]
    apiKey: Optional[str] = None


class SummaryRequest(BaseModel):
    topic: str
    history: list[dict]
    apiKey: Optional[str] = None


class QuizRequest(BaseModel):
    topic: str
    weakConcepts: list[str]
    apiKey: Optional[str] = None


# ── Rate Limiting ─────────────────────────────────────────────────────────────

rate_limit_store = {}
RATE_LIMIT_MAX_CALLS = 30
RATE_LIMIT_COOLDOWN_SECONDS = 300

def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = time.time()
    
    user_data = rate_limit_store.get(client_ip)
    
    if not user_data:
        rate_limit_store[client_ip] = {"count": 1, "window_start": now}
        return
        
    if now - user_data["window_start"] > RATE_LIMIT_COOLDOWN_SECONDS:
        user_data["count"] = 1
        user_data["window_start"] = now
        return
        
    if user_data["count"] >= RATE_LIMIT_MAX_CALLS:
        remaining = int(RATE_LIMIT_COOLDOWN_SECONDS - (now - user_data["window_start"]))
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit reached. Please wait {remaining} seconds."
        )
        
    user_data["count"] += 1


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/chat", dependencies=[Depends(check_rate_limit)])
async def chat_with_alex(request: ChatRequest):
    system_prompt = f"""
    You are a curious but slightly confused student named "Alex".
    Your goal is to learn about "{request.topic}" by having the user explain it to you.

    YOUR PERSONALITY & MEMORY:
    - You are eager to learn, but easily confused by jargon.
    - INTELLIGENT MEMORY: You MUST remember everything the user has told you so far in this conversation. Refer back to earlier explanations naturally ("Earlier you said X, but...").
    - DETECT CONTRADICTIONS & MISCONCEPTIONS: If the user says something factually incorrect or contradicts what they said earlier, politely bring it up. Example: "Wait, I thought you said [fact], but now you're saying [new fact]? I'm confused, could we check that?" Do not aggressively correct them; act like a confused student trying to reconcile information.
    - Connect different parts of the discussion. Ask follow-up questions based on earlier answers.

    RULES:
    1. NEVER explain the concept yourself. Only ask questions or express confusion.
    2. If the user uses jargon, ask them to simplify.
    3. If the explanation is too abstract, ask for a real-world example or analogy.
    4. Make plausible mistakes based on the confusion level ({request.confusionLevel}/10).
    5. Keep responses SHORT (2-3 sentences max, under 60 words).
    6. Be encouraging but persistent in your confusion if things aren't clear.
    7. Use casual language with occasional emoji (😊, 🤔, 😅).
    """

    messages = [
        {"role": "system", "content": system_prompt},
        *request.history,
        {"role": "user", "content": request.userExplanation}
    ]
    
    groq_client = Groq(api_key=request.apiKey) if request.apiKey else client

    try:
        completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7 + (request.confusionLevel * 0.02),
            max_tokens=150,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", dependencies=[Depends(check_rate_limit)])
async def analyze_explanation(request: AnalysisRequest):
    conversation_text = "\n".join(
        [f"{'Teacher' if m.get('role') == 'user' else 'Student (Alex)'}: {m.get('content', '')}"
         for m in request.history]
    )

    prompt = f"""
    Analyze the teacher's current understanding and communication for the topic "{request.topic}".
    Here is the conversation so far:
    ---
    {conversation_text}
    ---

    Return ONLY a valid JSON object with these exact keys:
    1. "jargonCount": Number of undefined technical terms used in the LATEST teacher message.
    2. "hasAnalogy": Boolean (true if a metaphor/analogy is used in the LATEST teacher message).
    3. "complexityScore": Number 1-10 (10=very complex) for the LATEST teacher message.
    4. "feedback": A one-sentence tip for the teacher based on the latest message.
    5. "concepts": An array of objects tracking the conceptual understanding SO FAR. Each object must have:
       - "name": String (e.g. "Gravity", "Mass")
       - "status": String (must be one of: "mastered", "weak", "missing", "incorrect")
    6. "misconceptions": An array of strings describing any factual inaccuracies the teacher has stated so far.

    Ensure you evaluate the entire conversation to determine the status of concepts and overall misconceptions, but base jargon, analogy, and complexity specifically on the teacher's most recent input.
    """
    
    groq_client = Groq(api_key=request.apiKey) if request.apiKey else client

    try:
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system",
                    "content": "You are a strict educational analyst. Output ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summary", dependencies=[Depends(check_rate_limit)])
async def session_summary(request: SummaryRequest):
    conversation_text = "\n".join(
        [f"{'Teacher' if m.get('role') == 'user' else 'Student (Alex)'}: {m.get('content', '')}"
         for m in request.history]
    )

    prompt = f"""
    Evaluate a teaching session using the Feynman Technique for the topic "{request.topic}".

    Full conversation:
    ---
    {conversation_text}
    ---

    Return ONLY a valid JSON object with these keys:
    1. "overallScore": 0-100.
    2. "clarityScore": 0-100.
    3. "simplicityScore": 0-100.
    4. "analogyScore": 0-100.
    5. "patienceScore": 0-100.
    6. "strengths": Array of 2-3 short strings (what went well).
    7. "improvements": Array of 3-5 specific, actionable suggestions for improvement.
    8. "letterGrade": (A+, A, B+, B, C+, C, D, F).
    9. "summary": 2-3 sentence encouraging summary.
    10. "masteredConcepts": Array of strings (concepts explained clearly).
    11. "weakConcepts": Array of strings (concepts mentioned but weakly explained).
    12. "misconceptions": Array of strings (factual inaccuracies).
    13. "strongestExplanation": A short string quoting or summarizing the best explanation given.
    14. "weakestExplanation": A short string quoting or summarizing the weakest explanation given.
    15. "knowledgeMap": An object representing a concept graph extracted from the session, with two keys:
        - "nodes": Array of objects {{ "id": string, "label": string, "status": "mastered" | "weak" | "missing" | "mentioned" }}
        - "edges": Array of objects {{ "source": string, "target": string, "label": string (optional) }}
    """
    
    groq_client = Groq(api_key=request.apiKey) if request.apiKey else client

    try:
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system",
                    "content": "You are a strict educational evaluator. Output ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/quiz", dependencies=[Depends(check_rate_limit)])
async def generate_quiz(request: QuizRequest):
    prompt = f"""
    Create a 5-question multiple-choice quiz about "{request.topic}".
    Focus specifically on reinforcing these weak concepts: {", ".join(request.weakConcepts) if request.weakConcepts else "the core principles of the topic"}.
    
    Return ONLY a valid JSON object with a single key "questions" which is an array of 5 objects.
    Each object must have:
    - "question": The question text.
    - "options": An array of 4 string options.
    - "correctAnswerIndex": Integer (0-3) indicating the correct option.
    - "explanation": A 1-2 sentence explanation of WHY this answer is correct.
    """
    
    groq_client = Groq(api_key=request.apiKey) if request.apiKey else client

    try:
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system",
                    "content": "You are an expert quiz generator. Output ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
