// Sends one row of public.notifications: web push to subscribed devices and (when send_email) email via Resend.
// Called by the database (pg_net) right after a notification row is inserted; guarded by a shared secret.
// Emails go through public.email_queue: the database hands out only as many as today's allowance permits
// (the free email plan stops at 100 a day), and a daily { drain: true } call sends the ones left waiting.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SITE = "https://nursingcareerbd.com";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function emailHtml(n: { title: string; body: string | null; url: string | null }, name: string | null, token: string) {
  const link = n.url ? (n.url.startsWith("http") ? n.url : SITE + n.url) : SITE;
  const unsub = `${SITE}/unsubscribe?t=${token}`;
  return `<!doctype html><html><body style="margin:0;background:#eef4fb;font-family:'Hind Siliguri','Noto Sans Bengali',Arial,sans-serif;color:#0f2a4a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(15,42,74,.08)">
<tr><td style="background:linear-gradient(135deg,#0d47a1,#1f7ad6 60%,#db2777);padding:18px 24px;color:#fff;font-size:20px;font-weight:700">Nursing Career BD</td></tr>
<tr><td style="padding:24px">
${name ? `<p style="margin:0 0 10px;font-size:15px;color:#5b6b80">প্রিয় ${esc(name)},</p>` : ""}
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.4">${esc(n.title)}</h1>
${n.body ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.7">${esc(n.body)}</p>` : ""}
<a href="${link}" style="display:inline-block;background:#1f7ad6;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border-radius:12px">এখনই দেখুন →</a>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e3edf8;font-size:12px;line-height:1.6;color:#7a8799">
আপনি nursingcareerbd.com-এ অ্যাকাউন্ট খুলেছেন বলে এই ইমেইল পেয়েছেন।<br>
আর ইমেইল না চাইলে <a href="${unsub}" style="color:#1f7ad6">এখানে চাপুন</a>।</td></tr>
</table></td></tr></table></body></html>`;
}

type Claimed = { qid: number; to_email: string; to_name: string | null; to_token: string; n_title: string; n_body: string | null; n_url: string | null };

/** Send queued emails until today's allowance (or the queue) runs out. */
async function drain(notes: string[]): Promise<number> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { notes.push("email_no_key"); return 0; }
  let sent = 0;
  for (let round = 0; round < 12; round++) {
    const { data, error } = await sb.rpc("email_queue_claim");
    if (error) { notes.push(`email_claim:${error.message.slice(0, 120)}`); break; }
    const rows = (data ?? []) as Claimed[];
    if (!rows.length) break;
    const batch = rows.map((r) => {
      const n = { title: r.n_title, body: r.n_body, url: r.n_url };
      return {
        from: "Nursing Career BD <notify@nursingcareerbd.com>",
        to: [r.to_email],
        reply_to: "nursingcareerbd@gmail.com",
        subject: n.title,
        html: emailHtml(n, r.to_name, r.to_token),
        text: `${n.title}\n\n${n.body ?? ""}\n\n${n.url ? SITE + n.url : SITE}\n\nআর ইমেইল না চাইলে: ${SITE}/unsubscribe?t=${r.to_token}`,
        headers: { "List-Unsubscribe": `<${SITE}/unsubscribe?t=${r.to_token}>` },
      };
    });
    let ok = false;
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(batch),
      });
      ok = r.ok;
      if (!ok) notes.push(`email_http_${r.status}:${(await r.text()).slice(0, 120)}`);
    } catch (e) { notes.push(`email_error:${String(e).slice(0, 120)}`); }
    await sb.rpc("email_queue_done", { p_ids: rows.map((r) => r.qid), p_ok: ok });
    if (!ok) break;
    sent += rows.length;
  }
  return sent;
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("notify_config").select("*").eq("id", 1).single();
  if (!cfg || req.headers.get("x-notify-secret") !== cfg.secret) return json({ error: "forbidden" }, 403);
  const input = await req.json().catch(() => ({}));

  // daily call: send the emails that were left waiting
  if (input?.drain) {
    const notes: string[] = [];
    const emailSent = await drain(notes);
    return json({ drain: true, emailSent, notes });
  }

  const id = input?.id ?? null;
  // claim the row so a retry never sends twice
  const { data: claimed } = await sb.from("notifications").update({ status: "sending" }).eq("id", id).eq("status", "pending").select("*");
  const n = claimed?.[0];
  if (!n) return json({ skipped: true });

  let pushSent = 0, emailSent = 0; const notes: string[] = [];

  // ---- web push ----
  if (n.send_push) {
    try {
      webpush.setVapidDetails("mailto:nursingcareerbd@gmail.com", cfg.vapid_public, cfg.vapid_private);
      let q = sb.from("push_subscriptions").select("endpoint,p256dh,auth,user_id");
      if (n.only_user) q = q.eq("user_id", n.only_user);
      const { data: subs } = await q;
      const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.url ?? "/", tag: `ncbd-${n.id}` });
      const res = await Promise.allSettled((subs ?? []).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 })
          .then(() => { pushSent++; })
          .catch(async (e: { statusCode?: number }) => {
            if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            throw e;
          })));
      const failed = res.filter((r) => r.status === "rejected").length;
      if (failed) notes.push(`push_failed:${failed}`);
    } catch (e) { notes.push(`push_error:${String(e).slice(0, 120)}`); }
  }

  // ---- email: queue every recipient, then send what today's allowance permits ----
  if (n.send_email) {
    const { error } = await sb.rpc("email_queue_add", { p_notification: n.id });
    if (error) notes.push(`email_queue:${error.message.slice(0, 120)}`);
    else emailSent = await drain(notes);
  }

  // email_sent is kept by the queue (email_queue_done), so it is not written here
  await sb.from("notifications").update({ status: notes.length ? `sent (${notes.join("; ")})`.slice(0, 300) : "sent", push_sent: pushSent }).eq("id", n.id);
  return json({ id: n.id, pushSent, emailSent, notes });
});
