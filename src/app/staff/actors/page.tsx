import type { Metadata } from "next";
import { connection } from "next/server";
import { ActionButton } from "@/components/ActionButton";
import { AddAccountForm, GroupsForm, PasswordForm } from "@/components/AccountForms";
import { GroupFilter, readGroupFilter } from "@/components/GroupFilter";
import { setActive, setGroupActive } from "@/app/actions/accounts";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_ABSENCES, MAX_EXCUSES, attendanceRate } from "@/lib/rules";
import { LANGUAGES, LANGUAGE_LABEL, type Language } from "@/lib/types";

export const metadata: Metadata = { title: "Actors" };

type Stats = {
  actor_id: string;
  language: Language;
  present: number;
  late: number;
  excused: number;
  absent: number;
};
type Group = {
  actor_id: string;
  language: Language;
  active: boolean;
  excuses_used: number;
  absences_used: number;
};

export default async function StaffActorsPage({
  searchParams,
}: PageProps<"/staff/actors">) {
  await connection();
  const filter = readGroupFilter(await searchParams);
  const me = await requireRole("staff");
  const supabase = await createClient();
  const [{ data: people }, { data: stats }, { data: groupRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,role,active")
      .order("full_name"),
    supabase.rpc("actor_group_stats"),
    supabase.from("actor_groups").select("actor_id,language,active,excuses_used,absences_used"),
  ]);
  const statsOf = new Map<string, Stats>(
    ((stats ?? []) as Stats[]).map((s) => [`${s.actor_id}:${s.language}`, s]),
  );
  const groupsOf = new Map<string, Group[]>();
  for (const g of (groupRows ?? []) as Group[]) {
    groupsOf.set(g.actor_id, [...(groupsOf.get(g.actor_id) ?? []), g]);
  }
  const everyone = (people ?? []).filter((p) => p.role === "actor");
  const actors = everyone.filter(
    (a) => !filter || (groupsOf.get(a.id) ?? []).some((g) => g.language === filter),
  );
  const staff = (people ?? []).filter((p) => p.role === "staff");
  const inactive = actors.filter((a) => !a.active).length;

  return (
    <div className="container">
      <h1 className="display page-title">Actors</h1>

      <details className="add-box">
        <summary className="btn-solid display">+ ADD A PERSON</summary>
        <div className="add-body">
          <AddAccountForm />
        </div>
      </details>

      <h2 className="display section-title">
        Actors ({actors.length}
        {inactive > 0 ? `, ${inactive} deactivated` : ""})
      </h2>
      <GroupFilter base="/staff/actors" current={filter} />
      {actors.length === 0 ? (
        <p className="empty">
          {everyone.length === 0
            ? "No actors yet. Add the first one above."
            : "No actors in this group."}
        </p>
      ) : (
        <ul className="cards">
          {actors.map((a) => {
            const groups = (groupsOf.get(a.id) ?? [])
              .filter((g) => !filter || g.language === filter)
              .sort((x, y) => LANGUAGES.indexOf(x.language) - LANGUAGES.indexOf(y.language));
            const allGroups = (groupsOf.get(a.id) ?? []).map((g) => g.language);
            return (
              <li key={a.id} className="card">
                <p className="card-title">
                  <strong>{a.full_name}</strong>
                  {!a.active ? <span className="chip chip-absent">Deactivated</span> : null}
                </p>
                <p className="muted">{a.email}</p>

                {groups.length === 0 ? (
                  <p className="form-hint">Not in any group yet. Choose one below.</p>
                ) : (
                  groups.map((g) => {
                    const st = statsOf.get(`${a.id}:${g.language}`);
                    const rate = st
                      ? attendanceRate({
                          present: st.present,
                          late: st.late,
                          excused: st.excused,
                          absent: st.absent,
                        })
                      : null;
                    return (
                      <div key={g.language} className="group-line">
                        <p className="card-title">
                          <strong>{LANGUAGE_LABEL[g.language]}</strong>
                          {!g.active ? <span className="chip chip-absent">Removed from group</span> : null}
                        </p>
                        <dl className="stat-row stat-small">
                          <div><dt>Rate</dt><dd>{rate === null ? "—" : `${rate}%`}</dd></div>
                          <div><dt>Late</dt><dd>{st?.late ?? 0}</dd></div>
                          <div><dt>Excuses</dt><dd>{g.excuses_used}/{MAX_EXCUSES}</dd></div>
                          <div><dt>Absences</dt><dd>{g.absences_used}/{MAX_ABSENCES}</dd></div>
                        </dl>
                        <ActionButton
                          action={setGroupActive.bind(null, a.id, g.language, !g.active)}
                          label={g.active ? `Remove from ${LANGUAGE_LABEL[g.language]}` : `Put back in ${LANGUAGE_LABEL[g.language]}`}
                          confirm={g.active ? `Remove ${a.full_name} from the ${LANGUAGE_LABEL[g.language]} group?` : undefined}
                          variant={g.active ? "danger" : "default"}
                        />
                      </div>
                    );
                  })
                )}

                <GroupsForm profileId={a.id} groups={allGroups} />
                <div className="actions tight">
                  <ActionButton
                    action={setActive.bind(null, a.id, !a.active)}
                    label={a.active ? "Deactivate" : "Reactivate"}
                    confirm={a.active ? `Deactivate ${a.full_name}? They will not be able to log in.` : undefined}
                    variant={a.active ? "danger" : "default"}
                  />
                  <PasswordForm profileId={a.id} name={a.full_name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="display section-title">Staff ({staff.length})</h2>
      <ul className="list">
        {staff.map((s) => (
          <li key={s.id} className="list-row static">
            <span className="list-main">
              <strong>
                {s.full_name}
                {s.id === me.id ? " (you)" : ""}
              </strong>
              <span className="muted">{s.email}</span>
            </span>
            {!s.active ? <span className="chip chip-absent">Deactivated</span> : null}
            {s.id !== me.id ? (
              <>
                <ActionButton
                  action={setActive.bind(null, s.id, !s.active)}
                  label={s.active ? "Deactivate" : "Reactivate"}
                  confirm={s.active ? `Deactivate ${s.full_name}?` : undefined}
                  variant={s.active ? "danger" : "default"}
                />
                <PasswordForm profileId={s.id} name={s.full_name} />
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
