
import React, { useState, useEffect } from 'react';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { AppState, Product, StockRequest, WhatsAppConfig } from './types';
import { LayoutDashboard, Users, ShieldCheck, Sun, Moon, Lock, KeyRound, ArrowRight, LogOut, ChevronRight, Store, X } from 'lucide-react';

const STORAGE_KEY = 'marsil_boraceia_db_v1';
const THEME_KEY = 'marsil_theme_pref';
const AUTH_KEY = 'marsil_auth_role';

// Senhas configuradas
const PASSWORDS = {
  VENDOR: '@marsil2026',
  ADMIN: '@adminMarsil2026'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [authRole, setAuthRole] = useState<'none' | 'vendor' | 'admin'>(() => {
    return (localStorage.getItem(AUTH_KEY) as any) || 'none';
  });
  
  // Controle de qual login está sendo exibido
  const [loginTarget, setLoginTarget] = useState<'vendedor' | 'admin' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'dark';
  });
  
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : { 
      products: [], 
      requests: [], 
      vendedores: [],
      whatsappConfig: { enabled: false, phoneNumber: '' }
    };
    if (!parsed.vendedores) parsed.vendedores = [];
    if (!parsed.whatsappConfig) parsed.whatsappConfig = { enabled: false, phoneNumber: '' };
    return parsed;
  });

  // Verificar parâmetros da URL para acesso direto - executado apenas uma vez no mount ou quando authRole for none
  useEffect(() => {
    if (authRole === 'none') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      if (portal === 'admin') setLoginTarget('admin');
      else if (portal === 'vendedor') setLoginTarget('vendedor');
    }
  }, [authRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, authRole);
  }, [authRole]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const isTargetAdmin = loginTarget === 'admin';
    const requiredPass = isTargetAdmin ? PASSWORDS.ADMIN : PASSWORDS.VENDOR;

    if (passwordInput === requiredPass) {
      const role = isTargetAdmin ? 'admin' : 'vendor';
      setAuthRole(role);
      setActiveTab(isTargetAdmin ? 'admin' : 'user');
      setLoginError(false);
      setLoginTarget(null);
      // Remove query params ao logar com sucesso para limpar a URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
    setPasswordInput('');
  };

  const handleLogout = () => {
    // Limpa a URL antes de mudar o estado para evitar que o useEffect de portal reative o loginTarget
    window.history.replaceState({}, '', window.location.pathname);
    
    // Reseta todos os estados de sessão
    setAuthRole('none');
    setLoginTarget(null);
    setPasswordInput('');
    setActiveTab('user');
    
    // Limpa persistência
    localStorage.removeItem(AUTH_KEY);
  };

  const handleUploadData = (newProducts: Product[]) => {
    setAppState(prev => ({ ...prev, products: newProducts }));
  };

  const handleAddVendedor = (name: string) => {
    if (!appState.vendedores.includes(name)) {
      setAppState(prev => ({ ...prev, vendedores: [...prev.vendedores, name].sort() }));
    }
  };

  const handleRemoveVendedor = (name: string) => {
    setAppState(prev => ({ ...prev, vendedores: prev.vendedores.filter(v => v !== name) }));
  };

  const handleUpdateWhatsApp = (config: WhatsAppConfig) => {
    setAppState(prev => ({ ...prev, whatsappConfig: config }));
  };

  const handleSubmitRequest = (req: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>) => {
    const newRequest: StockRequest = {
      ...req,
      id: `req-${Date.now()}`,
      dataSolicitacao: new Date().toISOString(),
      status: 'Pendente'
    };
    setAppState(prev => ({
      ...prev,
      requests: [newRequest, ...prev.requests]
    }));
  };

  const handleUpdateRequestStatus = (requestId: string, status: StockRequest['status']) => {
    setAppState(prev => ({
      ...prev,
      requests: prev.requests.map(r => r.id === requestId ? { ...r, status } : r)
    }));
  };

  const handleClearRequests = () => {
    if (window.confirm('Deseja realmente apagar todo o histórico de solicitações?')) {
      setAppState(prev => ({ ...prev, requests: [] }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg shrink-0">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent truncate max-w-[120px] sm:max-w-none">
                  Marsil & Boracéia
                </h1>
                {authRole !== 'none' && (
                  <p className="text-[8px] sm:text-[10px] text-gray-400 dark:text-slate-500 font-bold tracking-widest uppercase">
                    {authRole === 'admin' ? 'Painel Gestão' : 'Portal Vendas'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Alternar Tema"
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {authRole !== 'none' && (
                <div className="flex items-center gap-2">
                  <nav className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
                    <button
                      onClick={() => setActiveTab('user')}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'user' 
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-400 dark:text-slate-500 hover:text-gray-600'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Vendedor</span><span className="xs:hidden">Vend</span>
                    </button>
                    
                    {authRole === 'admin' && (
                      <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                          activeTab === 'admin' 
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-400 dark:text-slate-500 hover:text-gray-600'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Admin</span><span className="xs:hidden">Adm</span>
                      </button>
                    )}
                  </nav>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="Sair do Sistema"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col items-center overflow-x-hidden">
        {authRole === 'none' ? (
          !loginTarget ? (
            /* Tela de Seleção de Portal (Links) */
            <div className="w-full max-w-2xl mt-8 sm:mt-16 animate-in fade-in zoom-in-95 duration-500 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black dark:text-white tracking-tight">Bem-vindo!</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base">Escolha o portal de acesso para continuar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Link Portal Vendedor */}
                <button 
                  onClick={() => setLoginTarget('vendedor')}
                  className="group bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-emerald-500 transition-all flex flex-col items-center text-center space-y-4 active:scale-[0.98]"
                >
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <Store className="w-10 h-10 text-emerald-600 group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">Portal Vendedor</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mt-1">Consultar estoque e fazer pedidos.</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase tracking-widest pt-2">
                    Acessar <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                {/* Link Portal Admin */}
                <button 
                  onClick={() => setLoginTarget('admin')}
                  className="group bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-blue-500 transition-all flex flex-col items-center text-center space-y-4 active:scale-[0.98]"
                >
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShieldCheck className="w-10 h-10 text-blue-600 group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">Área Admin</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mt-1">Gestão de estoque, pedidos e equipe.</p>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-bold text-xs uppercase tracking-widest pt-2">
                    Gerenciar <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>

              <div className="flex justify-center pt-8">
                 <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest border-t border-gray-100 dark:border-slate-800 pt-6 w-full text-center">
                    Logística Marsil Boracéia - Sistema Interno
                 </p>
              </div>
            </div>
          ) : (
            /* Tela de Senha */
            <div className="w-full max-w-sm mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-8 duration-500 px-4">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 text-center relative">
                <button 
                  onClick={() => setLoginTarget(null)} 
                  className="absolute left-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Voltar"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${
                  loginTarget === 'admin' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'
                }`}>
                  {loginTarget === 'admin' ? 
                    <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" /> : 
                    <Store className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
                  }
                </div>
                <h2 className="text-xl sm:text-2xl font-bold dark:text-white mb-2">
                  Acesso {loginTarget === 'admin' ? 'Administrador' : 'Vendedor'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-6 sm:mb-8">Digite sua senha para entrar.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      autoFocus
                      type="password"
                      placeholder="Senha de Acesso"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-base sm:text-sm ${
                        loginError ? 'border-red-500 bg-red-50' : 'border-gray-200 dark:border-slate-700'
                      } bg-white dark:bg-slate-800 outline-none transition-all dark:text-white`}
                    />
                  </div>
                  {loginError && <p className="text-[10px] text-red-500 font-bold uppercase">Senha incorreta!</p>}
                  <button type="submit" className={`w-full ${
                    loginTarget === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95`}>
                    Entrar <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          )
        ) : (
          activeTab === 'user' ? (
            <UserPortal 
              products={appState.products} 
              requests={appState.requests}
              vendedores={appState.vendedores}
              whatsappConfig={appState.whatsappConfig}
              onSubmitRequest={handleSubmitRequest}
            />
          ) : (
            <AdminPortal 
              appState={appState}
              onUploadData={handleUploadData}
              onAddVendedor={handleAddVendedor}
              onRemoveVendedor={handleRemoveVendedor}
              onUpdateWhatsApp={handleUpdateWhatsApp}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              onClearRequests={handleClearRequests}
            />
          )
        )}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-gray-400 text-[10px] sm:text-xs font-medium">
          <p>© 2024 Marsil Logística.</p>
          <div className="flex gap-4">
            <span className="hidden xs:block">Unidade Boracéia-SP</span>
            {authRole === 'none' && (
              <button onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setLoginTarget(null);
              }} className="hover:text-blue-500 transition-colors uppercase font-bold tracking-tighter">Página Inicial</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
