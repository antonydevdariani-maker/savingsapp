import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, repsRequired } from "@/lib/supabase";
import { formatMoney, currencySymbol } from "@/lib/currency";

export default function Withdraw() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [locked, setLocked] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("sweatlock_accounts")
        .select("locked_balance,locked_until")
        .eq("user_id", user.id).single();
      setLocked(data?.locked_balance ?? 0);
      setLockedUntil(data?.locked_until ? new Date(data.locked_until) : null);
    })();
  }, [router]);

  const isLocked = lockedUntil && lockedUntil > new Date();
  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0 && parsed <= locked && !isLocked;
  const reps = valid ? repsRequired(parsed) : 0;

  function daysRemaining() {
    if (!lockedUntil) return 0;
    return Math.ceil((lockedUntil.getTime() - Date.now()) / 86400000);
  }

  function proceed() {
    if (!valid) { setError("Invalid amount or exceeds balance"); return; }
    router.push({ pathname: "/challenge", params: { amount: String(parsed) } });
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.content, { paddingTop: insets.top + 16 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Withdraw</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={s.balanceCard}>
          <Text style={s.balLabel}>Available to unlock</Text>
          <Text style={s.balValue}>{formatMoney(locked)}</Text>
        </View>

        {isLocked ? (
          <View style={s.lockBox}>
            <Text style={s.lockTitle}>Funds Locked</Text>
            <Text style={s.lockSub}>
              Unlocks {lockedUntil!.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </Text>
            <Text style={s.lockDays}>{daysRemaining()} days remaining</Text>
          </View>
        ) : (
          <>
            <Text style={s.label}>Withdraw amount</Text>
            <View style={s.inputWrap}>
              <Text style={s.dollar}>{currencySymbol}</Text>
              <TextInput
                style={s.input}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={amount}
                onChangeText={(v) => { setAmount(v); setError(""); }}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
              />
            </View>

            {valid && (
              <View style={s.challengeBox}>
                <Text style={s.challengeLabel}>Challenge required</Text>
                <Text style={s.challengeReps}>{reps} pushups</Text>
                <Text style={s.challengeSub}>Complete them on camera to unlock {formatMoney(parsed)}</Text>
              </View>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity style={[s.btn, !valid && s.btnDisabled]} onPress={proceed} disabled={!valid} activeOpacity={0.85}>
              <Text style={s.btnText}>Start Challenge</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { flex: 1, padding: 20, paddingBottom: 48, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontWeight: "700", fontSize: 18 },
  balanceCard: { backgroundColor: "#0A1220", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#16233A" },
  balLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  balValue: { color: "#fff", fontWeight: "700", fontSize: 28, marginTop: 2 },
  lockBox: { backgroundColor: "#0A1220", borderRadius: 20, padding: 32, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", alignItems: "center", gap: 8, marginTop: 8 },
  lockTitle: { color: "#f87171", fontWeight: "800", fontSize: 22 },
  lockSub: { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center" },
  lockDays: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  label: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#0A1220", borderWidth: 1, borderColor: "#16233A", borderRadius: 16, paddingHorizontal: 16 },
  dollar: { color: "rgba(255,255,255,0.3)", fontSize: 24, marginRight: 4 },
  input: { flex: 1, color: "#fff", fontSize: 28, fontWeight: "700", paddingVertical: 16 },
  challengeBox: { backgroundColor: "#0A1220", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)" },
  challengeLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  challengeReps: { color: "#3B82F6", fontWeight: "800", fontSize: 28, marginTop: 2 },
  challengeSub: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 },
  error: { color: "#f87171", fontSize: 13 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: "auto" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
