"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Shield, CheckCircle2 } from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Squares } from "@/components/react-bits/squares";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await signup(name, email, password);
    setLoading(false);
    router.push("/");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 font-mono text-slate-200">
      <Squares
        direction="diagonal"
        speed={0.4}
        squareSize={40}
        borderColor="rgba(59, 130, 246, 0.05)"
        hoverFillColor="rgba(59, 130, 246, 0.12)"
      />

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            REGISTER SCHOLAR ACCOUNT
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Create your account to start generating Cornell notes, practicals, and mock exams.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              FULL NAME
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              INSTITUTIONAL / PERSONAL EMAIL
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@university.edu"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <ShimmerButton
            disabled={loading}
            shimmerColor="#a855f7"
            className="w-full py-3 text-xs font-bold tracking-wider uppercase mt-4"
          >
            {loading ? "INITIALIZING ACCOUNT..." : "CREATE ACCOUNT"}
          </ShimmerButton>
        </form>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>Already registered?</span>
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold font-mono">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
