
import React, { useState, useEffect } from 'react';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { AppState, Product, StockRequest, WhatsAppConfig } from './types';
import { LayoutDashboard, Users, ShieldCheck, Sun, Moon, Lock, KeyRound, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'marsil_boraceia_db_v1';
const THEME_KEY = 'marsil_theme_pref';
const USER_PASSWORD = '@marsil2026';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
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
    if (passwordInput === USER_PASSWORD) {
      setIsUserAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
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
                <p className="text-[8px] sm:text-[10px] text-gray-400 dark:text-slate-500 font-bold tracking-widest uppercase">
                  Estoque
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

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
                  <span className="hidden xs:inline">Vend</span><span className="xs:hidden">V</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'admin' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Adm</span><span className="xs:hidden">A</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col items-center overflow-x-hidden">
        {activeTab === 'user' ? (
          !isUserAuthenticated ? (
            <div className="w-full max-w-sm mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-8 duration-500 px-4">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold dark:text-white mb-2">Acesso Restrito</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-6 sm:mb-8">Digite a senha para acessar.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-base sm:text-sm ${
                        loginError ? 'border-red-500 bg-red-50' : 'border-gray-200 dark:border-slate-700'
                      } bg-white dark:bg-slate-800 outline-none transition-all dark:text-white`}
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    Entrar <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <UserPortal 
              products={appState.products} 
              requests={appState.requests}
              vendedores={appState.vendedores}
              whatsappConfig={appState.whatsappConfig}
              onSubmitRequest={handleSubmitRequest}
            />
          )
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
        )}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-gray-400 text-[10px] sm:text-xs">
          <p>© 2024 Marsil Logística.</p>
          <p className="hidden xs:block">Unidade Boracéia-SP</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
