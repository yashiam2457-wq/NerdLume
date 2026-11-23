"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, Layers, Terminal, BookOpen, Clock, Shield, ArrowRight, Zap, Play, Search } from "lucide-react";
import { SpotlightCard } from "@/components/react-bits/spotlight";
import { Squares } from "@/components/react-bits/squares";
import { useAuth } from "@/lib/auth-context";

export default function PracticeHubPage() {
  const { user, openSubscriptionModal } = useAuth();
  const [topic, setTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<number>(10);

  const sampleTopics = [
    "Operating Systems & Memory Management",
    "Transformer Attention & Deep Learning",
    "Data Structures: Trees & Graph Traversals",
    "Relational Database Normalization & ACID",
    "Computer Networks: TCP Congestion Control",
  ];

  const practiceModes = [
    {
      id: "quiz",
      title: "Quiz Arena",
      description: "Timed multiple-choice evaluation with real-time score tally and detailed explanations.",
      icon: Award,
      baseRoute: "/quiz",
      badge: "ACTIVE RECALL",
      stats: "5-20 Questions • Instant Feedback",
      color: "blue",
      requiredPlan: "free",
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Interactive flip cards with Leitner algorithm confidence ratings to cement neural retention.",
      icon: Layers,
      baseRoute: "/flashcards",
      badge: "FLASHCARDS",
      stats: "Continuous Deck • Again / Hard / Good / Easy",
      color: "purple",
      requiredPlan: "free-premium",
    },
    {
      id: "mocktest",
      title: "Mock Exams",
      description: "Rigorous 30-minute timed examination environment with question palette, flagging, and analytics.",
      icon: Terminal,
      baseRoute: "/mocktest",
      badge: "EXAM",
      stats: "Full Question Sheet • Timed Countdown",
      color: "cyan",
      requiredPlan: "free-premium",
    },
  ];

  const handleLaunch = (mode: (typeof practiceModes)[0]) => {
    if (mode.requiredPlan !== "free" && user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }
  };

  return (
    <div className="relative min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 font-mono">
      <Squares
        direction="up"
        speed={0.4}
        squareSize={40}
        borderColor="rgba(59, 130, 246, 0.05)"
        hoverFillColor="rgba(59, 130, 246, 0.1)"
      />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            PRACTICE & EVALUATION
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            PRACTICE HUB
          </h1>
          <p className="text-sm text-slate-400 font-sans max-w-xl mx-auto">
            Specify your study syllabus or topic below to generate customized assessments and retention exercises.
          </p>
        </div>

        {/* Target Topic Input Console */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              SPECIFY TARGET TOPIC OR SYLLABUS AREA
            </label>
            <span className="text-[10px] text-slate-500">APPLIES TO ALL PRACTICE ENGINES</span>
          </div>

          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoComplete="off"
            placeholder="Enter study topic, chapter title, or syllabus contents..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all font-sans"
          />

          {/* Quick suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 shrink-0 text-[11px]">PRESETS:</span>
            {sampleTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-blue-300 border border-slate-800 transition-colors shrink-0 text-[10px]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Global Preset Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">ACTIVE DIFFICULTY:</span>
            {(["easy", "medium", "hard", "competitive"] as const).map((diff) => {
              const isLockedDiff = (diff === "hard" || diff === "competitive") && user.plan === "free";
              return (
                <button
                  key={diff}
                  onClick={() => {
                    if (isLockedDiff) {
                      openSubscriptionModal("free-premium");
                      return;
                    }
                    setSelectedDifficulty(diff);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs uppercase font-semibold transition-all flex items-center gap-1.5 ${
                    selectedDifficulty === diff
                      ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{diff}</span>
                  {isLockedDiff && <Shield className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">QUESTION COUNT:</span>
            {[5, 10, 15, 20].map((cnt) => {
              const isLockedCount = cnt > 10 && user.plan === "free";
              return (
                <button
                  key={cnt}
                  onClick={() => {
                    if (isLockedCount) {
                      openSubscriptionModal("free-premium");
                      return;
                    }
                    setQuestionCount(cnt);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    questionCount === cnt
                      ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{cnt} Qs</span>
                  {isLockedCount && <Shield className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Practice Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {practiceModes.map((mode) => {
            const Icon = mode.icon;
            const isLocked = mode.requiredPlan !== "free" && user.plan === "free";
            const targetUrl = `${mode.baseRoute}?topic=${encodeURIComponent(topic.trim() || "Computer Science")}&count=${questionCount}&difficulty=${selectedDifficulty}`;

            return (
              <SpotlightCard
                key={mode.id}
                spotlightColor={
                  mode.color === "blue"
                    ? "rgba(59,130,246,0.2)"
                    : mode.color === "purple"
                    ? "rgba(168,85,247,0.2)"
                    : "rgba(6,182,212,0.2)"
                }
                className="flex flex-col justify-between h-full border-slate-800 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{mode.title}</h3>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6">
                    {mode.description}
                  </p>

                  <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-4 mb-6 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{mode.stats}</span>
                  </div>
                </div>

                <div>
                  {isLocked ? (
                    <button
                      onClick={() => handleLaunch(mode)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-amber-500/30"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      UNLOCK WITH PREMIUM
                    </button>
                  ) : (
                    <Link
                      href={targetUrl}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      ENTER ARENA
                    </Link>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
