"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-context";

export default function SweatLockLanding() {
  const { user, loaded } = useAuth();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* nav */}
      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <span className="font-bold text-lg tracking-tight">
          <span className="text-[#00ff88]">Sweat</span>Lock
        </span>
        {loaded && (
          user ? (
            <Link href="/sweatlock/dashboard" className="text-sm text-[#00ff88] font-medium">
              Dashboard →
            </Link>
          ) : (
            <Link href="/login?redirect=/sweatlock/dashboard" className="text-sm text-white/70">
              Sign in
            </Link>
          )
        )}
      </nav>

      {/* hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full text-[#00ff88] text-xs font-mono uppercase tracking-widest mb-6">
            💪 Savings with a price
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Lock your money.<br />
            <span className="text-[#00ff88]">Earn</span> it back.
          </h1>
          <p className="text-white/50 text-base max-w-xs mx-auto leading-relaxed">
            Deposit funds. They&apos;re locked. To withdraw, you do pushups — AI counts every rep in real time.
          </p>
        </div>

        {/* how it works */}
        <div className="w-full max-w-sm grid gap-3">
          {[
            { icon: "💵", step: "Deposit", desc: "Add money — it locks instantly" },
            { icon: "📷", step: "Challenge", desc: "Do pushups on camera, AI tracks every rep" },
            { icon: "✅", step: "Withdraw", desc: "$10 = 5 reps, $100 = 50 reps, max 75" },
          ].map(({ icon, step, desc }) => (
            <div key={step} className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl text-left">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold text-sm">{step}</p>
                <p className="text-white/50 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href={user ? "/sweatlock/dashboard" : "/login?redirect=/sweatlock/dashboard"}
          className="w-full max-w-sm py-4 bg-[#00ff88] text-black font-bold rounded-2xl text-base text-center active:scale-95 transition-transform"
        >
          {user ? "Go to Dashboard" : "Get Started"}
        </Link>
      </main>
    </div>
  );
}
