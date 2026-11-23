"use client";

import React, { useState } from "react";
import { GenerationResult } from "@/lib/types";
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Cpu,
  Layers,
  Code,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface OutputDisplayProps {
  result: GenerationResult;
}

export function OutputDisplay({ result }: OutputDisplayProps) {
  const [activeTab, setActiveTab] = useState<"formatted" | "diagrams" | "code" | "practice">(
    "formatted"
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "md" | "txt") => {
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] font-mono text-slate-200 mt-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            GENERATION RESULT • {result.mode.toUpperCase()}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {result.title}
          </h2>
          <div className="text-[11px] text-slate-500 mt-1">
            Timestamp: {formatDate(result.timestamp)} • ID: {result.id}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "COPIED" : "COPY TEXT"}
          </button>
          <button
            onClick={() => handleDownload("md")}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            .MD
          </button>
          <button
            onClick={() => handleDownload("txt")}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            .TXT
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          >
            <Printer className="w-3.5 h-3.5" />
            PRINT / PDF
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="my-5 p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 font-sans leading-relaxed flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold font-mono text-blue-300 block mb-0.5">EXECUTIVE SUMMARY</span>
          {result.summary}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 text-xs">
        <button
          onClick={() => setActiveTab("formatted")}
          className={`px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "formatted"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          STUDY DOCUMENT
        </button>
        {result.diagrams && result.diagrams.length > 0 && (
          <button
            onClick={() => setActiveTab("diagrams")}
            className={`px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "diagrams"
                ? "border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            ASCII DIAGRAMS ({result.diagrams.length})
          </button>
        )}
        {result.codeSnippets && result.codeSnippets.length > 0 && (
          <button
            onClick={() => setActiveTab("code")}
            className={`px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "code"
                ? "border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            PROGRAM CODE
          </button>
        )}
        <button
          onClick={() => setActiveTab("practice")}
          className={`px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "practice"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          PRACTICE MODULES
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "formatted" && (
        <div className="prose prose-invert max-w-none text-slate-300 font-sans text-sm leading-relaxed space-y-4 whitespace-pre-line bg-slate-950/60 p-6 rounded-xl border border-slate-800/80">
          {result.content}
        </div>
      )}

      {activeTab === "diagrams" && result.diagrams && (
        <div className="space-y-4">
          {result.diagrams.map((diag, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 font-mono text-xs overflow-x-auto shadow-inner"
            >
              <pre>{diag}</pre>
            </div>
          ))}
        </div>
      )}

      {activeTab === "code" && result.codeSnippets && (
        <div className="space-y-4">
          {result.codeSnippets.map((snippet, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs"
            >
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 font-mono">
                <span>LANGUAGE: {snippet.language.toUpperCase()}</span>
                <span>STATUS: VERIFIED</span>
              </div>
              <pre className="p-4 text-emerald-400 overflow-x-auto font-mono">
                {snippet.code}
              </pre>
              {snippet.output && (
                <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  <span className="text-slate-500">EXECUTION TELEMETRY: </span>
                  {snippet.output}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "practice" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Launch Quiz Card */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs text-blue-400 font-bold mb-1">INTERACTIVE QUIZ</div>
                <h4 className="text-base font-bold text-white mb-2">Practice Questions Generated</h4>
                <p className="text-xs text-slate-400 font-sans mb-4">
                  Assessment questions formatted with timer presets and instant feedback logic.
                </p>
              </div>
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              >
                LAUNCH QUIZ ARENA
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Launch Flashcards Card */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs text-purple-400 font-bold mb-1">FLASHCARDS</div>
                <h4 className="text-base font-bold text-white mb-2">Flashcard Deck</h4>
                <p className="text-xs text-slate-400 font-sans mb-4">
                  Flip cards with interactive mastery ratings to accelerate long-term retention.
                </p>
              </div>
              <Link
                href="/flashcards"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              >
                OPEN FLASHCARDS
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
