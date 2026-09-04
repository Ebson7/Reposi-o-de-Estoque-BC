import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { RequestsHistory } from './components/RequestsHistory';
import { AppState, StockRequest, CatalogMeta, WhatsAppConfig, CreateOrderPayload } from './types';
import { api } from './api';
import { firebaseService } from './firebaseService';
import { KeyRound, X, ShieldAlert, Loader2 } from 'lucide-react';

const ADMIN_PASSWORD = '123'; // Senha padrão administrativa

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'requests' | 'admin'>('user');
  const [authRole, setAuthRole] = useState<'none' | 'vendor' | 'admin'>(() => {
    return (localStorage.getItem('marsil_auth_role') as any) || 'none';
  });

  const [activeVendor, setActiveVendor] = useState<string>(() => {
    return localStorage.getItem('marsil_active_vendor') || '';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('marsil_dark_mode') === 'true';
  });

  // Server State
  const [catalogMeta, setCatalogMeta] = useState<CatalogMeta>({
    totalProducts: 0,
    lastUpdated: new Date().toISOString(),
    sourceName: 'Carregando...',
    syncUrl: '',
    itensComEstoqueMarsil: 0,
    itensComEstoqueBoraceia: 0,
    itensZerados: 0
  });

  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    enabled: true,
    phoneNumber: '5511999999999'
  });

  // Connection & Refresh State
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Login Modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('marsil_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('marsil_dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Persist active vendor
  const handleSelectVendor = (vendor: string) => {
    setActiveVendor(vendor);
    if (vendor) {
      localStorage.setItem('marsil_active_vendor', vendor);
    } else {
      localStorage.removeItem('marsil_active_vendor');
    }
  };

  // Initial Fetch of Data
  const loadInitialData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, reqsRes, vendsRes] = await Promise.all([
        api.getStatus(),
        api.getRequests(),
        api.getVendedores()
      ]);

      setCatalogMeta(statusRes.catalogMeta);
      setWhatsappConfig(statusRes.whatsappConfig);
      setRequests(reqsRes);
      setVendedores(vendsRes);
    } catch (err) {
      console.error("[App] Erro ao carregar dados iniciais:", err);
    } finally {
      setIsRefreshing(false);
      setAppInitialized(true);
    }
  }, []);

  // Setup Firebase Firestore Real-Time Subscriptions
  useEffect(() => {
    loadInitialData();

    console.log("[Firebase] Ativando assinaturas em tempo real do Firestore...");
    setIsRealtimeConnected(true);

    // 1. Escuta solicitações em tempo real no Firestore
    const unsubRequests = firebaseService.subscribeToRequests((liveRequests) => {
      console.log(`[Firebase Firestore] ${liveRequests.length} solicitações sincronizadas em tempo real`);
      setRequests(liveRequests);
      setIsRealtimeConnected(true);
      setAppInitialized(true);
    });

    // 2. Escuta lista de vendedores em tempo real no Firestore
    const unsubVendedores = firebaseService.subscribeToVendedores((liveVendors) => {
      if (liveVendors && liveVendors.length > 0) {
        setVendedores(liveVendors);
      }
    });

    // 3. Escuta configurações de WhatsApp em tempo real no Firestore
    const unsubWhatsApp = firebaseService.subscribeToWhatsAppConfig((liveCfg) => {
      if (liveCfg) {
        setWhatsappConfig(liveCfg);
      }
    });

    // 4. Escuta metadados do catálogo em tempo real no Firestore
    const unsubCatalogMeta = firebaseService.subscribeToCatalogMeta((liveMeta) => {
      if (liveMeta && liveMeta.lastUpdated) {
        setCatalogMeta(prev => ({ ...prev, ...liveMeta }));
      }
    });

    return () => {
      unsubRequests();
      unsubVendedores();
      unsubWhatsApp();
      unsubCatalogMeta();
    };
  }, [loadInitialData]);

  // Handle Submit Request (Single)
  const handleSubmitRequest = async (reqData: Omit<StockRequest, 'id' | 'dataSolicitacao' | 'status'>) => {
    const created = await api.createRequest(reqData);
    setRequests(prev => [created, ...prev]);
    return created;
  };

  // Handle Submit Multi-Item Order
  const handleSubmitOrder = async (payload: CreateOrderPayload, sendWhatsApp = false) => {
    const createdRequests = await api.createOrder(payload);
    setRequests(prev => [...createdRequests, ...prev]);
    return createdRequests;
  };

  // Handle Multi-Item Order Status Update
  const handleUpdateOrderStatus = async (pedidoId: string, status: 'Pendente' | 'Aprovado' | 'Recusado', respostaAdmin?: string) => {
    const result = await api.updateOrderStatus(pedidoId, status, respostaAdmin);
    setRequests(prev => prev.map(r => (r.pedidoId === pedidoId || r.id === pedidoId) ? { ...r, status, respostaAdmin: respostaAdmin || r.respostaAdmin } : r));
    return result;
  };

  // Handle Multi-Item Order Deletion
  const handleDeleteOrder = async (pedidoId: string) => {
    await api.deleteOrder(pedidoId);
    setRequests(prev => prev.filter(r => r.pedidoId !== pedidoId && r.id !== pedidoId));
  };

  // Handle Admin Request Decision
  const handleUpdateRequestStatus = async (id: string, status: 'Pendente' | 'Aprovado' | 'Recusado', resposta?: string) => {
    const updated = await api.updateRequestStatus(id, status, resposta);
    setRequests(prev => prev.map(r => r.id === id ? updated : r));
  };

  // Handle Request Deletion
  const handleDeleteRequest = async (id: string) => {
    await api.deleteRequest(id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  // Handle Clear Requests
  const handleClearAllRequests = async () => {
    await api.clearRequests();
    setRequests([]);
  };

  // Handle Add Vendedor
  const handleAddVendedor = async (name: string) => {
    const updatedList = await api.addVendedor(name);
    setVendedores(updatedList);
  };

  // Handle Remove Vendedor
  const handleRemoveVendedor = async (name: string) => {
    const updatedList = await api.removeVendedor(name);
    setVendedores(updatedList);
  };

  // Handle WhatsApp Config
  const handleUpdateWhatsApp = async (config: Partial<WhatsAppConfig>) => {
    const updated = await api.updateWhatsAppConfig(config);
    setWhatsappConfig(updated);
  };

  // Handle Batch Upload Finish
  const handleBatchUploaded = (count: number, meta: CatalogMeta) => {
    setCatalogMeta(meta);
  };

  // Admin Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthRole('admin');
      localStorage.setItem('marsil_auth_role', 'admin');
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
      setActiveTab('admin');
    } else {
      setLoginError('Senha administrativa incorreta.');
    }
  };

  const handleLogout = () => {
    setAuthRole('none');
    localStorage.removeItem('marsil_auth_role');
    setActiveTab('user');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* Executive Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        authRole={authRole}
        onOpenLogin={() => {
          setLoginError('');
          setPasswordInput('');
          setShowLoginModal(true);
        }}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        catalogMeta={catalogMeta}
        isRealtimeConnected={isRealtimeConnected}
        pendingRequestsCount={requests.filter(r => r.status === 'Pendente').length}
        onManualRefresh={loadInitialData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: CONSULTA DE ESTOQUE (VENDEDORES & EQUIPE) */}
        {activeTab === 'user' && (
          <UserPortal
            requests={requests}
            vendedores={vendedores}
            whatsappConfig={whatsappConfig}
            onSubmitRequest={handleSubmitRequest}
            onSubmitOrder={handleSubmitOrder}
            onViewRequests={() => setActiveTab('requests')}
            activeVendor={activeVendor}
            onSelectVendor={handleSelectVendor}
            lastUpdated={catalogMeta.lastUpdated}
          />
        )}

        {/* TAB 2: MINHAS SOLICITAÇÕES (ACOMPANHAMENTO EM TEMPO REAL) */}
        {activeTab === 'requests' && (
          <RequestsHistory
            requests={requests}
            vendedores={vendedores}
            whatsappConfig={whatsappConfig}
            onDeleteRequest={handleDeleteRequest}
            onDeleteOrder={handleDeleteOrder}
            activeVendor={activeVendor}
            onSelectVendor={handleSelectVendor}
          />
        )}

        {/* TAB 3: NOVO PAINEL ADMINISTRATIVO */}
        {activeTab === 'admin' && (
          authRole === 'admin' ? (
            <AdminPortal
              requests={requests}
              vendedores={vendedores}
              whatsappConfig={whatsappConfig}
              catalogMeta={catalogMeta}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              onUpdateOrderGroupStatus={handleUpdateOrderStatus}
              onDeleteRequest={handleDeleteRequest}
              onDeleteOrderGroup={handleDeleteOrder}
              onClearAllRequests={handleClearAllRequests}
              onAddVendedor={handleAddVendedor}
              onRemoveVendedor={handleRemoveVendedor}
              onUpdateWhatsApp={handleUpdateWhatsApp}
              onBatchUploaded={handleBatchUploaded}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-4 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Restrito</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O painel de administração e carga em lote requer autenticação.
                </p>
              </div>
              <button
                onClick={() => {
                  setLoginError('');
                  setShowLoginModal(true);
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Entrar com Senha de Admin
              </button>
            </div>
          )
        )}

      </main>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Acesso Admin</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Digite a senha administrativa para gerenciar a carga em lote e aprovar pedidos. (Senha padrão: <strong>123</strong>)
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Senha..."
                  autoFocus
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-600 font-bold">{loginError}</div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Autenticar e Entrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-12">
        <p>Sistema de Gestão de Estoque Marsil & Boracéia • Arquitetura de Alta Performance com Sincronização em Tempo Real</p>
      </footer>

    </div>
  );
}
