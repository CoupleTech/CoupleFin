import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { PageHeader, Select, Button, EmptyState } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { useAppStore } from '../store/useAppStore'
import { FileBarChart, Download, Printer, Filter } from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'

export default function Relatorios() {
  const { empresaAtivaId, empresas } = useAppStore()
  const [loading, setLoading] = useState(false)
  
  const [tipoRelatorio, setTipoRelatorio] = useState('centro_custo') // centro_custo, fornecedor, conta
  const [visao, setVisao] = useState('contabil') // contabil, financeiro
  const [modo, setModo] = useState('empresa') // empresa, consolidado
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))
  
  const [dados, setDados] = useState<any[]>([])

  useEffect(() => {
    if (empresaAtivaId) {
      carregarRelatorio()
    }
  }, [empresaAtivaId, tipoRelatorio, visao, modo, mesAno])

  const carregarRelatorio = async () => {
    setLoading(true)
    
    try {
      const dataInicio = format(startOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')
      const dataFim = format(endOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')

      let query = supabase.from('lancamentos').select(`
        *,
        centro_custo:centro_custo_id(nome),
        fornecedor:fornecedor_id(razao_social),
        conta:conta_id(nome)
      `)

      // Filtro de data
      if (visao === 'contabil') {
        query = query.gte('data_competencia', dataInicio).lte('data_competencia', dataFim)
      } else {
        query = query.gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim).eq('status_pagamento', 'pago')
      }

      // Filtro de empresa
      if (modo === 'empresa') {
        query = query.eq('empresa_id', empresaAtivaId)
      } else {
        const empresaAtual = empresas.find(e => e.id === empresaAtivaId)
        if (empresaAtual) {
           const empresasDoGrupo = empresas.filter(e => e.grupo_id === empresaAtual.grupo_id).map(e => e.id)
           query = query.in('empresa_id', empresasDoGrupo)
        }
      }

      // Não contar estornados
      query = query.neq('status', 'estornado')

      const { data: lancamentos, error } = await query

      if (error) throw error

      processarDados(lancamentos || [])
    } catch (error) {
      console.error("Erro ao carregar Relatório", error)
    } finally {
      setLoading(false)
    }
  }

  const processarDados = (lancamentos: any[]) => {
    const mapa = new Map<string, number>()
    
    lancamentos.forEach(lanc => {
      let chave = 'Não Informado'
      const valor = Number(lanc.valor) || 0

      // Assume que despesas são negativas e receitas positivas
      // Se não for transferencia, consideramos o tipo
      let fator = 1;
      if (lanc.tipo === 'manual' && lanc.subtipo === 'despesa') fator = -1;
      if (lanc.tipo === 'nota_fiscal') fator = -1; // NF de entrada de serviço tomada = despesa

      if (tipoRelatorio === 'centro_custo') {
        chave = lanc.centro_custo?.nome || 'Sem Centro de Custo'
      } else if (tipoRelatorio === 'fornecedor') {
        chave = lanc.fornecedor?.razao_social || 'Sem Fornecedor'
      } else if (tipoRelatorio === 'conta') {
        chave = lanc.conta?.nome || 'Sem Conta Bancária'
      }

      const atual = mapa.get(chave) || 0
      mapa.set(chave, atual + (valor * fator))
    })

    const arrayProcessado = Array.from(mapa, ([nome, valor]) => ({ nome, valor }))
    // Ordenar por valor absoluto decrescente
    arrayProcessado.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    
    setDados(arrayProcessado)
  }

  const exportarExcel = () => {
    const titulos = {
      'centro_custo': 'Analítico por Centro de Custo',
      'fornecedor': 'Ranking de Gastos por Fornecedor',
      'conta': 'Extrato Financeiro por Conta'
    }

    const ws_data = [
      [titulos[tipoRelatorio as keyof typeof titulos]],
      [`Período: ${mesAno} | Visão: ${visao.toUpperCase()} | Modo: ${modo.toUpperCase()}`],
      [],
      ['Descrição', 'Valor (R$)']
    ]

    dados.forEach(item => {
      ws_data.push([item.nome, item.valor])
    })

    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio")
    XLSX.writeFile(wb, `Relatorio_${tipoRelatorio}_${mesAno}.xlsx`)
  }

  const imprimir = () => {
    window.print()
  }

  const getTitulo = () => {
    if (tipoRelatorio === 'centro_custo') return 'Analítico por Centro de Custo'
    if (tipoRelatorio === 'fornecedor') return 'Ranking de Gastos por Fornecedor'
    return 'Extrato Financeiro por Conta'
  }

  return (
    <Layout>
      <PageHeader
        title="Relatórios"
        subtitle="Extraia visões analíticas e financeiras customizadas"
      />

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end no-print">
        
        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Tipo de Relatório</label>
          <Select 
            value={tipoRelatorio} 
            onChange={e => setTipoRelatorio(e.target.value)}
            options={[
              { value: 'centro_custo', label: 'Por Centro de Custo' },
              { value: 'fornecedor', label: 'Por Fornecedor' },
              { value: 'conta', label: 'Por Conta Bancária' }
            ]}
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Mês/Ano</label>
          <input 
            type="month" 
            className="w-full max-w-full min-w-[140px] sm:min-w-[160px] appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg"
            value={mesAno}
            onChange={e => setMesAno(e.target.value)}
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Visão</label>
          <Select 
            value={visao} 
            onChange={e => setVisao(e.target.value)}
            options={[
              { value: 'contabil', label: 'Contábil' },
              { value: 'financeiro', label: 'Financeiro' }
            ]}
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Empresa</label>
          <Select 
            value={modo} 
            onChange={e => setModo(e.target.value)}
            options={[
              { value: 'empresa', label: 'Selecionada' },
              { value: 'consolidado', label: 'Consolidado' }
            ]}
          />
        </div>

        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={exportarExcel} icon={<Download className="w-4 h-4" />}>
            Excel
          </Button>
          <Button variant="secondary" className="flex-1" onClick={imprimir} icon={<Printer className="w-4 h-4" />}>
            Imprimir
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState icon={<FileBarChart className="w-12 h-12 text-slate-300" />} title="Selecione uma empresa" description="" />
      ) : dados.length === 0 ? (
         <EmptyState icon={<Filter className="w-12 h-12 text-slate-300" />} title="Nenhum dado encontrado" description="Tente alterar os filtros de período ou visão." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print-area">
          <div className="p-6 border-b border-slate-200 hidden print:block">
            <h2 className="text-2xl font-bold text-slate-800">{getTitulo()}</h2>
            <p className="text-slate-500">Período: {mesAno} | Visão: {visao} | Modo: {modo}</p>
          </div>
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Descrição</th>
                <th className="py-3 px-6 text-right">Valor Consolidado</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="py-4 px-6 font-medium">{item.nome}</td>
                  <td className={`py-4 px-6 text-right ${item.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200">
              <tr>
                <td className="py-4 px-6">TOTAL GERAL</td>
                <td className="py-4 px-6 text-right">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    dados.reduce((acc, cur) => acc + cur.valor, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Layout>
  )
}
