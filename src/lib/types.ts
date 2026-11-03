export type Role = "staff" | "actor";

/** Actors are divided into an English group and an Arabic group. */
export type Language = "english" | "arabic";
export type SessionLanguage = Language | "both";

export const LANGUAGES: Language[] = ["english", "arabic"];

export const LANGUAGE_LABEL: Record<SessionLanguage, string> = {
  english: "English",
  arabic: "Arabic",
  both: "English and Arabic",
};

export const isLanguage = (v: unknown): v is Language =>
  v === "english" || v === "arabic";

export const isSessionLanguage = (v: unknown): v is SessionLanguage =>
  v === "english" || v === "arabic" || v === "both";

/** Does a workshop for `session` concern the group `group`? */
export const sessionHasGroup = (session: SessionLanguage, group: Language) =>
  session === "both" || session === group;

export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export type FormType = "absence" | "late";
export type FormStatus = "pending" | "accepted" | "rejected";
export type FormCountedAs = "excuse" | "absence";

export type TeamGroup =
  | "director"
  | "assistant_director"
  | "president"
  | "vice_president"
  | "backstage"
  | "media"
  | "cast";

/** Order the groups appear on the public team page. */
export const TEAM_GROUP_ORDER: TeamGroup[] = [
  "director",
  "assistant_director",
  "president",
  "vice_president",
  "backstage",
  "media",
  "cast",
];

export const TEAM_GROUP_LABEL: Record<TeamGroup, string> = {
  director: "Director",
  assistant_director: "Assistant director",
  president: "President",
  vice_president: "Vice president",
  backstage: "Backstage",
  media: "Media team",
  cast: "Cast",
};
