"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  GenerationMode,
  QuickType,
  LearningGoal,
  NoteType,
  NoteMethod,
  PracticeType,
  GenerationResult,
} from "@/lib/types";
import { requestGeneration } from "@/lib/api";
import { saveGenerationToHistory, recordTokenUsage } from "@/lib/storage";
import { ShimmerButton } from "./magicui/shimmer-button";
import { BorderBeam } from "./magicui/border-beam";
import {
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Upload,
  Lock,
  CheckCircle2,
  AlertCircle,
  Code,
  BarChart3,
  Cpu,
  Trash2,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratorSectionProps {
  onGenerated: (result: GenerationResult) => void;
}

export function GeneratorSection({ onGenerated }: GeneratorSectionProps) {
  const { user, canPerformGeneration, consumeQuota, checkFeatureAllowed, openSubscriptionModal } =
    useAuth();

  const [mode, setMode] = useState<GenerationMode>("learning");
  const [goal, setGoal] = useState<LearningGoal>("notes");
  const [quickType, setQuickType] = useState<QuickType>("assignment");
  const [topic, setTopic] = useState("");
  const [files, setFiles] = useState<Array<{ name: string; size: number; type: string }>>([]);

  // Mandatory Minimum Academic Standard (Undergraduate / University Degree level)
  const MINIMUM_ACADEMIC_STANDARD = "Undergraduate / University Degree Standard";
  const [assignmentLanguage, setAssignmentLanguage] = useState<string>("Python");
  const [assignmentFormat, setAssignmentFormat] = useState<string>("md");
  const [assignmentSections, setAssignmentSections] = useState<string[]>([
    "Cover Page & Scholar Info",
    "Introduction & Objectives",
    "Questions & Detailed Solutions",
    "Mathematical Formulas & Proofs",
    "ASCII System Diagrams",
    "Summary & Conclusion",
    "References & Citations",
  ]);

  // Lab Practical Options
  const [practicalLanguage, setPracticalLanguage] = useState<string>("Python");
  const [practicalFormat, setPracticalFormat] = useState<string>("md");
  const [includeOutput, setIncludeOutput] = useState<boolean>(true);
  const [includeTestCases, setIncludeTestCases] = useState<boolean>(true);
  const [includeComplexity, setIncludeComplexity] = useState<boolean>(true);
  const [practicalSections, setPracticalSections] = useState<string[]>([
    "Aim & Objective",
    "Apparatus & Tools Required",
    "Theory & Working Principle",
    "Algorithm & Procedure",
    "Source Code with Comments",
    "Execution Output & Telemetry",
    "Observations & Truth Table",
    "Precautions & Viva Questions",
    "Result & Conclusion",
  ]);

  const [noteType, setNoteType] = useState<NoteType>("brief");
  const [method, setMethod] = useState<NoteMethod>("cornell");

  const [practiceType, setPracticeType] = useState<PracticeType>("quiz");
  const [practiceTimer, setPracticeTimer] = useState<number>(120);
  const [practiceCount, setPracticeCount] = useState<number>(10);
  const [practiceDifficulty, setPracticeDifficulty] = useState<
    "easy" | "medium" | "hard" | "competitive"
  >("medium");

  const [options, setOptions] = useState({
    theoryAndNumericals: true,
    programWithCode: false,
    dataGraphs: false,
    asciiDiagrams: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const uploaded = Array.from(e.target.files).map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      setFiles((prev) => [...prev, ...uploaded]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGoalSelect = (selectedGoal: LearningGoal) => {
    setGoal(selectedGoal);
  };

  const handleMethodSelect = (selectedMethod: NoteMethod, label: string) => {
    if (!checkFeatureAllowed(label)) {
      openSubscriptionModal("free-premium");
      return;
    }
    setMethod(selectedMethod);
  };

  const handlePracticeTypeSelect = (selectedPractice: PracticeType, label: string) => {
    if (!checkFeatureAllowed(label)) {
      openSubscriptionModal("free-premium");
      return;
    }
    setPracticeType(selectedPractice);
  };

  const handleGenerate = async () => {
    setErrorMsg(null);

    // Quota check
    const quotaMode = mode === "quick" ? "quick" : goal === "explain" ? "explain" : "notes";
    const quotaStatus = canPerformGeneration(quotaMode);
    if (!quotaStatus.allowed) {
      setErrorMsg(quotaStatus.reason || "Weekly quota exceeded. Please upgrade your plan.");
      openSubscriptionModal(user.plan === "free" ? "free-premium" : "diamond");
      return;
    }

    if (!topic.trim()) {
      setErrorMsg("Please enter a topic, assignment question, or practical problem statement before generating.");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await requestGeneration(
        {
          mode,
          goal,
          quickType,
          topic: topic.trim(),
          files,
          noteType,
          method,
          practiceType,
          practiceTimer,
          practiceCount,
          practiceDifficulty,
          options,
          assignmentOptions: {
            sections: assignmentSections,
            level: MINIMUM_ACADEMIC_STANDARD,
            language: assignmentLanguage,
            format: assignmentFormat,
          },
          practicalOptions: {
            sections: practicalSections,
            language: practicalLanguage,
            includeOutput,
            includeTestCases,
            includeComplexity,
            format: practicalFormat,
          },
        },
        user.token
      );

      consumeQuota(quotaMode);
      saveGenerationToHistory(result);

      // Record telemetry token consumption for administrative analytics
      const estimatedPromptTokens = Math.max(120, Math.floor((topic.length + 300) * 0.75));
      const estimatedCompletionTokens = Math.max(450, Math.floor((result.content.length || 1800) * 0.75));
      recordTokenUsage(
        estimatedPromptTokens,
        estimatedCompletionTokens,
        mode === "quick" ? quickType : mode,
        user.email || "scholar@nerdlume.in"
      );

      onGenerated(result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete generation");
      if (err.message && err.message.toLowerCase().includes("limit reached")) {
        openSubscriptionModal(user.plan === "free" ? "free-premium" : "diamond");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] font-mono text-slate-200">
      <BorderBeam size={250} duration={12} delay={0} colorFrom="#3b82f6" colorTo="#a855f7" />

      {/* Top Mode Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-800 pb-4">
        <button
          onClick={() => setMode("learning")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2",
            mode === "learning"
              ? "bg-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] border border-blue-400/40"
              : "bg-slate-800/60 text-slate-400 hover:text-white"
          )}
        >
          <BookOpen className="w-4 h-4" />
          LEARNING MODE
        </button>
        <button
          onClick={() => setMode("quick")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2",
            mode === "quick"
              ? "bg-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.5)] border border-purple-400/40"
              : "bg-slate-800/60 text-slate-400 hover:text-white"
          )}
        >
          <Sparkles className="w-4 h-4" />
          QUICK MODE
        </button>
      </div>

      {/* Quick Mode Sub-Selector: Assignment vs Lab Practical */}
      {mode === "quick" && (
        <div className="mb-6">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            SELECT QUICK GENERATOR TYPE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignment Generator */}
            <div
              onClick={() => setQuickType("assignment")}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                quickType === "assignment"
                  ? "bg-purple-500/15 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-purple-400" />
                {quickType === "assignment" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">ACADEMIC ASSIGNMENT</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Complete questions, solutions, formulas, diagrams & references
                </p>
              </div>
            </div>

            {/* Lab Practical File */}
            <div
              onClick={() => setQuickType("practical")}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                quickType === "practical"
                  ? "bg-purple-500/15 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                {quickType === "practical" && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">LAB PRACTICAL FILE</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Aim, apparatus, theory, algorithm, verified code, output & viva
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Cards (Learning Mode) */}
      {mode === "learning" && (
        <div className="mb-6">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            SELECT LEARNING GOAL
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Note Making */}
            <div
              onClick={() => handleGoalSelect("notes")}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                goal === "notes"
                  ? "bg-blue-500/15 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.25)] text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-blue-400" />
                {goal === "notes" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">NOTES</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Cornell, Outline, Mindmap & T-Notes
                </p>
              </div>
            </div>

            {/* Practice */}
            <div
              onClick={() => handleGoalSelect("practice")}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                goal === "practice"
                  ? "bg-blue-500/15 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.25)] text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                {goal === "practice" && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">PRACTICE</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Quizzes, Flashcards & Mock Tests
                </p>
              </div>
            </div>

            {/* Explain Mode */}
            <div
              onClick={() => handleGoalSelect("explain")}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative",
                goal === "explain"
                  ? "bg-purple-500/15 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                {goal === "explain" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">EXPLAIN</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Deep analogies, Socratic logic & proofs
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Topic Input */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {mode === "quick"
              ? quickType === "practical"
                ? "PRACTICAL LAB TITLE OR PROBLEM STATEMENT"
                : "ASSIGNMENT TOPIC OR QUESTIONS"
              : "STUDY TOPIC OR SYLLABUS CONTENT"}
          </label>
          <span className="text-[10px] text-slate-500">PASTE TEXT OR ENTER SUBJECT</span>
        </div>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoComplete="off"
          placeholder={
            mode === "quick"
              ? quickType === "practical"
                ? "Enter practical lab experiment title, algorithm requirements, or problem statement..."
                : "Enter academic assignment questions, problem statement, or curriculum topic..."
              : "Enter study topic, chapter title, or syllabus contents..."
          }
          rows={3}
          className="w-full rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all resize-y font-sans leading-relaxed"
        />

        {/* Informational Example Label (Static Guidance • No Autofill) */}
        <div className="mt-2 text-[11px] text-slate-400 font-sans flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
            EXAMPLE TOPICS:
          </span>
          <span className="text-slate-400">
            {mode === "quick"
              ? quickType === "practical"
                ? "Banker's Deadlock Algorithm in C17 • Round Robin CPU Scheduling • Dijkstra Graph Traversal"
                : "Raft Consensus Protocol and Leader Election • B-Tree Indexing in DBMS • RSA vs ECC Cryptography"
              : "Virtual Memory Architecture and TLB • Transformer Attention Mechanism • Dijkstra vs A* Pathfinding"}
          </span>
        </div>
      </div>

      {/* Document Upload Zone */}
      <div className="mb-5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          ATTACH SYLLABUS / DOCUMENTS
        </label>
        <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 hover:border-blue-500/50 cursor-pointer transition-all">
          <Upload className="w-5 h-5 text-blue-400 mb-1" />
          <span className="text-xs text-slate-300 font-medium">Click or Drag & Drop Documents</span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            PDF • DOCX • PPTX • XLSX • CSV • TXT
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Files List */}
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg"
              >
                <span className="truncate max-w-[280px] text-slate-300">{f.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Methods and Options Breakdown */}
      {goal === "notes" && mode === "learning" && (
        <div className="mb-6 space-y-4 border-t border-slate-800/80 pt-4">
          {/* Note Type */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              NOTE STRUCTURE TYPE
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "oneliner", label: "ONELINER / REVISION" },
                  { id: "brief", label: "BRIEF (FULL NOTES)" },
                  { id: "summary", label: "EXECUTIVE SUMMARY" },
                  { id: "mindmap", label: "MINDMAP OUTLINE" },
                ] as const
              ).map((nt) => (
                <button
                  key={nt.id}
                  onClick={() => setNoteType(nt.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border text-left",
                    noteType === nt.id
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                      : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                  )}
                >
                  {nt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Method */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              METHODOLOGY / TECHNIQUE
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: "cornell", label: "Cornell Method", lockName: "Cornell Method" },
                  { id: "outline", label: "Outline Points", lockName: "Outline Points" },
                  { id: "mindmap", label: "Mindmap Tree", lockName: "Mindmap" },
                  { id: "t-notes", label: "T-Notes Format", lockName: "T-Notes" },
                  { id: "feynman", label: "Feynman Technique", lockName: "Feynman Technique" },
                  { id: "sq3r", label: "SQ3R Method", lockName: "SQ3R Method" },
                ] as const
              ).map((m) => {
                const isLocked = !checkFeatureAllowed(m.lockName);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMethodSelect(m.id, m.lockName)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border text-left flex items-center justify-between",
                      method === m.id
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                        : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span>{m.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Practice Options (when goal is practice) */}
      {goal === "practice" && mode === "learning" && (
        <div className="mb-6 space-y-4 border-t border-slate-800/80 pt-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              PRACTICE FORMAT
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "quiz", label: "Interactive Quiz", lockName: "Quiz" },
                  { id: "mock", label: "Mock Test Paper", lockName: "Mock Test" },
                  { id: "flash", label: "Flash Cards", lockName: "Flash Cards" },
                  { id: "guide", label: "Example Guide", lockName: "Example Guide" },
                ] as const
              ).map((p) => {
                const isLocked = !checkFeatureAllowed(p.lockName);
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePracticeTypeSelect(p.id, p.lockName)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border text-left flex items-center justify-between",
                      practiceType === p.id
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span>{p.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">TIMER PRESET</label>
              <select
                value={practiceTimer}
                onChange={(e) => setPracticeTimer(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value={60}>60s / question</option>
                <option value={120}>120s / question (Standard)</option>
                <option value={180}>180s / question (Detailed)</option>
                <option value={300}>300s / question (Exam mode)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">QUESTION COUNT</label>
              <select
                value={practiceCount}
                onChange={(e) => setPracticeCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value={5}>5 Questions (Quick)</option>
                <option value={10}>10 Questions (Standard)</option>
                <option value={15}>15 Questions (Thorough)</option>
                <option value={20}>20 Questions (Comprehensive)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">DIFFICULTY LEVEL</label>
              <select
                value={practiceDifficulty}
                onChange={(e) => setPracticeDifficulty(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="easy">Easy (Fundamentals)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="hard">Hard (Edge Cases)</option>
                <option value="competitive">Competitive / University Level</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Mode: Academic Assignment Options */}
      {mode === "quick" && quickType === "assignment" && (
        <div className="mb-6 space-y-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              ASSIGNMENT SPECIFICATIONS & CONTENT SECTIONS
            </label>
            <span className="text-[10px] text-slate-500">ACADEMIC EXCELLENCE PRESETS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">CODE / TARGET PLATFORM</label>
              <select
                value={assignmentLanguage}
                onChange={(e) => setAssignmentLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="Python">Python 3.12</option>
                <option value="C++">C++20 (Modern Standard)</option>
                <option value="C">C17 Standard</option>
                <option value="Java">Java 21 (OpenJDK)</option>
                <option value="TypeScript">TypeScript • Node.js</option>
                <option value="Rust">Rust 1.76</option>
                <option value="None">None • Theory Only</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">DOCUMENT FORMAT</label>
              <select
                value={assignmentFormat}
                onChange={(e) => setAssignmentFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="md">Markdown Document (.md)</option>
                <option value="docx">Word Document (.docx compatible)</option>
                <option value="pdf">Academic PDF Ready</option>
                <option value="txt">Clean Plain Text (.txt)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-2">
              SECTIONS TO INCLUDE IN ASSIGNMENT
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "coverPage", label: "Cover Page & Scholar Info" },
                { id: "objectives", label: "Introduction & Objectives" },
                { id: "theory", label: "Theoretical Background" },
                { id: "methodology", label: "Questions & Solutions" },
                { id: "formulas", label: "Mathematical Proofs" },
                { id: "diagrams", label: "ASCII System Diagrams" },
                { id: "applications", label: "Real-World Applications" },
                { id: "conclusion", label: "Conclusion & References" },
              ].map((sec) => {
                const isSelected = assignmentSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setAssignmentSections((prev) =>
                        isSelected ? prev.filter((item) => item !== sec.id) : [...prev, sec.id]
                      );
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border text-left flex items-center justify-between",
                      isSelected
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                        : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="truncate">{sec.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Mode: Lab Practical File Options */}
      {mode === "quick" && quickType === "practical" && (
        <div className="mb-6 space-y-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              LAB PRACTICAL SPECIFICATIONS & VERIFICATION
            </label>
            <span className="text-[10px] text-slate-500">ENGINEERING LAB STANDARDS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">COMPILER / RUNTIME PLATFORM</label>
              <select
                value={practicalLanguage}
                onChange={(e) => setPracticalLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="C">C17 Standard (GCC • POSIX Threads)</option>
                <option value="C++">C++20 (G++ • Clang)</option>
                <option value="Python">Python 3.12 (NumPy • SciPy)</option>
                <option value="Java">Java 21 (OpenJDK)</option>
                <option value="Rust">Rust 1.76</option>
                <option value="Linux Bash">Linux Bash Shell Scripting</option>
                <option value="SQL">PostgreSQL / MySQL Schema</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">LAB REPORT FORMAT</label>
              <select
                value={practicalFormat}
                onChange={(e) => setPracticalFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="md">Markdown Lab File (.md)</option>
                <option value="docx">Word Lab Record (.docx)</option>
                <option value="code">Pure Executable Code File</option>
                <option value="txt">Plain Text Lab Record (.txt)</option>
              </select>
            </div>
          </div>

          {/* Verification Toggles */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-2">
              EXECUTION VERIFICATION & RIGOR
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIncludeOutput((prev) => !prev)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all",
                  includeOutput
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                Verified Terminal Output
              </button>
              <button
                type="button"
                onClick={() => setIncludeTestCases((prev) => !prev)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all",
                  includeTestCases
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Edge-Case Test Suites
              </button>
              <button
                type="button"
                onClick={() => setIncludeComplexity((prev) => !prev)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all",
                  includeComplexity
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <Cpu className="w-3.5 h-3.5" />
                Time & Space Complexity Proofs
              </button>
            </div>
          </div>

          {/* Practical Lab Sections */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-2">
              PRACTICAL RECORD SECTIONS
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "aim", label: "Aim & Objective" },
                { id: "apparatus", label: "Apparatus & Software" },
                { id: "theory", label: "Theory & Principles" },
                { id: "algorithm", label: "Algorithm & Steps" },
                { id: "flowchart", label: "ASCII Flowchart" },
                { id: "code", label: "Source Code & Docs" },
                { id: "output", label: "Terminal Output" },
                { id: "observations", label: "Observations Table" },
                { id: "precautions", label: "Precautions & Viva" },
                { id: "result", label: "Result & Conclusion" },
              ].map((sec) => {
                const isSelected = practicalSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setPracticalSections((prev) =>
                        isSelected ? prev.filter((item) => item !== sec.id) : [...prev, sec.id]
                      );
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border text-left flex items-center justify-between",
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="truncate">{sec.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Computational Feature Toggles */}
      <div className="mb-6 border-t border-slate-800/80 pt-4">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          COMPUTATIONAL ENRICHMENTS
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: "theoryAndNumericals", label: "Theory & Numericals", icon: FileText },
            { key: "programWithCode", label: "Program Code & Execution", icon: Code },
            { key: "dataGraphs", label: "Data Graphs (CSV/XLSX)", icon: BarChart3 },
            { key: "asciiDiagrams", label: "ASCII Architecture Diagrams", icon: Cpu },
          ].map((opt) => {
            const Icon = opt.icon;
            const isEnabled = (options as any)[opt.key];
            return (
              <button
                key={opt.key}
                onClick={() =>
                  setOptions((prev) => ({
                    ...prev,
                    [opt.key]: !isEnabled,
                  }))
                }
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all",
                  isEnabled
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold"
                    : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
        <div className="text-xs text-slate-400">
          <span>ACTIVE PLAN: </span>
          <span className="font-bold text-white uppercase">{user.plan}</span>
          <span className="text-slate-600 ml-2">•</span>
          <span className="text-slate-500 ml-2">High-performance synthesis</span>
        </div>

        <ShimmerButton
          onClick={handleGenerate}
          disabled={isGenerating}
          shimmerColor="#60a5fa"
          className="w-full sm:w-auto font-bold tracking-wider text-xs px-8 py-3"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              SYNTHESIZING{" "}
              {mode === "quick"
                ? quickType === "practical"
                  ? "LAB PRACTICAL FILE"
                  : "ASSIGNMENT FILE"
                : "STUDY PACKAGE"}
              ...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {mode === "quick"
                ? quickType === "practical"
                  ? "GENERATE LAB PRACTICAL FILE"
                  : "GENERATE ASSIGNMENT FILE"
                : "GENERATE STUDY PACKAGE"}
            </span>
          )}
        </ShimmerButton>
      </div>
    </div>
  );
}
