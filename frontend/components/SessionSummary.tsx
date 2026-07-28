"use client";
import { useEffect, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface SummaryData {
  overallScore: number;
  clarityScore: number;
  simplicityScore: number;
  analogyScore: number;
  patienceScore: number;
  strengths: string[];
  improvements: string[];
  letterGrade: string;
  summary: string;
  masteredConcepts: string[];
  weakConcepts: string[];
  misconceptions: string[];
  strongestExplanation: string;
  weakestExplanation: string;
  knowledgeMap: {
    nodes: { id: string; label: string; status: "mastered" | "weak" | "missing" | "mentioned" }[];
    edges: { source: string; target: string; label?: string }[];
  };
}

function ScoreRing({
  score,
  label,
  color,
  delay = 0,
}: {
  score: number;
  label: string;
  color: string;
  delay?: number;
}) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="flex flex-col items-center gap-2 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" className="score-ring-bg" />
          <circle
            cx="50"
            cy="50"
            r="45"
            className="score-ring-fill"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ animationDelay: `${delay + 200}ms` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color, animation: `countUp 0.6s ease-out ${delay + 400}ms both` }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-sm text-[var(--text-secondary)] font-medium">
        {label}
      </span>
    </div>
  );
}

const nodeColorMap = {
  mastered: "#10b981", // green
  weak: "#f59e0b", // yellow
  missing: "#ef4444", // red
  mentioned: "#3b82f6", // blue
};

export default function SessionSummary({
  topic,
  history,
  quizScore,
  onRestart,
  onTakeQuiz,
}: {
  topic: string;
  history: { role: string; content: string }[];
  quizScore?: { score: number; total: number };
  onRestart: () => void;
  onTakeQuiz: (weakConcepts: string[]) => void;
}) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("http://localhost:8000/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, history }),
        });
        if (!res.ok) throw new Error("Failed to generate summary");
        const result: SummaryData = await res.json();
        setData(result);

        // Map graph data to React Flow
        if (result.knowledgeMap) {
          const newNodes = result.knowledgeMap.nodes.map((n, i) => ({
            id: n.id,
            position: { x: 250 + (i % 3) * 200, y: 100 + Math.floor(i / 3) * 100 }, // basic auto-layout
            data: { label: n.label },
            style: {
              background: "var(--bg-card)",
              color: "white",
              border: `2px solid ${nodeColorMap[n.status]}`,
              borderRadius: "8px",
              padding: "10px",
              fontWeight: "bold",
            },
          }));
          const newEdges = result.knowledgeMap.edges.map((e, i) => ({
            id: `e-${i}`,
            source: e.source,
            target: e.target,
            label: e.label,
            style: { stroke: "var(--text-muted)", strokeWidth: 2 },
            animated: true,
          }));
          setNodes(newNodes);
          setEdges(newEdges);
        }
      } catch (err) {
        setError("Could not generate session summary. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (!data) {
      fetchSummary();
    }
  }, [topic, history, data, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-[var(--accent-purple)] animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          />
          <div
            className="absolute inset-4 rounded-full border-2 border-transparent border-t-[var(--accent-cyan)] animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
        </div>
        <p className="text-[var(--text-secondary)] text-lg font-medium">
          Analyzing your teaching session...
        </p>
        <p className="text-[var(--text-muted)] text-sm">
          Extracting knowledge map and grading performance
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="error-banner max-w-md">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <button onClick={onRestart} className="btn-secondary mt-4">
          Start New Session
        </button>
      </div>
    );
  }

  if (!data) return null;

  const gradeColor =
    data.letterGrade.startsWith("A")
      ? "#10b981"
      : data.letterGrade.startsWith("B")
      ? "#3b82f6"
      : data.letterGrade.startsWith("C")
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 animate-fade-in-up pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <p className="text-[var(--text-muted)] text-sm uppercase tracking-widest font-semibold">
          Session Complete
        </p>
        <h2 className="text-4xl font-bold text-[var(--text-primary)]">
          Teaching Report
        </h2>
        <p className="text-[var(--text-secondary)] text-lg">
          Topic: <span className="text-[var(--accent-blue)] font-semibold">{topic}</span>
        </p>
      </div>

      {/* Grade & Quiz Score */}
      <div className="flex flex-wrap justify-center gap-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div
          className="glass-card px-12 py-8 flex flex-col items-center gap-2"
          style={{ borderColor: gradeColor + "40" }}
        >
          <span className="text-[var(--text-muted)] text-xs uppercase tracking-widest">
            Feynman Grade
          </span>
          <span className="text-7xl font-black" style={{ color: gradeColor }}>
            {data.letterGrade}
          </span>
          <span className="text-[var(--text-secondary)] text-sm font-medium">
            {data.overallScore}/100
          </span>
        </div>
        {quizScore && (
          <div className="glass-card px-12 py-8 flex flex-col items-center gap-2 border-[var(--accent-purple)]">
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-widest">
              Quiz Score
            </span>
            <span className="text-7xl font-black text-[var(--accent-purple)]">
              {quizScore.score}/{quizScore.total}
            </span>
            <span className="text-[var(--text-secondary)] text-sm font-medium">
              Concept Reinforcement
            </span>
          </div>
        )}
      </div>

      {/* Score Rings */}
      <div className="glass-card p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <ScoreRing score={data.clarityScore} label="Clarity" color="#3b82f6" delay={300} />
          <ScoreRing score={data.simplicityScore} label="Simplicity" color="#10b981" delay={450} />
          <ScoreRing score={data.analogyScore} label="Analogies" color="#8b5cf6" delay={600} />
          <ScoreRing score={data.patienceScore} label="Patience" color="#06b6d4" delay={750} />
        </div>
      </div>

      {/* Understanding Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-t-4 border-[#10b981]">
          <h3 className="font-semibold text-[#10b981] mb-4">✓ Concepts Mastered</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            {data.masteredConcepts.length > 0 ? (
              data.masteredConcepts.map((c, i) => <li key={i}>• {c}</li>)
            ) : (
              <li className="italic opacity-50">None identified</li>
            )}
          </ul>
        </div>
        <div className="glass-card p-6 border-t-4 border-[#f59e0b]">
          <h3 className="font-semibold text-[#f59e0b] mb-4">⚠ Concepts Needing Review</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            {data.weakConcepts.length > 0 ? (
              data.weakConcepts.map((c, i) => <li key={i}>• {c}</li>)
            ) : (
              <li className="italic opacity-50">None identified</li>
            )}
          </ul>
        </div>
        <div className="glass-card p-6 border-t-4 border-[#ef4444]">
          <h3 className="font-semibold text-[#ef4444] mb-4">✗ Major Misconceptions</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            {data.misconceptions.length > 0 ? (
              data.misconceptions.map((c, i) => <li key={i}>• {c}</li>)
            ) : (
              <li className="italic opacity-50">None identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Knowledge Map */}
      <div className="glass-card p-6 h-[500px] flex flex-col">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Knowledge Map</h3>
        <div className="flex-1 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[rgba(15,25,50,0.4)]">
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#ccc" gap={16} />
              <Controls />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
              No concepts extracted to map.
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-4 justify-center text-xs text-[var(--text-secondary)] font-medium">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#10b981]" /> Mastered</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#3b82f6]" /> Mentioned</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#f59e0b]" /> Weak</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /> Missing</span>
        </div>
      </div>

      {/* Improvement Suggestions */}
      <div className="glass-card p-8">
        <h3 className="text-xl font-bold text-[var(--accent-amber)] mb-6 flex items-center gap-2">
          <span>◈</span> Improvement Suggestions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ul className="space-y-4">
            {data.improvements.map((imp, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[var(--text-secondary)] text-sm leading-relaxed p-4 bg-[rgba(15,25,50,0.6)] rounded-lg border border-[var(--border-subtle)]"
              >
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--accent-amber)] text-xs flex-shrink-0">
                  →
                </span>
                {imp}
              </li>
            ))}
          </ul>
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-[#10b981] bg-[rgba(16,185,129,0.05)]">
              <p className="text-xs text-[#10b981] uppercase tracking-widest font-bold mb-2">Strongest Explanation</p>
              <p className="text-sm text-[var(--text-secondary)] italic">&ldquo;{data.strongestExplanation}&rdquo;</p>
            </div>
            <div className="p-5 rounded-xl border border-[#f59e0b] bg-[rgba(245,158,11,0.05)]">
              <p className="text-xs text-[#f59e0b] uppercase tracking-widest font-bold mb-2">Weakest Explanation</p>
              <p className="text-sm text-[var(--text-secondary)] italic">&ldquo;{data.weakestExplanation}&rdquo;</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center gap-6 pt-4 animate-fade-in-up" style={{ animationDelay: "900ms" }}>
        {!quizScore && (
          <button onClick={() => onTakeQuiz(data.weakConcepts)} className="btn-primary text-lg px-10 py-4">
            Take Personalized Quiz
          </button>
        )}
        <button onClick={onRestart} className="btn-secondary text-lg px-10 py-4">
          Teach Another Topic
        </button>
      </div>
    </div>
  );
}
