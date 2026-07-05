"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import type { SweatLockAccount, SweatLockTransaction } from "@/lib/sweatlock/types";

export default function Dashboard() {
  const { user, loaded } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<SweatLockAccount | null>(null);
  const [transactions, setTransactions] = useState<SweatLockTransaction[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.replace("/login?redirect=/sweatlock/dashboard"); return; }

    fetch("/api/sweatlock/balance")
      .then((r) => r.json())
      .then(({ account, transactions }) => {
        setAccount(account);
        setTransactions(transactions ?? []);
      })
      .finally(() => setFetching(false));
  }, [user, loaded, router]);

  if (!loaded || fetching) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pb-safe">
      {/* header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <Link href="/sweatlock" className="font-bold text-lg tracking-tight">
          <span className="text-[#00ff88]">Sweat</span>Lock
        </Link>
        <span className="text-white/40 text-xs font-mono">{user?.email?.split("@")[0]}</span>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* balance card */}
        <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
          <p className="text-white/50 text-xs font-mono uppercase tracking-widest mb-1">Locked Balance</p>
          <p className="text-5xl font-bold mb-1">
            ${(account?.locked_balance ?? 0).toFixed(2)}
          </p>
          <p className="text-white/40 text-sm">
            Total: ${(account?.balance ?? 0).toFixed(2)}
          </p>

          <div className="flex gap-3 mt-6">
            <Link
              href="/sweatlock/deposit"
              className="flex-1 py-3 bg-zinc-800 text-white text-center font-semibold rounded-xl text-sm active:scale-95 transition-transform"
            >
              Deposit
            </Link>
            <Link
              href="/sweatlock/withdraw"
              className="flex-1 py-3 bg-[#00ff88] text-black text-center font-bold rounded-xl text-sm active:scale-95 transition-transform"
            >
              Withdraw 💪
            </Link>
          </div>
        </div>

        {/* transactions */}
        <div>
          <p className="text-white/50 text-xs font-mono uppercase tracking-widest mb-3">History</p>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-sm">No transactions yet</div>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-white/40 text-xs font-mono">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono font-semibold text-sm ${
                        tx.type === "deposit" ? "text-[#00ff88]" : "text-red-400"
                      }`}
                    >
                      {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </p>
                    <p className="text-white/30 text-xs capitalize">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
