"use client";
import { useEffect, useState, useRef } from "react";

interface Concept {
  name: string;
  status: "mastered" | "weak" | "missing" | "incorrect";
}

interface Metrics {
  jargonCount: number;
  hasAnalogy: boolean;
  complexityScore: number;
  feedback: string;
  concepts?: Concept[];
  misconceptions?: string[];
}

interface MetricHistory {
  jargon: number[];
  complexity: number[];
  analogy: boolean[];
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}

function ProgressBar({
  value,
  max,
  colorFrom,
  colorTo,
}: {
  value: number;
  max: number;
  colorFrom: string;
  colorTo: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar-track">
      <div
        className="progress-bar-fill"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
        }}
      />
    </div>
  );
}

function MiniTrend({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const h = 32;
  const w = 80;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function Dashboard({
  messages,
  topic,
  apiKey,
}: {
  messages: { role: string; content: string }[];
  topic: string;
  apiKey?: string;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<MetricHistory>({
    jargon: [],
    complexity: [],
    analogy: [],
  });
  const lastAnalyzedRef = useRef("");

  const latestUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  useEffect(() => {
    if (!latestUserMessage || latestUserMessage === lastAnalyzedRef.current)
      return;

    const controller = new AbortController();
    const id = setTimeout(() => {
      const doAnalyze = async () => {
        setLoading(true);
        try {
          const res = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, history: messages, apiKey }),
            signal: controller.signal,
          });
          const data: Metrics = await res.json();
          setMetrics(data);
          lastAnalyzedRef.current = latestUserMessage!;
          setHistory((prev) => ({
            jargon: [...prev.jargon.slice(-4), data.jargonCount],
            complexity: [...prev.complexity.slice(-4), data.complexityScore],
            analogy: [...prev.analogy.slice(-4), data.hasAnalogy],
          }));
        } catch (err) {
          if ((err as any).name !== "AbortError") console.error(err);
        } finally {
          setLoading(false);
        }
      };
      doAnalyze();
    }, 0);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [latestUserMessage, messages, topic]);

  if (loading && !metrics) {
    return (
      <div className="glass-card p-6 h-full space-y-6">
        <SkeletonBlock className="h-6 w-48" />
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!metrics && !loading) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(59,130,246,0.1)] flex items-center justify-center text-3xl">
          📊
        </div>
        <p className="text-[var(--text-secondary)] text-sm font-medium">
          Start teaching to see your performance metrics
        </p>
        <p className="text-[var(--text-muted)] text-xs">
          We&apos;ll analyze your explanations in real-time
        </p>
      </div>
    );
  }

  const jargonColor =
    metrics!.jargonCount > 3
      ? "#ef4444"
      : metrics!.jargonCount > 1
        ? "#f59e0b"
        : "#10b981";

  const complexityColor =
    metrics!.complexityScore > 7
      ? "#ef4444"
      : metrics!.complexityScore > 4
        ? "#f59e0b"
        : "#10b981";

  return (
    <div className="glass-card p-6 h-full space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)] animate-pulse" />
          Live Metrics
        </h3>
        {loading && (
          <span className="text-xs text-[var(--text-muted)] animate-pulse">
            updating…
          </span>
        )}
      </div>

      {/* Jargon Density */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            Jargon Density
          </span>
          <div className="flex items-center gap-3">
            <MiniTrend values={history.jargon} color={jargonColor} />
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: jargonColor }}
            >
              {metrics!.jargonCount} terms
            </span>
          </div>
        </div>
        <ProgressBar
          value={metrics!.jargonCount}
          max={8}
          colorFrom={jargonColor}
          colorTo={jargonColor + "80"}
        />
      </div>

      {/* Complexity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            Complexity
          </span>
          <div className="flex items-center gap-3">
            <MiniTrend values={history.complexity} color={complexityColor} />
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: complexityColor }}
            >
              {metrics!.complexityScore}/10
            </span>
          </div>
        </div>
        <ProgressBar
          value={metrics!.complexityScore}
          max={10}
          colorFrom={complexityColor}
          colorTo={complexityColor + "80"}
        />
      </div>

      {/* Analogy Badge */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(100,140,255,0.04)] border border-[var(--border-subtle)]">
        <span className="text-sm text-[var(--text-secondary)]">
          Analogy Used
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
            metrics?.hasAnalogy
              ? "bg-[rgba(16,185,129,0.15)] text-[#10b981]"
              : "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"
          }`}
        >
          {metrics?.hasAnalogy ? "✓ YES" : "✗ NO"}
        </span>
      </div>

      {/* Analogy streak */}
      {history.analogy.length > 1 && (
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-[var(--text-muted)]">History:</span>
          {history.analogy.map((used, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                used
                  ? "bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                  : "bg-[rgba(100,140,255,0.1)]"
              }`}
            />
          ))}
        </div>
      )}

      {/* Understanding Tracker */}
      {metrics?.concepts && metrics.concepts.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">
            Understanding Progress
          </h4>
          <ul className="space-y-1.5">
            {metrics.concepts.map((concept, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm bg-[var(--bg-card)] px-3 py-2 rounded-lg border border-[var(--border-subtle)]"
              >
                <span className="text-[var(--text-primary)]">{concept.name}</span>
                <span
                  className={`font-semibold text-xs ${
                    concept.status === "mastered"
                      ? "text-[#10b981]"
                      : concept.status === "weak"
                        ? "text-[#f59e0b]"
                        : "text-[#ef4444]"
                  }`}
                >
                  {concept.status === "mastered" && "✓ Mastered"}
                  {concept.status === "weak" && "⚠ Weak"}
                  {concept.status === "missing" && "✗ Missing"}
                  {concept.status === "incorrect" && "✗ Incorrect"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Misconceptions */}
      {metrics?.misconceptions && metrics.misconceptions.length > 0 && (
        <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] space-y-2">
          <p className="text-xs text-[#ef4444] uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <span>⚠</span> Misconceptions Detected
          </p>
          <ul className="list-disc list-inside text-sm text-[#fca5a5] space-y-1">
            {metrics.misconceptions.map((misconception, idx) => (
              <li key={idx}>{misconception}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      <div className="p-4 rounded-xl bg-[rgba(59,130,246,0.06)] border-l-[3px] border-[var(--accent-blue)]">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1.5">
          AI Feedback
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
          {metrics?.feedback}
        </p>
      </div>
    </div>
  );
}
