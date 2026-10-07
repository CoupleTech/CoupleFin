import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, EmptyState, Select } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { useAppStore } from '../store/useAppStore'
import { TrendingDown, TrendingUp, Building, CalendarClock, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, parseISO, addDays, isBefore, startOfDay, isAfter } from 'date-fns'
import { parseDateSafe } from '../lib/dateUtils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
  YAxis as BarYAxis, XAxis as BarXAxis
} from 'recharts'

const COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#64748b', '#ec4899', '#14b8a6']

export default function Dashboard() {
  const { empresas, empresaAtivaId } = useAppStore()
  const [loading, setLoading] = useState(false)
  
  const [modo, setModo] = useState('empresa')
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))

  const [cards, setCards] = useState({
    despesas: 0,
    receitas: 0,
    aVencerQtd: 0,
    aVencerValor: 0,
    atrasadasQtd: 0,
    atrasadasValor: 0,
  })

  const [evolucaoDiaria, setEvolucaoDiaria] = useState<any[]>([])
  const [distCentroCusto, setDistCentroCusto] = useState<any[]>([])
  const [distTipoDespesa, setDistTipoDespesa] = useState<any[]>([])
  const [distEmpresas, setDistEmpresas] = useState<any[]>([])

  useEffect(() => {
    if (empresaAtivaId) carregarDados()
  }, [empresaAtivaId, modo, mesAno])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const dataInicio = format(startOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')
      const dataFim = format(endOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')
      const hoje = startOfDay(new Date())
      const mais7Dias = addDays(hoje, 7)

      let query = supabase.from('lancamentos').select(`
        *,
        centro_custo:centro_custo_id(nome),
        tipo_despesa:tipo_despesa_id(nome),
        empresa:empresa_id(nome_fantasia)
      `).neq('status', 'estornado')

      if (modo === 'empresa') {
        query = query.eq('empresa_id', empresaAtivaId)
      } else {
        const empresaAtual = empresas.find(e => e.id === empresaAtivaId)
        if (empresaAtual) {
           const empresasDoGrupo = empresas.filter(e => e.grupo_id === empresaAtual.grupo_id).map(e => e.id)
           query = query.in('empresa_id', empresasDoGrupo)
        }
      }

      // Para o dashboard, precisamos pegar todos os que vencem no mês ou estão atrasados, 
      // ou foram competência/pagos no mês. Para simplificar, pegaremos um range mais amplo de atrasados,
      // mas como pode ser pesado, vamos pegar tudo do mês e também os pendentes gerais para o card.
      
      const { data: lancsMes, error } = await query
        .gte('data_competencia', dataInicio)
        .lte('data_competencia', dataFim)
      
      if (error) throw error

      // Para pegar atrasados de outros meses, faremos uma query separada rápida
      let queryAtrasos = supabase.from('lancamentos').select('valor, data_vencimento')
        .neq('status', 'estornado')
        .neq('status_pagamento', 'pago')
        .lt('data_vencimento', format(hoje, 'yyyy-MM-dd'))

      if (modo === 'empresa') queryAtrasos = queryAtrasos.eq('empresa_id', empresaAtivaId)
      else {
        const empresaAtual = empresas.find(e => e.id === empresaAtivaId)
        if (empresaAtual) {
           const empresasDoGrupo = empresas.filter(e => e.grupo_id === empresaAtual.grupo_id).map(e => e.id)
           queryAtrasos = queryAtrasos.in('empresa_id', empresasDoGrupo)
        }
      }
      
      const { data: atrasadosGerais } = await queryAtrasos

      processarDados(lancsMes || [], atrasadosGerais || [], hoje, mais7Dias)

    } catch (error) {
      console.error("Erro ao carregar Dashboard", error)
    } finally {
      setLoading(false)
    }
  }

  const processarDados = (lancsMes: any[], atrasadosGerais: any[], hoje: Date, mais7Dias: Date) => {
    let tDespesas = 0
    let tReceitas = 0
    
    // Cards Vencimento baseados na data real
    let aVencerQtd = 0
    let aVencerValor = 0

    // O atrasado pega os do mês que atrasaram + os atrasados gerais
    let atrasadasQtd = atrasadosGerais.length
    let atrasadasValor = atrasadosGerais.reduce((acc, l) => acc + Number(l.valor), 0)

    const mapaDiario = new Map<string, number>()
    const mapaCC = new Map<string, number>()
    const mapaTD = new Map<string, number>()
    const mapaEmp = new Map<string, number>()

    lancsMes.forEach(lanc => {
      const valor = Number(lanc.valor) || 0
      const isReceita = lanc.subtipo === 'receita' || lanc.subtipo === 'nf_receita'
      const isTransferencia = lanc.subtipo === 'transferencia_empresa' || lanc.subtipo === 'transferencia_conta'

      if (isReceita) {
        tReceitas += valor
      } else if (!isTransferencia) {
        tDespesas += valor
        
        // Agrupamentos (somente despesas)
        // Correção do fuso horário para os gráficos
        const dia = format(parseDateSafe(lanc.data_competencia)!, 'dd/MM')
        mapaDiario.set(dia, (mapaDiario.get(dia) || 0) + valor)

        const cc = lanc.centro_custo?.nome || 'Sem C.Custo'
        mapaCC.set(cc, (mapaCC.get(cc) || 0) + valor)

        const td = lanc.tipo_despesa?.nome || 'Sem Tipo'
        mapaTD.set(td, (mapaTD.get(td) || 0) + valor)

        const emp = lanc.empresa?.nome_fantasia || 'Desconhecida'
        mapaEmp.set(emp, (mapaEmp.get(emp) || 0) + valor)
      }

      // Checar vencimentos dos lançamentos do mês que não estão pagos
      if (lanc.status_pagamento !== 'pago' && lanc.data_vencimento) {
        const vDt = parseISO(lanc.data_vencimento)
        if ((isAfter(vDt, hoje) || vDt.getTime() === hoje.getTime()) && (isBefore(vDt, mais7Dias) || vDt.getTime() === mais7Dias.getTime())) {
          aVencerQtd++
          aVencerValor += valor
        }
      }
    })

    setCards({
      despesas: tDespesas,
      receitas: tReceitas,
      aVencerQtd,
      aVencerValor,
      atrasadasQtd,
      atrasadasValor
    })

    // Sort Diário
    const dDiario = Array.from(mapaDiario, ([dia, valor]) => ({ dia, valor })).sort((a, b) => a.dia.localeCompare(b.dia))
    setEvolucaoDiaria(dDiario)

    // Sort CC
    const dCC = Array.from(mapaCC, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    setDistCentroCusto(dCC)

    // Sort TD (Top 5)
    const dTD = Array.from(mapaTD, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
    setDistTipoDespesa(dTD)

    // Sort Emp
    const dEmp = Array.from(mapaEmp, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    setDistEmpresas(dEmp)
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Layout>
      {empresas.length === 0 ? (
        <EmptyState
          icon={<Building className="w-full h-full text-slate-300" />}
          title="Bem-vindo ao CoupleFin"
          description="Você ainda não possui empresas cadastradas. Acesse o menu Empresas para registrar a primeira."
        />
      ) : (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard Financeiro</h1>
              <p className="text-slate-500">Acompanhe seus principais indicadores em tempo real.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
              <input 
                type="month" 
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full sm:w-auto min-w-[160px] sm:min-w-[180px] appearance-none bg-white"
                value={mesAno}
                onChange={e => setMesAno(e.target.value)}
              />
              <Select 
                value={modo} 
                onChange={e => setModo(e.target.value)}
                options={[
                  { value: 'empresa', label: 'Empresa Atual' },
                  { value: 'consolidado', label: 'Consolidado' }
                ]}
                className="py-1.5"
              />
            </div>
          </div>

          {loading ? (
            <PageLoading />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 border-l-danger-500">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm text-slate-500 font-medium">Total de Gastos (Mês)</span>
                    <TrendingDown className="w-5 h-5 text-danger-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(cards.despesas)}</p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 border-l-emerald-500">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm text-slate-500 font-medium">Receitas (Mês)</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(cards.receitas)}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 border-l-warning-500">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm text-slate-500 font-medium">A Vencer (7 dias)</span>
                    <CalendarClock className="w-5 h-5 text-warning-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(cards.aVencerValor)}</p>
                  <p className="text-xs text-slate-400 mt-1">{cards.aVencerQtd} título(s)</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 border-l-red-600">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm text-slate-500 font-medium">Atrasadas (Geral)</span>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(cards.atrasadasValor)}</p>
                  <p className="text-xs text-slate-400 mt-1">{cards.atrasadasQtd} título(s)</p>
                </div>
              </div>

              {/* Gráficos Principais */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Linha: Evolução */}
                <Card title="Evolução de Gastos" className="lg:col-span-2">
                  <div className="h-72 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucaoDiaria}>
                        <defs>
                          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$ ${value}`} />
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                        <Area type="monotone" dataKey="valor" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Pizza: C. Custo */}
                <Card title="Por Centro de Custo">
                  <div className="h-72 w-full flex flex-col items-center justify-center">
                    {distCentroCusto.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distCentroCusto}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {distCentroCusto.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-400 text-sm">Sem dados suficientes</p>
                    )}
                  </div>
                </Card>

                {/* Barra: Top Tipos Despesa */}
                <Card title="Top 5 Categorias de Gasto" className={modo === 'consolidado' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                   <div className="h-64 w-full mt-4">
                    {distTipoDespesa.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distTipoDespesa} layout="vertical" margin={{ left: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <BarXAxis type="number" hide />
                          <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#f1f5f9'}} />
                          <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-slate-400 text-sm">Sem dados suficientes</p>
                      </div>
                    )}
                   </div>
                </Card>

                {/* Barra: Consolidado Empresas */}
                {modo === 'consolidado' && (
                  <Card title="Gastos por Empresa">
                    <div className="h-64 w-full mt-4">
                      {distEmpresas.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distEmpresas} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <BarXAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} dy={10} />
                            <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-slate-400 text-sm">Sem dados suficientes</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
