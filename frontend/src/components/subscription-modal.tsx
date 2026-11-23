"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PlanType } from "@/lib/types";
import { createPaymentOrder, verifyPayment, syncUserPlanWithBackend } from "@/lib/api";
import { X, Check, Zap, Crown, Shield, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ShimmerButton } from "./magicui/shimmer-button";
import { SpotlightCard } from "./react-bits/spotlight";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedTier?: PlanType;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  highlightedTier,
}: SubscriptionModalProps) {
  const { user, switchPlan } = useAuth();
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [loadingTier, setLoadingTier] = useState<PlanType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectTier = async (plan: PlanType) => {
    setErrorMessage(null);

    // Free tier: direct switch
    if (plan === "free") {
      setLoadingTier(plan);
      try {
        switchPlan("free");
        await syncUserPlanWithBackend("free", user.token);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to switch to Free tier.");
      } finally {
        setLoadingTier(null);
      }
      return;
    }

    // Paid tiers: initiate Razorpay Checkout
    setLoadingTier(plan);
    try {
      const order = await createPaymentOrder(plan, cadence, user.token);

      // Handle mock / sandbox development mode
      if (order.orderId.startsWith("order_mock_")) {
        const mockPayId = `pay_mock_${Date.now()}`;
        const mockSig = "mock_signature_bypass";
        const verifyRes = await verifyPayment(
          {
            razorpay_order_id: order.orderId,
            razorpay_payment_id: mockPayId,
            razorpay_signature: mockSig,
            plan,
            cadence,
          },
          user.token
        );
        if (verifyRes.ok) {
          switchPlan(plan);
          onClose();
          return;
        }
      }

      // Load official Razorpay Standard Checkout SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your network connection.");
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NerdLume",
        description: `${order.planName} • ${cadence.toUpperCase()}`,
        order_id: order.orderId,
        prefill: {
          name: user.name || "Scholar",
          email: user.email || "scholar@nerdlume.in",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async function (response: any) {
          try {
            setLoadingTier(plan);
            const verifyRes = await verifyPayment(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                cadence,
              },
              user.token
            );
            if (verifyRes.ok) {
              switchPlan(plan);
              onClose();
            } else {
              setErrorMessage(verifyRes.error || "Payment verification failed.");
            }
          } catch (vErr: any) {
            setErrorMessage(vErr.message || "Payment verification error occurred.");
          } finally {
            setLoadingTier(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingTier(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        setErrorMessage(resp.error?.description || "Payment failed or was declined by the issuer.");
        setLoadingTier(null);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate payment checkout.");
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      id: "free" as PlanType,
      name: "FREE SCHOLAR",
      badge: "FREE FOREVER",
      price: "₹0",
      cadence: "Forever Free",
      annual: "",
      description: "For students discovering NerdLume. Experience the actual product before purchasing.",
      limits: "5 Notes • 5 Quick • 2 Explain per week",
      features: [
        "5 Notes generations / week",
        "5 Quick generations / week",
        "2 Explain sessions / week",
        "Standard Cornell and Outline notes",
        "Basic quizzes and MCQs",
        "3 file uploads per generation",
        "Markdown, TXT and PDF exports",
        "Basic flashcard generation",
        "30-day generation history",
        "Standard processing priority",
      ],
      popular: false,
    },
    {
      id: "free-premium" as PlanType,
      name: "SCHOLAR PRO",
      badge: "RECOMMENDED • MOST POPULAR",
      price: cadence === "annual" ? "₹1,199" : "₹149",
      cadence: cadence === "annual" ? "/ year (~₹100/mo)" : "/ month",
      annual: cadence === "annual" ? "Billed annually • Save 33%" : "Annual option: ₹1,199 (~₹100/mo)",
      description: "For everyday university and engineering students. The default purchase for academic success.",
      limits: "30 Notes • 30 Explain • 60 Quick per month",
      features: [
        "30 Notes generations / month",
        "30 Explain sessions / month",
        "60 Quick generations / month",
        "Feynman and SQ3R methodologies",
        "Full examination simulator (timed mock exams)",
        "Advanced flashcards & Leitner tracking",
        "Question Prediction Engine (limited)",
        "10 file uploads per generation",
        "Advanced diagrams and flowcharts",
        "PDF, DOCX and Markdown exports",
        "Automatic cloud history and recovery",
        "Faster processing priority",
        "90-day generation history",
        "10% unused monthly credit rollover",
      ],
      popular: true,
    },
    {
      id: "diamond" as PlanType,
      name: "DIAMOND RESEARCHER",
      badge: "POWER USER",
      price: cadence === "annual" ? "₹2,799" : "₹349",
      cadence: cadence === "annual" ? "/ year (~₹233/mo)" : "/ month",
      annual: cadence === "annual" ? "Billed annually • Save 33%" : "Annual option: ₹2,799 (~₹233/mo)",
      description: "For toppers, competitive exam aspirants and researchers. Uncapped compute power.",
      limits: "4× Scholar Pro compute allowance • Advanced Reasoning",
      features: [
        "4× Scholar Pro monthly compute allowance",
        "Access to advanced reasoning models",
        "Advanced multi-document synthesis",
        "Unlimited document storage within policy",
        "Large batch generation",
        "Full Question Prediction Engine",
        "Advanced mathematical derivations",
        "Research-grade technical explanations",
        "Priority GPU/CPU-backed processing",
        "Export automation and batch downloads",
        "Extended generation history",
        "Priority support & Diamond Researcher badge",
      ],
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Close Dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            SUBSCRIPTION PLANS • SECURE RAZORPAY CHECKOUT
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
            UPGRADE YOUR SCHOLAR TIER
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl mx-auto">
            Unlock advanced learning frameworks, expanded generation quotas, and specialized examination engines.
          </p>

          {/* Billing Cadence Toggle */}
          <div className="flex items-center justify-center gap-2 pt-3">
            <button
              onClick={() => setCadence("monthly")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cadence === "monthly"
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              MONTHLY BILLING
            </button>
            <button
              onClick={() => setCadence("annual")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                cadence === "annual"
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>ANNUAL BILLING</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px]">
                SAVE 33%
              </span>
            </button>
          </div>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((t) => {
            const isCurrent = user.plan === t.id;
            const isHighlighted = highlightedTier === t.id || (!highlightedTier && t.popular);
            const isLoading = loadingTier === t.id;

            return (
              <SpotlightCard
                key={t.id}
                spotlightColor={
                  t.popular ? "rgba(59, 130, 246, 0.25)" : "rgba(168, 85, 247, 0.18)"
                }
                className={`flex flex-col justify-between rounded-2xl p-6 transition-all ${
                  isHighlighted
                    ? "border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-slate-900/90"
                    : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-white">{t.name}</h3>
                    {t.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          t.popular
                            ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                            : t.id === "diamond"
                            ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                            : "bg-slate-800 border border-slate-700 text-slate-400"
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 my-1.5">
                    <span className="text-3xl font-extrabold text-white">{t.price}</span>
                    <span className="text-xs text-slate-400 font-sans">{t.cadence}</span>
                  </div>

                  {t.annual && (
                    <div className="text-[11px] text-blue-400 font-semibold mb-2 font-sans">
                      {t.annual}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">
                    {t.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-blue-300 font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{t.limits}</span>
                  </div>

                  <div className="space-y-2 text-xs font-sans text-slate-300 border-t border-slate-800 pt-4 mb-6">
                    {t.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300 leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700 cursor-default"
                    >
                      CURRENT ACTIVE PLAN
                    </button>
                  ) : (
                    <button
                      disabled={isLoading}
                      onClick={() => handleSelectTier(t.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        t.popular
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>INITIALIZING...</span>
                        </>
                      ) : (
                        <span>{t.id === "free" ? "SWITCH TO FREE" : `ACTIVATE ${t.name}`}</span>
                      )}
                    </button>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>

        {/* Security & Access footer */}
        <div className="text-center pt-6 text-[11px] text-slate-500 border-t border-slate-800 mt-6">
          INSTANT ACTIVATION • ENCRYPTED TELEMETRY • DOWNGRADE OR CANCEL ANYTIME
        </div>
      </div>
    </div>
  );
}
