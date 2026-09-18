import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Search, 
  ShoppingBag, 
  Send, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Warehouse, 
  Smartphone, 
  KeyRound, 
  Copy,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isAdmin = false }) => {
  const [activeTab, setActiveTab] = useState<'passo-a-passo' | 'termos' | 'faq'>('passo-a-passo');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Guia de Uso & Dicas Rápidas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instruções operacionais para consulta de estoque e envio de pedidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Fechar guia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('passo-a-passo')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'passo-a-passo'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Passo a Passo (Fluxo)</span>
          </button>

          <button
            onClick={() => setActiveTab('termos')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'termos'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Legenda & Estoques</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'faq'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Dúvidas Frequentes</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 text-sm">
          
          {/* TAB 1: PASSO A PASSO */}
          {activeTab === 'passo-a-passo' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300">
                <strong>Visão Geral:</strong> O sistema permite pesquisar o saldo de estoque nos dois depósitos (Marsil e Boracéia) e consolidar pedidos de transferência com envio direto via WhatsApp para a expedição.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Passo 1 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span>Identifique seu Vendedor</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    No topo da tela inicial, selecione seu nome no campo <strong>"Identificação do Usuário / Vendedor"</strong>. O sistema lembrará de você em todos os pedidos da sessão.
                  </p>
                </div>

                {/* Passo 2 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Search className="w-4 h-4 text-blue-500" />
                      <span>Consulte e Filtre Itens</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Digite o código (antigo ou novo), descrição do produto ou marca. Use os filtros rápidos para ver itens com estoque na Marsil, Boracéia ou produtos com validade curta.
                  </p>
                </div>

                {/* Passo 3 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">3</span>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <ShoppingBag className="w-4 h-4 text-blue-500" />
                      <span>Adicione ao Pedido</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Clique em <strong>"+ Pedido"</strong> no card de qualquer produto. Você pode adicionar quantos produtos quiser e depois clicar em <strong>"Meu Pedido"</strong> para ajustar quantidades e tipo de transferência.
                  </p>
                </div>

                {/* Passo 4 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">4</span>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Send className="w-4 h-4 text-emerald-500" />
                      <span>Copie para o WhatsApp</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Ao confirmar o pedido, o sistema grava tudo no banco e gera a mensagem já formatada (sem número de pedido). Basta clicar em <strong>"Copiar Mensagem"</strong> e colar na conversa com a expedição.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TERMOS & LEGENDA */}
          {activeTab === 'termos' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                Depósitos e Estoques
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                    <Warehouse className="w-4 h-4" />
                    <span>Estoque Marsil (Origem)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    É o saldo disponível no Centro de Distribuição Principal. É de onde a mercadoria sai para ser transferida para a Boracéia.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <Warehouse className="w-4 h-4" />
                    <span>Estoque Boracéia (Destino / Pronta Entrega)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    É o saldo físico presente na filial Boracéia disponível para faturamento imediato ou pronta entrega aos clientes da rota.
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider text-xs pt-2">
                Situação do Produto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">NO</span>
                    <span>Situação Normal</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Produto de linha normal com validade plena e fluxo comercial regular.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-black text-[10px]">DV</span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Validade Curta / Devolução
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Itens que exigem giro rápido. Verifique a data antes de fechar a transferência.
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider text-xs pt-2">
                Tipos de Transferência
              </h3>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <p>• <strong>Aposta na Venda:</strong> Mercadoria com alta procura para estoque de giro local.</p>
                <p>• <strong>Garantir Entrega:</strong> Produto reservado para assegurar pedido do cliente.</p>
                <p>• <strong>Estoque Mínimo:</strong> Reposição preventiva para não zerar prateleira.</p>
                <p>• <strong>Pedido Fechado de Cliente:</strong> Venda já confirmada aguardando apenas faturamento/expedição.</p>
                <p>• <strong>Transferência Emergencial:</strong> Prioridade máxima para carregamento urgente.</p>
              </div>

            </div>
          )}

          {/* TAB 3: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  <span>Por que a mensagem do WhatsApp não tem número de pedido?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                  A mensagem foi simplificada para facilitar a conferência imediata por itens e volumes no WhatsApp, contendo nome do vendedor, código dos produtos, sabores e quantidades. O número continua salvo no banco de dados para controle da expedição.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  <span>Posso pedir um item se o estoque Marsil estiver zerado?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                  Sim, o sistema permite incluir no carrinho para antecipar a demanda (ex: mercadoria que está chegando ao galpão), e a mensagem de WhatsApp indicará o saldo do momento para a expedição avaliar.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  <span>Como instalar o aplicativo na tela inicial do celular?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                  No topo da tela existe o botão <strong>"Instalar App"</strong>. No Chrome (Android), basta clicar para instalar. No Safari (iPhone), clique no botão Compartilhar do navegador e selecione <em>"Adicionar à Tela de Início"</em>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  <span>Como o Administrador acessa os controles de gestão?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                  No topo da tela, clique no botão <strong>"Admin"</strong> (ícone de chave). Insira a senha administrativa para acessar o controle de solicitações, upload em lote do catálogo Excel/CSV e cadastro de vendedores.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Estoque Marsil Boracéia • Dúvidas operacionais
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Entendido, fechar
          </button>
        </div>

      </div>
    </div>
  );
};
