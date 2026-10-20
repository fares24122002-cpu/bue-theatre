export type Role = "staff" | "actor";

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
