import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Send, 
  Copy, 
  Check, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Package
} from 'lucide-react';
import { OrderItem, UnitType, RequestType, WhatsAppConfig, CreateOrderPayload, StockRequest } from '../types';

interface OrderDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  onUpdateItemQty: (productId: string, delta: number) => void;
  onSetItemQty: (productId: string, qty: number) => void;
  onSetItemUnit: (productId: string, unit: UnitType) => void;
  onSetItemTipo: (productId: string, tipo: RequestType) => void;
  onToggleItemValidade: (productId: string) => void;
  onSetItemNotes: (productId: string, notes: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearOrder: () => void;
  vendedores: string[];
  activeVendor: string;
  onSelectVendor: (vendor: string) => void;
  whatsappConfig: WhatsAppConfig;
  onSubmitOrder: (payload: CreateOrderPayload, sendWhatsApp: boolean) => Promise<StockRequest[]>;
  onViewRequests?: () => void;
}

const UNIT_OPTIONS: UnitType[] = ['CX', 'UN', 'DP', 'PCT', 'PT', 'SC', 'FD'];

export const OrderDrawerModal: React.FC<OrderDrawerModalProps> = ({
  isOpen,
  onClose,
  orderItems,
  onUpdateItemQty,
  onSetItemQty,
  onSetItemUnit,
  onSetItemTipo,
  onToggleItemValidade,
  onSetItemNotes,
  onRemoveItem,
  onClearOrder,
  vendedores,
  activeVendor,
  onSelectVendor,
  whatsappConfig,
  onSubmitOrder,
  onViewRequests
}) => {
  const [solicitante, setSolicitante] = useState(activeVendor || (vendedores[0] || 'ADALTON LUIZ'));
  const [tipoGeral, setTipoGeral] = useState<RequestType>('Aposta na Venda');
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderInfo, setSubmittedOrderInfo] = useState<{
    pedidoNumero: string;
    count: number;
    whatsappUrl?: string;
    messageText: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Sync solicitante when activeVendor changes
  React.useEffect(() => {
    if (activeVendor) {
      setSolicitante(activeVendor);
    }
  }, [activeVendor]);

  // Totals calculation
  const totals = useMemo(() => {
    const totalItens = orderItems.length;
    const totalVolumes = orderItems.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);
    return { totalItens, totalVolumes };
  }, [orderItems]);

  // Apply general type to all items
  const handleApplyTipoToAll = (newTipo: RequestType) => {
    setTipoGeral(newTipo);
    orderItems.forEach(item => {
      onSetItemTipo(item.productId, newTipo);
    });
  };

  // Build formatted WhatsApp message
  const buildWhatsAppMessage = (orderNum: string): string => {
    const nowStr = new Date().toLocaleString('pt-BR');
    let msg = `*SOLICITAÇÃO DE TRANSFERÊNCIA DE ESTOQUE - BORACÉIA*\n`;
    msg += `📋 *Pedido:* #${orderNum}\n`;
    msg += `👤 *Solicitante:* ${solicitante}\n`;
    msg += `🎯 *Tipo Principal:* ${tipoGeral}\n`;
    msg += `📅 *Data/Hora:* ${nowStr}\n`;
    if (observacoesGerais.trim()) {
      msg += `📝 *Obs Geral:* ${observacoesGerais.trim()}\n`;
    }
    msg += `\n*📦 ITENS DO PEDIDO (${totals.totalItens} produtos / ${totals.totalVolumes} volumes):*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    orderItems.forEach((item, index) => {
      const idx = index + 1;
      msg += `${idx}) *[Cód: ${item.productCode}]* ${item.productName}\n`;
      msg += `   • Qtde: *${item.quantidade} ${item.unidade}*`;
      if (item.productSabor) msg += ` | Sabor: ${item.productSabor}`;
      msg += `\n`;
      msg += `   • Estoque: Marsil: ${item.estoqueMarsilMomento ?? 'N/D'} | Boracéia: ${item.estoqueBoraceiaMomento ?? 'N/D'}\n`;
      if (item.tipo && item.tipo !== tipoGeral) {
        msg += `   • Tipo: ${item.tipo}\n`;
      }
      if (item.isValidadeCurta) {
        msg += `   • ⚠️ *Validade Curta*\n`;
      }
      if (item.observacoes) {
        msg += `   • Obs: ${item.observacoes}\n`;
      }
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Total:* ${totals.totalItens} itens selecionados (${totals.totalVolumes} volumes)\n`;
    msg += `Por favor, confirmar a separação e transferência. Obrigado!`;
    return msg;
  };

  // Submit Order
  const handleConfirmSubmit = async (sendWhatsApp: boolean) => {
    if (orderItems.length === 0) return;
    if (!solicitante) {
      alert("Por favor, selecione o solicitante/vendedor.");
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedOrderNum = `PED-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const messageText = buildWhatsAppMessage(generatedOrderNum);

      const payload: CreateOrderPayload = {
        pedidoNumero: generatedOrderNum,
        solicitante,
        tipoGeral,
        observacoesGerais: observacoesGerais.trim(),
        items: orderItems
      };

      await onSubmitOrder(payload, sendWhatsApp);
      onSelectVendor(solicitante);

      const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

      if (sendWhatsApp) {
        window.open(whatsappUrl, '_blank');
      }

      setSubmittedOrderInfo({
        pedidoNumero: generatedOrderNum,
        count: orderItems.length,
        whatsappUrl,
        messageText
      });

      // Clear local cart
      onClearOrder();
    } catch (err: any) {
      alert(`Erro ao registrar pedido: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* SUCCESS SCREEN */}
        {submittedOrderInfo ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-md">
              <span className="inline-flex px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider">
                Pedido Registrado com Sucesso!
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Pedido #{submittedOrderInfo.pedidoNumero}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Os <strong>{submittedOrderInfo.count} itens</strong> foram gravados com o mesmo código de pedido no servidor e já aparecem em tempo real no painel administrativo e em "Minhas Solicitações".
              </p>
            </div>

            {/* WhatsApp Card Box */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>Mensagem Formatada para WhatsApp</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyMessage(submittedOrderInfo.messageText)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>
              <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {submittedOrderInfo.messageText}
              </pre>
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
              {submittedOrderInfo.whatsappUrl && (
                <a
                  href={submittedOrderInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Reenviar pelo WhatsApp</span>
                </a>
              )}
              {onViewRequests && (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrderInfo(null);
                    onClose();
                    onViewRequests();
                  }}
                  className="py-3 px-4 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-sm rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Ver em Minhas Solicitações</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrderInfo(null);
                  onClose();
                }}
                className="py-3 px-4 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Pedido de Transferência
                    </h2>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                      {totals.totalItens} {totals.totalItens === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Selecione produtos do catálogo e envie todos em um único pedido consolidado.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* VENDOR & GENERAL CONFIG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Vendedor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Vendedor / Solicitante *</span>
                  </label>
                  <select
                    value={solicitante}
                    onChange={(e) => {
                      setSolicitante(e.target.value);
                      onSelectVendor(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {vendedores.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo Geral */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tipo do Pedido</span>
                  </label>
                  <div className="flex rounded-xl bg-slate-200 dark:bg-slate-700 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleApplyTipoToAll('Aposta na Venda')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        tipoGeral === 'Aposta na Venda'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Aposta na Venda
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTipoToAll('Venda Garantida')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        tipoGeral === 'Venda Garantida'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Venda Garantida
                    </button>
                  </div>
                </div>

                {/* Observações Gerais */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Observação Geral do Pedido (opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={observacoesGerais}
                    onChange={(e) => setObservacoesGerais(e.target.value)}
                    placeholder="Ex: Urgente para entrega de amanhã; separar com prioridade; cliente X..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* LIST OF SELECTED ITEMS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span>Produtos Selecionados ({totals.totalItens})</span>
                  </h3>
                  {orderItems.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearOrder}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Tudo</span>
                    </button>
                  )}
                </div>

                {orderItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      Nenhum item selecionado ainda
                    </p>
                    <p className="text-xs text-slate-400">
                      Volte na busca de produtos e clique em <strong>"+ Adicionar ao Pedido"</strong> nos itens desejados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div
                        key={item.productId}
                        className="bg-white dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3"
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-mono text-xs font-black bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  #{item.productCode}
                                </span>
                                {item.productNovoCodigo && item.productNovoCodigo !== item.productCode && (
                                  <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800" title="Novo Código">
                                    Novo: {item.productNovoCodigo}
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 uppercase font-bold">
                                  {item.fornecedor}
                                </span>
                                {item.isValidadeCurta && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                                    Validade Curta
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                                {item.productName}
                              </h4>
                              {item.productSabor && (
                                <p className="text-xs text-slate-500 font-medium">
                                  Sabor: {item.productSabor}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.productId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remover do pedido"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Controls Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          
                          {/* Estoques de Referência */}
                          <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
                            <span>Marsil: <strong className="text-blue-600 dark:text-blue-400 font-mono">{item.estoqueMarsilMomento ?? 0}</strong></span>
                            <span>•</span>
                            <span>Boracéia: <strong className="text-purple-600 dark:text-purple-400 font-mono">{item.estoqueBoraceiaMomento ?? 0}</strong></span>
                          </div>

                          {/* Quantidade e Unidade */}
                          <div className="flex items-center space-x-2">
                            {/* Stepper */}
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateItemQty(item.productId, -1)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => onSetItemQty(item.productId, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-12 text-center text-xs font-black bg-transparent border-none focus:outline-none text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => onUpdateItemQty(item.productId, 1)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Unidade */}
                            <select
                              value={item.unidade}
                              onChange={(e) => onSetItemUnit(item.productId, e.target.value as UnitType)}
                              className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                            >
                              {UNIT_OPTIONS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-3">
              {/* Totals Summary */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Resumo do Pedido:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {totals.totalItens} produtos diferentes • <strong className="text-blue-600 dark:text-blue-400 font-mono text-base">{totals.totalVolumes}</strong> volumes totais
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={orderItems.length === 0 || isSubmitting}
                  onClick={() => handleConfirmSubmit(true)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processando...' : 'Finalizar e Enviar no WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  disabled={orderItems.length === 0 || isSubmitting}
                  onClick={() => handleConfirmSubmit(false)}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Apenas Salvar no Sistema</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-colors"
                >
                  Continuar Escolhendo
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
