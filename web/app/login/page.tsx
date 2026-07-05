"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const { session, loaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("redirect") || "/sweatlock/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (loaded && session) {
      router.replace(next);
    }
  }, [loaded, session, router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess("Account created! Signing you in…");
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
        }
      }
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/40 text-xs uppercase tracking-widest">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 border border-zinc-800 bg-zinc-950 rounded-3xl p-8">
        <div className="space-y-2 text-center">
          <span className="font-bold text-lg tracking-tight">
            <span className="text-[#00ff88]">Sweat</span>Lock
          </span>
          <h1 className="text-2xl font-bold text-white">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-zinc-700 bg-zinc-900 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00ff88] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full border border-zinc-700 bg-zinc-900 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00ff88] focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-[#00ff88] font-semibold border border-[#00ff88]/30 bg-[#00ff88]/10 rounded-xl px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center h-12 bg-[#00ff88] text-black text-sm font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-40"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
        >
          {mode === "login" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white/40 text-xs uppercase tracking-widest">
        Loading…
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
