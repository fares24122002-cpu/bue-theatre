import type { Metadata } from "next";
import { connection } from "next/server";
import { ReviewForm } from "@/components/ReviewForm";
import { createClient } from "@/lib/supabase/server";
import { GroupFilter, readGroupFilter } from "@/components/GroupFilter";
import { MAX_ABSENCES, MAX_EXCUSES } from "@/lib/rules";
import { LANGUAGE_LABEL, sessionHasGroup, type Language, type SessionLanguage } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Forms" };

type Person = { full_name: string };
type Sess = { title: string; starts_at: string; language: SessionLanguage };
type FormRow = {
  id: string;
  type: "absence" | "late";
  reason: string;
  expected_arrival: string | null;
  actor_id: string;
  status: "pending" | "accepted" | "rejected";
  counted_as: "excuse" | "absence" | null;
  created_at: string;
  actor: Person | Person[] | null;
  session: Sess | Sess[] | null;
};

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

export default async function StaffFormsPage({
  searchParams,
}: PageProps<"/staff/forms">) {
  await connection();
  const group = readGroupFilter(await searchParams);
  const supabase = await createClient();
  const [{ data }, { data: groupRows }] = await Promise.all([supabase
    .from("forms")
    .select(
      "id,actor_id,type,reason,expected_arrival,status,counted_as,created_at, actor:profiles!forms_actor_id_fkey(full_name), session:sessions(title,starts_at,language)",
    )
    .order("created_at", { ascending: false })
    .limit(100),
    supabase.from("actor_groups").select("actor_id,language,excuses_used,absences_used"),
  ]);
  const groups = (groupRows ?? []) as {
    actor_id: string;
    language: Language;
    excuses_used: number;
    absences_used: number;
  }[];
  // The excuse and absence counts that matter are those of the groups the
  // workshop is for.
  const countsFor = (actorId: string, lang: SessionLanguage | undefined) => {
    const mine = groups.filter(
      (g) => g.actor_id === actorId && (!lang || sessionHasGroup(lang, g.language)),
    );
    return {
      excuses: Math.max(0, ...mine.map((g) => g.excuses_used)),
      absences: Math.max(0, ...mine.map((g) => g.absences_used)),
    };
  };
  const forms = ((data ?? []) as unknown as FormRow[]).filter((f) => {
    const s = one(f.session);
    return !group || !s || sessionHasGroup(s.language, group);
  });
  const pending = forms.filter((f) => f.status === "pending").reverse();
  const handled = forms.filter((f) => f.status !== "pending").slice(0, 30);

  return (
    <div className="container">
      <h1 className="display page-title">Forms</h1>

      <GroupFilter base="/staff/forms" current={group} />

      <h2 className="display section-title">To review ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="empty">Nothing waiting.</p>
      ) : (
        <ul className="cards">
          {pending.map((f) => {
            const actor = one(f.actor);
            const s = one(f.session);
            const counts = countsFor(f.actor_id, s?.language);
            const excusesLeft = counts.excuses < MAX_EXCUSES;
            return (
              <li key={f.id} className="card">
                <p className="card-title">
                  <strong>{actor?.full_name ?? "Unknown"}</strong>{" "}
                  <span className={f.type === "absence" ? "chip chip-absent" : "chip chip-late"}>
                    {f.type === "absence" ? "Absence" : "Late"}
                  </span>
                </p>
                <p>
                  {s ? `${s.title}, ${formatDay(s.starts_at)} ${formatTime(s.starts_at)}` : ""}
                  {s ? ` · ${LANGUAGE_LABEL[s.language]}` : ""}
                  {f.type === "late" && f.expected_arrival
                    ? ` · expects to arrive ${f.expected_arrival.slice(0, 5)}`
                    : ""}
                </p>
                <p className="reason">&ldquo;{f.reason}&rdquo;</p>
                {actor ? (
                  <p className="muted">
                    Excuses used {counts.excuses}/{MAX_EXCUSES} · absences{" "}
                    {counts.absences}/{MAX_ABSENCES}
                    {f.type === "absence"
                      ? excusesLeft
                        ? " · accepting counts as an excuse"
                        : " · accepting counts as an absence (unless urgent)"
                      : " · lateness has no penalty"}
                    {f.type === "absence" ? " · rejecting counts as an absence" : ""}
                  </p>
                ) : null}
                <ReviewForm
                  formId={f.id}
                  canBeUrgent={f.type === "absence" && !excusesLeft}
                />
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="display section-title">Handled</h2>
      {handled.length === 0 ? (
        <p className="empty">Nothing yet.</p>
      ) : (
        <ul className="list">
          {handled.map((f) => {
            const actor = one(f.actor);
            const s = one(f.session);
            return (
              <li key={f.id} className="list-row static">
                <span className="list-main">
                  <strong>
                    {actor?.full_name ?? "Unknown"} · {f.type === "absence" ? "Absence" : "Late"}
                  </strong>
                  <span className="muted">
                    {s ? `${s.title}, ${formatDay(s.starts_at)}` : ""} · &ldquo;{f.reason}&rdquo;
                  </span>
                </span>
                <span className={f.status === "accepted" ? "chip chip-present" : "chip chip-absent"}>
                  {f.status === "accepted"
                    ? f.counted_as
                      ? `Accepted, ${f.counted_as}`
                      : "Accepted"
                    : f.type === "absence"
                      ? "Rejected, absence"
                      : "Rejected"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
