import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Success() {
  const router = useRouter();
  return (
    <View style={s.root}>
      <Text style={s.emoji}>🎉</Text>
      <Text style={s.title}>Withdrawal approved</Text>
      <Text style={s.sub}>You earned it.</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace("/dashboard")} activeOpacity={0.85}>
        <Text style={s.btnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:"#000", alignItems:"center", justifyContent:"center", gap:12, padding:24 },
  emoji: { fontSize:64 },
  title: { color:"#00ff88", fontSize:28, fontWeight:"800" },
  sub: { color:"rgba(255,255,255,0.4)", fontSize:15, marginBottom:16 },
  btn: { backgroundColor:"#00ff88", borderRadius:16, paddingVertical:18, paddingHorizontal:40 },
  btnText: { color:"#000", fontWeight:"700", fontSize:16 },
});
