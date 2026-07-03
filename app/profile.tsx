import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [friendCount, setFriendCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setEmail(user.email ?? "");
      setMemberSince(new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }));

      const { data } = await supabase.rpc("sweatlock_friends_list");
      setFriendCount((data ?? []).filter((f: { status: string }) => f.status === "accepted").length);
    })();
  }, [router]));

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account, balances, goals, and history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Forever", style: "destructive", onPress: deleteAccount },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    const { error } = await supabase.rpc("sweatlock_delete_account");
    if (error) {
      Alert.alert("Error", error.message);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.identity}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.email}>{email}</Text>
        <Text style={s.since}>Member since {memberSince}</Text>
      </View>

      <Text style={s.groupLabel}>Social</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.row} onPress={() => router.push("/friends")}>
          <Text style={s.rowText}>Friends</Text>
          <Text style={s.rowValue}>{friendCount} {"›"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.groupLabel}>Legal</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.row} onPress={() => router.push("/terms")}>
          <Text style={s.rowText}>Terms &amp; Conditions</Text>
          <Text style={s.rowValue}>{"›"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.groupLabel}>Account</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.row} onPress={signOut}>
          <Text style={s.rowText}>Sign Out</Text>
          <Text style={s.rowValue}>{"›"}</Text>
        </TouchableOpacity>
        <View style={s.rowDivider} />
        <TouchableOpacity style={s.row} onPress={confirmDelete} disabled={deleting}>
          <Text style={s.rowDanger}>{deleting ? "Deleting..." : "Delete Account"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>SweatLock v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0F1E" },
  content: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontWeight: "700", fontSize: 17 },
  identity: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(16,185,129,0.15)", borderWidth: 1, borderColor: "rgba(16,185,129,0.4)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#10B981", fontSize: 30, fontWeight: "800" },
  email: { color: "#fff", fontSize: 16, fontWeight: "600" },
  since: { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 4 },
  groupLabel: { color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: "#121A2B", borderRadius: 16, borderWidth: 1, borderColor: "#1E2A40", marginBottom: 24, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 18 },
  rowDivider: { height: 1, backgroundColor: "#1E2A40" },
  rowText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  rowValue: { color: "rgba(255,255,255,0.35)", fontSize: 15 },
  rowDanger: { color: "#f87171", fontSize: 15, fontWeight: "600" },
  version: { color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center", marginTop: 8 },
});
