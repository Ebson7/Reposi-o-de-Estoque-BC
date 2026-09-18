import React, { useState, useEffect } from 'react';
import { usePWAInstall } from './usePWAInstall';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowRight,
  Monitor,
  ShieldCheck
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoPromptDelay?: number; // Delay in ms before auto-opening (default: 2500ms)
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoPromptDelay = 2500,
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Determina se o modal está aberto (via props controladas ou estado interno)
  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    // Salva no localStorage para não ser invasivo a cada recarregamento
    try {
      localStorage.setItem('marsil_pwa_prompt_dismissed_at', Date.now().toString());
    } catch {}
  };

  // Escuta evento global customizado para abrir o modal de qualquer botão do app
  useEffect(() => {
    const handleOpenEvent = () => {
      setInternalIsOpen(true);
      setInstallSuccess(false);
    };

    window.addEventListener('marsil_open_pwa_install', handleOpenEvent);
    return () => {
      window.removeEventListener('marsil_open_pwa_install', handleOpenEvent);
    };
  }, []);

  // Exibição automática inteligente após delay inicial
  useEffect(() => {
    // Se já estiver rodando em modo standalone (PWA instalado e aberto como app), não exibe
    if (isStandalone || isInstalled) return;

    // Verifica se o usuário já dispensou nas últimas 12 horas
    try {
      const dismissedAt = localStorage.getItem('marsil_pwa_prompt_dismissed_at');
      if (dismissedAt) {
        const diffHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (diffHours < 12) {
          return; // Não abre automaticamente dentro de 12h do fechamento
        }
      }
    } catch {}

    const timer = setTimeout(() => {
      // Se não for controlado externamente, abre suavemente
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(true);
      }
    }, autoPromptDelay);

    return () => clearTimeout(timer);
  }, [isStandalone, isInstalled, autoPromptDelay, controlledIsOpen]);

  const handleInstallAction = async () => {
    setIsInstalling(true);
    try {
      if (isInstallable) {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => {
            handleClose();
          }, 2500);
        }
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all transform animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Faixa Superior Decorativa */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar pop-up"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-5">
          {/* Header do Modal com Ícone do App */}
          <div className="flex items-start space-x-3.5">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Marsil Estoque"
                className="w-16 h-16 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 object-cover"
                onError={(e) => {
                  // Fallback se a imagem demorar a carregar
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 pr-6">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Aplicativo PWA Oficial</span>
              </span>
              <h2
                id="pwa-install-title"
                className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight"
              >
                Instalar Aplicativo no Celular
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Marsil & Boracéia • Gestão de Estoque
              </p>
            </div>
          </div>

          {/* Estado de Sucesso */}
          {installSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                Aplicativo Instalado com Sucesso!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                O ícone já está disponível na sua tela de início para acesso rápido e em tela cheia.
              </p>
            </div>
          ) : (
            <>
              {/* Benefícios em Destaque */}
              <div className="grid grid-cols-1 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Acesso Direto na Tela de Início</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Abra como um app nativo, sem digitar link no navegador.</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Carregamento Ultra Rápido & Offline</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Consulta de produtos em cache mesmo com sinal oscilando.</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Tela Cheia sem Barras do Navegador</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Maior área visual para consultar tabelas e transferências.</span>
                  </div>
                </div>
              </div>

              {/* Instruções Específicas por Plataforma */}
              {isIOS ? (
                // Guia Específico para iPhone / iPad no Safari
                <div className="space-y-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/50">
                  <p className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Como instalar no Safari do iPhone:
                  </p>
                  <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Toque no botão <strong>Compartilhar</strong> (
                        <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5 align-middle" />
                        ) na barra inferior do Safari.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Role as opções e toque em <strong>"Adicionar à Tela de Início"</strong> (
                        <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 mx-0.5 align-middle" />
                        ).
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!
                      </span>
                    </li>
                  </ol>
                </div>
              ) : !isInstallable ? (
                // Guia para Android / Chrome quando prompt nativo não disparou diretamente ou desktop
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                    Dica de instalação rápida no Chrome / Android:
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior do navegador e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              ) : null}

              {/* Ações / Botões */}
              <div className="space-y-2 pt-1">
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleInstallAction}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'Instalando...' : 'Instalar Aplicativo Agora'}</span>
                  </button>
                ) : isIOS ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Entendi, vou adicionar no Safari</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Entendi como instalar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Agora não, continuar pelo navegador
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
