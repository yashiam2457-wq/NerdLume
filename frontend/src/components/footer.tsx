"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-855/60 bg-slate-950/90 py-6 px-4 sm:px-6 lg:px-8 text-slate-400 font-mono text-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-0.5"
          >
            <img src="/NerdLume_Symbol.svg" alt="NerdLume" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-white tracking-wider text-xs">
            NERDLUME
          </span>
          <span className="text-slate-600 text-[10px] hidden md:inline">•</span>
          <span className="text-slate-500 text-[11px] hidden md:inline">
            AI-POWERED STUDY PLATFORM
          </span>
        </div>

        {/* Minimal Thin Navigation Links */}
        <div className="flex items-center gap-6 text-[11px] text-slate-400">
          <Link
            href="/contact"
            className="hover:text-blue-400 transition-colors"
          >
            Contact
          </Link>
          <Link
            href="/contact"
            className="hover:text-blue-400 transition-colors"
          >
            Support
          </Link>
          <a
            href="#ai-core"
            className="hover:text-blue-400 transition-colors"
          >
            About
          </a>
          <Link
            href="/contact"
            className="hover:text-blue-400 transition-colors"
          >
            Terms & Privacy
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-[11px] text-slate-500">
          © 2026 NerdLume • All rights reserved
        </div>
      </div>
    </footer>
  );
}
