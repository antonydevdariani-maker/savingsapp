import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase, repsRequired } from "@/lib/supabase";

export default function Challenge() {
  const router = useRouter();
  const { amount: amountParam } = useLocalSearchParams<{ amount: string }>();
  const amount = parseFloat(amountParam ?? "0");
  const target = repsRequired(amount);

  const [permission, requestPermission] = useCameraPermissions();
  const [started, setStarted] = useState(false);
  const [reps, setReps] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const repsRef = useRef(0);
  const startTimeRef = useRef(0);

  function start() {
    if (!permission?.granted) requestPermission();
    repsRef.current = 0;
    startTimeRef.current = Date.now();
    setReps(0);
    setStarted(true);
  }

  function countRep() {
    repsRef.current += 1;
    setReps(repsRef.current);
    if (repsRef.current >= target) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      handleComplete(repsRef.current, duration);
    }
  }

  async function handleComplete(completedReps: number, duration: number) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: acct } = await supabase
        .from("sweatlock_accounts")
        .select("balance,locked_balance")
        .eq("user_id", user.id)
        .single();

      if (!acct || acct.locked_balance < amount) {
        Alert.alert("Error", "Insufficient balance");
        router.back();
        return;
      }

      const { data: tx } = await supabase
        .from("sweatlock_transactions")
        .insert({ user_id: user.id, type: "withdrawal", amount, status: "completed" })
        .select()
        .single();

      await supabase.from("sweatlock_challenge_logs").insert({
        user_id: user.id,
        transaction_id: tx?.id ?? null,
        reps_required: target,
        reps_completed: completedReps,
        passed: true,
        duration_seconds: duration,
      });

      await supabase.from("sweatlock_accounts").update({
        balance: acct.balance - amount,
        locked_balance: acct.locked_balance - amount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      router.replace("/success");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Withdrawal failed");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.label}>Processing withdrawal...</Text>
      </View>
    );
  }

  const progress = Math.min(reps / target, 1);

  return (
    <View style={s.root}>
      {permission?.granted && (
        <CameraView style={StyleSheet.absoluteFill} facing="front" />
      )}

      <View style={s.overlay}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.close}>✕</Text>
          </TouchableOpacity>
          <Text style={s.topLabel}>Unlocking ${amount.toFixed(2)}</Text>
          <View style={{ width: 32 }} />
        </View>

        {!started ? (
          <View style={s.center}>
            <View style={s.card}>
              <Text style={s.cardTitle}>CHALLENGE</Text>
              <Text style={s.bigNum}>{target}</Text>
              <Text style={s.cardSub}>pushups to unlock ${amount.toFixed(2)}</Text>
              <View style={s.instructionBox}>
                <Text style={s.instructionText}>📱 Prop phone up facing you</Text>
                <Text style={s.instructionText}>Tap the button after each pushup</Text>
              </View>
              <TouchableOpacity style={s.startBtn} onPress={start}>
                <Text style={s.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.bottom}>
            <View style={s.repRow}>
              <Text style={s.repCount}>{reps}</Text>
              <Text style={s.repTarget}>/ {target}</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${progress * 100}%` as any }]} />
            </View>
            <TouchableOpacity style={s.repBtn} onPress={countRep} activeOpacity={0.7}>
              <Text style={s.repBtnText}>✓ Rep Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 56 },
  close: { color: "#fff", fontSize: 20 },
  topLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  card: { backgroundColor: "rgba(0,0,0,0.8)", borderWidth: 1, borderColor: "rgba(0,255,136,0.3)", borderRadius: 24, padding: 28, alignItems: "center", width: 300 },
  cardTitle: { color: "#00ff88", fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  bigNum: { color: "#fff", fontSize: 64, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 16, textAlign: "center" },
  instructionBox: { backgroundColor: "rgba(0,255,136,0.08)", borderRadius: 12, padding: 12, marginBottom: 20, width: "100%", gap: 4 },
  instructionText: { color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center" },
  startBtn: { backgroundColor: "#00ff88", borderRadius: 14, paddingVertical: 16, width: "100%", alignItems: "center" },
  startBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.85)", borderTopWidth: 1, borderTopColor: "#1a1a1a", padding: 20, paddingBottom: 48 },
  repRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  repCount: { color: "#fff", fontSize: 56, fontWeight: "800", lineHeight: 60 },
  repTarget: { color: "rgba(255,255,255,0.3)", fontSize: 20 },
  track: { height: 8, backgroundColor: "#1a1a1a", borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  fill: { height: 8, backgroundColor: "#00ff88", borderRadius: 4 },
  repBtn: { backgroundColor: "#00ff88", borderRadius: 16, paddingVertical: 20, alignItems: "center", marginTop: 8 },
  repBtnText: { color: "#000", fontWeight: "800", fontSize: 18 },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 16 },
});
