"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { doorCheckIn, type DoorResult } from "@/app/actions/reservations";

/** A ticket QR holds ".../ticket/<code>". The code is the last part. */
function codeFrom(scanned: string): string {
  const last = scanned.trim().split("/").pop() ?? "";
  return last.split("?")[0].toLowerCase();
}

export function DoorClient({ showId }: { showId: string }) {
  const [result, setResult] = useState<DoorResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const submit = useCallback(
    (code: string) => {
      startTransition(async () => {
        setResult(await doorCheckIn(code, showId));
      });
    },
    [showId],
  );

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setCameraError("Could not open the camera. Allow camera access, or type the ticket code below.");
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
              submit(codeFrom(code.data));
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

  return (
    <div className="scan-box">
      {result?.ok ? (
        <div className={result.already ? "scan-result warn" : "scan-result ok"} role="status">
          <p className="display scan-status">{result.already ? "ALREADY CHECKED IN" : "WELCOME"}</p>
          <p className="lead">
            <strong>{result.name}</strong> · {result.tickets} {result.tickets === 1 ? "ticket" : "tickets"}
          </p>
        </div>
      ) : null}
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
            {pending ? "CHECKING..." : result ? "SCAN NEXT TICKET" : "OPEN CAMERA"}
          </button>
        )}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
          if (input.value.trim()) {
            submit(codeFrom(input.value));
            input.value = "";
          }
        }}
      >
        <label className="sr-only" htmlFor="code">
          Ticket code
        </label>
        <input id="code" name="code" placeholder="Or type the ticket code" autoComplete="off" />
        <button type="submit" className="btn-outline" disabled={pending}>
          Check in
        </button>
      </form>
    </div>
  );
}
