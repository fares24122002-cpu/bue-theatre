import type { Metadata } from "next";
import { connection } from "next/server";
import { deleteTeamMember } from "@/app/actions/content";
import { ActionButton } from "@/components/ActionButton";
import { TeamMemberForm } from "@/components/ContentForms";
import { getTeam } from "@/lib/content";
import { TEAM_GROUP_LABEL, TEAM_GROUP_ORDER } from "@/lib/types";

export const metadata: Metadata = { title: "Team content" };

export default async function StaffTeamPage() {
  await connection();
  const team = await getTeam();

  return (
    <div className="container">
      <h1 className="display page-title">Team</h1>
      <p className="lead">
        Shown on the public site in this order: director, assistant director,
        president, vice president, backstage, media team, cast. Inside a group, people are sorted by the
        order number, then by name.
      </p>

      <details className="add-box">
        <summary className="btn-solid display">+ ADD A PERSON</summary>
        <div className="add-body">
          <TeamMemberForm />
        </div>
      </details>

      {TEAM_GROUP_ORDER.map((g) => {
        const members = team.filter((t) => t.team_group === g);
        return (
          <div key={g}>
            <h2 className="display section-title">
              {TEAM_GROUP_LABEL[g]} ({members.length})
            </h2>
            {members.length === 0 ? (
              <p className="empty">Nobody here yet.</p>
            ) : (
              <div className="edit-stack">
                {members.map((m) => (
                  <details key={m.id} className="edit-box">
                    <summary>
                      <strong>{m.name}</strong>
                      {m.role ? <span className="muted">{m.role}</span> : null}
                    </summary>
                    <div className="edit-body">
                      <TeamMemberForm m={m} />
                      <ActionButton
                        action={deleteTeamMember.bind(null, m.id)}
                        label="Remove from team"
                        confirm={`Remove ${m.name} from the public team page?`}
                        variant="danger"
                      />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
