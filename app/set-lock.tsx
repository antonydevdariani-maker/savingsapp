import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "@/lib/supabase";

const PRESETS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const MIN_DATE = addDays(1);

export default function SetLock() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!date) { Alert.alert("Pick a date"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error } = await supabase.from("sweatlock_accounts")
      .update({ locked_until: date.toISOString() })
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
      <Text style={s.sub}>Choose how long to lock your savings. Withdrawals will be blocked until the date you pick.</Text>

      <Text style={s.groupLabel}>Quick Select</Text>
      <View style={s.grid}>
        {PRESETS.map((p) => {
          const isSelected = !!date && Math.abs(date.getTime() - addDays(p.days).getTime()) < 86400000;
          return (
            <TouchableOpacity
              key={p.days}
              style={[s.preset, isSelected && s.presetSelected]}
              onPress={() => setDate(addDays(p.days))}
            >
              <Text style={[s.presetLabel, isSelected && s.presetLabelSelected]}>{p.label}</Text>
              <Text style={[s.presetDate, isSelected && s.presetDateSelected]}>
                {addDays(p.days).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.groupLabel}>Or Pick an Exact Date</Text>
      <TouchableOpacity style={s.dateBtn} onPress={() => setShowPicker(true)}>
        <Text style={s.dateBtnText}>
          {date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Choose a date"}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date ?? MIN_DATE}
          mode="date"
          minimumDate={MIN_DATE}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, selected) => {
            if (Platform.OS === "android") setShowPicker(false);
            if (selected) setDate(selected);
          }}
          themeVariant="dark"
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <TouchableOpacity style={s.doneBtn} onPress={() => setShowPicker(false)}>
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>
      )}

      {date && (
        <View style={s.warningBox}>
          <Text style={s.warningText}>Once set, this lock cannot be removed early. Your funds will be inaccessible until the date.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.btn, (!date || saving) && s.btnDim]}
        onPress={confirm}
        disabled={!date || saving}
      >
        <Text style={s.btnText}>{saving ? "Locking..." : "Lock My Savings"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 24, gap: 16 },
  backBtn: { marginBottom: 4 },
  backText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontSize: 32, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 20, marginBottom: 4 },
  groupLabel: { color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: { width: "31.5%", backgroundColor: "#0A1220", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#16233A" },
  presetSelected: { borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.08)" },
  presetLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
  presetLabelSelected: { color: "#3B82F6" },
  presetDate: { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 },
  presetDateSelected: { color: "rgba(59,130,246,0.6)" },
  dateBtn: { backgroundColor: "#0A1220", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#16233A", alignItems: "center" },
  dateBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  doneBtn: { backgroundColor: "#0A1220", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#16233A" },
  doneBtnText: { color: "#3B82F6", fontWeight: "700", fontSize: 14 },
  warningBox: { backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  warningText: { color: "#f87171", fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  btnDim: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
