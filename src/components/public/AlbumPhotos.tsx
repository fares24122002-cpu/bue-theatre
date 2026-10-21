"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Photo = { id: string; url: string };

/**
 * Photo grid for one album. Tapping a photo opens it full screen on the same
 * page; swipe (or use the arrows / keyboard) to move between the photos of
 * this album.
 */
export function AlbumPhotos({ title, photos }: { title: string; photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const count = photos.length;

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Jump to the tapped photo as soon as the viewer appears.
  useEffect(() => {
    if (open === null) return;
    setIndex(open);
    goTo(open, false);
    closeBtn.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, goTo]);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goTo(Math.min(index + 1, count - 1));
      if (e.key === "ArrowLeft") goTo(Math.max(index - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, count, close, goTo]);

  function onScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <>
      <div className="photo-grid album-photos">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="photo photo-btn"
            aria-label={`Open photo ${i + 1} of ${count}, ${title}`}
            onClick={(e) => {
              opener.current = e.currentTarget;
              setOpen(i);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {open !== null ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
          <div className="lightbox-bar">
            <span className="lightbox-count">
              {title} · {index + 1} / {count}
            </span>
            <button ref={closeBtn} type="button" className="lightbox-btn" onClick={close} aria-label="Close photos">
              ✕
            </button>
          </div>
          <div ref={track} className="lightbox-track" onScroll={onScroll}>
            {photos.map((p, i) => (
              <div key={p.id} className="lightbox-slide">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${title}, photo ${i + 1} of ${count}`} loading={Math.abs(i - open) < 2 ? "eager" : "lazy"} />
              </div>
            ))}
          </div>
          {count > 1 ? (
            <>
              <button
                type="button"
                className="lightbox-btn lightbox-prev"
                onClick={() => goTo(Math.max(index - 1, 0))}
                disabled={index === 0}
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                className="lightbox-btn lightbox-next"
                onClick={() => goTo(Math.min(index + 1, count - 1))}
                disabled={index === count - 1}
                aria-label="Next photo"
              >
                →
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
