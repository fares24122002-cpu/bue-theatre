export type Role = "staff" | "actor";

export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export type FormType = "absence" | "late";
export type FormStatus = "pending" | "accepted" | "rejected";
export type FormCountedAs = "excuse" | "absence";

export type TeamGroup =
  | "director"
  | "assistant_director"
  | "backstage"
  | "media"
  | "cast";

/** Order the groups appear on the public team page. */
export const TEAM_GROUP_ORDER: TeamGroup[] = [
  "director",
  "assistant_director",
  "backstage",
  "media",
  "cast",
];

export const TEAM_GROUP_LABEL: Record<TeamGroup, string> = {
  director: "Director",
  assistant_director: "Assistant director",
  backstage: "Backstage",
  media: "Media team",
  cast: "Cast",
};
