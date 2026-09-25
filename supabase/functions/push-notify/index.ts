// Follow Deno + Supabase Edge Functions conventions
// Deploy: supabase functions deploy push-notify --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? Deno.env.get("VITE_VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@keuanganku.local";

  if (!supabaseUrl || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Missing env: SUPABASE_URL / VAPID keys" }, 500);
  }

  let body: {
    family_id?: string;
    notification_id?: string;
    title?: string;
    body?: string;
    message?: string;
    target?: string;
    type?: string;
    icon?: string;
    badge?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const familyId = body.family_id;
  if (!familyId) {
    return jsonResponse({ error: "family_id required" }, 400);
  }

  // Use service role for DB access (bypass RLS but we still verify membership)
  const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    }
  );

  // Verify caller is family member (if JWT present)
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data: membership } = await supabase
          .from("family_members")
          .select("role")
          .eq("family_id", familyId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!membership) {
          return jsonResponse({ error: "Not a family member" }, 403);
        }
      }
    }
  }

  // Coalesce: if many transaction notifs in last 10s, combine into one
  let title = body.title || "KeuanganKu — Transaksi Baru";
  let message = body.body || body.message || "Ada pencatatan baru di keluarga Anda.";
  const target = body.target || "transactions";
  const type = body.type || "transaction";

  try {
    // Count recent transaction notifications for this family (last 12 seconds)
    const { data: recentCountData } = await supabase
      .rpc("get_recent_notification_count", { p_family_id: familyId, p_seconds: 12 });
    const recentCount = typeof recentCountData === "number" ? recentCountData : Number(recentCountData) || 0;

    if (type === "transaction" && recentCount > 1) {
      title = `${recentCount} transaksi baru dicatat`;
      message = `Ada ${recentCount} pencatatan baru di keluarga Anda — buka untuk detail.`;
    }
  } catch {
    // ignore coalesce failure, use original
  }

  // Fetch push subscriptions for this family, filtered to owner/admin only
  // Join with family_members to ensure only managers get push
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, expirationTime, user_id, family_id, created_at")
    .eq("family_id", familyId);

  if (subsError) {
    return jsonResponse({ error: subsError.message }, 500);
  }

  if (!subs || subs.length === 0) {
    return jsonResponse({ ok: true, sent: 0, reason: "No subscriptions for family" });
  }

  // Filter to owner/admin only (as per requirement)
  // Need to fetch family_members roles for these user_ids
  const userIds = [...new Set(subs.map((s: { user_id: string }) => s.user_id))];
  const { data: members } = await supabase
    .from("family_members")
    .select("user_id, role")
    .eq("family_id", familyId)
    .in("user_id", userIds);

  const managerIds = new Set(
    (members || []).filter((m: { role: string }) => ["owner", "admin"].includes(m.role)).map((m: { user_id: string }) => m.user_id)
  );

  const targetSubs = subs.filter((s: { user_id: string }) => managerIds.has(s.user_id));

  if (targetSubs.length === 0) {
    return jsonResponse({ ok: true, sent: 0, reason: "No manager subscriptions" });
  }

  // Prepare web-push
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (e) {
    return jsonResponse({ error: `VAPID setup failed: ${String(e)}` }, 500);
  }

  const payload = JSON.stringify({
    title,
    body: message,
    icon: body.icon || "/pwa-192x192.png",
    badge: body.badge || "/pwa-192x192.png",
    tag: "keuanganku-transaction", // coalesce per family
    target,
    url: `/?target=${target}`,
    type,
  });

  let sent = 0;
  let failed = 0;
  const toDelete: string[] = [];

  await Promise.all(
    targetSubs.map(async (sub: { endpoint: string; p256dh: string; auth: string; expirationTime?: string }) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            expirationTime: sub.expirationTime ? new Date(sub.expirationTime).getTime() : undefined,
          } as unknown as Parameters<typeof webpush.sendNotification>[0],
          payload,
          { TTL: 60 * 60 * 24 } // 24h
        );
        sent++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        const code = err?.statusCode;
        // 410 Gone, 404 Not Found => subscription expired/invalid, queue for deletion
        if (code === 410 || code === 404) {
          toDelete.push(sub.endpoint);
        }
        // 429 rate limited? log but don't delete
        failed++;
        console.warn("push failed", sub.endpoint.slice(0, 60), err?.message || e);
      }
    })
  );

  // Cleanup expired subscriptions
  if (toDelete.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", toDelete);
  }

  return jsonResponse({
    ok: true,
    sent,
    failed,
    total: targetSubs.length,
    coalesced: title.includes("transaksi baru"),
    cleaned: toDelete.length,
  });
});
