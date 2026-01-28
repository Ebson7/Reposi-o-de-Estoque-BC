
import React, { useState, useEffect } from 'react';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { AppState, Product, StockRequest, WhatsAppConfig } from './types';
import { LayoutDashboard, ShieldCheck, Sun, Moon, KeyRound, LogOut, ChevronRight, Store, X, Loader2, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

const THEME_KEY = 'marsil_theme_pref';
const AUTH_KEY = 'marsil_auth_role';
const PRODUCTS_KEY = 'marsil_local_products';
const VENDEDORES_KEY = 'marsil_vendedores_list';
const REQUESTS_KEY = 'marsil_requests_history';
const SYNC_URL_KEY = 'marsil_sync_url';

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
  const [syncMessage, setSyncMessage] = useState('');
  
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
      vendedores: savedVendedores ? JSON.parse(savedVendedores) : ['Vendedor 1', 'Vendedor 2'],
      whatsappConfig: { enabled: true, phoneNumber: '5511999999999' }
    };
  });

  // Efeito de Inicialização e Auto-Sync
  useEffect(() => {
    const initApp = async () => {
      // 1. Verificar se há link de sincronização na URL (?s=...)
      const params = new URLSearchParams(window.location.search);
      const urlSync = params.get('s');
      
      if (urlSync) {
        localStorage.setItem(SYNC_URL_KEY, urlSync);
        setSyncMessage('Configurando nova fonte de dados...');
      }

      const activeSyncUrl = localStorage.getItem(SYNC_URL_KEY);

      if (activeSyncUrl) {
        setSyncMessage('Sincronizando estoque...');
        Papa.parse(activeSyncUrl, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const mapped = mapCSVToProducts(results.data);
              setAppState(prev => ({ ...prev, products: mapped }));
              localStorage.setItem(PRODUCTS_KEY, JSON.stringify(mapped));
              setSyncMessage('');
            }
            setIsLoading(false);
          },
          error: () => {
            console.error("Erro no auto-sync");
            setIsLoading(false);
          }
        });
      } else {
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    initApp();
  }, []);

  const mapCSVToProducts = (data: any[]): Product[] => {
    return data.map((row: any, i: number) => {
      // Busca flexível de colunas
      const findValue = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
        return foundKey ? row[foundKey] : '';
      };

      return {
        id: `p-${i}-${Date.now()}`,
        fornecedor: findValue(['fornecedor', 'forn']),
        codigo: String(findValue(['código', 'codigo', 'cod'])),
        situacao: findValue(['situação', 'situacao', 'status']),
        comprador: findValue(['comprador']),
        produto: findValue(['produto', 'descrição', 'desc']),
        sabor: '',
        embalagem: '',
        estoqueMarsil: parseInt(findValue(['marsil', 'sp', 'estoque_sp'])) || 0,
        estoqueBoraceia: parseInt(findValue(['boraceia', 'boracéia', 'unidade_bor'])) || 0,
      };
    }).filter(p => p.produto && p.produto !== '');
  };

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
    const requiredPass = loginTarget === 'admin' ? PASSWORDS.ADMIN : PASSWORDS.VENDOR;
    if (passwordInput === requiredPass) {
      setAuthRole(loginTarget === 'admin' ? 'admin' : 'vendor');
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
    setActiveTab('user');
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight">Marsil & Boracéia</h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Sincronização Direta</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-400 hover:text-blue-500">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {authRole !== 'none' && (
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex">
                  <button onClick={() => setActiveTab('user')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg ${activeTab === 'user' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>Estoque</button>
                  {authRole === 'admin' && <button onClick={() => setActiveTab('admin')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg ${activeTab === 'admin' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>Gestão</button>}
                </div>
                <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><LogOut className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center mt-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{syncMessage || 'Carregando Sistema...'}</p>
          </div>
        ) : authRole === 'none' ? (
          !loginTarget ? (
            <div className="max-w-2xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button onClick={() => setLoginTarget('vendedor')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-emerald-500 transition-all flex flex-col items-center space-y-4">
                <Store className="w-12 h-12 text-emerald-600" />
                <h3 className="text-xl font-bold">Vendedor</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase">Consultar Estoque <ChevronRight className="w-4 h-4 inline" /></p>
              </button>
              <button onClick={() => setLoginTarget('admin')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-blue-500 transition-all flex flex-col items-center space-y-4">
                <ShieldCheck className="w-12 h-12 text-blue-600" />
                <h3 className="text-xl font-bold">Admin</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase">Gestão da Planilha <ChevronRight className="w-4 h-4 inline" /></p>
              </button>
            </div>
          ) : (
            <div className="max-w-sm mx-auto mt-12 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl relative">
              <button onClick={() => setLoginTarget(null)} className="absolute left-4 top-4 text-gray-400"><X className="w-4 h-4" /></button>
              <h2 className="text-2xl font-black text-center mb-6">Acesso</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input autoFocus type="password" placeholder="Senha" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-4 rounded-2xl border bg-gray-50 dark:bg-slate-800 outline-none text-center font-bold" />
                {loginError && <p className="text-[9px] text-red-500 text-center font-bold uppercase">Senha Inválida</p>}
                <button className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-xs">Entrar</button>
              </form>
            </div>
          )
        ) : (
          activeTab === 'user' ? (
            <UserPortal products={appState.products} requests={appState.requests} vendedores={appState.vendedores} whatsappConfig={appState.whatsappConfig} onSubmitRequest={(r) => {}} />
          ) : (
            <AdminPortal appState={appState} onUploadData={(p) => setAppState({...appState, products: p})} onAddVendedor={(v) => {}} onRemoveVendedor={(v) => {}} onUpdateWhatsApp={(w) => {}} onUpdateRequestStatus={(id, s) => {}} onClearRequests={() => {}} />
          )
        )}
      </main>
    </div>
  );
};

export default App;
