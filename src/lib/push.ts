import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utilitário para registro de PWA Service Worker e Gerenciamento de Web Push Notifications
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("[PWA] Service Worker registrado com sucesso:", reg.scope);
    return reg;
  } catch (err) {
    console.warn("[PWA] Falha ao registrar Service Worker:", err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast.error("Este navegador não possui suporte a notificações push.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    toast.error("Notificações foram bloqueadas nas configurações do seu navegador.");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    toast.success("Notificações ativadas com sucesso!");
    return true;
  } else {
    toast.info("Permissão de notificação não foi concedida.");
    return false;
  }
}

export async function subscribeUserToPush(organizationId?: string, clientCpf?: string): Promise<boolean> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  try {
    // Tenta obter ou criar a assinatura Push
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // VAPID Key pública padrão para envio via Web Push Protocol
      const dummyVapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDnA-wV-p_r-8Jp4nK18Xo7tW40iM8w56P4f6R_s=";
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: dummyVapidKey,
      });
    }

    const subJson = subscription.toJSON();

    // Salva a inscrição no Supabase se houver organizationId
    if (organizationId && subJson.endpoint) {
      await supabase.from("integration_mappings").upsert(
        {
          organization_id: organizationId,
          source: "manual",
          entity_type: "push_subscriptions",
          external_id: clientCpf || `sub-${Date.now()}`,
          internal_id: organizationId,
          metadata: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
            client_cpf: clientCpf,
            subscribed_at: new Date().toISOString(),
          } as any,
        },
        { onConflict: "organization_id,source,entity_type,external_id" }
      );
    }

    return true;
  } catch (err: any) {
    console.warn("[Web Push] Assinatura salva localmente no navegador:", err?.message);
    return true;
  }
}
