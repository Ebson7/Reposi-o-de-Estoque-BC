
import React, { useState, useEffect } from 'react';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { AppState, Product, StockRequest, WhatsAppConfig } from './types';
import { LayoutDashboard, ShieldCheck, Sun, Moon, KeyRound, LogOut, ChevronRight, Store, X, Loader2 } from 'lucide-react';

const THEME_KEY = 'marsil_theme_pref';
const AUTH_KEY = 'marsil_auth_role';
const PRODUCTS_KEY = 'marsil_local_products';
const VENDEDORES_KEY = 'marsil_vendedores_list';
const REQUESTS_KEY = 'marsil_requests_history';

const PASSWORDS = {
  VENDOR: '@marsil2026',
  ADMIN: '@adminMarsil2026'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [authRole, setAuthRole] = useState<'none' | 'vendor' | 'admin'>(() => {
    return (localStorage.getItem(AUTH_KEY) as any) || 'none';
  });
  
  const [loginTarget, setLoginTarget] = useState<'vendedor' | 'admin' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'dark';
  });
  
  const [appState, setAppState] = useState<AppState>(() => {
    const savedProducts = localStorage.getItem(PRODUCTS_KEY);
    const savedVendedores = localStorage.getItem(VENDEDORES_KEY);
    const savedRequests = localStorage.getItem(REQUESTS_KEY);

    return { 
      products: savedProducts ? JSON.parse(savedProducts) : [], 
      requests: savedRequests ? JSON.parse(savedRequests) : [], 
      vendedores: savedVendedores ? JSON.parse(savedVendedores) : [],
      whatsappConfig: { enabled: true, phoneNumber: '5511999999999' } // Altere para seu número
    };
  });

  useEffect(() => {
    // Simula um carregamento inicial para UX
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, authRole);
  }, [authRole]);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(appState.products));
    localStorage.setItem(VENDEDORES_KEY, JSON.stringify(appState.vendedores));
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(appState.requests));
  }, [appState]);

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
    const requiredPass = loginTarget === 'admin' ? PASSWORDS.ADMIN : PASSWORDS.VENDOR;

    if (passwordInput === requiredPass) {
      const role = loginTarget === 'admin' ? 'admin' : 'vendor';
      setAuthRole(role);
      setActiveTab(loginTarget === 'admin' ? 'admin' : 'user');
      setLoginError(false);
      setLoginTarget(null);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
    setPasswordInput('');
  };

  const handleLogout = () => {
    setAuthRole('none');
    setLoginTarget(null);
    setPasswordInput('');
    setActiveTab('user');
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
      id: Math.random().toString(36).substr(2, 9),
      dataSolicitacao: new Date().toISOString(),
      status: 'Pendente'
    };
    
    setAppState(prev => ({
      ...prev,
      requests: [newRequest, ...prev.requests].slice(0, 50) // Mantém apenas os últimos 50 locais
    }));
  };

  const handleUpdateRequestStatus = (requestId: string, status: StockRequest['status']) => {
    setAppState(prev => ({
      ...prev,
      requests: prev.requests.map(r => r.id === requestId ? { ...r, status } : r)
    }));
  };

  const handleClearRequests = () => {
    if (window.confirm('Limpar histórico local de pedidos?')) {
      setAppState(prev => ({ ...prev, requests: [] }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Marsil Boracéia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shrink-0">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-tight dark:text-white">Marsil & Boracéia</h1>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Estoque Local</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {authRole !== 'none' && (
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex">
                    <button onClick={() => setActiveTab('user')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase ${activeTab === 'user' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>Consulta</button>
                    {authRole === 'admin' && (
                      <button onClick={() => setActiveTab('admin')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase ${activeTab === 'admin' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>Admin</button>
                    )}
                  </div>
                  <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-8 flex flex-col items-center">
        {authRole === 'none' ? (
          !loginTarget ? (
            <div className="w-full max-w-2xl mt-12 animate-in fade-in zoom-in-95 duration-500 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black dark:text-white tracking-tight">Painel de Estoque</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Acesse para consultar itens disponíveis.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button onClick={() => setLoginTarget('vendedor')} className="group bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-emerald-500 transition-all flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Store className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white">Equipe Vendas</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Entrar <ChevronRight className="w-4 h-4 inline" /></p>
                </button>

                <button onClick={() => setLoginTarget('admin')} className="group bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-blue-500 transition-all flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShieldCheck className="w-8 h-8 text-blue-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white">Gestão / TI</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Configurações <ChevronRight className="w-4 h-4 inline" /></p>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm mt-12 animate-in slide-in-from-bottom-8 duration-500 px-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 text-center relative">
                <button onClick={() => setLoginTarget(null)} className="absolute left-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${loginTarget === 'admin' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                  {loginTarget === 'admin' ? <ShieldCheck className="w-8 h-8 text-blue-600" /> : <Store className="w-8 h-8 text-emerald-600" />}
                </div>
                <h2 className="text-2xl font-black dark:text-white mb-6">Acesso</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input autoFocus type="password" placeholder="Senha de Acesso" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none transition-all dark:text-white font-bold" />
                  </div>
                  {loginError && <p className="text-[10px] text-red-500 font-bold uppercase">Senha incorreta!</p>}
                  <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">Entrar</button>
                </form>
              </div>
            </div>
          )
        ) : (
          activeTab === 'user' ? (
            <UserPortal products={appState.products} requests={appState.requests} vendedores={appState.vendedores} whatsappConfig={appState.whatsappConfig} onSubmitRequest={handleSubmitRequest} />
          ) : (
            <AdminPortal appState={appState} onUploadData={handleUploadData} onAddVendedor={handleAddVendedor} onRemoveVendedor={handleRemoveVendedor} onUpdateWhatsApp={handleUpdateWhatsApp} onUpdateRequestStatus={handleUpdateRequestStatus} onClearRequests={handleClearRequests} />
          )
        )}
      </main>
    </div>
  );
};

export default App;
