"use client";

import "./globals.css";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SubscriptionModal } from "@/components/subscription-modal";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { subscriptionModalOpen, closeSubscriptionModal, highlightedTier } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={closeSubscriptionModal}
        highlightedTier={highlightedTier}
      />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>NerdLume — AI-Powered Smart Study & Learning Platform</title>
        <meta
          name="description"
          content="Transform complex syllabi, documents, and technical papers into structured Cornell notes, interactive quizzes, flashcards, and assignments with NerdLume."
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 antialiased selection:bg-blue-500/30 selection:text-blue-200">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
