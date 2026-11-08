import { supabase } from "@/integrations/supabase/client";
import { BASE_PATH } from "@/lib/appUrl";

/** Chave pública VAPID (pode ficar no código; a privada fica só no banco/servidor). */
export const VAPID_PUBLIC_KEY = "BLkaYxdDaM2gAJwzR55QJdNkiqGGOd-ln-VO1Bq-6pz2WGZCdOCzG20Hd6k1yU48zEbZs5NLd_dJi6JegK0xiaI";

export type PushSupport =
  | "supported"
  | "ios-needs-install" // iPhone/iPad: só funciona com o sistema adicionado à Tela de Início
  | "unsupported";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIOS() && !isStandalone()) return "ios-needs-install";
  return hasApis ? "supported" : "unsupported";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  return navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` });
}

/** True quando este aparelho já está inscrito para receber notificações. */
export async function isPushEnabled(): Promise<boolean> {
  if (getPushSupport() !== "supported" || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration(`${BASE_PATH}/`);
  return !!(await reg?.pushManager.getSubscription());
}

/** Pede permissão, inscreve o aparelho e salva a inscrição do usuário logado. Precisa ser chamado num toque/clique. */
export async function enablePush(): Promise<void> {
  if (getPushSupport() !== "supported") throw new Error("Este aparelho não aceita notificações por aqui.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada. Libere nas configurações do celular.");
  const reg = await getRegistration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Faça login novamente.");
  const { error } = await supabase
    .from("push_subscriptions" as never)
    .upsert(
      { user_id: auth.user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 300) } as never,
      { onConflict: "endpoint" },
    );
  if (error) throw new Error("Não foi possível salvar a inscrição. Tente de novo.");
}

/** Remove a inscrição deste aparelho. */
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration(`${BASE_PATH}/`);
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions" as never).delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
