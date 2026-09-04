import React from 'react';
import { Package, Search, ShieldCheck, Sun, Moon, LogOut, KeyRound, Radio, Clock, ShoppingCart, RefreshCw } from 'lucide-react';
import { CatalogMeta } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'user' | 'requests' | 'admin';
  setActiveTab: (tab: 'user' | 'requests' | 'admin') => void;
  authRole: 'none' | 'vendor' | 'admin';
  onOpenLogin: (role: 'admin') => void;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  catalogMeta: CatalogMeta;
  isRealtimeConnected: boolean;
  pendingRequestsCount: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authRole,
  onOpenLogin,
  onLogout,
  isDarkMode,
  setIsDarkMode,
  catalogMeta,
  isRealtimeConnected,
  pendingRequestsCount,
  onManualRefresh,
  isRefreshing
}) => {
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Desconhecido';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMinutes < 1) return 'Agora mesmo';
      if (diffMinutes === 1) return 'Há 1 minuto';
      if (diffMinutes < 60) return `Há ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return 'Há 1 hora';
      if (diffHours < 24) return `Há ${diffHours} horas`;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Recentemente';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-blue-700 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/10">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  MARSIL <span className="text-blue-600 dark:text-blue-400 font-extrabold">•</span> BORACÉIA
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                  Estoque v2.0
                </span>
              </div>
              
              {/* Status em Tempo Real & Metadados do Catálogo */}
              <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-1.5" title={isRealtimeConnected ? "Sincronizado na Nuvem via Firebase Firestore" : "Conectando ao Firebase..."}>
                  <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                    {isRealtimeConnected ? 'Firebase Nuvem' : 'Conectando...'}
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="hidden sm:inline text-[11px]">
                  {catalogMeta.totalProducts ? `${catalogMeta.totalProducts.toLocaleString('pt-BR')} itens` : 'Sem itens'}
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                <span className="hidden lg:flex items-center space-x-1 text-[11px]" title={`Última atualização: ${catalogMeta.lastUpdated}`}>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatTimeAgo(catalogMeta.lastUpdated)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Botão de Instalar PWA */}
            <PWAInstallButton variant="header" />

            {/* Nav Tabs (Visíveis a partir de sm: - no mobile ficam na barra inferior) */}
            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setActiveTab('user')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'user'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Consulta</span>
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'requests'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Solicitações</span>
                {pendingRequestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (authRole === 'admin') {
                    setActiveTab('admin');
                  } else {
                    onOpenLogin('admin');
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>

            {/* Quick Refresh Button */}
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              title="Recarregar dados do servidor"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              title="Alternar tema"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Admin Logout */}
            {authRole === 'admin' && (
              <button
                onClick={onLogout}
                title="Sair do modo Admin"
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair Admin</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
