# RevTutor

RevTutor is an interactive learning app built around the Feynman technique. Users pick a topic, explain it to an AI student named Alex, and receive live feedback while Alex acts confused on purpose to encourage clearer thinking. The app then generates a session summary and a personalized quiz focused on weak concepts.

## What it does

- Helps users practice explaining complex ideas simply
- Simulates a curious student that asks follow-up questions
- Analyzes explanations in real time for jargon, complexity, and analogy use
- Produces a teaching report with scores, strengths, weaknesses, and a knowledge map
- Generates a targeted quiz to reinforce missing or weak concepts

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, Groq API
- Visualization: React Flow for the knowledge map

## Project structure

- [frontend](frontend/) - Next.js app for the user interface
- [backend](backend/) - FastAPI service for AI-powered tutoring endpoints
- [backend/main.py](backend/main.py) - API routes for chat, analysis, summary, and quiz generation
- [frontend/components](frontend/components/) - UI components for chat, dashboard, summary, and quiz flow

## Getting started

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
# On Windows, use: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a file named [.env](backend/.env) in the backend folder with:

```env
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=http://localhost:3000
```

Run the API:

```bash
uvicorn main:app --reload
```

The backend will be available at http://localhost:8000.

### 2. Frontend

```bash
cd frontend
npm install
```

Create a file named [.env.local](frontend/.env.local) with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 to use the app.

## API overview

The backend exposes these endpoints:

- GET /health - checks service status
- POST /chat - sends the current explanation to the AI tutor
- POST /analyze - evaluates jargon, complexity, and concept understanding
- POST /summary - generates a session report and knowledge map
- POST /quiz - creates a personalized quiz from weak concepts

## Deployment notes

- Frontend can be deployed on Vercel
- Backend can be deployed on Railway, Render, or similar platforms
- Make sure the deployed backend has the same environment variables configured, especially GROQ_API_KEY

## Notes

If no Groq API key is provided, the app will still start, but AI-powered features will fail until a valid key is configured.
