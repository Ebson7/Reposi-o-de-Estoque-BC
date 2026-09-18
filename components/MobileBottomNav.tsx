import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, ShieldCheck, Download, Smartphone, HelpCircle, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface MobileBottomNavProps {
  activeTab: 'user' | 'requests' | 'admin';
  setActiveTab: (tab: 'user' | 'requests' | 'admin') => void;
  authRole: 'none' | 'vendor' | 'admin';
  onOpenLogin: (role: 'admin') => void;
  pendingRequestsCount: number;
  onOpenHelp?: () => void;
  onOpenCart?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  authRole,
  onOpenLogin,
  pendingRequestsCount,
  onOpenHelp,
  onOpenCart,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('marsil_order_cart_items');
      return saved ? JSON.parse(saved).length : 0;
    } catch {
      return 0;
    }
  });

  // Escuta atualizações do carrinho de pedidos
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (typeof e.detail === 'number') {
        setCartCount(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('marsil_order_cart_items');
          setCartCount(saved ? JSON.parse(saved).length : 0);
        } catch {
          setCartCount(0);
        }
      }
    };
    window.addEventListener('marsil_cart_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('marsil_cart_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleCartClick = () => {
    if (onOpenCart) {
      onOpenCart();
    } else {
      if (activeTab !== 'user') {
        setActiveTab('user');
      }
      window.dispatchEvent(new CustomEvent('marsil_open_order_drawer'));
    }
  };

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          
          {/* Tab Consulta / Estoque */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('user');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'user'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Search className={`w-5 h-5 ${activeTab === 'user' ? 'stroke-[2.5]' : ''}`} />
            </div>
            <span className="text-[11px] mt-1 tracking-tight">Estoque</span>
          </button>

          {/* Tab Pedidos / Meu Pedido (Com Badge de Volumes/Itens) */}
          {authRole === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
                activeTab === 'requests'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <ShoppingCart className={`w-5 h-5 ${activeTab === 'requests' ? 'stroke-[2.5]' : ''}`} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white min-w-[16px] text-center shadow-sm">
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">Pedidos</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCartClick}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white min-w-[17px] text-center shadow-md animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight font-bold">Meu Pedido</span>
            </button>
          )}

          {/* Tab Como Usar / Dicas */}
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-[11px] mt-1 tracking-tight">Como Usar</span>
            </button>
          )}

          {/* Botão de Instalar PWA / Status */}
          {!isInstalled && (isInstallable || isIOS) ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex flex-col items-center justify-center flex-1 py-1 text-blue-600 dark:text-blue-400 font-bold transition-all active:scale-95"
              title="Instalar App no Smartphone"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Download className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] mt-0.5">Instalar</span>
            </button>
          ) : (
            <div
              className="flex flex-col items-center justify-center flex-1 py-1 text-emerald-600 dark:text-emerald-400 opacity-80"
              title="Aplicativo PWA Instalado e Ativo"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-semibold">PWA Ativo</span>
            </div>
          )}

          {/* Tab Admin / Login */}
          <button
            type="button"
            onClick={() => {
              if (authRole === 'admin') {
                setActiveTab('admin');
              } else {
                onOpenLogin('admin');
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'admin'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'stroke-[2.5]' : ''}`} />
            </div>
            <span className="text-[11px] mt-1 tracking-tight">Admin</span>
          </button>

        </div>
      </nav>

      {/* Modal Passo a Passo para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Instalar no iPhone / iPad</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Para usar como aplicativo em tela cheia no iOS:
            </p>
            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
              <p><strong>1.</strong> Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com seta para cima) na barra inferior do Safari.</p>
              <p><strong>2.</strong> Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
              <p><strong>3.</strong> Toque em <strong>"Adicionar"</strong> no topo direito.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
