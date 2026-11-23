"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, PlanType, PlanLimits, FeatureLock } from "./types";
import {
  INITIAL_USER,
  getStoredUser,
  saveStoredUser,
  clearStoredAuth,
  PLAN_QUOTAS,
  FEATURE_LOCKS,
  getStoredAdminAuth,
  setStoredAdminAuth,
  validateAdminCredentials,
  recordActivity,
} from "./storage";
import { syncUserPlanWithBackend } from "./api";

interface AuthContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isAdmin: boolean;
  quotas: PlanLimits;
  activeLocks: FeatureLock[];
  subscriptionModalOpen: boolean;
  highlightedTier?: PlanType;
  openSubscriptionModal: (tier?: PlanType) => void;
  closeSubscriptionModal: () => void;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string) => Promise<boolean>;
  adminLogin: (credential: string, pass: string) => Promise<boolean>;
  adminLogout: () => void;
  logout: () => void;
  switchPlan: (plan: PlanType) => void;
  checkFeatureAllowed: (featureName: string) => boolean;
  canPerformGeneration: (mode: "notes" | "explain" | "quick") => { allowed: boolean; reason?: string };
  consumeQuota: (mode: "notes" | "explain" | "quick") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [highlightedTier, setHighlightedTier] = useState<PlanType | undefined>();

  useEffect(() => {
    const stored = getStoredUser();
    if (stored && stored.id) {
      if (stored.id === "usr-default") {
        stored.id = "usr-guest";
        saveStoredUser(stored);
      }
      setUser(stored);
    }
    const adminSession = getStoredAdminAuth();
    if (adminSession) {
      setIsAdmin(true);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveStoredUser(user);
    }
  }, [user, isLoaded]);

  const quotas = PLAN_QUOTAS[user.plan] || PLAN_QUOTAS.free;

  const openSubscriptionModal = (tier?: PlanType) => {
    setHighlightedTier(tier);
    setSubscriptionModalOpen(true);
  };

  const closeSubscriptionModal = () => {
    setSubscriptionModalOpen(false);
    setHighlightedTier(undefined);
  };

  const adminLogin = async (credential: string, pass: string): Promise<boolean> => {
    const isValid = validateAdminCredentials(credential, pass);
    if (isValid) {
      setIsAdmin(true);
      setStoredAdminAuth(true);
      setUser((prev) => ({
        ...prev,
        role: "admin",
      }));
      recordActivity({
        eventType: "admin_login",
        scholar: credential.trim(),
        status: "success",
        description: `Administrator session authenticated for ${credential.trim()}.`,
      });
      return true;
    }
    recordActivity({
      eventType: "admin_login",
      scholar: credential.trim(),
      status: "warning",
      description: `Failed administrator authentication attempt for ${credential.trim()}.`,
    });
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    setStoredAdminAuth(false);
    setUser((prev) => ({
      ...prev,
      role: "user",
    }));
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    // Check if logging in with administrator credentials directly
    if (validateAdminCredentials(email, pass)) {
      await adminLogin(email, pass);
      return true;
    }

    try {
      const res = await fetch("http://localhost:5050/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated: UserProfile = {
          id: data.user?.id || "user-api",
          name: data.user?.name || email.split("@")[0],
          email: data.user?.email || email,
          plan: (data.user?.plan as PlanType) || "free",
          avatar: email[0].toUpperCase(),
          token: data.token,
          usage: data.user?.usage || {
            notes: 0,
            explain: 0,
            quick: 0,
            resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        };
        setUser(updated);
        saveStoredUser(updated);
        return true;
      }
    } catch (e) {
      // Offline fallback
    }

    const fallback: UserProfile = {
      id: `usr-${Date.now()}`,
      name: email.split("@")[0],
      email: email,
      plan: "free",
      avatar: email[0].toUpperCase(),
      usage: {
        notes: 0,
        explain: 0,
        quick: 0,
        resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
    setUser(fallback);
    saveStoredUser(fallback);
    return true;
  };

  const signup = async (name: string, email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch("http://localhost:5050/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated: UserProfile = {
          id: data.user?.id || `usr-${Date.now()}`,
          name: data.user?.name || name || email.split("@")[0],
          email: data.user?.email || email,
          plan: (data.user?.plan as PlanType) || "free",
          avatar: (name || email)[0].toUpperCase(),
          token: data.token,
          role: "user",
          usage: data.user?.usage || {
            notes: 0,
            explain: 0,
            quick: 0,
            resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        };
        setUser(updated);
        saveStoredUser(updated);
        return true;
      }
    } catch (e) {
      // Offline fallback
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: name || email.split("@")[0],
      email: email,
      plan: "free",
      role: "user",
      avatar: (name || email)[0].toUpperCase(),
      usage: {
        notes: 0,
        explain: 0,
        quick: 0,
        resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
    setUser(newUser);
    saveStoredUser(newUser);
    return true;
  };

  const logout = () => {
    clearStoredAuth();
    setUser(INITIAL_USER);
  };

  const switchPlan = (newPlan: PlanType) => {
    setUser((prev) => ({
      ...prev,
      plan: newPlan,
    }));
    syncUserPlanWithBackend(newPlan, user.token);
  };

  const checkFeatureAllowed = (featureName: string): boolean => {
    if (user.plan === "diamond") return true;

    const lock = FEATURE_LOCKS.find(
      (l) =>
        (l.id && l.id.toLowerCase() === featureName.toLowerCase()) ||
        (l.match && l.match.toLowerCase() === featureName.toLowerCase()) ||
        l.label.toLowerCase() === featureName.toLowerCase()
    );

    if (!lock) return true;

    if (user.plan === "free" && (lock.required === "free-premium" || lock.required === "diamond")) {
      return false;
    }
    return true;
  };

  const canPerformGeneration = (
    mode: "notes" | "explain" | "quick"
  ): { allowed: boolean; reason?: string } => {
    if (user.plan === "diamond") return { allowed: true };

    const limit = quotas[mode];
    const used = user.usage[mode] || 0;

    if (used >= limit) {
      return {
        allowed: false,
        reason: `Weekly generation quota reached for ${mode} (${limit}/${limit}). Upgrade to Premium or Diamond for higher or unlimited limits.`,
      };
    }
    return { allowed: true };
  };

  const consumeQuota = (mode: "notes" | "explain" | "quick") => {
    if (user.plan === "diamond") return;
    setUser((prev) => ({
      ...prev,
      usage: {
        ...prev.usage,
        [mode]: (prev.usage[mode] || 0) + 1,
      },
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user.id !== "usr-guest",
        isAdmin,
        quotas,
        activeLocks: FEATURE_LOCKS,
        subscriptionModalOpen,
        highlightedTier,
        openSubscriptionModal,
        closeSubscriptionModal,
        login,
        signup,
        adminLogin,
        adminLogout,
        logout,
        switchPlan,
        checkFeatureAllowed,
        canPerformGeneration,
        consumeQuota,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
