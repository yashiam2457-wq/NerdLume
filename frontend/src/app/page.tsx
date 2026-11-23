"use client";

import React, { useState, useEffect } from "react";
import { GenerationResult } from "@/lib/types";
import { GeneratorSection } from "@/components/generator-section";
import { OutputDisplay } from "@/components/output-display";
import { GenerationSaveModal } from "@/components/generation-save-modal";
import { PlanPromoBar } from "@/components/plan-promo-bar";
import { QuotaIndicator } from "@/components/quota-indicator";
import { WordRotate } from "@/components/magicui/word-rotate";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { Marquee } from "@/components/magicui/marquee";
import { Meteors } from "@/components/magicui/meteors";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { Squares } from "@/components/react-bits/squares";
import { motion } from "framer-motion";
import {
  FileText,
  Award,
  Layers,
  Cpu,
  BarChart3,
  Shield,
  ChevronDown,
  Terminal,
  AlertTriangle,
  Download,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { recordActivity, getStoredHistory } from "@/lib/storage";

const ROTATING_HERO_WORDS = [
  "CORNELL NOTES",
  "SMART QUIZZES",
  "MOCK EXAMS",
  "FLASHCARDS",
  "CODE & LABS",
];

export default function HomePage() {
  // Result is only visible when a study package is actually generated
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null);
  const [sessionGenerations, setSessionGenerations] = useState<GenerationResult[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [activeSaveResult, setActiveSaveResult] = useState<GenerationResult | null>(null);
  const { user, openSubscriptionModal } = useAuth();

  // Restore latest generated document on initial load or reload so text persists
  useEffect(() => {
    try {
      const history = getStoredHistory();
      if (history && history.length > 0) {
        setCurrentResult(history[0]);
        setSessionGenerations(history);
      }
    } catch (e) {
      console.warn("Failed to restore generation history", e);
    }
  }, []);

  // Helper to trigger direct browser file download
  const triggerAutoDownload = (res: GenerationResult, format: "md" | "txt" = "md") => {
    try {
      const blob = new Blob([res.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${res.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Auto-download error", e);
    }
  };

  // Browser refresh or close interception: protect ephemeral unsaved files
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionGenerations.length > 0) {
        // If user is Diamond tier, trigger automatic export of all generated files before exit
        if (user.plan === "diamond") {
          sessionGenerations.forEach((item) => {
            triggerAutoDownload(item, "md");
          });
        }
        e.preventDefault();
        e.returnValue =
          "You have unsaved generated files in this session. NerdLume does not store files in a database; leaving or refreshing will erase them.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionGenerations, user.plan]);

  const handleGenerated = (res: GenerationResult) => {
    setCurrentResult(res);
    setSessionGenerations((prev) => [res, ...prev.filter((item) => item.id !== res.id)]);
    setActiveSaveResult(res);
    setSaveModalOpen(true);

    // If Diamond user, execute instant automatic download upon generation
    if (user.plan === "diamond") {
      triggerAutoDownload(res, "md");
      recordActivity({
        eventType: "auto_download",
        scholar: user.email || "scholar@nerdlume.in",
        mode: res.mode,
        status: "success",
        description: `Diamond tier auto-download executed for "${res.title}".`,
      });
    }

    setTimeout(() => {
      const element = document.getElementById("results");
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleSaveAllGenerations = () => {
    sessionGenerations.forEach((g) => {
      triggerAutoDownload(g, "md");
    });
  };

  const studyTechniques = [
    "Cornell Notes",
    "Feynman Method",
    "SQ3R Method",
    "Flashcards",
    "Mock Exams",
    "Code Practicals",
    "ASCII Diagrams",
  ];

  const bentoFeatures = [
    {
      Icon: FileText,
      name: "Cornell Notes",
      description:
        "Transforms dense syllabi, textbook PDFs, and research papers into cues, structured synthesis, and executive summaries.",
      href: "/practice",
      cta: "Explore Cornell Notes",
      className: "md:col-span-2",
    },
    {
      Icon: Award,
      name: "Quiz Arena",
      description:
        "Generates topic-targeted multiple-choice evaluations with live timers, instant explanations, and performance metrics.",
      href: "/quiz",
      cta: "Launch Arena",
      className: "md:col-span-1",
    },
    {
      Icon: Terminal,
      name: "Mock Exams",
      description:
        "Rigorous timed university examination environment with question sheet palettes, review tagging, and score breakdowns.",
      href: "/mocktest",
      cta: "Enter Simulator",
      className: "md:col-span-1",
    },
    {
      Icon: Cpu,
      name: "Code & Labs",
      description:
        "Generates clean programs with edge-case tests, execution telemetry, and verified compiler outputs.",
      href: "/practice",
      cta: "Generate Practicals",
      className: "md:col-span-2",
    },
    {
      Icon: Layers,
      name: "Flashcards",
      description:
        "Flashcard decks with Leitner algorithm confidence ratings to maximize long-term retention before high-stakes exams.",
      href: "/flashcards",
      cta: "Review Cards",
      className: "md:col-span-1",
    },
    {
      Icon: BarChart3,
      name: "Graphs & Diagrams",
      description:
        "Plots mathematical data and renders terminal-ready ASCII architecture diagrams for fast comprehension.",
      href: "/practice",
      cta: "View Visuals",
      className: "md:col-span-2",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden isolate bg-[#080c14]">
      {/* Interactive Cyber Grid Background */}
      <Squares
        direction="diagonal"
        speed={0.35}
        squareSize={44}
        borderColor="rgba(59, 130, 246, 0.16)"
        hoverFillColor="rgba(56, 189, 248, 0.28)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 relative z-10 space-y-16">
        {/* Hero Section */}
        <section className="relative text-center py-10 md:py-14 space-y-6">
          <Meteors number={15} />

          {/* Prominent Platform Webpage Title */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center p-3.5 sm:p-4 shadow-[0_0_40px_rgba(34,197,94,0.45)] cursor-pointer select-none hover:scale-105 transition-all"
            >
              <img src="/NerdLume_Symbol.svg" alt="NerdLume" className="w-full h-full object-contain" />
            </div>
            <span className="font-mono text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white flex items-center">
              NERD<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400">LUME</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-POWERED SMART STUDY ENGINE • V2.0
          </div>

          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-mono uppercase text-center leading-tight">
              <span className="block">
                STUDY <span className="text-blue-500 italic">SMARTER</span>
              </span>
              <span className="inline-flex items-center justify-center gap-2.5 flex-wrap pt-1 sm:pt-2">
                <span>GENERATE</span>
                <WordRotate
                  words={ROTATING_HERO_WORDS}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400"
                />
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 font-sans leading-relaxed pt-2">
              Paste your syllabus or upload course documents. NerdLume decomposes complex technical curriculum into exam-ready notes, formulas, and interactive evaluations.
            </p>
          </div>

          {/* Quick CTA cluster */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a href="#ai-core">
              <ShimmerButton
                shimmerColor="#60a5fa"
                className="px-8 py-3.5 text-xs font-mono font-bold tracking-wider uppercase"
              >
                ACCESS AI CORE & GENERATOR
              </ShimmerButton>
            </a>
            <button
              onClick={() => openSubscriptionModal()}
              className="px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              VIEW SUBSCRIPTION PLANS
            </button>
          </div>
        </section>

        {/* Marquee Banner */}
        <section className="border-y border-slate-800/80 py-4 bg-slate-950/40">
          <Marquee pauseOnHover className="[--duration:28s]">
            {studyTechniques.map((tech) => (
              <div
                key={tech}
                className="flex items-center gap-3 mx-4 text-xs font-mono text-slate-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="tracking-wide uppercase">{tech}</span>
              </div>
            ))}
          </Marquee>
        </section>

        {/* AI CORE & GENERATOR */}
        <section id="ai-core" className="scroll-mt-20 space-y-8">
          {/* Enhanced Animated AI Core Centerpiece (Clean & Label-Free) */}
          <div className="relative flex flex-col items-center justify-center py-6 overflow-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulseSlow" />

            {/* Orbiting Visual Container */}
            <div className="relative flex h-[320px] w-full max-w-lg mx-auto items-center justify-center">
              {/* Expanding Concentric Energy Waves */}
              <motion.div
                animate={{
                  scale: [0.95, 1.35, 0.95],
                  opacity: [0.2, 0.45, 0.2],
                  borderWidth: ["1px", "1.5px", "1px"],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-64 h-64 rounded-full border border-cyan-500/30 pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1.1, 1.55, 1.1],
                  opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.2,
                }}
                className="absolute w-72 h-72 rounded-full border border-indigo-500/20 pointer-events-none"
              />

              {/* Counter-Rotating Dashed Tech Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
                className="absolute w-[210px] h-[210px] rounded-full border border-dashed border-blue-400/25 pointer-events-none"
              />

              {/* Central Glowing Geometric Core (Label-Free with Dynamic Geometry) */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                animate={{
                  boxShadow: [
                    "0 0 35px rgba(59, 130, 246, 0.5)",
                    "0 0 65px rgba(6, 182, 212, 0.65)",
                    "0 0 35px rgba(59, 130, 246, 0.5)",
                  ],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="z-20 w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white border border-white/30 cursor-pointer shadow-2xl relative group backdrop-blur-xl"
              >
                {/* Internal Pulsing Energy Core */}
                <motion.div
                  animate={{
                    scale: [0.85, 1.15, 0.85],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-2 rounded-2xl bg-gradient-to-tr from-cyan-400/20 via-blue-500/30 to-purple-500/20 blur-sm pointer-events-none"
                />

                {/* Rotating Geometric SVG Portal */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <svg
                    className="w-12 h-12 text-cyan-200 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 2 12 12 22 22 12" />
                    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                    <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" strokeOpacity="0.6" />
                    <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" strokeOpacity="0.6" />
                  </svg>
                </motion.div>
              </motion.div>

              {/* Orbiting Layer 1 */}
              <OrbitingCircles radius={88} duration={18} delay={0}>
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.4)] backdrop-blur-md"
                >
                  <FileText className="w-4 h-4" />
                </motion.div>
              </OrbitingCircles>

              <OrbitingCircles radius={88} duration={18} delay={9}>
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.4)] backdrop-blur-md"
                >
                  <Award className="w-4 h-4" />
                </motion.div>
              </OrbitingCircles>

              {/* Orbiting Layer 2 */}
              <OrbitingCircles radius={138} duration={26} delay={0} reverse>
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.4)] backdrop-blur-md"
                >
                  <Layers className="w-4 h-4" />
                </motion.div>
              </OrbitingCircles>

              <OrbitingCircles radius={138} duration={26} delay={13} reverse>
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.4)] backdrop-blur-md"
                >
                  <Cpu className="w-4 h-4" />
                </motion.div>
              </OrbitingCircles>
            </div>
          </div>

          {/* Plan Promo Bar & Quota Indicators (Positioned directly below AI Core) */}
          <div className="space-y-3 max-w-5xl mx-auto">
            <PlanPromoBar />
            <QuotaIndicator />
          </div>

          {/* Main Study Generation Console */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white uppercase">
                STUDY CONSOLE
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl mx-auto">
                Configure parameters, select note-taking methodology, and execute AI synthesis with deterministic accuracy.
              </p>
            </div>

            <GeneratorSection onGenerated={handleGenerated} />
          </div>

          {/* Ephemeral Session Alert Banner for Unsaved Generations */}
          {sessionGenerations.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-white uppercase">
                    EPHEMERAL RUNTIME SESSION • {sessionGenerations.length} ARTIFACT(S)
                  </span>
                  <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                    Files are held in temporary memory and are NOT saved to the database. Save all files before refreshing or closing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSaveAllGenerations}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SAVE ALL GENERATED FILES</span>
                </button>
              </div>
            </div>
          )}

          {/* Generated Result: ONLY visible when file / study package is generated */}
          {currentResult && (
            <div id="results" className="scroll-mt-20">
              <OutputDisplay result={currentResult} />
            </div>
          )}

          {/* Popup Modal for Each Generation */}
          <GenerationSaveModal
            isOpen={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            result={activeSaveResult}
            user={user}
          />
        </section>

        {/* Magic UI Bento Grid Feature Showcase */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs text-blue-400 font-mono tracking-widest uppercase font-semibold">
              COMPLETE ACADEMIC TOOLKIT
            </div>
            <h2 className="text-3xl font-bold font-mono text-white tracking-tight uppercase">
              STUDY TOOLKIT
            </h2>
            <p className="text-sm text-slate-400 font-sans max-w-2xl mx-auto">
              Every tool is tailored to STEM, computer science, medicine, and university exams.
            </p>
          </div>

          <BentoGrid className="lg:grid-rows-2">
            {bentoFeatures.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </section>

        {/* Academic FAQ */}
        <section className="max-w-3xl mx-auto space-y-6 pt-4 font-mono">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white uppercase">
              FAQ
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Operational details regarding quotas, generation fidelity, and study formats.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                q: "How does the Cornell Note-Taking generation work?",
                a: "The engine synthesizes your text or syllabus into 3 distinct sections: cue questions and vocabulary on the left, thorough conceptual explanations and formulas on the right, and an executive recap at the bottom.",
              },
              {
                q: "How do generation quotas operate?",
                a: "Quotas reset every 7 days from your initial registration. Free accounts receive 3 Notes and 3 Quick generations per week, while Explain Mode is reserved for Premium and Diamond tiers. Premium accounts expand to 7 Notes, 5 Explain, and 14 Quick generations, and Diamond scholars enjoy unlimited access.",
              },
              {
                q: "Are code outputs and assignments executable?",
                a: "Yes. Practical and Assignment Generator mode produces standard C/C++, Python, and Java programs complete with edge-case tests and simulated terminal outputs.",
              },
              {
                q: "How do I upgrade or manage my subscription?",
                a: "Click on the Upgrade button or tier badge in the navigation bar or quota meters to launch the Subscription Plans popup, where you can activate Premium or Diamond access instantly.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-slate-300 open:border-blue-500/40 transition-colors"
              >
                <summary className="font-bold text-white cursor-pointer list-none flex items-center justify-between">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-2 text-slate-400 font-sans leading-relaxed pt-2 border-t border-slate-800/60">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
