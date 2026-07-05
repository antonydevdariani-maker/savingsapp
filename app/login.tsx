import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const TEST_EMAIL = "test@sweatlock.com";
const TEST_PASSWORD = "test1234";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      router.replace("/dashboard");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function testLogin() {
    setLoading(true);
    try {
      // try signup first (no-op if already exists), then login
      await supabase.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const { error } = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
      if (error) throw error;
      router.replace("/dashboard");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Test login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.content}>
        <Text style={s.logo}><Text style={s.green}>Sweat</Text>Lock</Text>

        {/* mode toggle */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, mode === "login" && s.tabActive]} onPress={() => setMode("login")}>
            <Text style={[s.tabText, mode === "login" && s.tabTextActive]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mode === "signup" && s.tabActive]} onPress={() => setMode("signup")}>
            <Text style={[s.tabText, mode === "signup" && s.tabTextActive]}>Sign up</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          keyboardAppearance="dark"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          keyboardAppearance="dark"
        />

        <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
          <Text style={s.btnText}>{loading ? "..." : mode === "login" ? "Sign in" : "Sign up"}</Text>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.line} />
        </View>

        <TouchableOpacity style={s.testBtn} onPress={testLogin} disabled={loading} activeOpacity={0.85}>
          <Text style={s.testBtnText}>Use Test Account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  logo: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 16, textAlign: "center" },
  green: { color: "#3B82F6" },
  tabs: { flexDirection: "row", backgroundColor: "#0A1220", borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "#101A2C" },
  tabText: { color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#0A1220", borderWidth: 1, borderColor: "#16233A",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: "#fff", fontSize: 16,
  },
  btn: { backgroundColor: "#3B82F6", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: "#16233A" },
  dividerText: { color: "rgba(255,255,255,0.2)", fontSize: 13 },
  testBtn: { backgroundColor: "#101A2C", borderWidth: 1, borderColor: "#1E2F4D", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  testBtnText: { color: "rgba(255,255,255,0.6)", fontWeight: "600", fontSize: 15 },
});
