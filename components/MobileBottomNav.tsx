import React from 'react';
import { Search, ShoppingCart, ShieldCheck, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface MobileBottomNavProps {
  activeTab: 'user' | 'requests' | 'admin';
  setActiveTab: (tab: 'user' | 'requests' | 'admin') => void;
  authRole: 'none' | 'vendor' | 'admin';
  onOpenLogin: (role: 'admin') => void;
  pendingRequestsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  authRole,
  onOpenLogin,
  pendingRequestsCount,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        
        {/* Tab Consulta */}
        <button
          onClick={() => setActiveTab('user')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'user'
              ? 'text-blue-600 dark:text-blue-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <Search className={`w-5 h-5 ${activeTab === 'user' ? 'stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Consulta</span>
        </button>

        {/* Tab Solicitações */}
        <button
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

        {/* Tab Admin */}
        <button
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

        {/* Botão de Instalar no Celular se não estiver instalado */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="flex flex-col items-center justify-center flex-1 py-1 text-blue-700 dark:text-blue-400 font-bold transition-all active:scale-95"
            title="Instalar App no Smartphone"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5">Instalar</span>
          </button>
        )}

      </div>
    </nav>
  );
};
