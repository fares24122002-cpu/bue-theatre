"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { checkIn, type CheckInResult } from "@/app/actions/checkin";
import { STATUS_LABEL } from "@/lib/session-status";

/** Pulls the code out of a scanned link like https://site/actor/scan?t=abc. */
function tokenFrom(scanned: string): string {
  try {
    return new URL(scanned).searchParams.get("t") ?? scanned;
  } catch {
    return scanned;
  }
}

export function ScanClient({ initialToken }: { initialToken: string | null }) {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const submit = useCallback((token: string) => {
    startTransition(async () => {
      setResult(await checkIn(token));
    });
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setCameraError(
          "Could not open the camera. Allow camera access, or scan the code with your phone's normal camera app instead.",
        );
        setCameraOn(false);
        return;
      }
      const video = videoRef.current;
      if (!video || stopped) return;
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        if (stopped) return;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code?.data) {
              stopped = true;
              setCameraOn(false);
              submit(tokenFrom(code.data));
              return;
            }
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, submit]);

  if (result?.ok) {
    return (
      <div className="scan-result ok" role="status">
        <p className="display scan-status">
          {result.already ? "ALREADY CHECKED IN" : "YOU'RE IN"}
        </p>
        <p className="lead">
          {result.title}: <strong>{STATUS_LABEL[result.status]}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="scan-box">
      {result && !result.ok ? (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      ) : null}
      {cameraError ? (
        <p className="form-error" role="alert">
          {cameraError}
        </p>
      ) : null}

      {initialToken ? (
        <div className="panel">
          <p className="lead">You opened a check-in link.</p>
          <button
            type="button"
            className="btn-primary display"
            disabled={pending}
            onClick={() => submit(initialToken)}
          >
            {pending ? "CHECKING IN..." : "CHECK IN NOW"}
          </button>
        </div>
      ) : null}

      <div className="panel">
        {cameraOn ? (
          <>
            <video ref={videoRef} className="scan-video" playsInline muted />
            <canvas ref={canvasRef} hidden />
            <button type="button" className="btn-outline" onClick={() => setCameraOn(false)}>
              Stop camera
            </button>
          </>
        ) : (
          <>
            <p className="lead">Point your camera at the QR code shown in the room.</p>
            <button
              type="button"
              className="btn-primary display"
              disabled={pending}
              onClick={() => {
                setCameraError(null);
                setResult(null);
                setCameraOn(true);
              }}
            >
              {pending ? "CHECKING IN..." : "OPEN CAMERA"}
            </button>
            <p className="form-hint">
              You can also scan the code with your phone&apos;s normal camera app.
              It opens this page and you tap &ldquo;Check in now&rdquo;.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
