"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import ChallengeScreen from "@/components/sweatlock/challenge-screen";

function ChallengeContent() {
  const { user, loaded } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<"challenge" | "submitting" | "success" | "failed">("challenge");
  const [error, setError] = useState("");

  const amount = parseFloat(params.get("amount") ?? "0");

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.replace("/login?redirect=/sweatlock/withdraw"); return; }
    if (!amount || amount <= 0) { router.replace("/sweatlock/withdraw"); return; }
  }, [user, loaded, router, amount]);

  async function handleComplete(reps: number, duration: number) {
    setPhase("submitting");
    try {
      const res = await fetch("/api/sweatlock/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reps_completed: reps, duration_seconds: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhase("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Withdrawal failed");
      setPhase("failed");
    }
  }

  if (!amount) return null;

  if (phase === "submitting") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-mono">Processing withdrawal...</p>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-6 text-center">
        <p className="text-6xl">🎉</p>
        <div>
          <p className="text-[#00ff88] text-3xl font-bold">${amount.toFixed(2)}</p>
          <p className="text-white/70 text-base mt-1">Withdrawal approved</p>
          <p className="text-white/30 text-sm mt-1">You earned it.</p>
        </div>
        <button
          onClick={() => router.push("/sweatlock/dashboard")}
          className="px-8 py-4 bg-[#00ff88] text-black font-bold rounded-2xl text-base active:scale-95 transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-6 text-center">
        <p className="text-5xl">😤</p>
        <div>
          <p className="text-red-400 text-xl font-bold">Withdrawal failed</p>
          <p className="text-white/40 text-sm mt-2">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPhase("challenge")}
            className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm active:scale-95 transition-transform"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/sweatlock/dashboard")}
            className="px-6 py-3 border border-zinc-700 text-white/70 rounded-xl text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 shrink-0">
        <button
          onClick={() => router.push("/sweatlock/withdraw")}
          className="text-white/40 text-sm"
        >
          ✕
        </button>
        <span className="text-white/70 text-sm font-mono">
          Unlocking ${amount.toFixed(2)}
        </span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-hidden">
        <ChallengeScreen
          amount={amount}
          onComplete={handleComplete}
          onFail={() => router.push("/sweatlock/withdraw")}
        />
      </div>
    </div>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChallengeContent />
    </Suspense>
  );
}
