import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { PageHeader, Select, Button, EmptyState } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { useAppStore } from '../store/useAppStore'
import { Calculator, Download, Printer } from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'

// Estrutura do DRE de acordo com a documentação
const ESTRUTURA_DRE = [
  { id: 'receita_bruta', nome: '(+) Receita Bruta', tipo: 'positiva', grupos: ['receita_bruta', 'receitas', 'receita'] },
  { id: 'deducoes', nome: '(-) Deduções da Receita', tipo: 'negativa', grupos: ['deducoes_receita', 'deducoes', 'impostos_faturamento'] },
  { id: 'receita_liquida', nome: '(=) Receita Líquida', tipo: 'totalizador', calcula: ['receita_bruta', 'deducoes'] },
  { id: 'custos', nome: '(-) Custos (CPV/CSV)', tipo: 'negativa', grupos: ['custos', 'cpv', 'csv'] },
  { id: 'lucro_bruto', nome: '(=) Lucro Bruto', tipo: 'totalizador', calcula: ['receita_liquida', 'custos'] },
  { id: 'despesas_operacionais', nome: '(-) Despesas Operacionais / Administrativas', tipo: 'negativa', grupos: ['despesas_operacionais', 'despesas_administrativas', 'operacional', 'administrativo'] },
  { id: 'despesas_financeiras', nome: '(-) Despesas Financeiras', tipo: 'negativa', grupos: ['despesas_financeiras', 'financeiro'] },
  { id: 'resultado_antes_impostos', nome: '(=) Resultado antes de Impostos', tipo: 'totalizador', calcula: ['lucro_bruto', 'despesas_operacionais', 'despesas_financeiras'] },
  { id: 'impostos_lucro', nome: '(-) Impostos sobre o Lucro', tipo: 'negativa', grupos: ['impostos_lucro', 'irpj', 'csll'] },
  { id: 'resultado_liquido', nome: '(=) Resultado Líquido', tipo: 'totalizador', calcula: ['resultado_antes_impostos', 'impostos_lucro'] },
]

export default function DRE() {
  const { empresaAtivaId, empresas } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [visao, setVisao] = useState('contabil') // contabil, financeiro
  const [modo, setModo] = useState('empresa') // empresa, consolidado
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))
  
  const [dadosDRE, setDadosDRE] = useState<any>({})

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDRE()
    }
  }, [empresaAtivaId, visao, modo, mesAno])

  const carregarDRE = async () => {
    setLoading(true)
    
    try {
      const dataInicio = format(startOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')
      const dataFim = format(endOfMonth(parseISO(mesAno + '-01')), 'yyyy-MM-dd')

      let query = supabase.from('lancamentos').select(`
        *,
        tipo_despesa:tipo_despesa_id(*)
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
        // Consolidado
        const empresaAtual = empresas.find(e => e.id === empresaAtivaId)
        if (empresaAtual) {
           const empresasDoGrupo = empresas.filter(e => e.grupo_id === empresaAtual.grupo_id).map(e => e.id)
           query = query.in('empresa_id', empresasDoGrupo)
        }
      }

      // Não contar estornados
      query = query.neq('status', 'estornado')

      const { data, error } = await query

      if (error) throw error

      processarDRE(data || [])
    } catch (error) {
      console.error("Erro ao carregar DRE", error)
    } finally {
      setLoading(false)
    }
  }

  const processarDRE = (lancamentos: any[]) => {
    // Inicializa a estrutura de dados
    const valores: any = {}
    
    // Soma os lançamentos por grupo_dre
    const gruposSoma: any = {}

    lancamentos.forEach(lanc => {
      // Receitas geralmente não tem "tipo_despesa" na mesma lógica, ou se tiver, o grupo_dre dirá.
      // Assumindo que subtipo entra como receita se o valor for positivo ou tipo for 'receita' (a definir)
      // Como o sistema foca em despesas mas a DRE prevê receitas, vamos inferir pelo grupo_dre do tipo_despesa
      const grupoDre = lanc.tipo_despesa?.grupo_dre?.toLowerCase() || 'sem_grupo'
      const valor = Number(lanc.valor) || 0
      
      if (!gruposSoma[grupoDre]) gruposSoma[grupoDre] = 0
      gruposSoma[grupoDre] += valor
    })

    // Processa a DRE step-by-step
    ESTRUTURA_DRE.forEach(item => {
      if (item.tipo === 'positiva' || item.tipo === 'negativa') {
        let soma = 0
        item.grupos?.forEach(g => {
          // Busca parciais matching
          Object.keys(gruposSoma).forEach(k => {
            if (k.includes(g)) soma += gruposSoma[k]
          })
        })
        valores[item.id] = item.tipo === 'negativa' ? -soma : soma
      }
    })

    // Calcula Totalizadores
    ESTRUTURA_DRE.forEach(item => {
      if (item.tipo === 'totalizador') {
        let soma = 0
        item.calcula?.forEach(calcId => {
          soma += (valores[calcId] || 0)
        })
        valores[item.id] = soma
      }
    })

    setDadosDRE(valores)
  }

  const exportarExcel = () => {
    const ws_data = [
      ['Demonstração do Resultado do Exercício (DRE)'],
      [`Período: ${mesAno} | Visão: ${visao.toUpperCase()} | Modo: ${modo.toUpperCase()}`],
      [],
      ['Descrição', 'Valor']
    ]

    ESTRUTURA_DRE.forEach(item => {
      const valor = dadosDRE[item.id] || 0
      ws_data.push([item.nome, valor])
    })

    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "DRE")
    XLSX.writeFile(wb, `DRE_${mesAno}.xlsx`)
  }

  const imprimir = () => {
    window.print()
  }

  return (
    <Layout>
      <PageHeader
        title="DRE (Demonstração do Resultado)"
        subtitle="Analise a performance financeira e contábil do seu negócio"
      />

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end no-print">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Mês/Ano</label>
          <input 
            type="month" 
            className="w-full max-w-full min-w-[140px] sm:min-w-[180px] appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg"
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
              { value: 'contabil', label: 'Contábil (Competência)' },
              { value: 'financeiro', label: 'Financeiro (Pagamento Realizado)' }
            ]}
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Empresa</label>
          <Select 
            value={modo} 
            onChange={e => setModo(e.target.value)}
            options={[
              { value: 'empresa', label: 'Empresa Selecionada' },
              { value: 'consolidado', label: 'Visão Consolidada do Grupo' }
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
        <EmptyState icon={<Calculator className="w-12 h-12 text-slate-300" />} title="Selecione uma empresa" description="" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print-area">
          <div className="p-6 border-b border-slate-200 hidden print:block">
            <h2 className="text-2xl font-bold text-slate-800">Demonstração do Resultado do Exercício</h2>
            <p className="text-slate-500">Período: {mesAno} | Visão: {visao} | Modo: {modo}</p>
          </div>
          <table className="w-full text-left text-sm text-slate-700">
            <tbody>
              {ESTRUTURA_DRE.map((item) => {
                const valor = dadosDRE[item.id] || 0
                const isTotal = item.tipo === 'totalizador'
                return (
                  <tr key={item.id} className={`border-b border-slate-100 last:border-0 ${isTotal ? 'bg-slate-50/80 font-bold text-slate-900' : ''}`}>
                    <td className="py-4 px-6">{item.nome}</td>
                    <td className={`py-4 px-6 text-right ${valor < 0 ? 'text-red-600' : isTotal && valor > 0 ? 'text-emerald-600' : ''}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
