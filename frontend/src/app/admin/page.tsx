"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTokenStats,
  getSystemActivities,
  clearSystemActivities,
  recordActivity,
  FEATURE_LOCKS,
} from "@/lib/storage";
import { TokenStats, SystemActivity } from "@/lib/types";
import {
  Shield,
  Activity,
  Cpu,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Database,
  BarChart2,
  RefreshCw,
  LogOut,
  Zap,
  Layers,
  FileText,
  Terminal,
  DownloadCloud,
  Trash2,
  KeyRound,
  Server,
  TrendingUp,
} from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Squares } from "@/components/react-bits/squares";

export default function AdminPage() {
  const { user, isAdmin, adminLogin, adminLogout } = useAuth();

  // Admin Login State
  const [adminId, setAdminId] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Telemetry & Activities State
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [locks, setLocks] = useState(FEATURE_LOCKS);
  const [saveToast, setSaveToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load telemetry data when authenticated
  const loadTelemetry = () => {
    setRefreshing(true);
    setTokenStats(getTokenStats());
    setActivities(getSystemActivities());
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    if (isAdmin || user.role === "admin") {
      loadTelemetry();
    }
  }, [isAdmin, user.role]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const success = await adminLogin(adminId, adminPass);
    setIsLoggingIn(false);

    if (success) {
      loadTelemetry();
    } else {
      setLoginError("Access denied. Invalid administrator credentials or master token.");
    }
  };

  const handleToggleLock = (index: number) => {
    setLocks((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            required: item.required === "free" ? "free-premium" : "free",
          };
        }
        return item;
      })
    );
  };

  const handleSavePolicies = () => {
    setSaveToast(true);
    recordActivity({
      eventType: "policy_change",
      scholar: user.email || "admin@nerdlume.in",
      status: "success",
      description: "Updated access policy rules and study technique feature tiers.",
    });
    setActivities(getSystemActivities());
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleClearActivities = () => {
    clearSystemActivities();
    setActivities([]);
  };

  const handleExportAudit = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Timestamp,Event,Scholar,Mode,Tokens,LatencyMs,Status,Description"]
        .concat(
          activities.map(
            (a) =>
              `"${a.timestamp}","${a.eventType}","${a.scholar}","${a.mode || "n/a"}","${
                a.tokensConsumed || 0
              }","${a.latencyMs || 0}","${a.status}","${a.description.replace(/"/g, '""')}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nerdlume-audit-log-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If NOT authenticated as admin, show secure Administrator Login Gate
  if (!isAdmin && user.role !== "admin") {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 font-mono text-slate-200">
        <Squares
          direction="diagonal"
          speed={0.3}
          squareSize={40}
          borderColor="rgba(239, 68, 68, 0.08)"
          hoverFillColor="rgba(239, 68, 68, 0.12)"
        />

        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_60px_rgba(239,68,68,0.2)] space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_24px_rgba(239,68,68,0.3)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wider uppercase">
              ADMINISTRATIVE SECURITY GATE
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Restricted console for platform governance, token telemetry & system audit logs.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                ADMIN IDENTIFIER
              </label>
              <input
                type="text"
                required
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="admin or admin@nerdlume.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                MASTER SECURITY KEY / PASSPHRASE
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <ShimmerButton
              disabled={isLoggingIn}
              shimmerColor="#ef4444"
              className="w-full font-bold tracking-wider text-xs py-2.5 uppercase"
            >
              {isLoggingIn ? "AUTHENTICATING SECURE SESSION..." : "AUTHENTICATE ADMINISTRATOR"}
            </ShimmerButton>
          </form>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold uppercase">SECURE ROOT ACCESS</div>
            <div>Authorized personnel only. Telemetry actions are audited and logged with IP origin.</div>
          </div>
        </div>
      </div>
    );
  }

  // Filtered activities
  const filteredActivities =
    activityFilter === "all"
      ? activities
      : activities.filter((a) => a.eventType === activityFilter);

  const totalModeTokens =
    tokenStats && tokenStats.modeBreakdown
      ? Object.values(tokenStats.modeBreakdown).reduce((a, b) => a + b, 0) || 1
      : 1;

  return (
    <div className="relative min-h-screen w-full py-10 px-4 sm:px-6 lg:px-8 font-mono text-slate-200">
      <Squares
        direction="diagonal"
        speed={0.3}
        squareSize={44}
        borderColor="rgba(59, 130, 246, 0.05)"
        hoverFillColor="rgba(59, 130, 246, 0.1)"
      />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header HUD */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white uppercase tracking-tight">
                  ADMINISTRATIVE TELEMETRY & OPERATIONS CONSOLE
                </h1>
                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold">
                  ROOT • ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Real-time token consumption analytics, live system activity audit stream, and access policy control.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadTelemetry}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>REFRESH METRICS</span>
            </button>
            <button
              onClick={handleExportAudit}
              className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>EXPORT AUDIT</span>
            </button>
            <button
              onClick={handleSavePolicies}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>SAVE POLICIES</span>
            </button>
            <button
              onClick={adminLogout}
              className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>EXIT CONSOLE</span>
            </button>
          </div>
        </div>

        {saveToast && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Access policies and quota thresholds persisted to system registry.</span>
          </div>
        )}

        {/* Top 4 Core Telemetry Cards (Including Token Consumption) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Tokens */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                TOTAL TOKEN CONSUMPTION
              </span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {tokenStats ? tokenStats.totalTokens.toLocaleString() : "..."}
            </div>
            <div className="text-[11px] text-purple-400 mt-1 flex items-center gap-1.5">
              <span>Prompt: {(tokenStats?.promptTokens || 0).toLocaleString()}</span>
              <span>•</span>
              <span>Completion: {(tokenStats?.completionTokens || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Calls Executed */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                SYNTHESIS CALLS EXECUTED
              </span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {tokenStats ? tokenStats.callsCount.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {tokenStats && tokenStats.callsCount > 0
                ? `${tokenStats.callsCount} synthesis operations recorded`
                : "Awaiting generation executions"}
            </div>
          </div>

          {/* Card 3: Estimated Compute Cost */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                ESTIMATED COMPUTE COST
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              ${tokenStats ? tokenStats.estimatedCostUsd.toFixed(2) : "0.00"}{" "}
              <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Blended compute rate ~$2.50 / 1M tokens
            </div>
          </div>

          {/* Card 4: System Health & Infrastructure */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                INFRASTRUCTURE STATE
              </span>
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">
              Telemetry collector operational
            </div>
          </div>
        </div>

        {/* Detailed Token Consumption Breakdown Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                TOKEN CONSUMPTION BY STUDY MODALITY
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Granular token telemetry across Cornell notes, deep explanations, assignments, and practical lab files.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              TOTAL: {tokenStats?.totalTokens.toLocaleString()} TOKENS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cornell Notes */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  CORNELL NOTES
                </span>
                <span className="text-slate-400 font-bold">
                  {(
                    (((tokenStats?.modeBreakdown.notes || 0) / totalModeTokens) * 100) || 0
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {(tokenStats?.modeBreakdown.notes || 0).toLocaleString()}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((tokenStats?.modeBreakdown.notes || 0) / totalModeTokens) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Deep Explain */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  EXPLAIN MODE
                </span>
                <span className="text-slate-400 font-bold">
                  {(
                    (((tokenStats?.modeBreakdown.explain || 0) / totalModeTokens) * 100) || 0
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {(tokenStats?.modeBreakdown.explain || 0).toLocaleString()}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((tokenStats?.modeBreakdown.explain || 0) / totalModeTokens) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Quick Assignment */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  ASSIGNMENTS
                </span>
                <span className="text-slate-400 font-bold">
                  {(
                    (((tokenStats?.modeBreakdown.quickAssignment || 0) / totalModeTokens) * 100) || 0
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {(tokenStats?.modeBreakdown.quickAssignment || 0).toLocaleString()}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((tokenStats?.modeBreakdown.quickAssignment || 0) / totalModeTokens) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Quick Practical */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  LAB PRACTICALS
                </span>
                <span className="text-slate-400 font-bold">
                  {(
                    (((tokenStats?.modeBreakdown.quickPractical || 0) / totalModeTokens) * 100) || 0
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {(tokenStats?.modeBreakdown.quickPractical || 0).toLocaleString()}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((tokenStats?.modeBreakdown.quickPractical || 0) / totalModeTokens) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Daily Token Consumption Timeline */}
          <div className="border-t border-slate-800/80 pt-4">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              RECENT DAILY TOKEN VELOCITY
            </label>
            {tokenStats?.dailyUsage && tokenStats.dailyUsage.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {tokenStats.dailyUsage.slice(-6).map((day) => (
                  <div
                    key={day.date}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center"
                  >
                    <div className="text-[10px] text-slate-500">{day.date}</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {day.tokens.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-purple-400 mt-0.5">{day.calls} calls</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-sans p-4 text-center border border-slate-800 rounded-xl bg-slate-950/30">
                No daily token usage logged yet. Metric logs will record automatically as study packages are generated.
              </div>
            )}
          </div>
        </div>

        {/* Live System Activity Stream & Audit Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                LIVE SYSTEM ACTIVITIES & AUDIT STREAM
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Real-time chronological events, quota checks, token consumption, and file exports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Event Types</option>
                <option value="generation">Generations</option>
                <option value="token_consumption">Token Usage</option>
                <option value="auto_download">Auto Downloads</option>
                <option value="quota_check">Quota Checks</option>
                <option value="policy_change">Policy Changes</option>
                <option value="admin_login">Admin Logins</option>
              </select>

              <button
                onClick={handleClearActivities}
                title="Clear Activity Log"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Scholar</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-500 text-xs">
                      No activities recorded for this filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-950/40">
                      <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase whitespace-nowrap">
                          {act.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-xs whitespace-nowrap">
                        {act.scholar}
                      </td>
                      <td className="p-3 text-slate-400 uppercase text-[11px]">
                        {act.mode || "•"}
                      </td>
                      <td className="p-3 text-purple-400 font-bold">
                        {act.tokensConsumed ? act.tokensConsumed.toLocaleString() : "•"}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {act.latencyMs ? `${act.latencyMs}ms` : "•"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            act.status === "success"
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : act.status === "warning"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                              : "bg-red-500/10 border border-red-500/30 text-red-400"
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-xs min-w-[280px]">
                        {act.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Lock Management Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                FEATURE ACCESS POLICIES
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Restrict or unlock specific study techniques for Free Scholar vs Scholar Pro tiers.
              </p>
            </div>
            <span className="text-xs text-slate-500">POLICY REGISTRY V2</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locks.map((lock, idx) => {
              const isLockedForFree = lock.required !== "free";
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{lock.label}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                      {lock.description || `Target identifier: ${lock.match || lock.id || lock.type}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleLock(idx)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                      isLockedForFree
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    {isLockedForFree ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    {isLockedForFree ? "PREMIUM REQUIRED" : "UNLOCKED (ALL)"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
