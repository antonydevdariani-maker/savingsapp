"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import type { SweatLockAccount } from "@/lib/sweatlock/types";

export default function Withdraw() {
  const { user, loaded } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<SweatLockAccount | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.replace("/login?redirect=/sweatlock/withdraw"); return; }
    fetch("/api/sweatlock/balance")
      .then((r) => r.json())
      .then(({ account }) => setAccount(account));
  }, [user, loaded, router]);

  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0 && account && parsed <= account.locked_balance;
  const repsNeeded = valid ? Math.min(Math.ceil(parsed * 0.5), 75) : 0;

  function proceed() {
    if (!valid) { setError("Invalid amount or insufficient balance"); return; }
    router.push(`/sweatlock/challenge?amount=${parsed}`);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-zinc-900">
        <Link href="/sweatlock/dashboard" className="text-white/50 text-sm">← Back</Link>
        <span className="font-bold">Withdraw</span>
      </header>

      <main className="flex-1 flex flex-col px-4 py-8 max-w-md mx-auto w-full gap-6">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <p className="text-white/50 text-xs font-mono">Available to unlock</p>
          <p className="text-2xl font-bold">${(account?.locked_balance ?? 0).toFixed(2)}</p>
        </div>

        <div>
          <p className="text-white/50 text-xs font-mono uppercase tracking-widest mb-4">Withdraw amount</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-2xl">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-10 py-4 text-2xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-[#00ff88] transition-colors"
            />
          </div>
        </div>

        {valid && (
          <div className="bg-zinc-900 rounded-2xl p-4 border border-[#00ff88]/30">
            <p className="text-white/50 text-xs font-mono mb-1">Challenge required</p>
            <p className="text-[#00ff88] font-bold text-2xl">{repsNeeded} pushups</p>
            <p className="text-white/30 text-xs mt-1">Complete them on camera to unlock ${parsed.toFixed(2)}</p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={proceed}
          disabled={!valid}
          className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all mt-auto"
        >
          Start Challenge 💪
        </button>
      </main>
    </div>
  );
}
