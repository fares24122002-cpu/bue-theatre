"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Item = { id: string; year: string; title: string; summary: string | null };

/**
 * Horizontal film-strip of milestones. The card nearest the middle is "lit"
 * and a soft spotlight follows it. Swipe on a phone, scroll or use the arrows
 * on a computer. Nothing moves by itself.
 */
export function StoryTimeline({ items }: { items: Item[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const card = c as HTMLElement;
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  function go(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    const step = (card?.offsetWidth ?? 280) + 20;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  }

  const pct = items.length > 1 ? (active / (items.length - 1)) * 100 : 50;

  return (
    <div className="timeline" style={{ ["--spot" as string]: `${pct}%` }}>
      <div className="timeline-glow" aria-hidden="true" />
      <ul
        ref={track}
        className="timeline-track"
        onScroll={update}
        tabIndex={0}
        aria-label="Team milestones, scroll sideways"
      >
        {items.map((m, i) => (
          <li key={m.id} className={`timeline-card${i === active ? " is-lit" : ""}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-year display">{m.year}</div>
            <div className="timeline-title display">{m.title}</div>
            {m.summary ? <p className="timeline-text">{m.summary}</p> : null}
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div className="timeline-arrows">
          <button type="button" className="timeline-arrow" onClick={() => go(-1)} disabled={!canPrev} aria-label="Earlier">
            ←
          </button>
          <button type="button" className="timeline-arrow" onClick={() => go(1)} disabled={!canNext} aria-label="Later">
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
