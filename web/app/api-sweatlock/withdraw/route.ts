import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, reps_completed, duration_seconds } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const { data: acct } = await supabase.from("sweatlock_accounts").select("balance, locked_balance").eq("user_id", user.id).single();
  if (!acct || acct.locked_balance < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const repsRequired = Math.min(Math.ceil(amount * 0.5), 75);
  if (reps_completed < repsRequired) {
    return NextResponse.json({ error: "Challenge not passed" }, { status: 400 });
  }

  // create pending withdrawal tx
  const { data: tx } = await supabase
    .from("sweatlock_transactions")
    .insert({ user_id: user.id, type: "withdrawal", amount, status: "completed" })
    .select()
    .single();

  // log challenge
  await supabase.from("sweatlock_challenge_logs").insert({
    user_id: user.id,
    transaction_id: tx?.id ?? null,
    reps_required: repsRequired,
    reps_completed,
    passed: true,
    duration_seconds: duration_seconds ?? null,
  });

  // deduct from balance
  const newBalance = acct.balance - amount;
  const newLocked = acct.locked_balance - amount;
  await supabase.from("sweatlock_accounts").update({ balance: newBalance, locked_balance: newLocked, updated_at: new Date().toISOString() }).eq("user_id", user.id);

  return NextResponse.json({ transaction: tx, message: "Withdrawal approved" });
}
