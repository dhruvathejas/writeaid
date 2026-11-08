"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { applyFlip, type FlipMode } from "@/lib/shared";

export type CameraState =
  | { status: "loading" }
  | { status: "ready"; stream: MediaStream }
  | { status: "error"; message: string };

/** Ask for the webcam once and share the stream. */
export function useCamera(deviceId?: string) {
  const [state, setState] = useState<CameraState>({ status: "loading" });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setState({ status: "loading" });

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: "error", message: "This browser can't use a webcam. Try Chrome, Edge or Safari." });
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setState({ status: "ready", stream: s });
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "videoinput"));
      })
      .catch((e: DOMException) => {
        const message =
          e.name === "NotAllowedError"
            ? "WriteAid needs your camera to see your notebook. Click the camera icon in the address bar and choose Allow."
            : e.name === "NotFoundError"
              ? "No webcam found. Plug one in and refresh the page."
              : "The camera is busy or not working. Close other apps using it and refresh.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [deviceId]);

  return { state, devices };
}

export type FlipViewHandle = {
  /** Snapshot exactly what's shown on the canvas (already flipped) as a JPEG data URL. */
  capture: (maxWidth?: number) => string | null;
};

/** Draws the live webcam onto a <canvas>, flipped the way the kid picked. What you see is what Inky sees. */
export function FlipView({
  stream,
  flipMode,
  className = "",
  ref,
}: {
  stream: MediaStream;
  flipMode: FlipMode;
  className?: string;
  ref?: Ref<FlipViewHandle>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flipRef = useRef(flipMode);
  flipRef.current = flipMode;

  useEffect(() => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    video.srcObject = stream;
    video.play().catch(() => {});

    let raf = 0;
    const draw = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        applyFlip(ctx, flipRef.current, w, h);
        ctx.drawImage(video, 0, 0, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [stream]);

  useImperativeHandle(ref, () => ({
    capture(maxWidth = 1280) {
      const src = canvasRef.current;
      if (!src || !src.width) return null;
      const scale = Math.min(1, maxWidth / src.width);
      const out = document.createElement("canvas");
      out.width = Math.round(src.width * scale);
      out.height = Math.round(src.height * scale);
      out.getContext("2d")!.drawImage(src, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.85);
    },
  }));

  return (
    <>
      {/* Kept "visible" but invisible: some browsers stop decoding display:none videos. */}
      <video ref={videoRef} muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />
      <canvas ref={canvasRef} className={`block h-full w-full bg-ink object-contain ${className}`} />
    </>
  );
}
