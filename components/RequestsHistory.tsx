import React, { useState, useMemo } from 'react';
import { StockRequest, WhatsAppConfig, RequestStatus } from '../types';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  MessageSquare, 
  Copy, 
  Check, 
  Trash2, 
  User, 
  Package, 
  Calendar, 
  Layers, 
  List, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle 
} from 'lucide-react';

interface RequestsHistoryProps {
  requests: StockRequest[];
  vendedores: string[];
  whatsappConfig: WhatsAppConfig;
  onDeleteRequest?: (id: string) => void;
  onDeleteOrder?: (pedidoId: string) => void;
  activeVendor?: string;
  onSelectVendor?: (name: string) => void;
}

interface OrderGroup {
  pedidoId: string;
  pedidoNumero: string;
  solicitante: string;
  dataSolicitacao: string;
  tipoGeral?: string;
  observacoesGerais?: string;
  items: StockRequest[];
  totalVolumes: number;
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Parcial';
}

export const RequestsHistory: React.FC<RequestsHistoryProps> = ({
  requests,
  vendedores,
  whatsappConfig,
  onDeleteRequest,
  onDeleteOrder,
  activeVendor = '',
  onSelectVendor
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSolicitante, setFilterSolicitante] = useState<string>(activeVendor);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter individual requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (filterStatus !== 'Todos' && req.status !== filterStatus) return false;
      if (filterSolicitante && req.solicitante.toLowerCase() !== filterSolicitante.toLowerCase()) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const combined = `${req.pedidoNumero || ''} ${req.productCode} ${req.productName} ${req.productSabor} ${req.solicitante} ${req.observacoes || ''}`.toLowerCase();
        if (!combined.includes(term)) return false;
      }
      return true;
    });
  }, [requests, filterStatus, filterSolicitante, searchTerm]);

  // Group requests by pedidoId or standalone request id
  const orderGroups = useMemo<OrderGroup[]>(() => {
    const map = new Map<string, StockRequest[]>();

    filteredRequests.forEach(req => {
      const key = req.pedidoId || `single_${req.id}`;
      const list = map.get(key) || [];
      list.push(req);
      map.set(key, list);
    });

    const groups: OrderGroup[] = [];
    map.forEach((items, key) => {
      const first = items[0];
      const isMulti = items.length > 1 || Boolean(first.pedidoId);
      const pedidoNumero = first.pedidoNumero || (first.pedidoId ? `PED-${first.pedidoId.slice(-6)}` : `SOL-${first.id.slice(-6)}`);
      
      const totalVolumes = items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);

      const allApproved = items.every(it => it.status === 'Aprovado');
      const allRefused = items.every(it => it.status === 'Recusado');
      const allPending = items.every(it => it.status === 'Pendente');

      let status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Parcial' = 'Pendente';
      if (allApproved) status = 'Aprovado';
      else if (allRefused) status = 'Recusado';
      else if (allPending) status = 'Pendente';
      else status = 'Parcial';

      groups.push({
        pedidoId: first.pedidoId || first.id,
        pedidoNumero,
        solicitante: first.solicitante,
        dataSolicitacao: first.dataSolicitacao,
        tipoGeral: first.tipo,
        observacoesGerais: first.observacoes,
        items,
        totalVolumes,
        status
      });
    });

    // Sort by latest request date
    return groups.sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [filteredRequests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pendentes = requests.filter(r => r.status === 'Pendente').length;
    const aprovadas = requests.filter(r => r.status === 'Aprovado').length;
    const recusadas = requests.filter(r => r.status === 'Recusado').length;
    return { total, pendentes, aprovadas, recusadas };
  }, [requests]);

  const toggleOrderExpand = (pedidoId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [pedidoId]: !prev[pedidoId]
    }));
  };

  // Build WhatsApp text for single request
  const handleCopySingleMessage = (req: StockRequest) => {
    const msg = `*SOLICITAÇÃO DE ESTOQUE - BORACÉIA*
📦 *Produto:* ${req.productName}
🔢 *Código:* ${req.productCode}
🍓 *Sabor:* ${req.productSabor || 'Padrão'}
📊 *Quantidade:* ${req.quantidade} ${req.unidade}
🎯 *Tipo:* ${req.tipo}
👤 *Solicitante:* ${req.solicitante}
${req.isValidadeCurta ? '⚠️ *ATENÇÃO:* Validade Curta\n' : ''}${req.observacoes ? `📝 *Obs:* ${req.observacoes}\n` : ''}📌 *Status:* ${req.status}
📅 *Data:* ${new Date(req.dataSolicitacao).toLocaleString('pt-BR')}`;

    navigator.clipboard.writeText(msg);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Build WhatsApp text for an entire grouped order
  const buildGroupWhatsAppText = (group: OrderGroup): string => {
    let msg = `*SOLICITAÇÃO DE TRANSFERÊNCIA DE ESTOQUE - BORACÉIA*\n`;
    msg += `📋 *Pedido:* #${group.pedidoNumero}\n`;
    msg += `👤 *Solicitante:* ${group.solicitante}\n`;
    msg += `🎯 *Tipo Principal:* ${group.tipoGeral || 'Aposta na Venda'}\n`;
    msg += `📅 *Data:* ${new Date(group.dataSolicitacao).toLocaleString('pt-BR')}\n`;
    msg += `📌 *Status Geral:* ${group.status}\n`;
    if (group.observacoesGerais) {
      msg += `📝 *Obs Geral:* ${group.observacoesGerais}\n`;
    }
    msg += `\n*📦 ITENS DO PEDIDO (${group.items.length} produtos / ${group.totalVolumes} volumes):*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    group.items.forEach((item, idx) => {
      msg += `${idx + 1}) *[Cód: ${item.productCode}]* ${item.productName}\n`;
      msg += `   • Qtde: *${item.quantidade} ${item.unidade}*`;
      if (item.productSabor) msg += ` | Sabor: ${item.productSabor}`;
      msg += `\n`;
      msg += `   • Status: ${item.status}\n`;
      if (item.respostaAdmin) msg += `   • Retorno: ${item.respostaAdmin}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    return msg;
  };

  const handleCopyGroupMessage = (group: OrderGroup) => {
    const text = buildGroupWhatsAppText(group);
    navigator.clipboard.writeText(text);
    setCopiedId(group.pedidoId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendGroupWhatsApp = (group: OrderGroup) => {
    const text = buildGroupWhatsAppText(group);
    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendSingleWhatsApp = (req: StockRequest) => {
    const msg = encodeURIComponent(`*SOLICITAÇÃO DE ESTOQUE - BORACÉIA*
📦 *Produto:* ${req.productName}
🔢 *Código:* ${req.productCode}
📊 *Quantidade:* ${req.quantidade} ${req.unidade}
🎯 *Tipo:* ${req.tipo}
👤 *Solicitante:* ${req.solicitante}
${req.observacoes ? `📝 *Obs:* ${req.observacoes}\n` : ''}📌 *Status Atual:* ${req.status}`);

    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const renderStatusBadge = (status: RequestStatus | 'Parcial') => {
    switch (status) {
      case 'Aprovado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprovado</span>
          </span>
        );
      case 'Recusado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Recusado</span>
          </span>
        );
      case 'Parcial':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Layers className="w-3.5 h-3.5" />
            <span>Parcial</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Pendente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Itens</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Aguardando Aprovação</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendentes}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Aprovados</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.aprovadas}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Recusados</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.recusadas}</p>
        </div>
      </div>

      {/* Filter, Search & Group Toggle Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pedido, código, produto..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Solicitante Filter */}
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={filterSolicitante}
              onChange={(e) => {
                setFilterSolicitante(e.target.value);
                if (onSelectVendor) onSelectVendor(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Vendedores</option>
              {vendedores.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Recusado">Recusados</option>
            </select>
          </div>

        </div>

        {/* View Mode Toggle Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Pedido Consolidado ({orderGroups.length})</span>
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'individual'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Itens Individuais ({filteredRequests.length})</span>
            </button>
          </div>

          {filterSolicitante && (
            <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg">
              <span>Vendedor: <strong>{filterSolicitante}</strong></span>
              <button
                onClick={() => {
                  setFilterSolicitante('');
                  if (onSelectVendor) onSelectVendor('');
                }}
                className="hover:underline font-bold text-[11px]"
              >
                (Limpar)
              </button>
            </div>
          )}
        </div>

      </div>

      {/* RENDER LIST: GROUPED BY ORDER */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4">
          {orderGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum pedido encontrado</p>
              <p className="text-xs text-slate-500">
                Selecione itens no catálogo de estoque e clique em "Adicionar ao Pedido" para enviar.
              </p>
            </div>
          ) : (
            orderGroups.map(group => {
              const isExpanded = expandedOrders[group.pedidoId] ?? true;

              return (
                <div
                  key={group.pedidoId}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
                >
                  {/* Order Group Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg">
                          #{group.pedidoNumero}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          Pedido com {group.items.length} {group.items.length === 1 ? 'produto' : 'produtos'}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                          {group.totalVolumes} volumes
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span>Vendedor: <strong className="text-slate-700 dark:text-slate-300">{group.solicitante}</strong></span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(group.dataSolicitacao).toLocaleString('pt-BR')}</span>
                        </span>
                        {group.tipoGeral && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{group.tipoGeral}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      {renderStatusBadge(group.status)}
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(group.pedidoId)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={isExpanded ? 'Recolher itens' : 'Expandir itens'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Optional General Notes */}
                  {group.observacoesGerais && (
                    <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-slate-700 dark:text-slate-300 border-b border-amber-100 dark:border-amber-900/30">
                      <strong>Observação Geral:</strong> {group.observacoesGerais}
                    </div>
                  )}

                  {/* Order Items Table / List */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {group.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <span className="font-mono text-slate-400 font-bold mt-0.5">
                              {idx + 1}.
                            </span>
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  #{item.productCode}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.productName}
                                </span>
                                {item.productSabor && (
                                  <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[11px]">
                                    {item.productSabor}
                                  </span>
                                )}
                                {item.isValidadeCurta && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                    Validade Curta
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                <span>Estoque Marsil: {item.estoqueMarsilMomento ?? '-'}</span>
                                <span>•</span>
                                <span>Boracéia: {item.estoqueBoraceiaMomento ?? '-'}</span>
                                {item.observacoes && (
                                  <>
                                    <span>•</span>
                                    <span>Obs: {item.observacoes}</span>
                                  </>
                                )}
                              </div>

                              {item.respostaAdmin && (
                                <div className="mt-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded">
                                  <strong>Retorno:</strong> {item.respostaAdmin}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                            <div className="text-right">
                              <span className="font-black text-sm text-slate-900 dark:text-white">
                                {item.quantidade} {item.unidade}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                {item.tipo}
                              </span>
                            </div>
                            <div>
                              {renderStatusBadge(item.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Group Footer / Actions */}
                  <div className="p-3.5 sm:px-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyGroupMessage(group)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        {copiedId === group.pedidoId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === group.pedidoId ? 'Copiado!' : 'Copiar Pedido'}</span>
                      </button>

                      <button
                        onClick={() => handleSendGroupWhatsApp(group)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Reenviar no WhatsApp</span>
                      </button>
                    </div>

                    {onDeleteOrder && group.status === 'Pendente' && (
                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja cancelar o pedido #${group.pedidoNumero} completo?`)) {
                            onDeleteOrder(group.pedidoId);
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 flex items-center space-x-1 transition-colors"
                        title="Cancelar pedido completo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar Pedido</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      ) : (

        /* RENDER LIST: INDIVIDUAL ITEMS (FLAT LIST) */
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma solicitação encontrada</p>
              <p className="text-xs text-slate-500">
                Tente ajustar os filtros ou buscar por outro termo.
              </p>
            </div>
          ) : (
            filteredRequests.map(req => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      {req.pedidoNumero && (
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          #{req.pedidoNumero}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                        CÓD: {req.productCode}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {req.productName}
                      </span>
                      {req.productSabor && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {req.productSabor}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Por: <strong className="text-slate-700 dark:text-slate-300">{req.solicitante}</strong></span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(req.dataSolicitacao).toLocaleString('pt-BR')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    {renderStatusBadge(req.status)}
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Quantidade Solicitada</span>
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {req.quantidade} {req.unidade}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Tipo de Demanda</span>
                    <span className={`font-bold inline-block mt-0.5 ${req.tipo === 'Venda Garantida' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {req.tipo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Estoque no Momento</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Marsil: {req.estoqueMarsilMomento ?? '-'} | Boracéia: {req.estoqueBoraceiaMomento ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Validade</span>
                    <span className={req.isValidadeCurta ? 'font-bold text-amber-600' : 'text-slate-600 dark:text-slate-400'}>
                      {req.isValidadeCurta ? '⚠️ Validade Curta' : 'Padrão'}
                    </span>
                  </div>
                </div>

                {req.observacoes && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-2.5 rounded-lg">
                    <strong>Observação:</strong> {req.observacoes}
                  </div>
                )}

                {req.respostaAdmin && (
                  <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-2.5 rounded-lg">
                    <strong>Retorno da Expedição/Admin:</strong> {req.respostaAdmin}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopySingleMessage(req)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === req.id ? 'Copiado!' : 'Copiar'}</span>
                    </button>

                    <button
                      onClick={() => handleSendSingleWhatsApp(req)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {onDeleteRequest && req.status === 'Pendente' && (
                    <button
                      onClick={() => onDeleteRequest(req.id)}
                      title="Cancelar solicitação"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
