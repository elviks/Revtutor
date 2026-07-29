"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Dashboard from "@/components/Dashboard";
import SessionSummary from "@/components/SessionSummary";
import Quiz from "@/components/Quiz";

interface Message {
  role: "user" | "ai";
  content: string;
}

type Phase = "landing" | "chat" | "summary" | "quiz";

const SUGGESTED_TOPICS = [
  "Quantum Entanglement",
  "How DNA Replication Works",
  "Blockchain & Cryptography",
  "Neural Networks",
  "Photosynthesis",
  "Theory of Relativity",
  "Supply & Demand Economics",
  "How the Internet Works",
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [topic, setTopic] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confusionLevel, setConfusionLevel] = useState(5);
  const [error, setError] = useState("");

  // State for quiz integration
  const [weakConcepts, setWeakConcepts] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | undefined>();
  const [apiKey, setApiKey] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat phase starts
  useEffect(() => {
    if (phase === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [phase]);

  const startSession = useCallback(
    (selectedTopic: string) => {
      if (!selectedTopic.trim()) return;
      setTopic(selectedTopic.trim());
      setMessages([
        {
          role: "ai",
          content: `Hey! I'm Alex 👋 I've heard of "${selectedTopic.trim()}" but I really don't get it. Could you explain it to me like I'm 10?`,
        },
      ]);
      setPhase("chat");
    },
    [],
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setError("");

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userExplanation: input,
          topic,
          confusionLevel,
          history,
          apiKey: apiKey || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Couldn't reach Alex. Check if the backend is running.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: data.response },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = () => {
    setPhase("summary");
  };

  const restartSession = () => {
    setPhase("landing");
    setTopic("");
    setTopicInput("");
    setMessages([]);
    setInput("");
    setError("");
    setConfusionLevel(5);
    setWeakConcepts([]);
    setQuizScore(undefined);
  };

  const handleTakeQuiz = (concepts: string[]) => {
    setWeakConcepts(concepts);
    setPhase("quiz");
  };

  const handleQuizComplete = (score: number, total: number) => {
    setQuizScore({ score, total });
    setPhase("summary");
  };

  // Build history for API calls
  const apiHistory = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // ── Landing Phase ─────────────────────────────────────────────────────

  if (phase === "landing") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="animated-bg" />

        <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
          {/* Brand */}
          <div className="animate-fade-in-up space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              Powered by Feynman Technique
            </div>
            <h1 className="text-6xl sm:text-7xl font-black tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4] animate-gradient-text">
                RevTutor
              </span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Master any concept by teaching it to an AI student who pretends
              not to understand.
            </p>
          </div>

          {/* Topic Input */}
          <div
            className="animate-fade-in-up space-y-4"
            style={{ animationDelay: "200ms" }}
          >
            <div className="relative">
              <input
                id="topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && startSession(topicInput)
                }
                placeholder="What do you want to teach?"
                className="w-full p-5 pr-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all duration-300"
                autoFocus
              />
              <button
                onClick={() => startSession(topicInput)}
                disabled={!topicInput.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white disabled:opacity-30 transition-all hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Optional API Key Input */}
            <div className="relative max-w-sm mx-auto mt-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional: Enter your Groq API Key"
                className="w-full p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-all duration-300 text-center"
              />
            </div>
          </div>

          {/* Suggested Topics */}
          <div
            className="animate-fade-in-up space-y-3"
            style={{ animationDelay: "400ms" }}
          >
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-semibold">
              Or try a suggested topic
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => startSession(t)}
                  className="topic-chip"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Feature pills */}
          <div
            className="flex flex-wrap justify-center gap-6 pt-4 animate-fade-in-up"
            style={{ animationDelay: "600ms" }}
          >
            {[
              { icon: "🟢", text: "Active Recall" },
              { icon: "🟢", text: "Live Metrics" },
              { icon: "🟢", text: "Feynman Grading" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)]"
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Summary Phase ─────────────────────────────────────────────────────

  if (phase === "summary") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
        <div className="animated-bg" />
        <div className="relative z-10 w-full">
          <SessionSummary
            topic={topic}
            history={apiHistory}
            quizScore={quizScore}
            apiKey={apiKey || undefined}
            onRestart={restartSession}
            onTakeQuiz={handleTakeQuiz}
          />
        </div>
      </main>
    );
  }

  // ── Quiz Phase ────────────────────────────────────────────────────────

  if (phase === "quiz") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
        <div className="animated-bg" />
        <div className="relative z-10 w-full">
          <Quiz
            topic={topic}
            weakConcepts={weakConcepts}
            apiKey={apiKey || undefined}
            onComplete={handleQuizComplete}
          />
        </div>
      </main>
    );
  }

  // ── Chat Phase ────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="animated-bg" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[rgba(5,10,24,0.8)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]">
              RevTutor
            </h1>
            <div className="h-5 w-px bg-[var(--border-subtle)]" />
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              Teaching:{" "}
              <span className="text-[var(--accent-blue)]">{topic}</span>
            </span>
          </div>
          <button
            onClick={endSession}
            disabled={messages.filter((m) => m.role === "user").length < 2}
            className="btn-secondary text-sm py-2 px-5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            End Session
          </button>
        </header>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0 lg:gap-0 overflow-hidden">
          {/* Chat Column */}
          <div className="flex flex-col h-[calc(100vh-73px)] border-r border-[var(--border-subtle)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.role === "user"
                      ? "animate-slide-right"
                      : "animate-slide-left"
                    }`}
                  style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                >
                  <div
                    className={`max-w-[75%] p-4 ${msg.role === "user" ? "msg-user" : "msg-ai"}`}
                  >
                    <p className="text-xs font-semibold opacity-50 mb-1.5 uppercase tracking-wider">
                      {msg.role === "user" ? "You (Teacher)" : "Alex 🤔"}
                    </p>
                    <p className="leading-relaxed text-[0.94rem]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="px-6 pb-2">
                <div className="error-banner">
                  <span>⚠️</span>
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="ml-auto text-sm opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[rgba(5,10,24,0.6)] backdrop-blur-xl space-y-3">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all duration-300"
                  placeholder="Explain it to Alex..."
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="btn-primary px-6"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Confusion slider */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--text-muted)] whitespace-nowrap">
                  Alex&apos;s Confusion:
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confusionLevel}
                  onChange={(e) =>
                    setConfusionLevel(Number(e.target.value))
                  }
                  className="flex-1 max-w-48"
                />
                <span className="text-[var(--accent-blue)] font-bold font-mono tabular-nums w-8 text-center">
                  {confusionLevel}
                </span>
                <span className="text-[var(--text-muted)] text-xs">
                  {confusionLevel <= 3
                    ? "😊 Follows along"
                    : confusionLevel <= 6
                      ? "🤔 Needs help"
                      : "😵 Very confused"}
                </span>
              </div>
            </div>
          </div>

          {/* Dashboard Sidebar */}
          <div className="hidden lg:block overflow-y-auto custom-scrollbar p-4">
            <Dashboard topic={topic} messages={apiHistory} apiKey={apiKey || undefined} />
          </div>
        </div>
      </div>
    </main>
  );
}
