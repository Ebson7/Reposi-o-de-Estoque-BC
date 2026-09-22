import { registerSW } from 'virtual:pwa-register';

let updateSWInstance: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initPwaUpdateManager() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    updateSWInstance = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] Nova versão detectada! Atualizando imediatamente...');
        if (updateSWInstance) {
          updateSWInstance(true);
        }
      },
      onOfflineReady() {
        console.log('[PWA] Aplicativo pronto para funcionamento offline.');
      },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;

        console.log('[PWA] Service Worker registrado em:', swUrl);

        // Verifica novas versões a cada 45 segundos em segundo plano
        setInterval(() => {
          registration.update().catch((err) => console.warn('[PWA] Erro na verificação periódica:', err));
        }, 45 * 1000);

        // Verifica imediatamente quando a aba ou app volta ao primeiro plano (visibilidade)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        // Verifica quando a conexão de rede é restabelecida
        window.addEventListener('online', () => {
          registration.update().catch(() => {});
        });
      }
    });

    // Quando o novo Service Worker assume o controle (controllerchange), recarrega a página de forma transparente
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('[PWA] Novo Service Worker ativo. Recarregando aplicação...');
        window.location.reload();
      }
    });
  } catch (err) {
    console.warn('[PWA] Não foi possível registrar gerenciador PWA:', err);
  }
}

/**
 * Função utilitária para forçar a limpeza total de cache e recarregar a versão mais recente
 */
export async function forceAppFullUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (err) {
    console.warn('[PWA] Erro ao limpar caches:', err);
  } finally {
    // Força recarregamento do servidor
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
  }
}
