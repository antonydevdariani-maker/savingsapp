import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase, repsRequired } from "@/lib/supabase";

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

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#000; color:#fff; font-family:-apple-system,sans-serif; overflow:hidden; height:100vh; }
#video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
#canvas { position:absolute; inset:0; width:100%; height:100%; transform:scaleX(-1); }
#ui { position:absolute; inset:0; display:flex; flex-direction:column; }
#topbar { padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
#close { color:rgba(255,255,255,0.5); font-size:20px; background:none; border:none; color:#fff; }
#overlay { flex:1; display:flex; align-items:center; justify-content:center; }
#card { background:rgba(0,0,0,0.8); border:1px solid rgba(0,255,136,0.3); border-radius:24px; padding:32px; text-align:center; max-width:300px; }
#card h2 { font-size:14px; color:#00ff88; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
#card .reps { font-size:48px; font-weight:800; margin:8px 0; }
#card .sub { color:rgba(255,255,255,0.4); font-size:14px; margin-bottom:24px; }
#startBtn { background:#00ff88; color:#000; font-weight:700; font-size:16px; padding:16px 40px; border:none; border-radius:14px; width:100%; }
#repbar { background:rgba(0,0,0,0.85); border-top:1px solid #1a1a1a; padding:16px 20px 32px; }
#reprow { display:flex; align-items:baseline; gap:6px; margin-bottom:10px; }
#repcount { font-size:48px; font-weight:800; line-height:1; }
#reptarget { color:rgba(255,255,255,0.3); font-size:18px; }
#track { height:8px; background:#1a1a1a; border-radius:4px; overflow:hidden; }
#fill { height:8px; background:#00ff88; border-radius:4px; transition:width 0.2s; width:0%; }
#status { position:absolute; top:60px; left:0; right:0; text-align:center; color:rgba(255,255,255,0.5); font-size:13px; }
.hidden { display:none!important; }
</style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<canvas id="canvas"></canvas>
<div id="status">Loading AI model...</div>

<div id="ui">
  <div id="topbar">
    <button id="close" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:'cancel'}))">✕</button>
    <span style="color:rgba(255,255,255,0.6);font-size:13px">Unlocking $${amount.toFixed(2)}</span>
    <div style="width:32px"></div>
  </div>

  <div id="overlay">
    <div id="card">
      <h2>Challenge</h2>
      <div class="reps">${target}</div>
      <div class="sub">pushups to unlock $${amount.toFixed(2)}</div>
      <button id="startBtn" onclick="startChallenge()">Start</button>
    </div>
  </div>

  <div id="repbar" class="hidden">
    <div id="reprow">
      <span id="repcount">0</span>
      <span id="reptarget">/ ${target}</span>
    </div>
    <div id="track"><div id="fill"></div></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js" crossorigin="anonymous"></script>
<script>
const TARGET = ${target};
const AMOUNT = ${amount};
let detector = null, reps = 0, running = false, startTime = 0;
let leftDown = false, rightDown = false, bothWereDown = false;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function deg(a, b, c) {
  const ab = {x:a.x-b.x, y:a.y-b.y}, cb = {x:c.x-b.x, y:c.y-b.y};
  const dot = ab.x*cb.x + ab.y*cb.y;
  const mag = Math.sqrt(ab.x**2+ab.y**2)*Math.sqrt(cb.x**2+cb.y**2);
  return mag===0 ? 0 : Math.acos(Math.max(-1,Math.min(1,dot/mag)))*180/Math.PI;
}

const CONNECTIONS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];

async function init() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
    video.srcObject = stream;
    await video.play();

    const vision = await PoseLandmarkerVision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    detector = await PoseLandmarkerVision.PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    });
    status.textContent = '';
    document.getElementById('overlay').classList.remove('hidden');
  } catch(e) {
    status.textContent = 'Camera error: ' + e.message;
  }
}

function startChallenge() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('repbar').classList.remove('hidden');
  running = true;
  startTime = Date.now();
  loop();
}

let lastTime = -1;
function loop() {
  if (!running) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (video.currentTime !== lastTime && detector) {
    lastTime = video.currentTime;
    const result = detector.detectForVideo(video, performance.now());
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if (result.landmarks.length > 0) {
      const lm = result.landmarks[0];

      // draw skeleton
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
      CONNECTIONS.forEach(([i,j]) => {
        const a = lm[i], b = lm[j];
        if (!a||!b||(a.visibility??1)<0.3||(b.visibility??1)<0.3) return;
        ctx.beginPath();
        ctx.moveTo(a.x*canvas.width, a.y*canvas.height);
        ctx.lineTo(b.x*canvas.width, b.y*canvas.height);
        ctx.stroke();
      });
      ctx.fillStyle = '#ff0066';
      lm.forEach(p => {
        if((p.visibility??1)<0.3) return;
        ctx.beginPath();
        ctx.arc(p.x*canvas.width, p.y*canvas.height, 5, 0, Math.PI*2);
        ctx.fill();
      });

      // rep counting: shoulder(11/12) elbow(13/14) wrist(15/16)
      const ls=lm[11],le=lm[13],lw=lm[15];
      const rs=lm[12],re=lm[14],rw=lm[16];
      const lv=(ls?.visibility??0)>0.3&&(le?.visibility??0)>0.3&&(lw?.visibility??0)>0.3;
      const rv=(rs?.visibility??0)>0.3&&(re?.visibility??0)>0.3&&(rw?.visibility??0)>0.3;

      if(lv && deg(ls,le,lw) < 90) leftDown = true;
      if(rv && deg(rs,re,rw) < 90) rightDown = true;
      if(leftDown && rightDown) bothWereDown = true;

      if(bothWereDown) {
        const la = lv ? deg(ls,le,lw) : 0;
        const ra = rv ? deg(rs,re,rw) : 0;
        if(la > 150 && ra > 150) {
          bothWereDown = false; leftDown = false; rightDown = false;
          reps++;
          document.getElementById('repcount').textContent = reps;
          document.getElementById('fill').style.width = Math.min(reps/TARGET*100,100)+'%';

          if(reps >= TARGET) {
            running = false;
            const duration = Math.round((Date.now()-startTime)/1000);
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'complete',reps,duration}));
            return;
          }
        }
      }
    }
  }
  requestAnimationFrame(loop);
}

// MediaPipe namespace fix
window.PoseLandmarkerVision = window.VisionTasksVision || {};
document.addEventListener('DOMContentLoaded', () => {});

// wait for mediapipe to load
function tryInit() {
  if(window.PoseLandmarkerVision?.PoseLandmarker) { init(); }
  else if(window.vision?.PoseLandmarker) { window.PoseLandmarkerVision = window.vision; init(); }
  else { setTimeout(tryInit, 200); }
}
tryInit();
</script>
</body>
</html>`;

  if (submitting) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.text}>Processing withdrawal...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <WebView
        ref={webviewRef}
        style={s.root}
        source={{ html }}
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
