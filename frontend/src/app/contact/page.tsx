"use client";

import React, { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Squares } from "@/components/react-bits/squares";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("feedback");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <Squares
        direction="diagonal"
        speed={0.3}
        squareSize={40}
        borderColor="rgba(59, 130, 246, 0.05)"
        hoverFillColor="rgba(59, 130, 246, 0.1)"
      />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs">
            <Mail className="w-3.5 h-3.5" />
            COMMUNICATION DISPATCH
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
            CONTACT NERDLUME ENGINEERING
          </h1>
          <p className="text-xs text-slate-400 font-sans max-w-lg mx-auto">
            Have questions about study notes generation, institutional licensing, or custom features? Reach our core team directly.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-white uppercase">
                DISPATCH TRANSMITTED SUCCESSFULLY
              </h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                Thank you, {name}. Our engineering support team has received your ticket and will respond to {email} within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
              >
                SEND ANOTHER MESSAGE
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alan Turing"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alan@cambridge.ac.uk"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  SUBJECT INQUIRY
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="feedback">General Study Feedback & Quality</option>
                  <option value="enterprise">University & Institutional Licensing</option>
                  <option value="quota">Quota or Subscription Question</option>
                  <option value="bug">Bug Report or Mathematical Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  MESSAGE BODY
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, curriculum requirements, or feature feedback..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-y font-sans leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <ShimmerButton
                  shimmerColor="#60a5fa"
                  className="w-full py-3 text-xs font-bold uppercase tracking-wider"
                >
                  TRANSMIT DISPATCH
                </ShimmerButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
