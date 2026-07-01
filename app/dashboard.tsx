import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

interface Account { balance: number; locked_balance: number }
interface Transaction { id: string; type: string; amount: number; status: string; created_at: string }

export default function Dashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    setEmail(user.email ?? "");

    await supabase.from("sweatlock_accounts").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

    const [{ data: acct }, { data: txs }] = await Promise.all([
      supabase.from("sweatlock_accounts").select("balance,locked_balance").eq("user_id", user.id).single(),
      supabase.from("sweatlock_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    setAccount(acct);
    setTransactions(txs ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

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
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />}
    >
      <View style={s.header}>
        <Text style={s.logo}><Text style={s.green}>Sweat</Text>Lock</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.emailText}>{email.split("@")[0]}</Text>

      {/* balance card */}
      <View style={s.card}>
        <Text style={s.label}>Locked Balance</Text>
        <Text style={s.balance}>${(account?.locked_balance ?? 0).toFixed(2)}</Text>
        <Text style={s.total}>Total: ${(account?.balance ?? 0).toFixed(2)}</Text>

        <View style={s.actions}>
          <TouchableOpacity style={s.depositBtn} onPress={() => router.push("/deposit")} activeOpacity={0.85}>
            <Text style={s.depositBtnText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.withdrawBtn} onPress={() => router.push("/withdraw")} activeOpacity={0.85}>
            <Text style={s.withdrawBtnText}>Withdraw 💪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* transactions */}
      <Text style={s.sectionLabel}>History</Text>
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
                {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
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
  emailText: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 24 },
  card: { backgroundColor: "#111", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#222", marginBottom: 32 },
  label: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  balance: { fontSize: 48, fontWeight: "800", color: "#fff" },
  total: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 2, marginBottom: 20 },
  actions: { flexDirection: "row", gap: 12 },
  depositBtn: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  depositBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  withdrawBtn: { flex: 1, backgroundColor: "#00ff88", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  withdrawBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  sectionLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  empty: { color: "rgba(255,255,255,0.2)", textAlign: "center", paddingVertical: 40, fontSize: 14 },
  tx: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  txType: { color: "#fff", fontWeight: "600", fontSize: 14, textTransform: "capitalize" },
  txDate: { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 },
  txAmount: { fontWeight: "700", fontSize: 14 },
  txStatus: { color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
});
