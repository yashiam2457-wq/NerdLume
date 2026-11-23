"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generateTopicQuiz } from "@/lib/api";
import { QuizQuestionItem } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import {
  Terminal,
  Clock,
  Bookmark,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Award,
  ChevronRight,
  ChevronLeft,
  Search,
  Shield,
} from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import confetti from "canvas-confetti";
import Link from "next/link";

function MockTestContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const { user, openSubscriptionModal } = useAuth();

  const [topic, setTopic] = useState(initialTopic || "");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(5);
  const [isStarted, setIsStarted] = useState(Boolean(initialTopic && user.plan !== "free"));

  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      loadExam(initialTopic, 5, 30);
    }
  }, [initialTopic]);

  const loadExam = async (targetTopic: string, count: number, mins: number) => {
    // Paywall check for free plan
    if (user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }

    setLoading(true);
    const qs = await generateTopicQuiz(targetTopic, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers({});
    setFlagged({});
    setTimeLeft(mins * 60);
    setIsSubmitted(false);
    setIsStarted(true);
    setLoading(false);
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }
    if (!topic.trim()) return;
    loadExam(topic.trim(), questionCount, durationMinutes);
  };

  useEffect(() => {
    if (!isStarted || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, isStarted]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIdx];

  const handleSelect = (idx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: idx }));
  };

  const handleClear = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentIdx];
      return copy;
    });
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
  };

  const handleFinalSubmit = () => {
    setConfirmModal(false);
    setIsSubmitted(true);
    confetti({
      particleCount: 120,
      spread: 80,
    });
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const score = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white uppercase">
                EXAMINATION SIMULATOR
              </h1>
              <div className="text-xs text-slate-400 font-sans">
                {isStarted ? `Target: ${topic}` : "Timed Assessment & Grading Engine"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isStarted && !isSubmitted && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400">TIME REMAINING:</span>
                <span className="font-bold text-white tracking-widest">{formatTime(timeLeft)}</span>
              </div>
            )}

            {isStarted && !isSubmitted && (
              <button
                onClick={() => setConfirmModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
              >
                SUBMIT EXAM
              </button>
            )}
          </div>
        </div>

        {/* SETUP SCREEN */}
        {!isStarted ? (
          <form
            onSubmit={handleStartExam}
            className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                <Shield className="w-3.5 h-3.5" />
                PREMIUM EXAMINATION SUITE
              </div>
              <h2 className="text-xl font-bold text-white uppercase">
                CONFIGURE EXAMINATION ENVIRONMENT
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Set up a realistic examination with question sheet palette, review tags, and marking schemes.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                COURSE SYLLABUS OR EXAM TOPIC
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  autoComplete="off"
                  placeholder="Enter study topic, chapter title, or syllabus contents..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  EXAM DURATION
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value={15}>15 Minutes (Short Exam)</option>
                  <option value={30}>30 Minutes (Standard Exam)</option>
                  <option value={45}>45 Minutes (Full University Simulation)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  QUESTIONS COUNT
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                </select>
              </div>
            </div>

            {user.plan === "free" ? (
              <button
                type="button"
                onClick={() => openSubscriptionModal("free-premium")}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <Shield className="w-4 h-4" />
                UNLOCK WITH PREMIUM
              </button>
            ) : (
              <ShimmerButton
                disabled={loading}
                shimmerColor="#06b6d4"
                className="w-full py-3 text-xs font-bold uppercase tracking-wider mt-2"
              >
                {loading ? "INITIALIZING EXAMINATION ROOM..." : "INITIALIZE EXAMINATION ENVIRONMENT"}
              </ShimmerButton>
            )}
          </form>
        ) : (
          /* ACTIVE EXAM RUNNER */
          <>
            {!isSubmitted && currentQ ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Question Sheet */}
                <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3 mb-4">
                      <span className="font-bold text-cyan-400">
                        QUESTION {currentIdx + 1} OF {questions.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Single Correct (+4, -1)
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white font-sans leading-relaxed mb-6">
                      {currentQ.question}
                    </h3>

                    {/* Options */}
                    <div className="space-y-3">
                      {currentQ.options.map((opt, i) => {
                        const isSelected = answers[currentIdx] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelect(i)}
                            className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-sans flex items-center gap-3 transition-all ${
                              isSelected
                                ? "bg-cyan-500/15 border-cyan-500 text-white font-semibold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                                : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-300 shrink-0">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleFlag}
                        className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                          flagged[currentIdx]
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        {flagged[currentIdx] ? "FLAGGED" : "MARK REVIEW"}
                      </button>
                      <button
                        onClick={handleClear}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        CLEAR RESPONSE
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> PREV
                      </button>
                      <button
                        disabled={currentIdx === questions.length - 1}
                        onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                      >
                        NEXT <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Col: Question Palette */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    QUESTION PALETTE
                  </h4>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {questions.map((_, idx) => {
                      const isCurrent = currentIdx === idx;
                      const isAns = answers[idx] !== undefined;
                      const isFlg = flagged[idx];

                      let bg = "bg-slate-950 border-slate-800 text-slate-400";
                      if (isAns) bg = "bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold";
                      if (isFlg) bg = "bg-amber-600/30 border-amber-500 text-amber-300 font-bold";
                      if (isCurrent) bg += " ring-2 ring-cyan-400";

                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentIdx(idx)}
                          className={`h-10 rounded-xl border flex items-center justify-center text-xs transition-all ${bg}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="border-t border-slate-800 pt-4 space-y-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Answered ({answeredCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>Marked for Review ({flaggedCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-800" />
                      <span>Not Answered ({questions.length - answeredCount})</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Submission Results View */
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center">
                  <Award className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white uppercase">
                    EXAMINATION EVALUATION COMPLETE
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Topic: {topic}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto py-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">ACCURACY</div>
                    <div className="text-2xl font-bold text-cyan-400">{percentage}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">TOTAL SCORE</div>
                    <div className="text-2xl font-bold text-white">{score * 4} PTS</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">CORRECT</div>
                    <div className="text-2xl font-bold text-emerald-400">{score} / {questions.length}</div>
                  </div>
                </div>

                {/* Answer review breakdown */}
                <div className="text-left space-y-4 max-w-2xl mx-auto border-t border-slate-800 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">ANSWER ANALYSIS SHEET</h4>
                  {questions.map((q, idx) => {
                    const userChoice = answers[idx];
                    const isCorrect = userChoice === q.correctIndex;
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-300">Q{idx + 1}. {q.question}</span>
                          <span className={isCorrect ? "text-emerald-400" : "text-red-400"}>
                            {isCorrect ? "CORRECT (+4)" : "INCORRECT (-1)"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Your answer: {userChoice !== undefined ? q.options[userChoice] : "None"} • Correct: {q.options[q.correctIndex]}
                        </div>
                        <div className="text-[11px] text-cyan-400/90 font-sans">{q.explanation}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => setIsStarted(false)}
                    className="px-6 py-2.5 rounded-xl border border-slate-800 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                  >
                    CONFIG ANOTHER EXAM
                  </button>
                  <Link href="/practice">
                    <ShimmerButton shimmerColor="#06b6d4" className="text-xs px-6 py-2.5 font-bold">
                      PRACTICE HUB
                    </ShimmerButton>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">SUBMIT EXAMINATION?</h3>
              <p className="text-xs text-slate-400 font-sans">
                You have answered {answeredCount} of {questions.length} questions. You cannot change your responses after submission.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  CONTINUE TEST
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  CONFIRM SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockTestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading Examination Simulator...</div>}>
      <MockTestContent />
    </Suspense>
  );
}
