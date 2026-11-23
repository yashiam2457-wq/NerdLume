"use client";

import { useAuth } from "@/lib/auth-context";
import { SubscriptionModal } from "./subscription-modal";

export function FeatureLockModal() {
  const { subscriptionModalOpen, closeSubscriptionModal, highlightedTier } = useAuth();

  return (
    <SubscriptionModal
      isOpen={subscriptionModalOpen}
      onClose={closeSubscriptionModal}
      highlightedTier={highlightedTier}
    />
  );
}
