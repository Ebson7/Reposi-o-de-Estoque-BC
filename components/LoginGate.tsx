import React, { useState } from 'react';
import { Package, KeyRound, ShieldCheck, User, Eye, EyeOff, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { SecurityConfig } from '../types';

interface LoginGateProps {
  securityConfig: SecurityConfig;
  onLoginSuccess: (role: 'vendor' | 'admin') => void;
  isDarkMode: boolean;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  securityConfig,
  onLoginSuccess,
  isDarkMode
}) => {
  const [selectedRole, setSelectedRole] = useState<'vendor' | 'admin'>('vendor');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const adminExpected = securityConfig.adminPassword || '@adminmarsil2026';
  const userExpected = securityConfig.userPassword || '@marsil2026';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    if (!cleanPass) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    if (selectedRole === 'vendor') {
      // Se digitou a senha de usuário correta
      if (cleanPass === userExpected) {
        setErrorMsg('');
        onLoginSuccess('vendor');
        return;
      }
      // Inteligência de conveniência: Se digitou a senha de admin enquanto na aba de usuário, autentica como admin
      if (cleanPass === adminExpected) {
        setErrorMsg('');
        onLoginSuccess('admin');
        return;
      }
      setErrorMsg('Senha de usuário incorreta.');
    } else {
      // Aba Admin
      if (cleanPass === adminExpected) {
        setErrorMsg('');
        onLoginSuccess('admin');
        return;
      }
      // Se digitou a senha de usuário enquanto na aba de admin
      if (cleanPass === userExpected) {
        setErrorMsg('');
        onLoginSuccess('vendor');
        return;
      }
      setErrorMsg('Senha de administrador incorreta.');
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
                Acesso liberado para vendedores e equipe consultarem o estoque Marsil e Boracéia e enviarem solicitações.
              </>
            ) : (
              <>
                <strong className="text-slate-800 dark:text-white font-bold block mb-0.5">Painel Administrativo</strong>
                Acesso para expedição e gerência gerenciarem a planilha de estoque, aprovarem pedidos e alterarem dados.
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
            <span>Entrar no Sistema</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-400">
            As senhas de acesso podem ser reconfiguradas a qualquer momento pelo administrador no painel.
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
