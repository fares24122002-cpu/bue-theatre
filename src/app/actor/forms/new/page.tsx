import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SendFormForm } from "@/components/SendFormForm";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Send a form" };

export default async function NewFormPage({
  searchParams,
}: PageProps<"/actor/forms/new">) {
  await connection();
  const me = await requireRole("actor");
  const sp = await searchParams;
  const wanted = Array.isArray(sp.session) ? sp.session[0] : sp.session;

  const supabase = await createClient();
  const [{ data: sessions }, { data: sent }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id,title,starts_at")
      .eq("cancelled", false)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(30),
    supabase.from("forms").select("session_id").eq("actor_id", me.id),
  ]);
  const already = new Set((sent ?? []).map((f) => f.session_id));
  const options = (sessions ?? [])
    .filter((s) => !already.has(s.id))
    .map((s) => ({
      id: s.id,
      label: `${formatDay(s.starts_at)} ${formatTime(s.starts_at)} · ${s.title}`,
    }));

  return (
    <div className="container narrow">
      <Link href="/actor" className="back-link">
        ← My dashboard
      </Link>
      <h1 className="display page-title">Send a form</h1>
      {options.length === 0 ? (
        <p className="empty">
          There is no upcoming workshop you can send a form for. You can send one
          form per workshop, before it starts.
        </p>
      ) : (
        <SendFormForm
          sessions={options}
          selectedId={options.some((o) => o.id === wanted) ? (wanted ?? null) : null}
        />
      )}
    </div>
  );
}
