import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const steps = [
  { icon: "💵", title: "Deposit", desc: "Add money — locks instantly" },
  { icon: "📷", title: "Challenge", desc: "Do pushups on camera, AI counts every rep" },
  { icon: "✅", title: "Withdraw", desc: "$10 = 5 reps, $100 = 50 reps, max 75" },
];

export default function Landing() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthed(true);
    });
  }, []);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} bounces={false}>
      <View style={s.nav}>
        <Text style={s.logo}>
          <Text style={s.green}>Sweat</Text>Lock
        </Text>
        {authed && (
          <TouchableOpacity onPress={() => router.push("/dashboard")}>
            <Text style={s.navLink}>Dashboard →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.hero}>
        <View style={s.badge}>
          <Text style={s.badgeText}>💪 Savings with a price</Text>
        </View>
        <Text style={s.h1}>
          Lock your money.{"\n"}
          <Text style={s.green}>Earn</Text> it back.
        </Text>
        <Text style={s.sub}>
          Deposit funds. They&apos;re locked. To withdraw, you do pushups — AI counts every rep in real time.
        </Text>
      </View>

      <View style={s.steps}>
        {steps.map((step) => (
          <View key={step.title} style={s.step}>
            <Text style={s.stepIcon}>{step.icon}</Text>
            <View>
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
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20, paddingBottom: 48 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { fontSize: 20, fontWeight: "700", color: "#fff" },
  green: { color: "#00ff88" },
  navLink: { color: "#00ff88", fontSize: 14 },
  hero: { marginBottom: 32 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,255,136,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.2)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeText: { color: "#00ff88", fontSize: 12, fontWeight: "600" },
  h1: { fontSize: 36, fontWeight: "800", color: "#fff", lineHeight: 44, marginBottom: 12 },
  sub: { fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 22 },
  steps: { gap: 12, marginBottom: 32 },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
  },
  stepIcon: { fontSize: 24 },
  stepTitle: { fontSize: 14, fontWeight: "600", color: "#fff" },
  stepDesc: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  cta: {
    backgroundColor: "#00ff88",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
