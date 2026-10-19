import type { Metadata } from "next";
import { connection } from "next/server";
import { deleteMilestone } from "@/app/actions/content";
import { ActionButton } from "@/components/ActionButton";
import { MilestoneForm, SettingsForm } from "@/components/ContentForms";
import { getMilestones, getSettings } from "@/lib/content";

export const metadata: Metadata = { title: "Public content" };

export default async function StaffContentPage() {
  await connection();
  const [settings, milestones] = await Promise.all([getSettings(), getMilestones()]);

  return (
    <div className="container">
      <h1 className="display page-title">Public content</h1>
      <p className="lead">Everything visitors see on the public site is edited here.</p>

      <h2 className="display section-title">Story and footer</h2>
      <SettingsForm values={settings} />

      <h2 className="display section-title">Milestones</h2>
      <div className="edit-stack">
        {milestones.map((m) => (
          <details key={m.id} className="edit-box">
            <summary>
              <span className="display">{m.year}</span> {m.title}
            </summary>
            <div className="edit-body">
              <MilestoneForm m={m} />
              <ActionButton
                action={deleteMilestone.bind(null, m.id)}
                label="Remove milestone"
                confirm="Remove this milestone?"
                variant="danger"
              />
            </div>
          </details>
        ))}
      </div>
      <h3 className="display section-title small">Add a milestone</h3>
      <MilestoneForm />
    </div>
  );
}
