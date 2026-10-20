import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFullDay, formatTime } from "@/lib/time";

/**
 * Email sending. Two ways to set it up (the site works without either; it just
 * sends no email):
 *
 * 1. SMTP (recommended: a free Gmail account works, no domain needed).
 *    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.
 * 2. Resend (https://resend.com): RESEND_API_KEY and EMAIL_FROM. Resend only
 *    delivers to strangers once you verify your own domain there.
 *
 * If both are set, SMTP is used.
 */
const smtpConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const resendConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

/** Why the last email in this request failed, so staff can see it. */
let lastEmailError = "";
export const getLastEmailError = () => lastEmailError;

export function emailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

type Attachment = { filename: string; content: string; contentId?: string };

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
}): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    if (smtpConfigured()) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          encoding: "base64",
          ...(a.contentId ? { cid: a.contentId } : {}),
        })),
      });
      return true;
    }

    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          ...(a.contentId ? { content_id: a.contentId } : {}),
        })),
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      lastEmailError = `Resend refused it (${res.status}): ${body}`;
      console.error("Email not sent:", lastEmailError);
      return false;
    }
    return true;
  } catch (err) {
    lastEmailError = err instanceof Error ? err.message : String(err);
    console.error("Email not sent:", lastEmailError);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain poster-style frame shared by every email. */
function frame(inner: string): string {
  return `<div style="background:#f2f2f2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff;border:4px solid #111">
<div style="background:#111;color:#fff;padding:16px 24px;font-size:26px;font-weight:bold;letter-spacing:1px">BUE THEATRE<span style="color:#d42a24">.</span></div>
<div style="padding:24px;font-size:16px;line-height:1.5">${inner}</div>
</div></div>`;
}

const button = (href: string, label: string) =>
  `<p><a href="${esc(href)}" style="display:inline-block;background:#d42a24;color:#fff;padding:14px 22px;font-weight:bold;text-decoration:none">${esc(label)}</a></p>`;

/**
 * Sends every notification that was created in the database but not emailed
 * yet (new forms for staff, form decisions, account changes). Safe to call
 * often and from several places at once: each notification is claimed before
 * it is sent, so nobody gets two copies.
 */
export async function flushNotificationEmails(siteUrl?: string): Promise<void> {
  if (!emailConfigured()) return;
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("notifications")
    .select("id")
    .eq("emailed", false)
    .order("created_at", { ascending: true })
    .limit(50);
  if (!pending?.length) return;

  const { data: claimed } = await admin
    .from("notifications")
    .update({ emailed: true })
    .in("id", pending.map((p) => p.id))
    .eq("emailed", false)
    .select("id,message,user:profiles(email,full_name)");

  for (const n of claimed ?? []) {
    const person = Array.isArray(n.user) ? n.user[0] : n.user;
    if (!person?.email) continue;
    const link = siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const ok = await sendEmail({
      to: person.email,
      subject: n.message.length > 70 ? `${n.message.slice(0, 67)}...` : n.message,
      text: `Hi ${person.full_name},\n\n${n.message}\n\n${link}`,
      html: frame(
        `<p>Hi ${esc(person.full_name)},</p><p style="font-size:18px"><strong>${esc(n.message)}</strong></p>${
          link ? button(`${link}/login`, "Open the website") : ""
        }`,
      ),
    });
    if (!ok) await admin.from("notifications").update({ emailed: false }).eq("id", n.id);
  }
}

/** Emails the ticket (with the QR code) for one reservation. */
export async function sendTicketEmail(code: string, siteUrl: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select("name,email,tickets,show:shows(title,starts_at,venue,map_url)")
    .eq("ticket_code", code)
    .maybeSingle();
  const show = Array.isArray(r?.show) ? r?.show[0] : r?.show;
  if (!r || !show) return false;

  const ticketUrl = `${siteUrl}/ticket/${code}`;
  const png = await QRCode.toBuffer(ticketUrl, { width: 480, margin: 2 });
  const when = `${formatFullDay(show.starts_at)} · ${formatTime(show.starts_at)}`;
  const count = `${r.tickets} ${r.tickets === 1 ? "ticket" : "tickets"}`;

  return sendEmail({
    to: r.email,
    subject: `Your tickets for ${show.title}`,
    text: `Hi ${r.name},\n\nYou are booked: ${show.title}, ${when}${show.venue ? `, ${show.venue}` : ""}. ${count}.\n\nYour ticket: ${ticketUrl}\nShow the QR code at the door.`,
    html: frame(
      `<p>Hi ${esc(r.name)}, you are booked!</p>
<p style="font-size:30px;font-weight:bold;margin:8px 0">${esc(show.title)}</p>
<p style="margin:4px 0">${esc(when)}</p>
${show.venue ? `<p style="margin:4px 0">${esc(show.venue)}</p>` : ""}
${show.map_url ? `<p style="margin:4px 0"><a href="${esc(show.map_url)}">Open in maps</a></p>` : ""}
<p style="font-size:20px;font-weight:bold;color:#d42a24">${esc(count)}</p>
<p><img src="cid:ticket-qr" width="240" height="240" alt="Your ticket QR code"></p>
<p>Show this QR code at the door. You can also open your ticket online:</p>
${button(ticketUrl, "View your ticket")}`,
    ),
    attachments: [
      { filename: "ticket-qr.png", content: png.toString("base64"), contentId: "ticket-qr" },
    ],
  });
}
