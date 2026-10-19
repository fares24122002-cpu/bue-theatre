import type { Metadata } from "next";
import { connection } from "next/server";
import { ActionButton } from "@/components/ActionButton";
import { AddAccountForm, PasswordForm } from "@/components/AccountForms";
import { setActive } from "@/app/actions/accounts";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_ABSENCES, MAX_EXCUSES, attendanceRate } from "@/lib/rules";

export const metadata: Metadata = { title: "Actors" };

type Stats = { actor_id: string; present: number; late: number; excused: number; absent: number };

export default async function StaffActorsPage() {
  await connection();
  const me = await requireRole("staff");
  const supabase = await createClient();
  const [{ data: people }, { data: stats }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,role,active,excuses_used,absences_used")
      .order("full_name"),
    supabase.rpc("actor_stats"),
  ]);
  const byActor = new Map<string, Stats>(
    ((stats ?? []) as Stats[]).map((s) => [s.actor_id, s]),
  );
  const actors = (people ?? []).filter((p) => p.role === "actor");
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
      {actors.length === 0 ? (
        <p className="empty">No actors yet. Add the first one above.</p>
      ) : (
        <ul className="cards">
          {actors.map((a) => {
            const st = byActor.get(a.id);
            const rate = st
              ? attendanceRate({
                  present: st.present,
                  late: st.late,
                  excused: st.excused,
                  absent: st.absent,
                })
              : null;
            return (
              <li key={a.id} className="card">
                <p className="card-title">
                  <strong>{a.full_name}</strong>
                  {!a.active ? <span className="chip chip-absent">Deactivated</span> : null}
                </p>
                <p className="muted">{a.email}</p>
                <dl className="stat-row stat-small">
                  <div><dt>Rate</dt><dd>{rate === null ? "—" : `${rate}%`}</dd></div>
                  <div><dt>Late</dt><dd>{st?.late ?? 0}</dd></div>
                  <div><dt>Excuses</dt><dd>{a.excuses_used}/{MAX_EXCUSES}</dd></div>
                  <div><dt>Absences</dt><dd>{a.absences_used}/{MAX_ABSENCES}</dd></div>
                </dl>
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
