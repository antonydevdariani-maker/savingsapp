import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

const PRESETS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
];

export default function SetLock() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function unlockDate(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  async function confirm() {
    if (selected === null) { Alert.alert("Pick a lock period"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error } = await supabase.from("sweatlock_accounts")
      .update({ locked_until: unlockDate(selected).toISOString() })
      .eq("user_id", user.id);

    if (error) { Alert.alert("Error", error.message); setSaving(false); return; }
    router.back();
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: insets.top + 24 }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={s.title}>Lock Funds</Text>
      <Text style={s.sub}>Choose how long to lock your savings. Withdrawals will be blocked until the date passes.</Text>

      <View style={s.grid}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.days}
            style={[s.preset, selected === p.days && s.presetSelected]}
            onPress={() => setSelected(p.days)}
          >
            <Text style={[s.presetLabel, selected === p.days && s.presetLabelSelected]}>{p.label}</Text>
            <Text style={[s.presetDate, selected === p.days && s.presetDateSelected]}>
              until {unlockDate(p.days).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected !== null && (
        <View style={s.warningBox}>
          <Text style={s.warningText}>Once set, this lock cannot be removed early. Your funds will be inaccessible until the date.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.btn, (selected === null || saving) && s.btnDim]}
        onPress={confirm}
        disabled={selected === null || saving}
      >
        <Text style={s.btnText}>{saving ? "Locking..." : "Lock My Savings"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 24, paddingTop: 64, gap: 20 },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontSize: 32, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: { width: "47%", backgroundColor: "#111", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#222" },
  presetSelected: { borderColor: "#00ff88", backgroundColor: "rgba(0,255,136,0.08)" },
  presetLabel: { color: "#fff", fontWeight: "700", fontSize: 16 },
  presetLabelSelected: { color: "#00ff88" },
  presetDate: { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 },
  presetDateSelected: { color: "rgba(0,255,136,0.6)" },
  warningBox: { backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  warningText: { color: "#f87171", fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: "#00ff88", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  btnDim: { opacity: 0.4 },
  btnText: { color: "#000", fontWeight: "800", fontSize: 16 },
});
