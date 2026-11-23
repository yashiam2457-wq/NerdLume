"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStoredHistory } from "@/lib/storage";
import { GenerationResult } from "@/lib/types";
import {
  User,
  Shield,
  Zap,
  Clock,
  Download,
  FileText,
  Search,
  ExternalLink,
  Crown,
  BookOpen,
} from "lucide-react";
import { QuotaIndicator } from "@/components/quota-indicator";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { user, quotas, openSubscriptionModal, logout } = useAuth();
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<GenerationResult | null>(null);

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const filteredHistory = history.filter(
    (h) =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.mode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full py-10 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              {user.avatar || user.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{user.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    user.plan === "diamond"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : user.plan === "free-premium"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {user.plan === "free-premium" ? "PREMIUM SCHOLAR" : `${user.plan.toUpperCase()} TIER`}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Subscription Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openSubscriptionModal()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              MANAGE SUBSCRIPTION
            </button>
          </div>
        </div>

        {/* Quota Indicators */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            WEEKLY GENERATION QUOTAS
          </div>
          <QuotaIndicator />
        </div>

        {/* Generation History */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white uppercase">GENERATION LIBRARY</h3>
              <p className="text-xs text-slate-400 font-sans">
                Review and export previously generated notes, practicals, and quizzes.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search study documents..."
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-1 max-w-lg mt-0.5">
                        {item.summary}
                      </p>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>•</span>
                        <span className="uppercase">{item.mode} MODE</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setSelectedDoc(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      PREVIEW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm text-slate-400">No generation history found.</div>
              <Link href="/">
                <ShimmerButton shimmerColor="#60a5fa" className="text-xs px-6 py-2.5 font-bold">
                  CREATE NEW STUDY PACKAGE
                </ShimmerButton>
              </Link>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[80vh] bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-hidden space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white truncate max-w-lg">
                  {selectedDoc.title}
                </h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  CLOSE
                </button>
              </div>

              <div className="overflow-y-auto max-h-[55vh] text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-950 border border-slate-800">
                {selectedDoc.content}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDoc.content);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-bold"
                >
                  COPY TEXT
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
