import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Modal, Badge, EmptyState, PageHeader } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { 
  CalendarClock, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toast } from '../store/useToastStore'
import { format, isBefore, isToday, isThisWeek, isThisMonth, parseISO, startOfDay } from 'date-fns'
import { isPeriodoFechado } from '../lib/gatekeeper'

interface Lancamento {
  id: string
  tipo: string
  subtipo: string
  valor: number
  valor_acrescimo?: number
  valor_desconto?: number
  data_competencia: string
  data_vencimento: string | null
  descricao: string
  status_pagamento: string
  fornecedores?: { razao_social: string }
  centro_custo?: { nome: string }
  tipo_despesa?: { nome: string, grupo_dre: string }
}

export default function ContasPagar() {
  const { empresaAtivaId, user } = useAppStore()
  
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)

  // Ações de Baixa
  const [isModalBaixaOpen, setIsModalBaixaOpen] = useState(false)
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)
  const [dataBaixa, setDataBaixa] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [valorAcrescimo, setValorAcrescimo] = useState<number | ''>('')
  const [valorDesconto, setValorDesconto] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setLancamentos([])
      setLoading(false)
    }
  }, [empresaAtivaId])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        id, tipo, subtipo, valor, valor_acrescimo, valor_desconto, data_competencia, data_vencimento, descricao, status_pagamento,
        fornecedores(razao_social),
        centro_custo(nome),
        tipo_despesa(nome, grupo_dre)
      `)
      .eq('empresa_id', empresaAtivaId)
      .neq('status', 'estornado')
      .in('status_pagamento', ['pendente', 'atrasado'])
      .order('data_vencimento', { ascending: true }) // Vencimentos mais próximos primeiro
      .order('data_competencia', { ascending: true })

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

  const openBaixa = (l: Lancamento) => {
    setLancamentoSelecionado(l)
    setDataBaixa(format(new Date(), 'yyyy-MM-dd'))
    setValorAcrescimo('')
    setValorDesconto('')
    setIsModalBaixaOpen(true)
  }

  const handleBaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lancamentoSelecionado || !user || !empresaAtivaId) return
    setIsSubmitting(true)

    // GATEKEEPER
    const fechado = await isPeriodoFechado(empresaAtivaId, lancamentoSelecionado.data_competencia)
    if (fechado) {
      toast.error("⚠️ ERRO: Este lançamento pertence a um mês já FECHADO. Não é possível alterar seu status.")
      setIsSubmitting(false)
      setIsModalBaixaOpen(false)
      return
    }

    const { error } = await supabase.from('lancamentos')
      .update({ 
        status_pagamento: 'pago', 
        data_pagamento: dataBaixa,
        valor_acrescimo: Number(valorAcrescimo) || 0,
        valor_desconto: Number(valorDesconto) || 0
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
    carregarDados() // recarrega e remove o item da tela
  }

  // Lógica de agrupamento do Kanban
  const hoje = startOfDay(new Date())

  const grupos = {
    atrasadas: [] as Lancamento[],
    hoje: [] as Lancamento[],
    semana: [] as Lancamento[],
    mes: [] as Lancamento[],
    futuro: [] as Lancamento[]
  }

  lancamentos.forEach(l => {
    const dataRefStr = l.data_vencimento || l.data_competencia
    const dataRef = parseISO(dataRefStr)

    if (isBefore(dataRef, hoje)) {
      grupos.atrasadas.push(l)
    } else if (isToday(dataRef)) {
      grupos.hoje.push(l)
    } else if (isThisWeek(dataRef, { weekStartsOn: 0 })) {
      grupos.semana.push(l)
    } else if (isThisMonth(dataRef)) {
      grupos.mes.push(l)
    } else {
      grupos.futuro.push(l)
    }
  })

  // Componente de Card para cada lançamento no Kanban
  const LancamentoCard = ({ lanc, isAtrasado = false }: { lanc: Lancamento, isAtrasado?: boolean }) => {
    const isReceita = lanc.tipo_despesa?.grupo_dre === 'receita'
    return (
      <div className={`p-4 bg-white border ${isAtrasado ? 'border-danger/30 shadow-danger/5' : 'border-slate-200'} rounded-lg shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden`}>
        {isAtrasado && <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>}
        
        <div className="flex justify-between items-start mb-2">
          <span className={`text-sm font-bold ${isReceita ? 'text-success' : 'text-slate-800'}`}>
             {isReceita ? '+' : ''}{formatCurrency(lanc.valor)}
          </span>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isReceita ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
             {isReceita ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        </div>
        
        <p className="text-sm font-medium text-slate-700 line-clamp-2 leading-tight">
          {lanc.descricao || lanc.fornecedores?.razao_social || 'Sem descrição'}
        </p>
        
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-medium flex items-center gap-1 ${isAtrasado ? 'text-danger' : 'text-slate-500'}`}>
            <Clock className="w-3 h-3" />
            {formatDate(lanc.data_vencimento || lanc.data_competencia)}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openBaixa(lanc)}
            className="!text-success hover:!bg-success/10 h-6 px-2 text-xs"
            icon={<CheckCircle className="w-3 h-3" />}
          >
            Baixar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <PageHeader
        title="Contas a Pagar / Receber"
        subtitle="Acompanhe o fluxo de vencimentos e compromissos pendentes."
      />

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<CalendarClock className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página."
        />
      ) : lancamentos.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-full h-full text-success" />}
          title="Tudo em dia!"
          description="Você não possui nenhum lançamento pendente ou atrasado. Parabéns pela organização financeira!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          
          {/* Coluna Atrasadas */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Atrasadas
              </h3>
              <Badge variant="danger" className="text-xs !px-1.5">{grupos.atrasadas.length}</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {grupos.atrasadas.map(l => <LancamentoCard key={l.id} lanc={l} isAtrasado />)}
              {grupos.atrasadas.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-4">Nenhuma conta atrasada</p>}
            </div>
          </div>

          {/* Coluna Hoje */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-warning flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Vencem Hoje
              </h3>
              <Badge variant="warning" className="text-xs !px-1.5">{grupos.hoje.length}</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {grupos.hoje.map(l => <LancamentoCard key={l.id} lanc={l} />)}
              {grupos.hoje.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-4">Tudo limpo para hoje</p>}
            </div>
          </div>

          {/* Coluna Na Semana */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Nesta Semana
              </h3>
              <Badge variant="neutral" className="text-xs !px-1.5 bg-white border-slate-200">{grupos.semana.length}</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {grupos.semana.map(l => <LancamentoCard key={l.id} lanc={l} />)}
              {grupos.semana.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-4">Sem previsões para a semana</p>}
            </div>
          </div>

          {/* Coluna No Mês e Futuro */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-600 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Para Frente
              </h3>
              <Badge variant="neutral" className="text-xs !px-1.5 bg-white border-slate-200">{grupos.mes.length + grupos.futuro.length}</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {[...grupos.mes, ...grupos.futuro].map(l => <LancamentoCard key={l.id} lanc={l} />)}
              {(grupos.mes.length + grupos.futuro.length) === 0 && <p className="text-sm text-slate-400 italic text-center mt-4">Nenhum lançamento futuro</p>}
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE BAIXA (Reaproveitado da tela Financeiro) */}
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
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Acréscimos (Juros/Multa)"
              type="number"
              min="0"
              step="0.01"
              value={valorAcrescimo}
              onChange={(e) => setValorAcrescimo(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
            />
            <Input
              label="Descontos (Abatimento)"
              type="number"
              min="0"
              step="0.01"
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
            <div className="flex justify-between text-sm mb-1 text-slate-600">
              <span>Valor Original:</span>
              <span>{lancamentoSelecionado ? formatCurrency(lancamentoSelecionado.valor) : 'R$ 0,00'}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
              <span>Total Pago:</span>
              <span className="text-primary">
                {lancamentoSelecionado ? formatCurrency(lancamentoSelecionado.valor + (Number(valorAcrescimo) || 0) - (Number(valorDesconto) || 0)) : 'R$ 0,00'}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalBaixaOpen(false)}>Cancelar</Button>
            <Button type="submit" className="!bg-success hover:!bg-success-dark !border-success" loading={isSubmitting}>Confirmar Baixa</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
