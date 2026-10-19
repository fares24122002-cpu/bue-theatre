/** The team meets in Cairo, so all times are entered and shown in Cairo time. */
export const TZ = "Africa/Cairo";

/** How far TZ is ahead of UTC at a given moment, in minutes (handles summer time). */
function offsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const n = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    n("year"),
    n("month") - 1,
    n("day"),
    n("hour"),
    n("minute"),
    n("second"),
  );
  return Math.round((asUtc - utcMs) / 60000);
}

/** Turns a Cairo date ("2026-10-19") and time ("18:30") into the real moment. */
export function cairoToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let utc = guess - offsetMinutes(guess) * 60000;
  // Near a clock change the first guess can be off by an hour; settle it.
  const second = offsetMinutes(utc);
  utc = guess - second * 60000;
  return new Date(utc);
}

export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
export const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const fmt = (opts: Intl.DateTimeFormatOptions, d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(
    typeof d === "string" ? new Date(d) : d,
  );

/** "Mon 19 Oct" */
export const formatDay = (d: Date | string) =>
  fmt({ weekday: "short", day: "numeric", month: "short" }, d);

/** "Mon 19 Oct 2026" */
export const formatFullDay = (d: Date | string) =>
  fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }, d);

/** "18:30" */
export const formatTime = (d: Date | string) =>
  fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, d);

/** "2026-10-19" for an <input type="date"> */
export const toDateInput = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof d === "string" ? new Date(d) : d);

/** "18:30" for an <input type="time"> */
export const toTimeInput = formatTime;
