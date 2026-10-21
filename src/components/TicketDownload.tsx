"use client";

import { useState } from "react";

type Props = {
  qr: string; // data URL of the QR image
  title: string;
  when: string;
  venue: string | null;
  name: string;
  tickets: number;
  code: string;
};

/** Draws the ticket on a canvas in the browser and saves it as a PNG. */
export function TicketDownload({ qr, title, when, venue, name, tickets, code }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const img = new Image();
      img.src = qr;
      await img.decode();

      const W = 900;
      const H = 1300;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#111";
      c.fillRect(0, 0, W, 130);
      c.fillStyle = "#fff";
      c.font = "bold 72px Impact, 'Arial Narrow', sans-serif";
      c.fillText("BUE THEATRE TEAM", 48, 92);
      c.fillStyle = "#d42a24";
      c.fillText(".", 48 + c.measureText("BUE THEATRE TEAM").width, 92);

      const wrap = (txt: string, x: number, y: number, max: number, lh: number) => {
        let line = "";
        for (const word of txt.split(" ")) {
          const test = line ? `${line} ${word}` : word;
          if (c.measureText(test).width > max && line) {
            c.fillText(line, x, y);
            line = word;
            y += lh;
          } else line = test;
        }
        c.fillText(line, x, y);
        return y + lh;
      };

      c.fillStyle = "#111";
      c.font = "bold 84px Impact, 'Arial Narrow', sans-serif";
      let y = wrap(title.toUpperCase(), 48, 240, W - 96, 90);
      c.font = "600 36px Arial, sans-serif";
      y = wrap(when, 48, y + 10, W - 96, 46);
      if (venue) y = wrap(venue, 48, y, W - 96, 46);
      c.fillStyle = "#d42a24";
      c.font = "bold 44px Arial, sans-serif";
      y = wrap(`${tickets} ${tickets === 1 ? "ticket" : "tickets"} · ${name}`, 48, y + 24, W - 96, 54);

      const size = 560;
      c.drawImage(img, (W - size) / 2, Math.max(y + 10, 640), size, size);
      c.fillStyle = "#5c5c5c";
      c.font = "28px monospace";
      c.textAlign = "center";
      c.fillText(code, W / 2, H - 28);

      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ticket-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn-solid display" onClick={download} disabled={busy}>
      {busy ? "PREPARING..." : "DOWNLOAD TICKET"}
    </button>
  );
}
