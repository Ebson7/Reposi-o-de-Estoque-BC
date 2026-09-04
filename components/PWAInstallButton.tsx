import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, do not show install prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with beforeinstallprompt
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          title="Instalar App no Smartphone"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 sm:p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold leading-tight">Instale o App no seu Celular</h4>
              <p className="text-xs text-blue-100 mt-0.5">Acesso instantâneo em tela cheia, sem barra de navegação e ultra rápido.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="shrink-0 px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-black rounded-xl shadow-md active:scale-95 transition-all"
          >
            Instalar Agora
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all"
        title="Instalar como aplicativo no celular"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit does not support beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-all active:scale-95"
          title="Instalar aplicativo no iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Instalar no iPhone</span>
          <span className="xs:hidden">App</span>
        </button>

        {/* Modal com Passo a Passo para iOS Safari */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Instalar no iPhone</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Siga estes 2 passos simples no Safari para fixar o aplicativo na sua tela de início:
              </p>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      Toque em Compartilhar <Share className="w-3.5 h-3.5 text-blue-600" />
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      No menu inferior do Safari no seu iPhone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 text-blue-600" />
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Role as opções para baixo e selecione "Adicionar à Tela de Início".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Pronto! O app abrirá em tela cheia como aplicativo nativo.</span>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback banner/button for browsers that don't emit beforeinstallprompt yet
  return null;
};
