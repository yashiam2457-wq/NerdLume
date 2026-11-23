"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generateTopicFlashcards } from "@/lib/api";
import { FlashcardItem } from "@/lib/types";
import {
  Layers,
  Rotate3d,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  Volume2,
  Search,
  Shield,
  Lock,
} from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function FlashcardsContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const { user, openSubscriptionModal } = useAuth();

  const [topic, setTopic] = useState(initialTopic || "");
  const [cardCount, setCardCount] = useState(6);
  const [isStarted, setIsStarted] = useState(Boolean(initialTopic && user.plan !== "free"));
  const [deck, setDeck] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      if (user.plan === "free") {
        openSubscriptionModal("free-premium");
        return;
      }
      loadDeck(initialTopic, 6);
    }
  }, [initialTopic]);

  const loadDeck = async (targetTopic: string, count: number) => {
    if (user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }
    setLoading(true);
    const cards = await generateTopicFlashcards(targetTopic, count);
    setDeck(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setIsStarted(true);
    setLoading(false);
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.plan === "free") {
      openSubscriptionModal("free-premium");
      return;
    }
    if (!topic.trim()) return;
    loadDeck(topic.trim(), cardCount);
  };

  const currentCard = deck[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    if (rating === "good" || rating === "easy") {
      setMasteredCount((c) => c + 1);
    }
    setIsFlipped(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  const speakText = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white uppercase">FLASHCARDS</h1>
              <div className="text-xs text-slate-400 font-sans">
                {isStarted ? `Target Topic: ${topic}` : "Topic Flashcards"}
              </div>
            </div>
          </div>

          {isStarted && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                title="Shuffle Deck"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                SHUFFLE
              </button>
            </div>
          )}
        </div>

        {/* TOPIC SETUP SCREEN */}
        {!isStarted ? (
          <form
            onSubmit={handleStartCustom}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-full font-bold">
                <Shield className="w-3.5 h-3.5" />
                PREMIUM REPETITION SUITE
              </div>
              <h2 className="text-lg font-bold text-white uppercase">
                NEW DECK
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Enter your study subject or target unit to produce 3D Leitner-spaced repetition flashcards.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                TOPIC OR CONCEPT TO MEMORIZE
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
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                DECK SIZE
              </label>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value={6}>6 Cards (Concise Deck)</option>
                <option value={10}>10 Cards (Standard Deck)</option>
                <option value={15}>15 Cards (Comprehensive Deck)</option>
              </select>
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
                shimmerColor="#a855f7"
                className="w-full py-3 text-xs font-bold uppercase tracking-wider mt-2"
              >
                {loading ? "SYNTHESIZING DECK..." : "GENERATE FLASHCARDS"}
              </ShimmerButton>
            )}
          </form>
        ) : (
          /* ACTIVE FLASHCARDS DECK */
          <>
            {/* Progress Tracker */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>CARD {currentIndex + 1} OF {deck.length}</span>
                <span>MASTERED: {masteredCount}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 3D Flip Card Container */}
            {currentCard && (
              <div
                onClick={handleFlip}
                className="relative h-80 sm:h-96 w-full cursor-pointer [perspective:1000px]"
              >
                <motion.div
                  className="w-full h-full relative rounded-2xl [transform-style:preserve-3d] transition-transform duration-500"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                >
                  {/* FRONT FACE */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_40px_rgba(0,0,0,0.6)] [backface-visibility:hidden]">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-purple-400 font-bold text-[10px] uppercase">
                        CONCEPT • FRONT
                      </span>
                      <button
                        onClick={(e) => speakText(currentCard.front, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center my-auto px-4">
                      <p className="text-lg sm:text-xl font-bold text-white font-sans leading-relaxed">
                        {currentCard.front}
                      </p>
                    </div>

                    <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                      <Rotate3d className="w-3.5 h-3.5" />
                      CLICK TO REVEAL ANSWER
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl border border-purple-500/40 bg-slate-950 p-8 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_40px_rgba(168,85,247,0.2)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="flex items-center justify-between text-xs text-purple-300">
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase">
                        EXPLANATION • BACK
                      </span>
                      <button
                        onClick={(e) => speakText(currentCard.back, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-purple-300 hover:text-white transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-left my-auto px-2 overflow-y-auto">
                      <p className="text-sm sm:text-base text-slate-200 font-sans leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>

                    <div className="text-center text-[11px] text-purple-400/80">
                      RATE YOUR RECALL CONFIDENCE BELOW
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Spaced Repetition Rating Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => handleRating("again")}
                className="p-3 rounded-xl bg-slate-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-bold transition-all text-center flex flex-col items-center"
              >
                <span>AGAIN</span>
                <span className="text-[10px] text-slate-500 mt-0.5">&lt; 1 min</span>
              </button>
              <button
                onClick={() => handleRating("hard")}
                className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all text-center flex flex-col items-center"
              >
                <span>HARD</span>
                <span className="text-[10px] text-slate-500 mt-0.5">10 min</span>
              </button>
              <button
                onClick={() => handleRating("good")}
                className="p-3 rounded-xl bg-slate-900 border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all text-center flex flex-col items-center"
              >
                <span>GOOD</span>
                <span className="text-[10px] text-slate-500 mt-0.5">1 day</span>
              </button>
              <button
                onClick={() => handleRating("easy")}
                className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all text-center flex flex-col items-center"
              >
                <span>EASY</span>
                <span className="text-[10px] text-slate-500 mt-0.5">4 days</span>
              </button>
            </div>

            {/* Navigation bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                PREVIOUS
              </button>

              <button
                onClick={() => setIsStarted(false)}
                className="text-slate-400 hover:text-blue-400 transition-colors"
              >
                CHANGE TOPIC
              </button>

              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => Math.min(deck.length - 1, i + 1));
                }}
                disabled={currentIndex === deck.length - 1}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
              >
                NEXT
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading Flashcards...</div>}>
      <FlashcardsContent />
    </Suspense>
  );
}
