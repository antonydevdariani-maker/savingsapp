import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function NewGoal() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const amt = parseFloat(target);
    if (!name.trim()) { Alert.alert("Enter a goal name"); return; }
    if (!amt || amt <= 0) { Alert.alert("Enter a valid amount"); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error } = await supabase.from("sweatlock_goals").insert({
      user_id: user.id,
      name: name.trim(),
      target_amount: amt,
    });

    if (error) { Alert.alert("Error", error.message); setSaving(false); return; }
    router.back();
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.content}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>New Goal</Text>
        <Text style={s.sub}>What are you saving for?</Text>

        <View style={s.field}>
          <Text style={s.fieldLabel}>GOAL NAME</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. PS5, Vacation, Emergency fund"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>TARGET AMOUNT</Text>
          <View style={s.amtRow}>
            <Text style={s.dollar}>$</Text>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="500"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="decimal-pad"
              value={target}
              onChangeText={setTarget}
            />
          </View>
        </View>

        <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={create} disabled={saving}>
          <Text style={s.btnText}>{saving ? "Saving..." : "Create Goal"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24, paddingTop: 64 },
  backBtn: { marginBottom: 32 },
  backText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontSize: 32, fontWeight: "800", marginBottom: 6 },
  sub: { color: "rgba(255,255,255,0.4)", fontSize: 15, marginBottom: 36 },
  field: { marginBottom: 24 },
  fieldLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  input: { backgroundColor: "#111", borderRadius: 14, padding: 16, color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#222" },
  amtRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dollar: { color: "rgba(255,255,255,0.4)", fontSize: 20 },
  btn: { backgroundColor: "#00ff88", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  btnDim: { opacity: 0.5 },
  btnText: { color: "#000", fontWeight: "800", fontSize: 16 },
});
