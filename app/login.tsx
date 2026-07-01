import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("test@sweatlock.com");
  const [password, setPassword] = useState("test1234");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      // try login first, if fails try signup
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error?.message?.includes("Invalid login")) {
        const res = await supabase.auth.signUp({ email, password });
        error = res.error;
      }
      if (error) throw error;
      router.replace("/dashboard");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.content}>
        <Text style={s.logo}><Text style={s.green}>Sweat</Text>Lock</Text>
        <Text style={s.title}>Sign in</Text>

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
          <Text style={s.btnText}>{loading ? "..." : "Sign in"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  logo: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 8, textAlign: "center" },
  green: { color: "#00ff88" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16, textAlign: "center" },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
  },
  btn: { backgroundColor: "#00ff88", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
