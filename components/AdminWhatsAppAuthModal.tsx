import React, { useState, useEffect } from 'react';
import { KeyRound, X, Check, RefreshCw, Lock, ArrowRight, AlertCircle, ShieldCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { SecurityConfig, WhatsAppConfig, AdminAuthChallenge } from '../types';
import { api } from '../api';

interface AdminWhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  securityConfig: SecurityConfig;
  whatsappConfig: WhatsAppConfig;
}

export const AdminWhatsAppAuthModal: React.FC<AdminWhatsAppAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  securityConfig,
  whatsappConfig,
}) => {
  // Etapas: 'password' (validação da senha admin) -> 'whatsapp_otp' (envio para WhatsApp e código aleatório)
  const [step, setStep] = useState<'password' | 'whatsapp_otp'>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [challenge, setChallenge] = useState<AdminAuthChallenge | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  const adminExpected = securityConfig.adminPassword || '@adminmarsil2026';
  const targetPhone = (securityConfig.adminWhatsAppPhone || whatsappConfig.phoneNumber || '5511986946245').replace(/\D/g, '');

  // Reseta estados quando o modal abre ou fecha
  useEffect(() => {
    if (isOpen) {
      setStep('password');
      setPasswordInput('');
      setOtpInput('');
      setErrorMsg('');
      setChallenge(null);
      setWhatsAppSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Inicia o desafio OTP via WhatsApp
  const startWhatsAppChallenge = async () => {
    try {
      const newChallenge = await api.createAdminAuthChallenge();
      setChallenge(newChallenge);
      setStep('whatsapp_otp');
      setErrorMsg('');
      setOtpInput('');
      setWhatsAppSent(false);
    } catch (err) {
      // Fallback local se o Firebase falhar
      const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      const fallbackChallenge: AdminAuthChallenge = {
        requestId: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        code: fallbackCode,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        status: 'pending'
      };
      setChallenge(fallbackChallenge);
      setStep('whatsapp_otp');
    }
  };

  // Envio da senha na Etapa 1
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === adminExpected) {
      setErrorMsg('');
      startWhatsAppChallenge();
    } else {
      setErrorMsg('Senha de administrador incorreta.');
    }
  };

  // Formatação do link do WhatsApp com a mensagem de autorização
  const handleOpenWhatsApp = () => {
    if (!challenge) return;

    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const message = `🔐 *SOLICITAÇÃO DE ACESSO ADMINISTRADOR - MARSIL & BORACÉIA*

Olá Administrador, alguém está solicitando acesso ao *Painel de Gestão e Estoque*.

📋 *ID da Sessão:* #${challenge.requestId}
🔑 *Código de Liberação:* *${challenge.code}*
⏰ *Horário:* ${timeString}

_Para aprovar o acesso, forneça este código de 6 dígitos ao solicitante._`;

    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setWhatsAppSent(true);
  };

  // Verificação do código aleatório na Etapa 2
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!challenge) return;

    const cleanCode = otpInput.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg('O código de aprovação deve ter 6 dígitos numéricos.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const isValid = await api.verifyAdminAuthCode(challenge.requestId, cleanCode, challenge.code);
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Código incorreto ou expirado. Verifique a mensagem no WhatsApp do administrador.');
      }
    } catch {
      if (cleanCode === challenge.code) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Código incorreto. Solicite o código correto ao administrador.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Acesso Administrativo
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {step === 'password' ? 'Etapa 1 de 2 • Senha' : 'Etapa 2 de 2 • Aprovação WhatsApp'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ETAPA 1: SENHA ADMIN */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Digite a senha de administrador. Por segurança, em seguida será exigida a aprovação com código aleatório via WhatsApp.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha Administrativa
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Digite a senha de admin..."
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 2: APROVAÇÃO VIA WHATSAPP COM CÓDIGO ALEATÓRIO */}
        {step === 'whatsapp_otp' && challenge && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 text-xs font-extrabold">
                <MessageCircle className="w-4 h-4" />
                <span>Aprovação Obrigatória via WhatsApp</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Envie a solicitação de acesso para o WhatsApp do administrador. O administrador aprovará informando o código gerado para esta sessão.
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Sessão: <strong>#{challenge.requestId}</strong> • Válido por 10 minutos
              </div>
            </div>

            {/* Botão de Abrir WhatsApp */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition-all ${
                whatsAppSent
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 animate-pulse'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {whatsAppSent ? 'Reenviar Mensagem no WhatsApp' : '1. Enviar Mensagem para o WhatsApp'}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Input do Código Aleatório de 6 dígitos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                2. Digite o Código de 6 Dígitos Fornecido:
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setOtpInput(val);
                  if (errorMsg) setErrorMsg('');
                  if (val.length === 6) {
                    // Auto valida se digitar 6 dígitos
                    handleVerifyOtp();
                  }
                }}
                placeholder="Ex: 849201"
                autoFocus
                className="w-full text-center tracking-[0.35em] text-lg font-black py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 text-center block mt-1">
                Digite exatamente o código numérico de 6 dígitos.
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isVerifying || otpInput.trim().length !== 6}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validando Código...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Liberar e Entrar como Admin</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="hover:underline text-slate-500 dark:text-slate-400"
                >
                  Voltar para senha
                </button>
                <button
                  type="button"
                  onClick={startWhatsAppChallenge}
                  className="hover:underline text-blue-600 dark:text-blue-400 font-semibold"
                >
                  Gerar novo código
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
