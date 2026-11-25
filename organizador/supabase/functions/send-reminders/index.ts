// Edge Function: envía los recordatorios push vencidos.
// La invoca pg_cron cada minuto (ver supabase/cron.sql).
// Secrets necesarios: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los provee Supabase).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const env = (k: string) => Deno.env.get(k) ?? "";

webpush.setVapidDetails(
  env("VAPID_SUBJECT") || "mailto:avisos@example.com",
  env("VAPID_PUBLIC_KEY"),
  env("VAPID_PRIVATE_KEY"),
);

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
type Due = { id: string; title: string; body: string; url: string; kind: string; subs: Sub[] };

Deno.serve(async (req) => {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const { data, error } = await db.rpc("take_due_notifications");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const due = (data ?? []) as Due[];
  const dead = new Set<string>();
  let sent = 0, failed = 0;

  await Promise.all(due.flatMap((n) =>
    n.subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: `${n.kind}-${n.id}` }),
          { TTL: 60 * 60 * 6, urgency: "high" },
        );
        sent++;
      } catch (e) {
        failed++;
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.add(s.id);
        console.error("push error", code, (e as Error).message);
      }
    })
  ));

  if (dead.size) await db.from("push_subscriptions").delete().in("id", [...dead]);
  return Response.json({ notifications: due.length, sent, failed, removed: dead.size });
});
