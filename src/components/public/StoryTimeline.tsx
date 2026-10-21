"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Item = { id: string; year: string; title: string; summary: string | null };

const SPEED = 38; // pixels per second
const RESUME_AFTER = 1000; // ms after a finger leaves the strip

/**
 * Horizontal film-strip of milestones. The strip drifts sideways by itself
 * through a spotlight that stays fixed in the middle; the card under the light
 * is lit. Mouse hover never stops it. A finger or the arrows pause it for a
 * moment, and a Pause button lets anyone stop it for good.
 */
export function StoryTimeline({ items }: { items: Item[] }) {
  const n = items.length;
  const track = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const userPaused = useRef(false);
  const [stopped, setStopped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(0);
  const [copies, setCopies] = useState(1); // 1 = still strip, more = endless loop
  const looping = copies > 1;

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
    setActive(best % n);
  }, [n]);

  // Decide once whether to loop, and how many copies fill the screen.
  useEffect(() => {
    const el = track.current;
    if (!el || n < 2) return;
    const width = el.clientWidth;
    const setWidth = n * (Math.min(width * 0.8, 320) + 20);
    const k = Math.ceil((width / 2 + setWidth) / setWidth);
    setCopies(2 * k + 1);
  }, [n]);

  // Centre the first card of the middle copy, then drift.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    if (copies < 2) return;

    const first = el.children[((copies - 1) / 2) * n] as HTMLElement;
    const next = el.children[((copies - 1) / 2 + 1) * n] as HTMLElement;
    const setWidth = next.offsetLeft - first.offsetLeft;
    const home = first.offsetLeft + first.offsetWidth / 2 - el.clientWidth / 2;
    el.scrollLeft = home;
    let pos = home;
    let last = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const dt = Math.min(t - last, 64);
      last = t;
      if (paused.current || userPaused.current) {
        pos = el.scrollLeft;
      } else {
        pos += (SPEED * dt) / 1000;
      }
      if (pos >= home + setWidth / 2) pos -= setWidth;
      else if (pos < home - setWidth / 2) pos += setWidth;
      if (!(paused.current || userPaused.current) || Math.abs(el.scrollLeft - pos) > 1) el.scrollLeft = pos;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [copies, n, update]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [update]);

  function hold() {
    paused.current = true;
    if (timer.current) clearTimeout(timer.current);
  }
  function release(delay = RESUME_AFTER) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      paused.current = false;
    }, delay);
  }

  function go(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    hold();
    const card = el.children[0] as HTMLElement | undefined;
    const step = (card?.offsetWidth ?? 280) + 20;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
    release();
  }

  const list = Array.from({ length: copies }, (_, c) => items.map((m) => ({ m, c }))).flat();

  return (
    <div
      className="timeline"
      onTouchStart={hold}
      onTouchEnd={() => release()}
      onTouchCancel={() => release()}
    >
      <div className="timeline-glow" aria-hidden="true" />
      <ul
        ref={track}
        className="timeline-track"
        onScroll={update}
        tabIndex={0}
        aria-label="Team milestones"
      >
        {list.map(({ m, c }, i) => (
          <li
            key={`${m.id}-${c}`}
            className={`timeline-card${i % n === active ? " is-lit" : ""}`}
            aria-hidden={c !== (copies - 1) / 2 && looping ? true : undefined}
          >
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-year display">{m.year}</div>
            <div className="timeline-title display">{m.title}</div>
            {m.summary ? <p className="timeline-text">{m.summary}</p> : null}
          </li>
        ))}
      </ul>
      {n > 1 ? (
        <div className="timeline-arrows">
          <button type="button" className="timeline-arrow timeline-nav" onClick={() => go(-1)} aria-label="Earlier">
            ←
          </button>
          <button type="button" className="timeline-arrow timeline-nav" onClick={() => go(1)} aria-label="Later">
            →
          </button>
          <button
            type="button"
            className="timeline-arrow"
            aria-pressed={stopped}
            aria-label={stopped ? "Play the timeline" : "Pause the timeline"}
            onClick={() => {
              userPaused.current = !userPaused.current;
              setStopped(userPaused.current);
            }}
          >
            {stopped ? "▶" : "❚❚"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
