"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, AlertCircle } from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Squares } from "@/components/react-bits/squares";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const success = await login(email, password);
    setLoading(false);
    if (success) {
      router.push("/");
    } else {
      setError("Invalid credentials. Please verify your email and password.");
    }
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
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            SIGN IN
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Enter your credentials to access your saved notes and study history.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@university.edu"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
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
                placeholder="••••••••••••"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <ShimmerButton
            disabled={loading}
            shimmerColor="#60a5fa"
            className="w-full py-3 text-xs font-bold tracking-wider uppercase mt-2"
          >
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </ShimmerButton>
        </form>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>Need an account?</span>
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold font-mono">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
