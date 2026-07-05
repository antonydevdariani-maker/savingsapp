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

  const { amount } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  // ensure account exists
  await supabase.from("sweatlock_accounts").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  // create transaction
  const { data: tx, error: txErr } = await supabase
    .from("sweatlock_transactions")
    .insert({ user_id: user.id, type: "deposit", amount, status: "completed" })
    .select()
    .single();

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // update balance (locked = full balance — can't withdraw without challenge)
  const { error: balErr } = await supabase.rpc("sweatlock_add_balance", { p_user_id: user.id, p_amount: amount });

  if (balErr) {
    // fallback: manual update
    const { data: acct } = await supabase.from("sweatlock_accounts").select("balance, locked_balance").eq("user_id", user.id).single();
    const newBalance = (acct?.balance ?? 0) + amount;
    const newLocked = (acct?.locked_balance ?? 0) + amount;
    await supabase.from("sweatlock_accounts").update({ balance: newBalance, locked_balance: newLocked, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  }

  return NextResponse.json({ transaction: tx });
}
