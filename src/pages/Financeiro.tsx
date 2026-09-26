import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Badge, EmptyState, PageHeader, Modal } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  WalletCards,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCircle,
  Ban
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { isPeriodoFechado } from '../lib/gatekeeper'

interface Lancamento {
  id: string
  tipo: string
  subtipo: string
  valor: number
  data_competencia: string
  data_vencimento: string | null
  data_pagamento: string | null
  status_pagamento: string
  status: string
  descricao: string
  fornecedores?: { razao_social: string }
  centro_custo?: { nome: string }
  tipo_despesa?: { nome: string, grupo_dre: string }
}

export default function Financeiro() {
  const navigate = useNavigate()
  const { empresaAtivaId, user } = useAppStore()
  
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [statusFiltro, setStatusFiltro] = useState('')
  const [busca, setBusca] = useState('')

  // Ações
  const [isModalBaixaOpen, setIsModalBaixaOpen] = useState(false)
  const [isModalEstornoOpen, setIsModalEstornoOpen] = useState(false)
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)
  
  const [dataBaixa, setDataBaixa] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setLancamentos([])
      setLoading(false)
    }
  }, [empresaAtivaId, dataInicio, dataFim, statusFiltro])

  const carregarDados = async () => {
    setLoading(true)
    
    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        fornecedores(razao_social),
        centro_custo(nome),
        tipo_despesa(nome, grupo_dre)
      `)
      .eq('empresa_id', empresaAtivaId)
      .gte('data_competencia', dataInicio)
      .lte('data_competencia', dataFim)
      .order('data_competencia', { ascending: false })
      .order('created_at', { ascending: false })

    if (statusFiltro) {
      query = query.eq('status_pagamento', statusFiltro)
    }

    const { data, error } = await query
    
    if (!error && data) {
      setLancamentos(data as unknown as Lancamento[])
    }
    setLoading(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  // Filtragem local textual
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (!busca) return true
    const search = busca.toLowerCase()
    const desc = (l.descricao || '').toLowerCase()
    const forn = (l.fornecedores?.razao_social || '').toLowerCase()
    return desc.includes(search) || forn.includes(search)
  })

  // Resumos
  const totalAtrasado = lancamentosFiltrados.filter(l => l.status_pagamento === 'atrasado').reduce((acc, l) => acc + l.valor, 0)
  const totalPendente = lancamentosFiltrados.filter(l => l.status_pagamento === 'pendente').reduce((acc, l) => acc + l.valor, 0)
  const totalPago = lancamentosFiltrados.filter(l => l.status_pagamento === 'pago' && l.status !== 'estornado').reduce((acc, l) => acc + l.valor, 0)

  // Handlers de Ações
  const handleBaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lancamentoSelecionado || !user || !empresaAtivaId) return
    setIsSubmitting(true)

    // GATEKEEPER
    const fechado = await isPeriodoFechado(empresaAtivaId, lancamentoSelecionado.data_competencia)
    if (fechado) {
      alert("⚠️ ERRO: Este lançamento pertence a um mês já FECHADO. Não é possível alterar seu status.")
      setIsSubmitting(false)
      setIsModalBaixaOpen(false)
      return
    }

    const { error } = await supabase.from('lancamentos')
      .update({ 
        status_pagamento: 'pago', 
        data_pagamento: dataBaixa 
      })
      .eq('id', lancamentoSelecionado.id)

    if (!error) {
      await supabase.from('historico_alteracoes').insert([{
        tabela: 'lancamentos',
        registro_id: lancamentoSelecionado.id,
        usuario_id: user.id,
        campo_alterado: 'status_pagamento',
        valor_anterior: lancamentoSelecionado.status_pagamento,
        valor_novo: 'pago',
        acao: 'edicao'
      }])
    }
    
    setIsSubmitting(false)
    setIsModalBaixaOpen(false)
    carregarDados()
  }

  const handleEstorno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lancamentoSelecionado || !user || !empresaAtivaId || !motivoEstorno.trim()) return
    setIsSubmitting(true)

    // GATEKEEPER
    const fechado = await isPeriodoFechado(empresaAtivaId, lancamentoSelecionado.data_competencia)
    if (fechado) {
      alert("⚠️ ERRO: Este lançamento pertence a um mês já FECHADO. Não é possível estornar um lançamento desse período.")
      setIsSubmitting(false)
      setIsModalEstornoOpen(false)
      return
    }

    const { error } = await supabase.from('lancamentos')
      .update({ 
        status: 'estornado',
        motivo_estorno: motivoEstorno,
        status_pagamento: 'pendente' // Reseta status de pagamento caso estornado
      })
      .eq('id', lancamentoSelecionado.id)

    if (!error) {
      await supabase.from('historico_alteracoes').insert([{
        tabela: 'lancamentos',
        registro_id: lancamentoSelecionado.id,
        usuario_id: user.id,
        campo_alterado: 'status',
        valor_anterior: 'lancado',
        valor_novo: 'estornado',
        acao: 'estorno'
      }])
    }

    setIsSubmitting(false)
    setIsModalEstornoOpen(false)
    carregarDados()
  }

  const openBaixa = (l: Lancamento) => {
    setLancamentoSelecionado(l)
    setDataBaixa(format(new Date(), 'yyyy-MM-dd'))
    setIsModalBaixaOpen(true)
  }

  const openEstorno = (l: Lancamento) => {
    setLancamentoSelecionado(l)
    setMotivoEstorno('')
    setIsModalEstornoOpen(true)
  }

  return (
    <Layout>
      <PageHeader
        title="Lançamentos Financeiros"
        subtitle="Gerencie contas a pagar, contas a receber e movimentações."
        action={
          <Button 
            onClick={() => navigate('/financeiro/novo')} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!empresaAtivaId}
          >
            Novo Lançamento
          </Button>
        }
      />

      {loading && lancamentos.length === 0 ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<WalletCards className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página para ver seus lançamentos."
        />
      ) : (
        <div className="space-y-6">
          
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-danger/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-2 relative">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-slate-600">Em Atraso</h3>
              </div>
              <div className="mt-3 relative">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalAtrasado)}</p>
                <p className="text-xs text-slate-500 mt-1">Lançamentos vencidos e não pagos</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-warning/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-2 relative">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-slate-600">A Vencer</h3>
              </div>
              <div className="mt-3 relative">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalPendente)}</p>
                <p className="text-xs text-slate-500 mt-1">Lançamentos pendentes no período</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-success/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-2 relative">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-slate-600">Pagos</h3>
              </div>
              <div className="mt-3 relative">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalPago)}</p>
                <p className="text-xs text-slate-500 mt-1">Lançamentos quitados no período</p>
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-auto flex-1 min-w-[200px]">
              <Input
                label="Buscar Lançamento"
                placeholder="Fornecedor, descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="w-full md:w-auto grid grid-cols-2 gap-4">
              <Input
                label="Data Inicial"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <Input
                label="Data Final"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                label="Status"
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                options={[
                  { value: '', label: 'Todos os status' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'atrasado', label: 'Atrasado' },
                ]}
              />
            </div>
          </div>

          {/* Lista de Lançamentos */}
          {lancamentosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum lançamento encontrado</h3>
              <p className="text-sm text-slate-500">Ajuste os filtros de data ou busca para encontrar o que procura.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Classificação</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lancamentosFiltrados.map((lanc) => {
                      // Define a cor baseada no grupo do dre (entrada vs saída)
                      // No momento assumimos que a maioria é despesa, se for "receita" é positivo
                      const isReceita = lanc.tipo_despesa?.grupo_dre === 'receita'
                      const isAtrasado = lanc.status_pagamento === 'atrasado'
                      const isPago = lanc.status_pagamento === 'pago'
                      const isEstornado = lanc.status === 'estornado'

                      return (
                        <tr key={lanc.id} className={`hover:bg-slate-50/50 transition-colors duration-fast group ${isEstornado ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isReceita ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                              }`}>
                                {isReceita ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="block text-sm font-medium text-slate-800">
                                  {lanc.descricao || lanc.fornecedores?.razao_social || 'Sem descrição'}
                                </span>
                                <span className="block text-xs text-slate-500 mt-0.5">
                                  {lanc.fornecedores?.razao_social && lanc.descricao ? lanc.fornecedores.razao_social : (lanc.tipo === 'nota_fiscal' ? 'Nota Fiscal' : 'Manual')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="block text-sm text-slate-700">{lanc.tipo_despesa?.nome || '-'}</span>
                              <span className="block text-xs text-slate-400 mt-0.5">{lanc.centro_custo?.nome || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className={`${isAtrasado ? 'text-danger font-medium' : 'text-slate-600'}`}>
                                {formatDate(lanc.data_vencimento || lanc.data_competencia)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-medium ${isReceita ? 'text-success' : 'text-slate-800'}`}>
                              {isReceita ? '+' : ''}{formatCurrency(lanc.valor)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEstornado ? (
                              <Badge variant="neutral" className="w-24 justify-center !bg-slate-200">Estornado</Badge>
                            ) : isPago ? (
                              <Badge variant="success" className="w-24 justify-center">Pago</Badge>
                            ) : isAtrasado ? (
                              <Badge variant="danger" className="w-24 justify-center">Atrasado</Badge>
                            ) : (
                              <Badge variant="warning" className="w-24 justify-center">Pendente</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isPago && !isEstornado && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openBaixa(lanc)}
                                  title="Baixar Lançamento"
                                  className="!text-success hover:!bg-success/10"
                                  icon={<CheckCircle className="w-4 h-4" />}
                                />
                              )}
                              {!isEstornado && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEstorno(lanc)}
                                  title="Estornar"
                                  className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                                  icon={<Ban className="w-4 h-4" />}
                                />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {}}
                                title="Detalhes"
                              >
                                Ver Detalhes
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE BAIXA */}
      <Modal
        isOpen={isModalBaixaOpen}
        onClose={() => setIsModalBaixaOpen(false)}
        title="Baixar Lançamento"
        subtitle="Confirme a data efetiva em que o valor foi pago ou recebido."
        icon={<CheckCircle className="w-5 h-5 text-success" />}
        size="sm"
      >
        <form onSubmit={handleBaixa} className="space-y-4">
          <Input
            label="Data Efetiva"
            type="date"
            required
            value={dataBaixa}
            onChange={(e) => setDataBaixa(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalBaixaOpen(false)}>Cancelar</Button>
            <Button type="submit" className="!bg-success hover:!bg-success-dark !border-success" loading={isSubmitting}>Confirmar Baixa</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE ESTORNO */}
      <Modal
        isOpen={isModalEstornoOpen}
        onClose={() => setIsModalEstornoOpen(false)}
        title="Estornar Lançamento"
        subtitle="Atenção: O lançamento será invalidado. É obrigatório informar o motivo."
        icon={<Ban className="w-5 h-5 text-danger" />}
        size="sm"
      >
        <form onSubmit={handleEstorno} className="space-y-4">
          <Input
            label="Motivo do Estorno"
            type="text"
            required
            placeholder="Ex: Lançamento duplicado, valor incorreto..."
            value={motivoEstorno}
            onChange={(e) => setMotivoEstorno(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalEstornoOpen(false)}>Cancelar</Button>
            <Button type="submit" className="!bg-danger hover:!bg-danger-dark !border-danger" loading={isSubmitting}>Estornar</Button>
          </div>
        </form>
      </Modal>

    </Layout>
  )
}

