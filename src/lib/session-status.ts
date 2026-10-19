import type { AttendanceStatus } from "./types";

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

export const STATUSES: AttendanceStatus[] = [
  "present",
  "late",
  "excused",
  "absent",
];

export const isStatus = (v: unknown): v is AttendanceStatus =>
  typeof v === "string" && (STATUSES as string[]).includes(v);
