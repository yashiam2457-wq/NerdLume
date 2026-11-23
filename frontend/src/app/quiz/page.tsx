"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generateTopicQuiz } from "@/lib/api";
import { QuizQuestionItem } from "@/lib/types";
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Search,
  Play,
  Shield,
  Lock,
} from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import confetti from "canvas-confetti";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function QuizContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const { user, openSubscriptionModal, canPerformGeneration, consumeQuota } = useAuth();

  const [topic, setTopic] = useState(initialTopic || "");
  const [questionCount, setQuestionCount] = useState(5);
  const [isStarted, setIsStarted] = useState(Boolean(initialTopic));
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      loadQuiz(initialTopic, 5);
    }
  }, [initialTopic]);

  const loadQuiz = async (targetTopic: string, count: number) => {
    setLoading(true);
    const qs = await generateTopicQuiz(targetTopic, count);
    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setTimer(60);
    setIsFinished(false);
    setIsStarted(true);
    setLoading(false);
  };

  // Timer countdown
  useEffect(() => {
    if (!isStarted || isFinished) return;
    if (timer <= 0) {
      handleNext();
      return;
    }
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, isFinished, isStarted]);

  const currentQ = questions[currentIndex];
  const userChoice = selectedAnswers[currentIndex];
  const isAnswered = userChoice !== undefined;

  const handleSelectOption = (optIdx: number) => {
    if (isAnswered) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    setTimer(60);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionCount > 5 && user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }
    const quota = canPerformGeneration("notes");
    if (!quota.allowed) {
      openSubscriptionModal(user.plan === "free" ? "free-premium" : "diamond");
      return;
    }
    if (!topic.trim()) return;
    loadQuiz(topic.trim(), questionCount);
    consumeQuota("notes");
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) {
        score += 1;
      }
    });
    return score;
  };

  const totalScore = calculateScore();
  const accuracy = questions.length > 0 ? Math.round((totalScore / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white uppercase">QUIZ ARENA</h1>
              <div className="text-xs text-slate-400 font-sans">
                {isStarted ? `Target Topic: ${topic}` : "Topic-Targeted Interactive Evaluation"}
              </div>
            </div>
          </div>

          {isStarted && !isFinished && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className={`font-bold ${timer < 15 ? "text-red-400 animate-pulse" : "text-white"}`}>
                {timer}s
              </span>
            </div>
          )}
        </div>

        {/* TOPIC SETUP SCREEN (Shown before starting) */}
        {!isStarted ? (
          <form
            onSubmit={handleStartCustom}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white uppercase">
                CONFIGURE QUIZ PARAMETERS
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Specify any academic concept, syllabus module, or exam subject to generate tailored assessment questions.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                TOPIC OR SYLLABUS AREA
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
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  QUESTION COUNT
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => {
                    const cnt = Number(e.target.value);
                    if (cnt > 5 && user.plan === "free") {
                      openSubscriptionModal("free-premium");
                      return;
                    }
                    setQuestionCount(cnt);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value={5}>5 Questions (Free Evaluation)</option>
                  <option value={10}>10 Questions (Scholar Pro)</option>
                  <option value={15}>15 Questions (Deep Evaluation • Pro)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  EVALUATION MODE
                </label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  Timed Active Recall • Instant Keys
                </div>
              </div>
            </div>

            {user.plan === "free" && questionCount > 5 ? (
              <button
                type="button"
                onClick={() => openSubscriptionModal("free-premium")}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <Shield className="w-4 h-4" />
                UNLOCK EXTENDED QUIZ WITH PREMIUM
              </button>
            ) : (
              <ShimmerButton
                disabled={loading}
                shimmerColor="#60a5fa"
                className="w-full py-3 text-xs font-bold uppercase tracking-wider mt-2"
              >
                {loading ? "GENERATING ASSESSMENT QUESTIONS..." : "INITIALIZE QUIZ ARENA"}
              </ShimmerButton>
            )}
          </form>
        ) : (
          /* ACTIVE QUIZ SCREEN */
          <>
            {/* Progress */}
            {!isFinished && questions.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
                  <span>PROGRESS: {Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Question Body */}
            {!isFinished && currentQ ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-white font-sans leading-snug">
                  {currentQ.question}
                </h2>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = userChoice === idx;
                    const isCorrect = idx === currentQ.correctIndex;

                    let optClass = "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700";
                    if (isAnswered) {
                      if (isCorrect) {
                        optClass = "border-emerald-500/80 bg-emerald-500/15 text-emerald-200 font-semibold";
                      } else if (isSelected) {
                        optClass = "border-red-500/80 bg-red-500/15 text-red-200";
                      } else {
                        optClass = "border-slate-800 bg-slate-950/30 text-slate-500 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-sans flex items-center justify-between transition-all ${optClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-300 shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isAnswered && (
                          <div>
                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation box */}
                {showExplanation && (
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs font-sans text-blue-200 space-y-1 animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 font-mono text-blue-300 font-bold">
                      <HelpCircle className="w-4 h-4" />
                      CONCEPTUAL EXPLANATION
                    </div>
                    <p className="leading-relaxed">{currentQ.explanation}</p>
                  </div>
                )}

                {/* Next Question Control */}
                {isAnswered && (
                  <div className="flex justify-end pt-2">
                    <ShimmerButton
                      onClick={handleNext}
                      shimmerColor="#60a5fa"
                      className="px-6 py-2.5 text-xs font-bold font-mono tracking-wider"
                    >
                      {currentIndex === questions.length - 1 ? "FINISH EVALUATION" : "NEXT QUESTION"}
                      <ChevronRight className="w-4 h-4 ml-1 inline" />
                    </ShimmerButton>
                  </div>
                )}
              </div>
            ) : (
              /* Finished Result Screen */
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-[0_0_40px_rgba(59,130,246,0.6)]">
                  <Award className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    QUIZ COMPLETED
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Target Topic: {topic}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto py-4">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">ACCURACY</div>
                    <div className="text-xl font-bold text-emerald-400">{accuracy}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">CORRECT</div>
                    <div className="text-xl font-bold text-white">{totalScore} / {questions.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">RATING</div>
                    <div className="text-xl font-bold text-blue-400">
                      {accuracy >= 80 ? "EXPERT" : accuracy >= 50 ? "PROFICIENT" : "REVISE"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsStarted(false)}
                    className="px-6 py-2.5 rounded-xl border border-slate-800 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Search className="w-4 h-4" />
                    TEST ANOTHER TOPIC
                  </button>
                  <Link href="/practice">
                    <ShimmerButton shimmerColor="#60a5fa" className="px-6 py-2.5 text-xs font-bold">
                      PRACTICE HUB
                    </ShimmerButton>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading Quiz Arena...</div>}>
      <QuizContent />
    </Suspense>
  );
}
