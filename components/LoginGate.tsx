import React, { useState } from 'react';
import { Package, KeyRound, ShieldCheck, User, Eye, EyeOff, Lock, ArrowRight, AlertCircle, MessageCircle, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { SecurityConfig, WhatsAppConfig, AdminAuthChallenge } from '../types';
import { api } from '../api';

interface LoginGateProps {
  securityConfig: SecurityConfig;
  whatsappConfig?: WhatsAppConfig;
  onLoginSuccess: (role: 'vendor' | 'admin') => void;
  isDarkMode: boolean;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  securityConfig,
  whatsappConfig,
  onLoginSuccess,
  isDarkMode
}) => {
  const [selectedRole, setSelectedRole] = useState<'vendor' | 'admin'>('vendor');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados específicos para o fluxo de aprovação Admin em 2 etapas via WhatsApp
  const [adminStep, setAdminStep] = useState<'password' | 'whatsapp_otp'>('password');
  const [adminChallenge, setAdminChallenge] = useState<AdminAuthChallenge | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  const adminExpected = securityConfig.adminPassword || '@adminmarsil2026';
  const userExpected = securityConfig.userPassword || '@marsil2026';
  const targetPhone = (securityConfig.adminWhatsAppPhone || whatsappConfig?.phoneNumber || '5511986946245').replace(/\D/g, '');

  // Inicia o desafio OTP para Admin
  const initiateAdminWhatsAppChallenge = async () => {
    try {
      const challenge = await api.createAdminAuthChallenge();
      setAdminChallenge(challenge);
      setAdminStep('whatsapp_otp');
      setErrorMsg('');
      setOtpInput('');
      setWhatsAppSent(false);
    } catch {
      const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      const fallbackChallenge: AdminAuthChallenge = {
        requestId: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        code: fallbackCode,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        status: 'pending'
      };
      setAdminChallenge(fallbackChallenge);
      setAdminStep('whatsapp_otp');
    }
  };

  // Envia a solicitação para o WhatsApp do Administrador
  const handleOpenWhatsApp = () => {
    if (!adminChallenge) return;

    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const message = `🔐 *SOLICITAÇÃO DE ACESSO ADMINISTRADOR - MARSIL & BORACÉIA*

Olá Administrador, um dispositivo está solicitando entrada no *Painel Administrativo*.

📋 *ID da Sessão:* #${adminChallenge.requestId}
🔑 *Código Aleatório de Liberação:* *${adminChallenge.code}*
⏰ *Horário:* ${timeString}

_Se você autoriza este acesso, informe o código acima ao solicitante para liberação._`;

    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setWhatsAppSent(true);
  };

  // Submissão do formulário de login inicial
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    if (!cleanPass) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    if (selectedRole === 'vendor') {
      if (cleanPass === userExpected) {
        setErrorMsg('');
        onLoginSuccess('vendor');
        return;
      }
      if (cleanPass === adminExpected) {
        // Se digitou a senha de admin, aciona verificação 2FA
        setErrorMsg('');
        initiateAdminWhatsAppChallenge();
        return;
      }
      setErrorMsg('Senha de usuário incorreta.');
    } else {
      // Aba Admin
      if (cleanPass === adminExpected) {
        setErrorMsg('');
        initiateAdminWhatsAppChallenge();
        return;
      }
      if (cleanPass === userExpected) {
        setErrorMsg('');
        onLoginSuccess('vendor');
        return;
      }
      setErrorMsg('Senha de administrador incorreta.');
    }
  };

  // Validação do código de 6 dígitos recebido pelo WhatsApp
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminChallenge) return;

    const cleanCode = otpInput.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg('O código de aprovação deve ter 6 dígitos numéricos.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg('');

    try {
      const isValid = await api.verifyAdminAuthCode(adminChallenge.requestId, cleanCode, adminChallenge.code);
      if (isValid) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg('Código incorreto ou expirado. Verifique a mensagem no WhatsApp do administrador.');
      }
    } catch {
      if (cleanCode === adminChallenge.code) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg('Código incorreto. Solicite o código correto ao administrador.');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center items-center px-4 py-8">
      
      {/* Brand Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-800 to-blue-600 dark:from-blue-600 dark:to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-white dark:ring-slate-800">
          <Package className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          MARSIL <span className="text-blue-600 dark:text-blue-400 font-extrabold">•</span> BORACÉIA
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
          Sistema de Gestão & Consulta de Estoque Multiunidades
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* FLUXO 1: ESCOLHA DE PAPEL E SENHA (PADRÃO) */}
        {adminStep === 'password' ? (
          <>
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Tipo de Acesso
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('vendor');
                    setErrorMsg('');
                    setPassword('');
                  }}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedRole === 'vendor'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Acesso Usuário</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    setErrorMsg('');
                    setPassword('');
                  }}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedRole === 'admin'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acesso Admin</span>
                </button>
              </div>
            </div>

            {/* Informative description */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start space-x-3">
              <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedRole === 'vendor' ? (
                  <>
                    <strong className="text-slate-800 dark:text-white font-bold block mb-0.5">Consulta e Pedidos</strong>
                    Acesso liberado com senha para vendedores consultarem estoque e enviarem pedidos.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-800 dark:text-white font-bold block mb-0.5">Acesso com Verificação 2-Etapas</strong>
                    Requer senha e envio de mensagem com código de aprovação aleatório para o WhatsApp do administrador.
                  </>
                )}
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {selectedRole === 'vendor' ? 'Senha de Usuário' : 'Senha de Administrador'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder={selectedRole === 'vendor' ? 'Digite a senha de usuário...' : 'Digite a senha de administrador...'}
                    autoFocus
                    required
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>{selectedRole === 'admin' ? 'Avançar para Aprovação WhatsApp' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* FLUXO 2: APROVAÇÃO OBRIGATÓRIA VIA WHATSAPP (ADMIN) */
          adminChallenge && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Aprovação via WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Etapa 2 de 2 • Sessão #{adminChallenge.requestId}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <p>
                  Para liberar o acesso administrativo, é obrigatório enviar uma mensagem para o WhatsApp do administrador geral.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Ele receberá a solicitação e fornecerá o código aleatório de liberação gerado para esta sessão.
                </p>
              </div>

              {/* Botão de Enviar WhatsApp */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition-all ${
                  whatsAppSent
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 animate-pulse'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {whatsAppSent ? 'Reenviar Mensagem no WhatsApp' : '1. Enviar Solicitação para o WhatsApp'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              {/* Formulário com Input do Código Aleatório */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    2. Digite o Código Aleatório de 6 Dígitos:
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
                        handleVerifyOtp();
                      }
                    }}
                    placeholder="Ex: 849201"
                    autoFocus
                    className="w-full text-center tracking-[0.35em] text-xl font-black py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 text-center block mt-1">
                    Insira exatamente os 6 números aprovados pelo administrador.
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando Código...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Validar Código e Acessar como Admin</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminStep('password');
                      setErrorMsg('');
                    }}
                    className="hover:underline text-slate-600 dark:text-slate-400 font-semibold"
                  >
                    Voltar para senha
                  </button>
                  <button
                    type="button"
                    onClick={initiateAdminWhatsAppChallenge}
                    className="hover:underline text-blue-600 dark:text-blue-400 font-semibold"
                  >
                    Gerar novo código
                  </button>
                </div>
              </form>
            </div>
          )
        )}

        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400">
            Acesso protegido por autenticação obrigatória a cada abertura e verificação em duas etapas para administradores.
          </p>
        </div>

      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>Marsil & Boracéia • Distribuição de Alimentos</p>
      </div>

    </div>
  );
};
