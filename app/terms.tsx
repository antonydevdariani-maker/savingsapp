import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. What SweatLock Is",
    body: "SweatLock is a behavioral savings tool. You deposit funds, they are locked, and withdrawals require completing a physical challenge. SweatLock is currently in early access and deposits are simulated — no real money is moved or held.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 18 years old to use SweatLock. By creating an account you confirm that the information you provide is accurate and that you are physically able to perform exercise challenges safely.",
  },
  {
    title: "3. Health Disclaimer",
    body: "Exercise carries risk. Consult a physician before starting any fitness activity. You perform challenges at your own risk, and SweatLock is not liable for any injury resulting from use of the app. Stop immediately if you feel pain, dizziness, or discomfort.",
  },
  {
    title: "4. Lock Periods",
    body: "When you set a lock period, withdrawals are blocked until the chosen date. Lock periods cannot be shortened or removed once set. Choose your lock period carefully.",
  },
  {
    title: "5. Your Data",
    body: "We store your email, account balances, savings goals, friend connections, and challenge history. Camera video is processed on your device only and is never uploaded or stored. You may delete your account and all associated data at any time from your profile.",
  },
  {
    title: "6. Friends",
    body: "Friend features let other users see your display name. Friend requests can be declined or removed at any time.",
  },
  {
    title: "7. Account Termination",
    body: "You may delete your account at any time from the Profile screen. Deletion is permanent and removes all data including balances, goals, history, and friend connections. We may suspend accounts that abuse the service.",
  },
  {
    title: "8. Changes",
    body: "We may update these terms as the product evolves. Continued use after changes constitutes acceptance. Material changes will be communicated in the app.",
  },
];

export default function Terms() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Terms &amp; Conditions</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={s.updated}>Last updated July 3, 2026</Text>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.sectionBody}>{sec.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontWeight: "700", fontSize: 17 },
  updated: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 24, textAlign: "center" },
  section: { marginBottom: 22 },
  sectionTitle: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 6 },
  sectionBody: { color: "rgba(255,255,255,0.5)", fontSize: 13.5, lineHeight: 20 },
});
