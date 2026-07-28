"use client";
import { useEffect, useState } from "react";

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export default function Quiz({
  topic,
  weakConcepts,
  onComplete,
}: {
  topic: string;
  weakConcepts: string[];
  onComplete: (score: number, total: number) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch("http://localhost:8000/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, weakConcepts }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to generate quiz");
        }
        const data = await res.json();
        setQuestions(data.questions);
      } catch (err: any) {
        setError(err.message || "Could not generate quiz. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [topic, weakConcepts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-amber)] animate-spin" />
        </div>
        <p className="text-[var(--text-secondary)]">Generating your personalized quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <button onClick={() => onComplete(0, 0)} className="btn-secondary mt-4">
          Skip Quiz
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQ.correctAnswerIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      onComplete(score, questions.length);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 animate-fade-in-up mt-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Personalized Quiz</h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      <div className="glass-card p-8 space-y-6">
        <p className="text-lg font-medium text-[var(--text-primary)]">{currentQ.question}</p>
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            let btnClass = "btn-secondary w-full text-left justify-start hover:border-[var(--accent-blue)]";
            if (isAnswered) {
              if (idx === currentQ.correctAnswerIndex) {
                btnClass = "w-full text-left p-4 rounded-xl border border-[#10b981] bg-[rgba(16,185,129,0.1)] text-[#10b981] font-medium";
              } else if (idx === selectedOption) {
                btnClass = "w-full text-left p-4 rounded-xl border border-[#ef4444] bg-[rgba(239,68,68,0.1)] text-[#ef4444] font-medium";
              } else {
                btnClass = "w-full text-left p-4 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={isAnswered ? btnClass : `p-4 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.05)] w-full text-left transition-colors`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {isAnswered && (
        <div className="animate-fade-in-up space-y-6">
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,25,50,0.4)]">
            <p className="text-sm text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-2">Explanation</p>
            <p className="text-[var(--text-secondary)] leading-relaxed">{currentQ.explanation}</p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleNext} className="btn-primary">
              {currentIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
