"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Terminal, BookOpen, Layers, Award, User, LogOut, Shield, Crown, Zap } from "lucide-react";
import { ShimmerButton } from "./magicui/shimmer-button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout, openSubscriptionModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPlan = mounted ? user.plan : "free";
  const isUserAuth = mounted && (isAuthenticated || (Boolean(user) && user.id !== "usr-guest"));

  const navLinks = [
    { label: "STUDY", href: "/", icon: Sparkles },
    { label: "PRACTICE", href: "/practice", icon: BookOpen },
    { label: "QUIZZES", href: "/quiz", icon: Award },
    { label: "FLASHCARDS", href: "/flashcards", icon: Layers },
    { label: "MOCK EXAMS", href: "/mocktest", icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center p-1.5 shadow-[0_0_16px_rgba(34,197,94,0.35)] group-hover:shadow-[0_0_24px_rgba(74,222,128,0.65)] group-hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
          >
            <img src="/NerdLume_Symbol.svg" alt="NerdLume" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-lg font-bold tracking-tight text-white flex items-center gap-1">
              NERD<span className="text-emerald-400">LUME</span>
            </span>
            <span className="text-[10px] tracking-widest text-slate-400 font-mono">
              AI STUDY ENGINE
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider transition-all flex items-center gap-1.5",
                  isActive
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Status / Subscription Paywall / Actions */}
        <div className="flex items-center gap-3">
          {/* Active Tier Pill */}
          <button
            onClick={() => openSubscriptionModal()}
            title="Click to view subscription tiers & quotas"
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition-all",
              currentPlan === "diamond"
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25"
                : currentPlan === "free-premium"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            )}
          >
            {currentPlan === "diamond" ? (
              <Crown className="w-3.5 h-3.5 text-purple-400" />
            ) : currentPlan === "free-premium" ? (
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{currentPlan === "free-premium" ? "SCHOLAR PRO" : currentPlan === "diamond" ? "DIAMOND" : "FREE SCHOLAR"}</span>
          </button>

          {/* Paywall Upgrade Button (if Free) */}
          {currentPlan === "free" && (
            <button
              onClick={() => openSubscriptionModal("free-premium")}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)]"
            >
              UPGRADE TO PRO
            </button>
          )}

          {/* User Profile or Login */}
          {isUserAuth ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-white font-mono transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                  {user.avatar || user.name[0]}
                </div>
                <span className="hidden lg:inline">{user.name.split(" ")[0]}</span>
              </Link>
              <button
                onClick={logout}
                title="Log Out"
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-all"
              >
                SIGN IN
              </Link>
              <Link href="/signup">
                <ShimmerButton
                  shimmerColor="#60a5fa"
                  className="text-xs font-mono font-semibold py-1.5 px-4 h-8"
                >
                  SIGN UP
                </ShimmerButton>
              </Link>
            </div>
          )}

          {/* Admin Link - ONLY visible to authenticated Administrator */}
          {mounted && (user.role === "admin" || isAdmin) && (
            <Link
              href="/admin"
              title="Administrator Console"
              className="px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5 text-xs font-mono font-bold shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>ADMIN</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
