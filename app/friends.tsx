import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

interface FriendRow {
  id: string;
  friend_id: string;
  email: string;
  status: "pending" | "accepted";
  incoming: boolean;
}

export default function Friends() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("sweatlock_friends_list");
    if (!error) setRows(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addFriend() {
    const email = search.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      if (email === user.email?.toLowerCase()) {
        Alert.alert("That's you", "Enter a friend's email");
        return;
      }

      const { data: friendId, error: findErr } = await supabase.rpc("sweatlock_find_user", { p_email: email });
      if (findErr) throw findErr;
      if (!friendId) {
        Alert.alert("Not found", "No SweatLock account with that email");
        return;
      }

      const { error } = await supabase.from("sweatlock_friends").insert({
        requester: user.id,
        addressee: friendId,
      });
      if (error) {
        if (error.code === "23505") Alert.alert("Already added", "Request already exists with this user");
        else throw error;
        return;
      }

      setSearch("");
      await load();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  async function accept(row: FriendRow) {
    await supabase.from("sweatlock_friends").update({ status: "accepted" }).eq("id", row.id);
    await load();
  }

  async function remove(row: FriendRow) {
    await supabase.from("sweatlock_friends").delete().eq("id", row.id);
    await load();
  }

  const incoming = rows.filter((r) => r.status === "pending" && r.incoming);
  const outgoing = rows.filter((r) => r.status === "pending" && !r.incoming);
  const friends = rows.filter((r) => r.status === "accepted");

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Friends</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={s.addRow}>
          <TextInput
            style={s.input}
            placeholder="Friend's email"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            keyboardType="email-address"
            keyboardAppearance="dark"
          />
          <TouchableOpacity style={[s.addBtn, (!search.trim() || busy) && s.addBtnDim]} onPress={addFriend} disabled={!search.trim() || busy}>
            <Text style={s.addBtnText}>{busy ? "..." : "Add"}</Text>
          </TouchableOpacity>
        </View>

        {incoming.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Requests</Text>
            {incoming.map((r) => (
              <View key={r.id} style={s.card}>
                <Text style={s.email} numberOfLines={1}>{r.email}</Text>
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => accept(r)}>
                    <Text style={s.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.declineBtn} onPress={() => remove(r)}>
                    <Text style={s.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={s.sectionLabel}>My Friends</Text>
        {friends.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No friends yet. Add one by email above.</Text>
          </View>
        ) : (
          friends.map((r) => (
            <View key={r.id} style={s.card}>
              <View style={s.friendAvatar}>
                <Text style={s.friendAvatarText}>{r.email[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[s.email, { flex: 1 }]} numberOfLines={1}>{r.email}</Text>
              <TouchableOpacity onPress={() =>
                Alert.alert("Remove friend", r.email, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => remove(r) },
                ])
              }>
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {outgoing.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Sent</Text>
            {outgoing.map((r) => (
              <View key={r.id} style={s.card}>
                <Text style={[s.email, { flex: 1 }]} numberOfLines={1}>{r.email}</Text>
                <Text style={s.pendingText}>Pending</Text>
                <TouchableOpacity onPress={() => remove(r)}>
                  <Text style={s.removeText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  title: { color: "#fff", fontWeight: "700", fontSize: 17 },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  input: { flex: 1, backgroundColor: "#0A1220", borderWidth: 1, borderColor: "#16233A", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 15 },
  addBtn: { backgroundColor: "#3B82F6", borderRadius: 14, paddingHorizontal: 22, justifyContent: "center" },
  addBtnDim: { opacity: 0.4 },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  sectionLabel: { color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, marginLeft: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0A1220", borderRadius: 14, borderWidth: 1, borderColor: "#16233A", padding: 16, marginBottom: 8 },
  friendAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center" },
  friendAvatarText: { color: "#3B82F6", fontWeight: "700", fontSize: 15 },
  email: { color: "#fff", fontSize: 14, fontWeight: "500" },
  cardActions: { flexDirection: "row", gap: 8, marginLeft: "auto" },
  acceptBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  declineBtn: { backgroundColor: "#101A2C", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  declineText: { color: "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: 13 },
  removeText: { color: "rgba(248,113,113,0.8)", fontSize: 13, fontWeight: "600" },
  pendingText: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  emptyBox: { backgroundColor: "#0A1220", borderRadius: 14, borderWidth: 1, borderColor: "#16233A", padding: 24, alignItems: "center", marginBottom: 24 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 13.5 },
});
