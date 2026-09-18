import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './components/AdminPortal';
import { RequestsHistory } from './components/RequestsHistory';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginGate } from './components/LoginGate';
import { HelpModal } from './components/HelpModal';
import { PhoneEmulatorShell } from './components/PhoneEmulatorShell';
import { AppState, StockRequest, CatalogMeta, WhatsAppConfig, SecurityConfig, CreateOrderPayload } from './types';
import { api } from './api';
import { firebaseService, DEFAULT_SECURITY_CONFIG } from './firebaseService';
import { KeyRound, X, ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'requests' | 'admin'>('user');
  const [authRole, setAuthRole] = useState<'none' | 'vendor' | 'admin'>(() => {
    return (localStorage.getItem('marsil_auth_role') as any) || 'none';
  });

  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);

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

  // Help Modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Phone Emulation (Mobile simulator) mode on desktop
  const [isPhoneEmulating, setIsPhoneEmulating] = useState<boolean>(() => {
    const saved = localStorage.getItem('marsil_phone_emulating');
    return saved !== null ? saved === 'true' : true;
  });

  const handleTogglePhoneEmulating = () => {
    setIsPhoneEmulating(prev => {
      const next = !prev;
      localStorage.setItem('marsil_phone_emulating', String(next));
      return next;
    });
  };

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

    // 5. Escuta senhas de acesso em tempo real no Firestore
    const unsubSecurity = firebaseService.subscribeToSecurityConfig((liveSec) => {
      if (liveSec) {
        setSecurityConfig(liveSec);
      }
    });

    return () => {
      unsubRequests();
      unsubVendedores();
      unsubWhatsApp();
      unsubCatalogMeta();
      unsubSecurity();
    };
  }, [loadInitialData]);

  // Garante que o usuário padrão (vendor) permaneça estritamente na tela de Consulta
  useEffect(() => {
    if (authRole === 'vendor' && activeTab !== 'user') {
      setActiveTab('user');
    }
  }, [authRole, activeTab]);

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

  // Handle Security Passwords Config
  const handleUpdateSecurityConfig = async (cfg: Partial<SecurityConfig>) => {
    const updated = await api.updateSecurityConfig(cfg);
    setSecurityConfig(updated);
  };

  // Admin Login Modal Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminExpected = securityConfig.adminPassword || '@adminmarsil2026';
    if (passwordInput.trim() === adminExpected) {
      setAuthRole('admin');
      localStorage.setItem('marsil_auth_role', 'admin');
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
      setActiveTab('admin');
    } else {
      setLoginError(`Senha administrativa incorreta.`);
    }
  };

  const handleLogout = () => {
    setAuthRole('none');
    localStorage.removeItem('marsil_auth_role');
    setActiveTab('user');
  };

  // Se o usuário ainda não autenticou (authRole === 'none'), exibe a tela de login com senha de Usuário e Admin
  if (authRole === 'none') {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <LoginGate
          securityConfig={securityConfig}
          onLoginSuccess={(role) => {
            setAuthRole(role);
            localStorage.setItem('marsil_auth_role', role);
            if (role === 'admin') {
              setActiveTab('admin');
            } else {
              setActiveTab('user');
            }
          }}
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  return (
    <PhoneEmulatorShell
      isEmulating={isPhoneEmulating}
      onToggleEmulating={handleTogglePhoneEmulating}
      isDarkMode={isDarkMode}
    >
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        
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
          onOpenHelp={() => setIsHelpOpen(true)}
          isPhoneEmulating={isPhoneEmulating}
          onTogglePhoneEmulating={handleTogglePhoneEmulating}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-24">
        
        {/* TAB 1: CONSULTA DE ESTOQUE (USUÁRIO / VENDEDOR) */}
        {activeTab === 'user' && (
          <UserPortal
            requests={requests}
            vendedores={vendedores}
            whatsappConfig={whatsappConfig}
            onSubmitRequest={handleSubmitRequest}
            onSubmitOrder={handleSubmitOrder}
            onViewRequests={authRole === 'admin' ? () => setActiveTab('requests') : undefined}
            activeVendor={activeVendor}
            onSelectVendor={handleSelectVendor}
            lastUpdated={catalogMeta.lastUpdated}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {/* TAB 2: SOLICITAÇÕES (EXCLUSIVO ADMIN / EXPEDIÇÃO) */}
        {activeTab === 'requests' && (
          authRole === 'admin' ? (
            <RequestsHistory
              requests={requests}
              vendedores={vendedores}
              whatsappConfig={whatsappConfig}
              onDeleteRequest={handleDeleteRequest}
              onDeleteOrder={handleDeleteOrder}
              activeVendor={activeVendor}
              onSelectVendor={handleSelectVendor}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-4 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Exclusivo do Admin</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O painel de acompanhamento e controle de solicitações pertence ao administrador.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('user')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Voltar para a Tela de Consulta
              </button>
            </div>
          )
        )}

        {/* TAB 3: PAINEL ADMINISTRATIVO (EXCLUSIVO ADMIN) */}
        {activeTab === 'admin' && (
          authRole === 'admin' ? (
            <AdminPortal
              requests={requests}
              vendedores={vendedores}
              whatsappConfig={whatsappConfig}
              catalogMeta={catalogMeta}
              securityConfig={securityConfig}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              onUpdateOrderGroupStatus={handleUpdateOrderStatus}
              onDeleteRequest={handleDeleteRequest}
              onDeleteOrderGroup={handleDeleteOrder}
              onClearAllRequests={handleClearAllRequests}
              onAddVendedor={handleAddVendedor}
              onRemoveVendedor={handleRemoveVendedor}
              onUpdateWhatsApp={handleUpdateWhatsApp}
              onUpdateSecurityConfig={handleUpdateSecurityConfig}
              onBatchUploaded={handleBatchUploaded}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-4 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Restrito ao Admin</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O painel de administração e configurações pertence ao administrador.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('user')}
                  className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Ir para Consulta
                </button>
                <button
                  onClick={() => {
                    setLoginError('');
                    setShowLoginModal(true);
                  }}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Entrar como Admin
                </button>
              </div>
            </div>
          )
        )}

      </main>

        {/* Barra de Navegação Inferior para Smartphones */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          authRole={authRole}
          onOpenLogin={() => {
            setLoginError('');
            setPasswordInput('');
            setShowLoginModal(true);
          }}
          pendingRequestsCount={requests.filter(r => r.status === 'Pendente').length}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        {/* Indicador de Status Offline / Reconexão */}
        <OfflineIndicator />

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
                Digite a senha administrativa para gerenciar a carga em lote e aprovar pedidos.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Senha de administrador..."
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

        {/* Help / Guide Modal */}
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          isAdmin={authRole === 'admin'}
        />

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <p>Sistema de Gestão de Estoque Marsil & Boracéia • Arquitetura PWA Mobile de Alta Performance</p>
        </footer>

      </div>
    </PhoneEmulatorShell>
  );
}
