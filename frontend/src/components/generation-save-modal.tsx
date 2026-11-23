"use client";

import React, { useEffect } from "react";
import { GenerationResult, UserProfile } from "@/lib/types";
import {
  AlertTriangle,
  Download,
  CheckCircle,
  FileText,
  Sparkles,
  ShieldAlert,
  X,
  Crown,
} from "lucide-react";
import { ShimmerButton } from "./magicui/shimmer-button";

interface GenerationSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GenerationResult | null;
  user: UserProfile;
}

export function GenerationSaveModal({
  isOpen,
  onClose,
  result,
  user,
}: GenerationSaveModalProps) {
  if (!isOpen || !result) return null;

  const isDiamond = user.plan === "diamond";

  const downloadFile = (format: "md" | "txt") => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono text-slate-200 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.8)] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
                EPHEMERAL SESSION NOTICE
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                NO CLOUD DB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              NerdLume zero-database storage policy for absolute scholar privacy.
            </p>
          </div>
        </div>

        {/* Generated File Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            GENERATED ARTIFACT
          </div>
          <div className="text-xs font-bold text-white truncate">{result.title}</div>
          <div className="text-[10px] text-slate-500">
            Mode: {result.mode.toUpperCase()} • ID: {result.id}
          </div>
        </div>

        {/* Diamond Tier Automatic Download Banner */}
        {isDiamond ? (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white uppercase text-[11px]">
              <Crown className="w-4 h-4 text-cyan-400" />
              DIAMOND PRIVILEGE • AUTO-DOWNLOAD ACTIVATED
            </div>
            <p className="text-[11px] text-cyan-200 font-sans">
              As a Diamond scholar, this generation has been automatically saved directly to your local downloads folder.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1 font-sans">
            <div className="font-bold text-amber-300 font-mono uppercase text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              SAVE YOUR FILE NOW
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We do not store your documents in a remote database. If you refresh or close this browser window, all unsaved generated materials in this session will be cleared.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => downloadFile("md")}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD .MD
            </button>
            <button
              onClick={() => downloadFile("txt")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD .TXT
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800/40 transition-colors"
          >
            CONTINUE IN CURRENT SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
