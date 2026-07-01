import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Line, Circle } from "react-native-svg";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { supabase, repsRequired } from "@/lib/supabase";

const { width: W, height: H } = Dimensions.get("window");

// MoveNet keypoint indices
const KP = {
  L_SHOULDER: 5, R_SHOULDER: 6,
  L_ELBOW: 7, R_ELBOW: 8,
  L_WRIST: 9, R_WRIST: 10,
  L_HIP: 11, R_HIP: 12,
  L_KNEE: 13, R_KNEE: 14,
};

const CONNECTIONS: [number, number][] = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12], [11, 13], [13, 15],
  [12, 14], [14, 16],
];

type Keypoint = { x: number; y: number; score?: number; name?: string };

function angle(a: Keypoint, b: Keypoint, c: Keypoint) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

type Phase = "loading" | "ready" | "counting" | "done";

export default function Challenge() {
  const router = useRouter();
  const { amount: amountParam } = useLocalSearchParams<{ amount: string }>();
  const amount = parseFloat(amountParam ?? "0");
  const target = repsRequired(amount);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("loading");
  const [reps, setReps] = useState(0);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [tfReady, setTfReady] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repsRef = useRef(0);
  const startTimeRef = useRef(0);
  const leftArmDown = useRef(false);
  const rightArmDown = useRef(false);
  const bothWereDown = useRef(false);

  // load TF + MoveNet
  useEffect(() => {
    (async () => {
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      detectorRef.current = detector;
      setTfReady(true);
      setPhase("ready");
    })();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      detectorRef.current?.dispose();
    };
  }, []);

  const processFrame = useCallback(async () => {
    if (!cameraRef.current || !detectorRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
        exif: false,
      });
      if (!photo?.base64) return;

      // decode jpeg tensor
      const { decodeJpeg } = await import("@tensorflow/tfjs-react-native");
      const rawBytes = Uint8Array.from(atob(photo.base64!), (c) => c.charCodeAt(0));
      const imageTensor = decodeJpeg(rawBytes);

      const poses = await detectorRef.current.estimatePoses(imageTensor as unknown as HTMLVideoElement);
      imageTensor.dispose();

      if (poses.length === 0) return;
      const kps = poses[0].keypoints;

      // scale to screen coords
      const imgW = photo.width ?? W;
      const imgH = photo.height ?? H;
      const scaleX = W / imgW;
      const scaleY = H / imgH;

      const scaled = kps.map((kp) => ({
        x: (imgW - kp.x) * scaleX, // mirror for front cam
        y: kp.y * scaleY,
        score: kp.score,
        name: kp.name,
      }));
      setKeypoints(scaled);

      // rep counting
      const ls = scaled[KP.L_SHOULDER], le = scaled[KP.L_ELBOW], lw = scaled[KP.L_WRIST];
      const rs = scaled[KP.R_SHOULDER], re = scaled[KP.R_ELBOW], rw = scaled[KP.R_WRIST];

      if ((ls?.score ?? 0) > 0.3 && (le?.score ?? 0) > 0.3 && (lw?.score ?? 0) > 0.3) {
        const leftAngle = angle(ls, le, lw);
        if (leftAngle < 90) leftArmDown.current = true;
      }
      if ((rs?.score ?? 0) > 0.3 && (re?.score ?? 0) > 0.3 && (rw?.score ?? 0) > 0.3) {
        const rightAngle = angle(rs, re, rw);
        if (rightAngle < 90) rightArmDown.current = true;
      }

      if (leftArmDown.current && rightArmDown.current) bothWereDown.current = true;

      if (bothWereDown.current) {
        const la = (ls?.score ?? 0) > 0.3 && (le?.score ?? 0) > 0.3 ? angle(ls, le, lw) : 0;
        const ra = (rs?.score ?? 0) > 0.3 && (re?.score ?? 0) > 0.3 ? angle(rs, re, rw) : 0;
        if (la > 150 && ra > 150) {
          bothWereDown.current = false;
          leftArmDown.current = false;
          rightArmDown.current = false;
          repsRef.current += 1;
          setReps(repsRef.current);

          if (repsRef.current >= target) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPhase("done");
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            await completeChallenge(repsRef.current, duration);
          }
        }
      }
    } catch (_e) {
      // frame failed, continue
    }
  }, [target]);

  const startCounting = useCallback(() => {
    setPhase("counting");
    repsRef.current = 0;
    startTimeRef.current = Date.now();
    leftArmDown.current = false;
    rightArmDown.current = false;
    bothWereDown.current = false;
    intervalRef.current = setInterval(processFrame, 500); // 2fps — good balance speed/accuracy
  }, [processFrame]);

  async function completeChallenge(repsCompleted: number, duration: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: acct } = await supabase.from("sweatlock_accounts").select("balance,locked_balance").eq("user_id", user.id).single();
    if (!acct || acct.locked_balance < amount) {
      Alert.alert("Error", "Insufficient balance"); router.back(); return;
    }

    const { data: tx } = await supabase.from("sweatlock_transactions").insert({
      user_id: user.id, type: "withdrawal", amount, status: "completed",
    }).select().single();

    await supabase.from("sweatlock_challenge_logs").insert({
      user_id: user.id,
      transaction_id: tx?.id ?? null,
      reps_required: target,
      reps_completed: repsCompleted,
      passed: true,
      duration_seconds: duration,
    });

    await supabase.from("sweatlock_accounts").update({
      balance: acct.balance - amount,
      locked_balance: acct.locked_balance - amount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
  }

  if (!permission) return <View style={s.root} />;
  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>Camera permission needed</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = Math.min(reps / target, 1);

  return (
    <View style={s.root}>
      {/* camera */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      {/* skeleton overlay */}
      {keypoints.length > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
          {CONNECTIONS.map(([i, j]) => {
            const a = keypoints[i], b = keypoints[j];
            if (!a || !b || (a.score ?? 0) < 0.3 || (b.score ?? 0) < 0.3) return null;
            return <Line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#00ff88" strokeWidth={2} />;
          })}
          {keypoints.map((kp, i) =>
            (kp.score ?? 0) > 0.3 ? (
              <Circle key={i} cx={kp.x} cy={kp.y} r={5} fill="#ff0066" />
            ) : null
          )}
        </Svg>
      )}

      {/* top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
        <Text style={s.topText}>Unlocking ${amount.toFixed(2)}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* loading overlay */}
      {phase === "loading" && (
        <View style={s.overlay}>
          <Text style={s.loadingText}>Loading AI model...</Text>
        </View>
      )}

      {/* ready overlay */}
      {phase === "ready" && (
        <View style={s.overlay}>
          <View style={s.readyCard}>
            <Text style={s.readyLabel}>Challenge</Text>
            <Text style={s.readyReps}>{target} pushups</Text>
            <Text style={s.readySub}>to unlock ${amount.toFixed(2)}</Text>
            <TouchableOpacity style={s.startBtn} onPress={startCounting} activeOpacity={0.85}>
              <Text style={s.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* done overlay */}
      {phase === "done" && (
        <View style={s.overlay}>
          <View style={s.readyCard}>
            <Text style={{ fontSize: 56 }}>💪</Text>
            <Text style={s.readyReps}>{reps} reps!</Text>
            <Text style={s.readySub}>Withdrawal approved</Text>
            <TouchableOpacity style={s.startBtn} onPress={() => router.replace("/dashboard")} activeOpacity={0.85}>
              <Text style={s.startBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* rep counter */}
      {(phase === "counting" || phase === "done") && (
        <View style={s.repBar}>
          <View style={s.repRow}>
            <Text style={s.repCount}>{reps}</Text>
            <Text style={s.repTarget}>/ {target}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  permText: { color: "#fff", fontSize: 16, textAlign: "center" },
  btn: { backgroundColor: "#00ff88", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  topBar: {
    position: "absolute", top: 56, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  close: { color: "rgba(255,255,255,0.6)", fontSize: 18 },
  topText: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", fontSize: 16 },
  readyCard: {
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.2)",
    width: W - 48,
  },
  readyLabel: { color: "#00ff88", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  readyReps: { color: "#fff", fontSize: 40, fontWeight: "800" },
  readySub: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 8 },
  startBtn: { backgroundColor: "#00ff88", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  startBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  repBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: "#1a1a1a",
  },
  repRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 10 },
  repCount: { color: "#fff", fontSize: 48, fontWeight: "800", lineHeight: 52 },
  repTarget: { color: "rgba(255,255,255,0.3)", fontSize: 18, marginLeft: 6 },
  progressTrack: { height: 8, backgroundColor: "#1a1a1a", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#00ff88", borderRadius: 4 },
});
