"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { FileText, HelpCircle, Zap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuotaIndicator() {
  const { user, quotas, openSubscriptionModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUnlimited = mounted && user.plan === "diamond";
  const activeUsage = mounted ? user.usage : { notes: 0, explain: 0, quick: 0 };

  const metrics = [
    {
      label: "NOTE MAKING",
      used: activeUsage.notes || 0,
      limit: quotas.notes,
      icon: FileText,
      color: "from-blue-500 to-indigo-500",
      isLocked: false,
    },
    {
      label: "EXPLAIN MODE",
      used: activeUsage.explain || 0,
      limit: quotas.explain,
      icon: HelpCircle,
      color: "from-cyan-500 to-blue-500",
      isLocked: quotas.explain === 0,
    },
    {
      label: "QUICK MODE",
      used: activeUsage.quick || 0,
      limit: quotas.quick,
      icon: Zap,
      color: "from-purple-500 to-indigo-500",
      isLocked: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full font-mono text-xs">
      {metrics.map((m) => {
        const Icon = m.icon;
        const percent = isUnlimited
          ? 100
          : m.isLocked
          ? 0
          : Math.min(100, (m.used / m.limit) * 100);
        const remaining = isUnlimited
          ? "Unlimited"
          : m.isLocked
          ? "0 (Locked)"
          : Math.max(0, m.limit - m.used);

        return (
          <div
            key={m.label}
            onClick={() => {
              if (m.isLocked) openSubscriptionModal("free-premium");
            }}
            className={cn(
              "bg-slate-900/60 border rounded-xl p-3 flex flex-col justify-between transition-all",
              m.isLocked
                ? "border-amber-500/30 hover:border-amber-500/60 cursor-pointer bg-slate-950/40"
                : "border-slate-800"
            )}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <Icon className={cn("w-3.5 h-3.5", m.isLocked ? "text-amber-400" : "text-blue-400")} />
                {m.label}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                {isUnlimited ? (
                  "∞"
                ) : m.isLocked ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED
                  </span>
                ) : (
                  `${m.used} / ${m.limit}`
                )}
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  m.isLocked ? "bg-amber-500/40" : cn("bg-gradient-to-r", m.color)
                )}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-2 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{m.isLocked ? "Tier Access:" : "Remaining:"}</span>
              <span
                className={cn(
                  "font-bold",
                  m.isLocked
                    ? "text-amber-400 underline cursor-pointer"
                    : remaining === 0
                    ? "text-red-400"
                    : "text-slate-300"
                )}
              >
                {m.isLocked ? "Upgrade to Unlock" : remaining}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
