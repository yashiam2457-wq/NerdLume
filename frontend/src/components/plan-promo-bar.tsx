"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Zap, Crown, ChevronRight, Lock } from "lucide-react";

export function PlanPromoBar() {
  const { user, openSubscriptionModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activePlan = mounted ? user.plan : "free";

  if (activePlan === "diamond") {
    return (
      <div className="w-full bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-purple-950/60 border border-purple-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-purple-200">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-purple-400" />
          <span>DIAMOND RESEARCHER • 4× COMPUTE ALLOWANCE & ADVANCED REASONING ACTIVE</span>
        </div>
        <button
          onClick={() => openSubscriptionModal("diamond")}
          className="text-[11px] text-purple-400 hover:text-white font-bold uppercase tracking-wider hidden sm:inline transition-colors"
        >
          VIEW COMPUTE QUOTAS
        </button>
      </div>
    );
  }

  if (activePlan === "free-premium") {
    return (
      <div className="w-full bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-blue-950/60 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-blue-200">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span>SCHOLAR PRO ACTIVE • 30 Notes • 30 Explain • 60 Quick per month</span>
        </div>
        <button
          onClick={() => openSubscriptionModal("diamond")}
          className="text-[11px] text-blue-400 hover:text-white flex items-center gap-1 font-bold transition-colors"
        >
          UPGRADE TO DIAMOND
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-300">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>FREE SCHOLAR: 5 Notes • 5 Quick • 2 Explain per week</span>
        <span className="text-slate-600">•</span>
        <span className="text-blue-400/90 flex items-center gap-1 text-[11px]">
          3 file uploads • Basic flashcards
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-500 hidden md:inline">
          Need 30 Notes/mo & Exam Simulator?
        </span>
        <button
          onClick={() => openSubscriptionModal("free-premium")}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
        >
          UPGRADE TO SCHOLAR PRO (₹149)
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
