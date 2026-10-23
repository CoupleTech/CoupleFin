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
  { id: 'despesas_intercompany', nome: '(-) Despesas Intercompany', tipo: 'negativa', grupos: ['despesas_intercompany', 'intercompany'] },
  { id: 'resultado_antes_impostos', nome: '(=) Resultado antes de Impostos', tipo: 'totalizador', calcula: ['lucro_bruto', 'despesas_operacionais', 'despesas_financeiras', 'despesas_intercompany'] },
  { id: 'impostos_lucro', nome: '(-) Impostos sobre o Lucro', tipo: 'negativa', grupos: ['impostos_lucro', 'irpj', 'csll'] },
  { id: 'resultado_liquido', nome: '(=) Resultado Líquido', tipo: 'totalizador', calcula: ['resultado_antes_impostos', 'impostos_lucro'] },
]

export default function DRE() {
  const { empresaAtivaId, empresas } = useAppStore()
  const empresaAtiva = empresas.find(e => e.id === empresaAtivaId)
  const [loading, setLoading] = useState(false)
  const [visao, setVisao] = useState('contabil') // contabil, financeiro
  const [modo, setModo] = useState('empresa') // empresa, consolidado
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))
  
  const [dadosDRE, setDadosDRE] = useState<any>({})
  const [detalhesIntercompany, setDetalhesIntercompany] = useState<any[]>([])
  const [expandirIntercompany, setExpandirIntercompany] = useState(true)

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
    const itensIntercompany: any[] = []

    lancamentos.forEach(lanc => {
      // Verifica se é compra intercompany faturada por outra empresa
      const isIntercompany = Boolean(lanc.empresa_origem_id && lanc.empresa_origem_id !== lanc.empresa_id)
      const valor = Number(lanc.valor) || 0

      if (isIntercompany) {
        if (!gruposSoma['despesas_intercompany']) gruposSoma['despesas_intercompany'] = 0
        gruposSoma['despesas_intercompany'] += valor
        itensIntercompany.push(lanc)
      } else {
        const grupoDre = lanc.tipo_despesa?.grupo_dre?.toLowerCase() || 'sem_grupo'
        if (!gruposSoma[grupoDre]) gruposSoma[grupoDre] = 0
        gruposSoma[grupoDre] += valor
      }
    })

    setDetalhesIntercompany(itensIntercompany)

    ESTRUTURA_DRE.forEach(item => {
      if (item.tipo === 'positiva' || item.tipo === 'negativa') {
        let soma = 0
        Object.keys(gruposSoma).forEach(k => {
          // Se o grupo da despesa (k) bater com algum dos grupos esperados (g), soma e para
          const match = item.grupos?.some(g => k.includes(g))
          if (match) {
            soma += gruposSoma[k]
          }
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
    const ws_data: any[][] = [
      ['Demonstração do Resultado do Exercício (DRE)'],
      [`Período: ${mesAno} | Visão: ${visao.toUpperCase()} | Modo: ${modo.toUpperCase()}`],
      [],
      ['Descrição', 'Valor']
    ]

    ESTRUTURA_DRE.forEach(item => {
      const valor = dadosDRE[item.id] || 0
      ws_data.push([item.nome, valor])

      // Se for intercompany e houver lançamentos discriminados, inclui na planilha
      if (item.id === 'despesas_intercompany' && detalhesIntercompany.length > 0) {
        detalhesIntercompany.forEach(det => {
          const empOrigem = empresas.find(e => e.id === det.empresa_origem_id)
          const nomeOrigem = empOrigem?.nome_fantasia || empOrigem?.razao_social || 'Outra Empresa'
          ws_data.push([`   ↳ ${det.descricao || 'Despesa'} (Faturado por: ${nomeOrigem})`, -(Number(det.valor) || 0)])
        })
      }
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
          <div className="p-6 border-b border-slate-200 hidden print:flex items-center gap-6">
            {empresaAtiva?.logo_url ? (
              <img src={empresaAtiva.logo_url} alt="Logo da Empresa" className="h-16 w-auto object-contain" />
            ) : (
              <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400 font-bold text-xl border border-slate-200">
                {empresaAtiva?.nome_fantasia?.charAt(0) || empresaAtiva?.razao_social?.charAt(0) || 'E'}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Demonstração do Resultado do Exercício</h2>
              <p className="text-slate-600 font-medium">{empresaAtiva?.razao_social} {empresaAtiva?.cnpj ? `- CNPJ: ${empresaAtiva.cnpj}` : ''}</p>
              <p className="text-slate-500 text-sm mt-1">Período: {mesAno} | Visão: {visao === 'contabil' ? 'Contábil' : 'Financeiro'} | Modo: {modo === 'empresa' ? 'Empresa' : 'Consolidado'}</p>
            </div>
          </div>
          <table className="w-full text-left text-sm text-slate-700">
            <tbody>
              {ESTRUTURA_DRE.map((item) => {
                const valor = dadosDRE[item.id] || 0
                const isTotal = item.tipo === 'totalizador'
                const isIntercompanyRow = item.id === 'despesas_intercompany'

                return (
                  <div key={item.id} className="contents">
                    <tr className={`border-b border-slate-100 last:border-0 ${isTotal ? 'bg-slate-50/80 font-bold text-slate-900' : ''} ${isIntercompanyRow && valor !== 0 ? 'bg-amber-50/20' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span>{item.nome}</span>
                          {isIntercompanyRow && detalhesIntercompany.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandirIntercompany(!expandirIntercompany)}
                              className="text-xs text-amber-700 hover:text-amber-900 font-normal underline ml-2 no-print"
                            >
                              {expandirIntercompany ? '(Ocultar detalhes)' : `(Ver ${detalhesIntercompany.length} itens)`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`py-4 px-6 text-right ${valor < 0 ? 'text-red-600' : isTotal && valor > 0 ? 'text-emerald-600' : ''}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                      </td>
                    </tr>

                    {/* Sub-linhas com detalhamento dos lançamentos Intercompany */}
                    {isIntercompanyRow && expandirIntercompany && detalhesIntercompany.length > 0 && (
                      detalhesIntercompany.map((det, idx) => {
                        const empOrigem = empresas.find(e => e.id === det.empresa_origem_id)
                        const nomeOrigem = empOrigem?.nome_fantasia || empOrigem?.razao_social || 'Outra Empresa'
                        const valDet = Number(det.valor) || 0

                        return (
                          <tr key={`intercompany-${det.id || idx}`} className="bg-amber-50/40 text-xs border-b border-amber-100/50">
                            <td className="py-2.5 px-6 pl-10 text-slate-600">
                              <span className="font-medium text-slate-800">{det.descricao || 'Despesa repassada'}</span>
                              <span className="ml-2 text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                Faturado por: {nomeOrigem}
                              </span>
                            </td>
                            <td className="py-2.5 px-6 text-right text-red-500 font-mono">
                              -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valDet)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
