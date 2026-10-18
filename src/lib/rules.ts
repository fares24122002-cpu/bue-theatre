import type { AttendanceStatus } from "./types";

/** Each actor has 2 excuses. A further accepted excuse counts as an absence. */
export const MAX_EXCUSES = 2;

/** Each actor may have 2 absences. Going over (the 3rd) deactivates the account. */
export const MAX_ABSENCES = 2;

export type AttendanceCounts = Record<AttendanceStatus, number>;

/**
 * Attendance rate as a whole percent.
 * Present and late count as attended. Excused and absent count as not attended,
 * so both lower the rate. Returns null before any session has been held.
 */
export function attendanceRate(counts: AttendanceCounts): number | null {
  const total =
    counts.present + counts.late + counts.excused + counts.absent;
  if (total === 0) return null;
  return Math.round(((counts.present + counts.late) / total) * 100);
}

/**
 * Where an accepted absence form is counted.
 * The first 2 excuses are excuses; after that it counts as an absence,
 * unless staff mark a third excuse as urgent.
 */
export function countAcceptedAbsenceAs(
  excusesUsed: number,
  staffMarkedUrgent: boolean,
): "excuse" | "absence" {
  if (excusesUsed < MAX_EXCUSES) return "excuse";
  return staffMarkedUrgent ? "excuse" : "absence";
}

/** True when the actor's account must be deactivated. */
export function shouldDeactivate(absencesUsed: number): boolean {
  return absencesUsed > MAX_ABSENCES;
}
