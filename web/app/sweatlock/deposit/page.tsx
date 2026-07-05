"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

const PRESETS = [10, 25, 50, 100, 250];

export default function Deposit() {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0;

  async function submit() {
    if (!valid || !user) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sweatlock/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/sweatlock/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Deposit failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-zinc-900">
        <Link href="/sweatlock/dashboard" className="text-white/50 text-sm">← Back</Link>
        <span className="font-bold">Deposit</span>
      </header>

      <main className="flex-1 flex flex-col px-4 py-8 max-w-md mx-auto w-full gap-6">
        <div>
          <p className="text-white/50 text-xs font-mono uppercase tracking-widest mb-4">Amount (USD)</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-2xl">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-10 py-4 text-2xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-[#00ff88] transition-colors"
            />
          </div>
        </div>

        {/* presets */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                parsed === p
                  ? "bg-[#00ff88] text-black border-[#00ff88]"
                  : "bg-zinc-900 text-white/60 border-zinc-700 active:bg-zinc-800"
              }`}
            >
              ${p}
            </button>
          ))}
        </div>

        {valid && (
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <p className="text-white/50 text-xs font-mono">Reps to unlock</p>
            <p className="text-[#00ff88] font-bold text-xl">
              {Math.min(Math.ceil(parsed * 0.5), 75)} pushups
            </p>
          </div>
        )}

        {/* mock notice */}
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-xs">Mock deposit — no real money moves. Unit.co integration coming soon.</p>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={submit}
          disabled={!valid || loading}
          className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all mt-auto"
        >
          {loading ? "Depositing..." : `Deposit $${valid ? parsed.toFixed(2) : "0.00"}`}
        </button>
      </main>
    </div>
  );
}
