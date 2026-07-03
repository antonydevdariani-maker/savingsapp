import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

const steps = [
  { num: "01", title: "Deposit", desc: "Add money — it locks instantly" },
  { num: "02", title: "Challenge", desc: "Do pushups on camera to earn it back" },
  { num: "03", title: "Withdraw", desc: "More money means more reps, up to 75" },
];

export default function Landing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthed(true);
    });
  }, []);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
      bounces={false}
    >
      <View style={s.nav}>
        <Text style={s.logo}>
          <Text style={s.green}>Sweat</Text>Lock
        </Text>
        {authed && (
          <TouchableOpacity onPress={() => router.push("/dashboard")}>
            <Text style={s.navLink}>Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.hero}>
        <View style={s.badge}>
          <Text style={s.badgeText}>Savings with a price</Text>
        </View>
        <Text style={s.h1}>
          Lock your money.{"\n"}
          <Text style={s.green}>Earn</Text> it back.
        </Text>
        <Text style={s.sub}>
          Deposit funds. They&apos;re locked. To withdraw, you do pushups on camera — every rep counts.
        </Text>
      </View>

      <View style={s.steps}>
        {steps.map((step) => (
          <View key={step.title} style={s.step}>
            <Text style={s.stepNum}>{step.num}</Text>
            <View style={s.stepBody}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={s.cta}
        onPress={() => router.push(authed ? "/dashboard" : "/login")}
        activeOpacity={0.85}
      >
        <Text style={s.ctaText}>{authed ? "Go to Dashboard" : "Get Started"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0F1E" },
  content: { paddingHorizontal: 24 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 56 },
  logo: { fontSize: 19, fontWeight: "700", color: "#fff", letterSpacing: -0.3 },
  green: { color: "#10B981" },
  navLink: { color: "#10B981", fontSize: 14, fontWeight: "600" },
  hero: { marginBottom: 40 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: { color: "#10B981", fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  h1: { fontSize: 38, fontWeight: "800", color: "#fff", lineHeight: 45, marginBottom: 14, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 22 },
  steps: { gap: 1, marginBottom: 40, backgroundColor: "#1E2A40", borderRadius: 20, overflow: "hidden" },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#121A2B",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepNum: { fontSize: 13, fontWeight: "700", color: "rgba(16,185,129,0.5)", letterSpacing: 1 },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  stepDesc: { fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 3, lineHeight: 17 },
  cta: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
