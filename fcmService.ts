import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Unsubscribe 
} from 'firebase/firestore';
import { app, db } from './firebase';
import { CatalogMeta } from './types';
import { api } from './api';

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'CATALOG_UPDATE' | 'ORDER_UPDATE' | 'SYSTEM';
  totalProducts?: number;
  lastUpdated?: string;
  createdAt: string;
  sourceName?: string;
}

export interface FcmDeviceRecord {
  token: string;
  vendorName: string;
  userAgent: string;
  registeredAt: string;
  lastSeenAt: string;
  enabled: boolean;
}

class FCMService {
  private messagingInstance: any = null;
  private currentToken: string | null = null;
  private isMessagingSupported: boolean | null = null;
  private foregroundListenerSetup = false;

  constructor() {
    this.checkSupport();
    this.listenToSwMessages();
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  private async checkSupport(): Promise<boolean> {
    if (this.isMessagingSupported !== null) return this.isMessagingSupported;
    try {
      const supported = await isSupported();
      this.isMessagingSupported = supported;
      return supported;
    } catch {
      this.isMessagingSupported = false;
      return false;
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  private listenToSwMessages(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FCM_CATALOG_REFRESH') {
        console.log('[FCM] Mensagem recebida do Service Worker para atualizar catálogo!');
        api.syncCatalog(true).catch(() => {});
      }
    });
  }

  /**
   * Inicializa o Firebase Cloud Messaging e obtém o token de registro do dispositivo
   */
  public async initFCM(vendorName: string = 'Vendedor'): Promise<string | null> {
    if (!this.isSupported()) return null;

    try {
      const supported = await this.checkSupport();
      if (!supported) {
        console.warn('[FCM] Firebase Cloud Messaging não suportado neste navegador.');
        return null;
      }

      if (Notification.permission !== 'granted') {
        return null;
      }

      // Garante o registro do Service Worker para o FCM
      let registration: ServiceWorkerRegistration | undefined;
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('[FCM] Aviso ao registrar firebase-messaging-sw.js, tentando SW existente:', swErr);
        registration = await navigator.serviceWorker.ready;
      }

      this.messagingInstance = getMessaging(app);

      // Obtenção do Token FCM
      const token = await getToken(this.messagingInstance, {
        serviceWorkerRegistration: registration,
      }).catch((tokenErr) => {
        console.warn('[FCM] Aviso ao obter token FCM:', tokenErr.message);
        return null;
      });

      if (token) {
        this.currentToken = token;
        await this.saveTokenToFirestore(token, vendorName);
        console.log('[FCM] ✅ Dispositivo registrado no Firebase Cloud Messaging!');
      }

      // Configura listener de primeiro plano (quando o app já está aberto)
      if (!this.foregroundListenerSetup && this.messagingInstance) {
        this.foregroundListenerSetup = true;
        onMessage(this.messagingInstance, (payload) => {
          console.log('[FCM Foreground] Notificação Push recebida no app aberto:', payload);
          
          const title = payload.notification?.title || payload.data?.title || '📦 Catálogo Atualizado!';
          const body = payload.notification?.body || payload.data?.body || 'Novo estoque disponível na Marsil Boracéia.';

          // Dispara notificação nativa do sistema operacional
          this.triggerNativeNotification(title, body);

          // Sincroniza imediatamente o catálogo em segundo plano
          api.syncCatalog(true).catch(() => {});
        });
      }

      return token;
    } catch (err: any) {
      console.warn('[FCM] Erro na inicialização do FCM:', err.message);
      return null;
    }
  }

  /**
   * Solicita autorização de Notificações ao usuário
   */
  public async requestPushPermission(vendorName: string = 'Vendedor'): Promise<{
    granted: boolean;
    token?: string;
    error?: string;
  }> {
    if (!this.isSupported()) {
      return { granted: false, error: 'Notificações não são suportadas neste dispositivo/navegador.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.initFCM(vendorName);
        return { granted: true, token: token || undefined };
      } else {
        return { granted: false, error: 'Permissão de notificação negada no navegador.' };
      }
    } catch (err: any) {
      return { granted: false, error: err.message || 'Erro ao solicitar permissão de notificações.' };
    }
  }

  /**
   * Registra o token FCM no Firestore para controle do administrador
   */
  private async saveTokenToFirestore(token: string, vendorName: string): Promise<void> {
    try {
      const safeId = token.slice(-25).replace(/[^a-zA-Z0-9]/g, '_');
      const docRef = doc(db, 'fcm_tokens', safeId);
      const record: FcmDeviceRecord = {
        token,
        vendorName: vendorName || 'Vendedor',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'Web App',
        registeredAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        enabled: true
      };
      await setDoc(docRef, record, { merge: true });
    } catch (err: any) {
      console.warn('[FCM] Aviso ao salvar token no Firestore:', err.message);
    }
  }

  /**
   * Dispara uma notificação nativa no sistema operacional
   */
  public triggerNativeNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      // Tenta disparar via Service Worker (mais confiável em mobile Android/PWA)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          const opts: any = {
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            tag: 'marsil-push-alert',
            renotify: true
          };
          reg.showNotification(title, opts);
        }).catch(() => {
          new Notification(title, { body, icon: '/pwa-192x192.png' });
        });
      } else {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      }
    } catch (e) {
      console.warn('[FCM] Aviso ao exibir notificação nativa:', e);
    }
  }

  /**
   * Escuta em tempo real notificações de catálogo salvas no Firestore.
   * Garante entrega universal para todos os dispositivos Android/iOS/Desktop
   */
  public subscribeToPushNotifications(callback: (item: PushNotificationItem) => void): Unsubscribe {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));

    let isInitialSnapshot = true;

    return onSnapshot(q, (snapshot) => {
      // Ignora o primeiro carregamento histórico para não disparar notificação antiga
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          const notif: PushNotificationItem = {
            id: change.doc.id,
            title: data.title || '📦 Catálogo Marsil Atualizado!',
            body: data.body || 'Novo estoque disponível.',
            type: data.type || 'CATALOG_UPDATE',
            totalProducts: data.totalProducts,
            lastUpdated: data.lastUpdated,
            createdAt: data.createdAt || new Date().toISOString(),
            sourceName: data.sourceName
          };

          // 1. Dispara som/vibração e notificação nativa se o usuário permitiu
          this.triggerNativeNotification(notif.title, notif.body);

          // 2. Força sincronização imediata do catálogo para visibilidade instantânea
          api.syncCatalog(true).catch(() => {});

          // 3. Notifica componente UI
          callback(notif);
        }
      });
    }, (err) => {
      console.warn('[FCM] Erro ao escutar notificações no Firestore:', err.message);
    });
  }

  /**
   * Envia uma notificação de atualização de catálogo a todos os vendedores.
   * Acionado pelo Administrador ao importar nova planilha.
   */
  public async sendCatalogNotification(meta: CatalogMeta, count: number, customMessage?: string): Promise<void> {
    try {
      const nowIso = new Date().toISOString();
      const notifId = `notif_${Date.now()}`;
      const title = '📦 Catálogo Marsil Atualizado!';
      const body = customMessage || `A planilha foi atualizada pelo administrador com ${count.toLocaleString('pt-BR')} itens disponíveis para consulta!`;

      // 1. Salva documento de notificação no Firestore (ouvido instantaneamente por todos os clientes)
      const docRef = doc(db, 'notifications', notifId);
      await setDoc(docRef, {
        title,
        body,
        type: 'CATALOG_UPDATE',
        totalProducts: count,
        lastUpdated: meta.lastUpdated || nowIso,
        sourceName: meta.sourceName || 'Upload de Planilha',
        createdAt: nowIso
      });

      // 2. Notifica o backend Node para acionar transmissão SSE aos conectados
      try {
        await fetch('/api/notify-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            count,
            lastUpdated: meta.lastUpdated || nowIso
          })
        });
      } catch {}

      console.log(`[FCM] Notificação push de catálogo (${count} itens) enviada aos vendedores com sucesso!`);
    } catch (err: any) {
      console.warn('[FCM] Falha ao enviar notificação de catálogo:', err.message);
    }
  }

  /**
   * Retorna o total de dispositivos registrados
   */
  public async getRegisteredDevicesCount(): Promise<number> {
    try {
      const colRef = collection(db, 'fcm_tokens');
      const snap = await getDocs(colRef);
      return snap.size;
    } catch {
      return 0;
    }
  }
}

export const fcmService = new FCMService();
