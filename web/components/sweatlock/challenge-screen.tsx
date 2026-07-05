"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  amount: number;
  onComplete: (reps: number, duration: number) => void;
  onFail: () => void;
}

type Phase = "loading" | "ready" | "counting" | "done" | "error";

const WRIST_ANGLE_EXTENDED = 150;
const WRIST_ANGLE_BENT = 90;

function calcAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * 180) / Math.PI;
}

export default function ChallengeScreen({ amount, onComplete, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const poseLandmarkerRef = useRef<unknown>(null);
  const lastVideoTimeRef = useRef(-1);

  const [phase, setPhase] = useState<Phase>("loading");
  const [reps, setReps] = useState(0);
  const [error, setError] = useState("");
  const startTimeRef = useRef(0);

  // per-arm state for rep detection
  const leftArmState = useRef<"up" | "down">("up");
  const rightArmState = useRef<"up" | "down">("up");
  const bothDownRef = useRef(false);
  const repsRef = useRef(0);

  const target = Math.min(Math.ceil(amount * 0.5), 75);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (cancelled) return;
        poseLandmarkerRef.current = { landmarker, DrawingUtils, PoseLandmarker };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setPhase("ready");
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Camera init failed");
          setPhase("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  const startChallenge = useCallback(() => {
    setPhase("counting");
    startTimeRef.current = Date.now();
    repsRef.current = 0;
    leftArmState.current = "up";
    rightArmState.current = "up";
    bothDownRef.current = false;

    const { landmarker, DrawingUtils, PoseLandmarker } = poseLandmarkerRef.current as {
      landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: { x: number; y: number; z: number }[][] } };
      DrawingUtils: new (ctx: CanvasRenderingContext2D) => { drawConnectors: (lm: unknown[], conn: unknown[], opts: unknown) => void; drawLandmarks: (lm: unknown[], opts: unknown) => void };
      PoseLandmarker: { POSE_CONNECTIONS: unknown[] };
    };

    function detectLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());

        if (result.landmarks.length > 0) {
          const lm = result.landmarks[0];
          const drawUtils = new DrawingUtils(ctx);

          // draw skeleton
            drawUtils.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, {
            color: "#00ff88",
            lineWidth: 2,
          });
          drawUtils.drawLandmarks(lm, { color: "#ff0066", radius: 3 });

          // landmarks: 11=L shoulder, 12=R shoulder, 13=L elbow, 14=R elbow, 15=L wrist, 16=R wrist
          const lShoulder = lm[11], lElbow = lm[13], lWrist = lm[15];
          const rShoulder = lm[12], rElbow = lm[14], rWrist = lm[16];

          const leftAngle = calcAngle(lShoulder, lElbow, lWrist);
          const rightAngle = calcAngle(rShoulder, rElbow, rWrist);

          // state machine per arm
          const leftDown = leftAngle < WRIST_ANGLE_BENT;
          const rightDown = rightAngle < WRIST_ANGLE_BENT;
          const leftUp = leftAngle > WRIST_ANGLE_EXTENDED;
          const rightUp = rightAngle > WRIST_ANGLE_EXTENDED;

          if (leftDown) leftArmState.current = "down";
          if (rightDown) rightArmState.current = "down";

          if (leftArmState.current === "down" && rightArmState.current === "down") {
            bothDownRef.current = true;
          }

          if (bothDownRef.current && leftUp && rightUp) {
            bothDownRef.current = false;
            leftArmState.current = "up";
            rightArmState.current = "up";
            repsRef.current += 1;
            setReps(repsRef.current);

            if (repsRef.current >= target) {
              const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
              setPhase("done");
              stopCamera();
              onComplete(repsRef.current, duration);
              return;
            }
          }

          // draw angle overlays
          if (lElbow) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "14px monospace";
            ctx.fillText(`${Math.round(leftAngle)}°`, lElbow.x * canvas.width, lElbow.y * canvas.height);
            ctx.fillText(`${Math.round(rightAngle)}°`, rElbow.x * canvas.width, rElbow.y * canvas.height);
          }
        }
      }

      rafRef.current = requestAnimationFrame(detectLoop);
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [target, onComplete, stopCamera]);

  const progress = Math.min((reps / target) * 100, 100);

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-black">
      {/* camera feed */}
      <div className="relative w-full flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />

        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
            <div className="w-10 h-10 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm font-mono">Loading pose model...</p>
          </div>
        )}

        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-6 gap-6">
            <div className="text-center">
              <p className="text-[#00ff88] font-mono text-xs uppercase tracking-widest mb-2">Challenge</p>
              <p className="text-white text-3xl font-bold">{target} pushups</p>
              <p className="text-white/50 text-sm mt-1">to unlock ${amount.toFixed(2)}</p>
            </div>
            <button
              onClick={startChallenge}
              className="px-8 py-4 bg-[#00ff88] text-black font-bold rounded-2xl text-lg active:scale-95 transition-transform"
            >
              Start
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 gap-4">
            <p className="text-red-400 font-mono text-sm text-center">{error || "Camera error"}</p>
            <button onClick={onFail} className="px-6 py-3 border border-white/20 text-white rounded-xl text-sm">
              Go back
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
            <p className="text-6xl">💪</p>
            <p className="text-[#00ff88] text-2xl font-bold">{reps} reps!</p>
            <p className="text-white/70 text-sm">Challenge complete</p>
          </div>
        )}
      </div>

      {/* rep counter bar */}
      {(phase === "counting" || phase === "done") && (
        <div className="w-full px-4 py-4 bg-zinc-950 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-mono text-2xl font-bold">{reps}</span>
            <span className="text-white/40 font-mono text-sm">/ {target} reps</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00ff88] rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
