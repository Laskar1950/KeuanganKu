import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC || null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(familyId: string): Promise<{ ok: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push tidak didukung di browser ini." };
  const vapid = getVapidPublicKey();
  if (!vapid) return { ok: false, error: "VAPID public key belum diatur." };
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Izin notifikasi ditolak." };
  }
  if (!familyId) return { ok: false, error: "Family ID tidak tersedia." };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Ensure we have stored it
    await saveSubscriptionToDB(existing, familyId);
    return { ok: true, subscription: existing };
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });

  await saveSubscriptionToDB(sub, familyId);
  return { ok: true, subscription: sub };
}

async function saveSubscriptionToDB(sub: PushSubscription, familyId: string) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null };
  const endpoint = json.endpoint || (sub as unknown as { endpoint: string }).endpoint;
  const p256dh = json.keys?.p256dh || "";
  const auth = json.keys?.auth || "";
  const expirationTime = json.expirationTime ? new Date(json.expirationTime).toISOString() : null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Harus login untuk menyimpan subscription.");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      family_id: familyId,
      endpoint,
      p256dh,
      auth,
      expirationTime,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function unsubscribePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push tidak didukung." };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };
  const endpoint = (sub.toJSON() as { endpoint?: string }).endpoint || (sub as unknown as { endpoint: string }).endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    // ignore
  }
  // Remove from DB
  try {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } catch {
    // ignore
  }
  return { ok: true };
}

export async function isSubscribed(familyId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const sub = await getExistingSubscription();
  if (!sub) return false;
  if (!familyId) return true;
  // Also check DB has this endpoint for this family
  const endpoint = (sub.toJSON() as { endpoint?: string }).endpoint || "";
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .eq("family_id", familyId)
    .maybeSingle();
  return !!data;
}
