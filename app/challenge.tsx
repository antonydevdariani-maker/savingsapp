import { View, Text, StyleSheet, Alert } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase, repsRequired } from "@/lib/supabase";

const CHALLENGE_URL = "https://helpful-piroshki-1ac0b8.netlify.app";

export default function Challenge() {
  const router = useRouter();
  const { amount: amountParam } = useLocalSearchParams<{ amount: string }>();
  const amount = parseFloat(amountParam ?? "0");
  const target = repsRequired(amount);
  const [submitting, setSubmitting] = useState(false);
  const webviewRef = useRef<InstanceType<typeof WebView>>(null);

  async function handleComplete(reps: number, duration: number) {
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
        reps_completed: reps,
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
        <Text style={s.text}>Processing withdrawal...</Text>
      </View>
    );
  }

  const url = `${CHALLENGE_URL}?amount=${amount}&target=${target}`;

  return (
    <View style={s.root}>
      <WebView
        ref={webviewRef}
        style={s.root}
        source={{ uri: url }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia
        onMessage={(e: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "complete") handleComplete(msg.reps, msg.duration);
            if (msg.type === "cancel") router.back();
          } catch {}
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center" },
  text: { color: "rgba(255,255,255,0.6)", fontSize: 16 },
});
