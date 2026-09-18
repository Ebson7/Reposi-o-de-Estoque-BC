import React from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'compact' | 'bottomNav' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstalled, isStandalone, openInstallModal } = usePWAInstall();

  // Se já estiver rodando como PWA instalado em standalone, não precisa exibir
  if (isInstalled || isStandalone) {
    return null;
  }

  const handleClick = () => {
    openInstallModal();
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Instalar App no Smartphone"
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 mb-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold leading-tight">Instale o App no Celular</h4>
            <p className="text-xs text-blue-100 mt-0.5">Acesso instantâneo em tela cheia, sem barra de navegação e ultra rápido.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="shrink-0 px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-black rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
        >
          Instalar Agora
        </button>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Instalar App no Smartphone ou Computador"
        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm active:scale-95 transition-all cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar Aplicativo</span>
      </button>
    );
  }

  // Header variant (padrão)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all cursor-pointer ${className}`}
      title="Instalar como aplicativo no celular ou computador"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden xs:inline">Instalar App</span>
    </button>
  );
};
