import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Radio } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface PhoneEmulatorShellProps {
  children: React.ReactNode;
  isEmulating: boolean;
  onToggleEmulating: () => void;
  isDarkMode: boolean;
}

export const PhoneEmulatorShell: React.FC<PhoneEmulatorShellProps> = ({
  children,
  isEmulating,
  onToggleEmulating,
  isDarkMode,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [isRealMobile, setIsRealMobile] = useState(false);

  useEffect(() => {
    // Detect if the physical device is a real phone or tablet
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsRealMobile(isMobileWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Update digital clock in status bar
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, []);

  // Se estiver em um dispositivo móvel real (ou se o usuário desativou a emulação no desktop), exibe tela cheia nativa
  if (isRealMobile || !isEmulating) {
    return (
      <div className="w-full min-h-screen">
        {/* Barra superior de controle rápido no Desktop quando em modo Tela Cheia */}
        {!isRealMobile && (
          <aside
            aria-label="Controle de visualização da tela"
            className="hidden md:flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-xs border-b border-slate-700"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Modo Desktop / Tela Expandida</span>
            </div>
            <button
              onClick={onToggleEmulating}
              className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Emular tela e proporção de aplicativo de celular"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ver no Modo Celular (Simulador)</span>
            </button>
          </aside>
        )}
        {children}
      </div>
    );
  }

  // MODO EMULADOR DE CELULAR (DESKTOP)
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start py-6 px-4 select-none">
      
      {/* Barra de Controle do Simulador */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between px-3 py-2 bg-slate-800/90 backdrop-blur rounded-2xl border border-slate-700/80 shadow-lg text-xs text-white">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block leading-tight">Simulador PWA Mobile</span>
            <span className="text-[10px] text-slate-400">Emulando smartphone padrão</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <PWAInstallButton variant="compact" />
          <button
            onClick={onToggleEmulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-600"
            title="Expandir para largura total de monitor"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tela Cheia</span>
          </button>
        </div>
      </div>

      {/* Chassi do Celular (Emulador de Smartphone) */}
      <div className="relative w-full max-w-[428px] h-[890px] max-h-[90vh] bg-slate-950 rounded-[52px] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1)] border-[4px] border-slate-800 flex flex-col transition-all">
        
        {/* Botões Laterais Físicos Decorativos */}
        <div className="absolute -left-[7px] top-28 w-[3px] h-9 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[7px] top-40 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[7px] top-56 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -right-[7px] top-36 w-[3px] h-16 bg-slate-700 rounded-r-sm" />

        {/* Tela do Smartphone */}
        <div className="relative w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[44px] overflow-hidden flex flex-col border border-slate-800/40">
          
          {/* Barra de Status do Sistema Operacional (Mobile) */}
          <div className="h-11 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white shrink-0 z-30 border-b border-slate-100 dark:border-slate-850">
            {/* Relógio */}
            <span className="text-[13px] tracking-tight">{currentTime || '09:41'}</span>

            {/* Dynamic Island / Notch Central */}
            <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <span className="w-2 h-2 rounded-full bg-blue-950" />
            </div>

            {/* Ícones de Sistema (5G, WiFi, Bateria) */}
            <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
              <Radio className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center space-x-0.5">
                <span className="text-[10px]">100%</span>
                <Battery className="w-4 h-4 fill-current" />
              </div>
            </div>
          </div>

          {/* Área com Scroll do Aplicativo */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
            {children}
          </div>

          {/* Barra Inferior com Indicador Home do Celular */}
          <div className="h-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center shrink-0 z-50">
            <div className="w-32 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </div>

        </div>

      </div>

      <p className="mt-3 text-[11px] text-slate-500 text-center">
        Dica: Instale como aplicativo PWA no Chrome, Edge ou Safari para acesso instantâneo na tela inicial.
      </p>

    </div>
  );
};
