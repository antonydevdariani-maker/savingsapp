import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, repsRequired } from "@/lib/supabase";
import { formatMoney, currencySymbol } from "@/lib/currency";

const PRESETS = [10, 25, 50, 100, 250];

export default function Deposit() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0;

  async function submit() {
    if (!valid) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      await supabase.from("sweatlock_accounts").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

      const { error: txErr } = await supabase.from("sweatlock_transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: parsed,
        status: "completed",
      });
      if (txErr) throw txErr;

      const { data: acct } = await supabase.from("sweatlock_accounts").select("balance,locked_balance").eq("user_id", user.id).single();
      await supabase.from("sweatlock_accounts").update({
        balance: (acct?.balance ?? 0) + parsed,
        locked_balance: (acct?.locked_balance ?? 0) + parsed,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      router.replace("/dashboard");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#000000" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Deposit</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={s.label}>Amount ({currencySymbol})</Text>
        <View style={s.inputWrap}>
          <Text style={s.dollar}>{currencySymbol}</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            keyboardAppearance="dark"
          />
        </View>

        <View style={s.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.preset, parsed === p && s.presetActive]}
              onPress={() => setAmount(String(p))}
              activeOpacity={0.8}
            >
              <Text style={[s.presetText, parsed === p && s.presetTextActive]}>{formatMoney(p, { decimals: false })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {valid && (
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Reps to unlock</Text>
            <Text style={s.infoValue}>{repsRequired(parsed)} pushups</Text>
          </View>
        )}

        <View style={s.notice}>
          <Text style={s.noticeText}>Mock deposit — no real money moves. Unit.co coming soon.</Text>
        </View>

        <TouchableOpacity style={[s.btn, !valid && s.btnDisabled]} onPress={submit} disabled={!valid || loading} activeOpacity={0.85}>
          <Text style={s.btnText}>{loading ? "Depositing..." : `Deposit ${formatMoney(valid ? parsed : 0)}`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontWeight: "700", fontSize: 18 },
  label: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#0A1220", borderWidth: 1, borderColor: "#16233A", borderRadius: 16, paddingHorizontal: 16, marginBottom: 16 },
  dollar: { color: "rgba(255,255,255,0.3)", fontSize: 24, marginRight: 4 },
  input: { flex: 1, color: "#fff", fontSize: 28, fontWeight: "700", paddingVertical: 16 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  preset: { backgroundColor: "#0A1220", borderWidth: 1, borderColor: "#16233A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  presetActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  presetText: { color: "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: 14 },
  presetTextActive: { color: "#FFFFFF" },
  infoBox: { backgroundColor: "#0A1220", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.2)", marginBottom: 16 },
  infoLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  infoValue: { color: "#3B82F6", fontWeight: "700", fontSize: 22, marginTop: 2 },
  notice: { backgroundColor: "rgba(234,179,8,0.1)", borderWidth: 1, borderColor: "rgba(234,179,8,0.2)", borderRadius: 12, padding: 12, marginBottom: 24 },
  noticeText: { color: "#eab308", fontSize: 12 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
