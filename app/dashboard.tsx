import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";

interface Account { balance: number; locked_balance: number; locked_until?: string | null }
interface Transaction { id: string; type: string; amount: number; status: string; created_at: string }
interface Goal { id: string; name: string; target_amount: number; created_at: string }

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    setEmail(user.email ?? "");

    await supabase.from("sweatlock_accounts").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

    const [{ data: acct }, { data: txs }, { data: goalData }] = await Promise.all([
      supabase.from("sweatlock_accounts").select("balance,locked_balance,locked_until").eq("user_id", user.id).single(),
      supabase.from("sweatlock_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("sweatlock_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setAccount(acct);
    setTransactions(txs ?? []);
    setGoals(goalData ?? []);
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />}
    >
      <View style={s.header}>
        <Text style={s.logo}><Text style={s.green}>Sweat</Text>Lock</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.greeting}>
        {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}, {email.split("@")[0]}
      </Text>

      {/* balance card */}
      <View style={s.card}>
        <Text style={s.label}>Total Saved</Text>
        <Text style={s.balance}>{formatMoney(account?.locked_balance ?? 0)}</Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{transactions.filter((t) => t.type === "deposit").length}</Text>
            <Text style={s.statLabel}>Deposits</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{goals.length}</Text>
            <Text style={s.statLabel}>Goals</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{transactions.filter((t) => t.type === "withdrawal").length}</Text>
            <Text style={s.statLabel}>Unlocks</Text>
          </View>
        </View>

        {account?.locked_until && new Date(account.locked_until) > new Date() && (
          <View style={s.lockBadge}>
            <Text style={s.lockBadgeText}>Locked until {new Date(account.locked_until).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        )}
        <View style={s.actions}>
          <TouchableOpacity style={s.depositBtn} onPress={() => router.push("/deposit")} activeOpacity={0.85}>
            <Text style={s.depositBtnText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.lockBtn} onPress={() => router.push("/set-lock")} activeOpacity={0.85}>
            <Text style={s.lockBtnText}>Lock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.withdrawBtn} onPress={() => router.push("/withdraw")} activeOpacity={0.85}>
            <Text style={s.withdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* goals */}
      <View style={s.sectionRow}>
        <Text style={s.sectionLabel}>Goals</Text>
        <TouchableOpacity onPress={() => router.push("/new-goal")}>
          <Text style={s.addGoal}>+ New</Text>
        </TouchableOpacity>
      </View>
      {goals.length === 0 ? (
        <TouchableOpacity style={s.emptyGoal} onPress={() => router.push("/new-goal")}>
          <Text style={s.emptyGoalText}>Set a savings goal →</Text>
        </TouchableOpacity>
      ) : (
        goals.map((g) => {
          const locked = account?.locked_balance ?? 0;
          const progress = Math.min(locked / g.target_amount, 1);
          return (
            <View key={g.id} style={s.goalCard}>
              <View style={s.goalRow}>
                <Text style={s.goalName}>{g.name}</Text>
                <Text style={s.goalAmt}>{formatMoney(locked, { decimals: false })} / {formatMoney(g.target_amount, { decimals: false })}</Text>
              </View>
              <View style={s.goalTrack}>
                <View style={[s.goalFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={s.goalPct}>{Math.round(progress * 100)}% saved</Text>
            </View>
          );
        })
      )}

      {/* transactions */}
      <Text style={[s.sectionLabel, { marginTop: 24 }]}>History</Text>
      {transactions.length === 0 ? (
        <Text style={s.empty}>No transactions yet</Text>
      ) : (
        transactions.map((tx) => (
          <View key={tx.id} style={s.tx}>
            <View>
              <Text style={s.txType}>{tx.type}</Text>
              <Text style={s.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.txAmount, { color: tx.type === "deposit" ? "#00ff88" : "#f87171" }]}>
                {tx.type === "deposit" ? "+" : "-"}{formatMoney(tx.amount)}
              </Text>
              <Text style={s.txStatus}>{tx.status}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  logo: { fontSize: 20, fontWeight: "700", color: "#fff" },
  green: { color: "#00ff88" },
  signOut: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  greeting: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24, textTransform: "capitalize" },
  card: { backgroundColor: "#111", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(0,255,136,0.15)", marginBottom: 32 },
  label: { color: "#00ff88", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  balance: { fontSize: 44, fontWeight: "800", color: "#fff", marginBottom: 16 },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, paddingVertical: 12, marginBottom: 16 },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  statValue: { color: "#fff", fontWeight: "800", fontSize: 18 },
  statLabel: { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 },
  lockBadge: { backgroundColor: "rgba(248,113,113,0.1)", borderRadius: 8, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  lockBadgeText: { color: "#f87171", fontSize: 12, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8 },
  depositBtn: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  depositBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  lockBtn: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  lockBtnText: { color: "#f87171", fontWeight: "600", fontSize: 13 },
  withdrawBtn: { flex: 1, backgroundColor: "#00ff88", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  withdrawBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },
  sectionLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addGoal: { color: "#00ff88", fontSize: 13, fontWeight: "600" },
  emptyGoal: { backgroundColor: "#111", borderRadius: 14, padding: 20, borderWidth: 1, borderColor: "#222", alignItems: "center", marginBottom: 8 },
  emptyGoalText: { color: "rgba(255,255,255,0.3)", fontSize: 14 },
  goalCard: { backgroundColor: "#111", borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#222" },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  goalName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  goalAmt: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  goalTrack: { height: 6, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  goalFill: { height: 6, backgroundColor: "#00ff88", borderRadius: 3 },
  goalPct: { color: "rgba(255,255,255,0.3)", fontSize: 11 },
  empty: { color: "rgba(255,255,255,0.2)", textAlign: "center", paddingVertical: 40, fontSize: 14 },
  tx: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  txType: { color: "#fff", fontWeight: "600", fontSize: 14, textTransform: "capitalize" },
  txDate: { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 },
  txAmount: { fontWeight: "700", fontSize: 14 },
  txStatus: { color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
});
