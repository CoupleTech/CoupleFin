import { useEffect, useState, useMemo, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { PageHeader, Select, Button, EmptyState } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { useAppStore } from '../store/useAppStore'
import { 
  Download, 
  Printer, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  ChevronsUpDown, 
  Search,
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { formatDateBR } from '../lib/dateUtils'

interface LancamentoRelatorio {
  id: string
  descricao: string
  valor: number
  subtipo: string
  data_competencia?: string
  data_pagamento?: string
  numero_documento?: string
  status_pagamento?: string
  centro_custo?: { id: string; nome: string } | null
  tipo_despesa?: { id: string; nome: string; grupo_dre?: string } | null
  fornecedor?: { id: string; razao_social: string; cnpj_cpf?: string } | null
  conta?: { id: string; nome: string } | null
  empresa_id: string
}

interface ItemAnaliticoSubgrupo {
  chave: string
  subtotal: number
  isReceita: boolean
  lancamentos: LancamentoRelatorio[]
}

interface GrupoAnalitico {
  chave: string
  idReferencia?: string
  documento?: string
  total: number
  quantidade: number
  percentual: number
  isReceita: boolean
  subgrupos: ItemAnaliticoSubgrupo[]
  lancamentos: LancamentoRelatorio[]
}

// Identifica com precisão se o lançamento é receita ou despesa
export const isReceitaLancamento = (lanc: LancamentoRelatorio): boolean => {
  if (lanc.subtipo === 'receita' || lanc.subtipo === 'nf_receita') return true
  const grupo = lanc.tipo_despesa?.grupo_dre?.toLowerCase()?.trim() || ''
  if (grupo.includes('receita')) return true
  return false
}

// Identifica a chave principal para o relatório "Por Fornecedor",
// separando fornecedores cadastrados de salários, acordos bancários e despesas diretas
export const getChaveFornecedorOuDespesaDireta = (lanc: LancamentoRelatorio): { chave: string; documento: string } => {
  if (lanc.fornecedor?.razao_social) {
    return {
      chave: lanc.fornecedor.razao_social,
      documento: lanc.fornecedor.cnpj_cpf ? `CNPJ/CPF: ${lanc.fornecedor.cnpj_cpf}` : ''
    }
  }

  // Se não possui fornecedor cadastrado, verificar se é receita
  if (isReceitaLancamento(lanc)) {
    return {
      chave: 'Receita Operacional / Vendas (Sem Fornecedor)',
      documento: 'Receitas / Faturamento'
    }
  }

  // É despesa sem fornecedor cadastrado: categorizar por finalidade real
  const desc = (lanc.descricao || '').toLowerCase()
  const cat = (lanc.tipo_despesa?.nome || '').toLowerCase()
  const cc = (lanc.centro_custo?.nome || '').toLowerCase()

  // 1. Salários, Encargos e Folha de RH
  if (
    lanc.subtipo === 'salario' ||
    desc.includes('salário') || desc.includes('salario') ||
    desc.includes('pagamento por fora') || desc.includes('freelancer') ||
    cat.includes('salário') || cat.includes('salario') ||
    cc.includes('pessoal') || cc.includes('rh')
  ) {
    return {
      chave: 'Folha de Pagamento & Salários',
      documento: 'Despesa de Pessoal / RH'
    }
  }

  // 2. Acordos Financeiros, Bancários e Judiciais
  if (
    desc.includes('acordo') || desc.includes('safra') || desc.includes('empréstimo') ||
    desc.includes('emprestimo') || desc.includes('jurídico') || desc.includes('juridico') ||
    cat.includes('jurídico') || cat.includes('juridico') || cat.includes('acordo')
  ) {
    return {
      chave: 'Acordos & Compromissos Financeiros',
      documento: 'Despesa Financeira / Bancos'
    }
  }

  // 3. Se tiver Tipo de Despesa definido
  if (lanc.tipo_despesa?.nome) {
    return {
      chave: `${lanc.tipo_despesa.nome} (Despesa Direta)`,
      documento: 'Despesa Direta'
    }
  }

  // 4. Se tiver Centro de Custo definido
  if (lanc.centro_custo?.nome) {
    return {
      chave: `${lanc.centro_custo.nome} (Despesa Direta)`,
      documento: 'Despesa Direta'
    }
  }

  return {
    chave: 'Outras Despesas Diretas (Sem Fornecedor)',
    documento: 'Despesa Direta'
  }
}

export default function Relatorios() {
  const { empresaAtivaId, empresas, user } = useAppStore()
  const empresaAtiva = empresas.find(e => e.id === empresaAtivaId)
  
  const [loading, setLoading] = useState(false)
  
  // Filtros
  const [tipoRelatorio, setTipoRelatorio] = useState<'fornecedor' | 'centro_custo' | 'tipo_despesa' | 'conta'>('fornecedor')
  const [natureza, setNatureza] = useState<'despesas' | 'receitas' | 'todas'>('despesas')
  const [visao, setVisao] = useState<'contabil' | 'financeiro'>('contabil')
  const [modo, setModo] = useState<'empresa' | 'consolidado'>('empresa')
  
  // Período
  const [tipoPeriodo, setTipoPeriodo] = useState<'mes' | 'personalizado'>('mes')
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  
  // Busca e visualização
  const [busca, setBusca] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Dados brutos
  const [lancamentos, setLancamentos] = useState<LancamentoRelatorio[]>([])

  useEffect(() => {
    if (empresaAtivaId) {
      carregarRelatorio()
    }
  }, [empresaAtivaId, visao, modo, tipoPeriodo, mesAno, dataInicioPersonalizada, dataFimPersonalizada])

  const carregarRelatorio = async () => {
    setLoading(true)
    
    try {
      let dataInicio = ''
      let dataFim = ''

      if (tipoPeriodo === 'mes') {
        const parsed = parseISO(mesAno + '-01')
        dataInicio = format(startOfMonth(parsed), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(parsed), 'yyyy-MM-dd')
      } else {
        dataInicio = dataInicioPersonalizada
        dataFim = dataFimPersonalizada
      }

      let query = supabase.from('lancamentos').select(`
        id,
        empresa_id,
        descricao,
        valor,
        subtipo,
        data_competencia,
        data_pagamento,
        numero_documento,
        status_pagamento,
        status,
        centro_custo:centro_custo_id(id, nome),
        tipo_despesa:tipo_despesa_id(id, nome, grupo_dre),
        fornecedor:fornecedor_id(id, razao_social, cnpj_cpf),
        conta:conta_id(id, nome)
      `)

      // Filtro de data conforme a visão (Regime de Competência vs Regime de Caixa)
      if (visao === 'contabil') {
        query = query.gte('data_competencia', dataInicio).lte('data_competencia', dataFim)
      } else {
        query = query.gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim).eq('status_pagamento', 'pago')
      }

      // Filtro de empresa (Selecionada vs Consolidado do Grupo)
      if (modo === 'empresa') {
        query = query.eq('empresa_id', empresaAtivaId)
      } else {
        const empresaAtual = empresas.find(e => e.id === empresaAtivaId)
        if (empresaAtual) {
          const empresasDoGrupo = empresas.filter(e => e.grupo_id === empresaAtual.grupo_id).map(e => e.id)
          query = query.in('empresa_id', empresasDoGrupo)
        }
      }

      // Desconsiderar lançamentos estornados
      query = query.neq('status', 'estornado')

      const { data, error } = await query

      if (error) throw error

      setLancamentos((data as any[]) || [])
    } catch (error) {
      console.error("Erro ao carregar dados do relatório:", error)
    } finally {
      setLoading(false)
    }
  }

  // Processamento e Agrupamento Analítico
  const dadosProcessados = useMemo(() => {
    // 1. Filtrar transferências internas (movimentações financeiras neutras)
    let filtrados = lancamentos.filter(lanc => 
      lanc.subtipo !== 'transferencia_empresa' && lanc.subtipo !== 'transferencia_conta'
    )

    // 2. Filtrar pela natureza selecionada usando o helper contábil
    if (natureza === 'despesas') {
      filtrados = filtrados.filter(l => !isReceitaLancamento(l))
    } else if (natureza === 'receitas') {
      filtrados = filtrados.filter(l => isReceitaLancamento(l))
    }

    // 3. Filtrar por busca textual (se preenchida)
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      filtrados = filtrados.filter(l => {
        const fornecedorNome = l.fornecedor?.razao_social?.toLowerCase() || ''
        const centroNome = l.centro_custo?.nome?.toLowerCase() || ''
        const categoriaNome = l.tipo_despesa?.nome?.toLowerCase() || ''
        const contaNome = l.conta?.nome?.toLowerCase() || ''
        const descricao = l.descricao?.toLowerCase() || ''
        const doc = l.numero_documento?.toLowerCase() || ''
        return fornecedorNome.includes(termo) || 
               centroNome.includes(termo) || 
               categoriaNome.includes(termo) || 
               contaNome.includes(termo) || 
               descricao.includes(termo) ||
               doc.includes(termo)
      })
    }

    // 4. Totais globais para bases de percentual corretas
    let totalDespesas = 0
    let totalReceitas = 0
    let saldoLiquido = 0

    filtrados.forEach(l => {
      const val = Number(l.valor) || 0
      const isRec = isReceitaLancamento(l)
      if (isRec) {
        totalReceitas += val
        saldoLiquido += val
      } else {
        totalDespesas += val
        saldoLiquido -= val
      }
    })

    // 5. Agrupar os itens por Nível 1
    const mapaGrupos = new Map<string, {
      chave: string
      idReferencia?: string
      documento?: string
      total: number
      quantidade: number
      isReceita: boolean
      lancamentos: LancamentoRelatorio[]
      subgruposMap: Map<string, { isReceita: boolean; lancamentos: LancamentoRelatorio[] }>
    }>()

    filtrados.forEach(lanc => {
      const val = Number(lanc.valor) || 0
      const isRec = isReceitaLancamento(lanc)

      let chavePrincipal = 'Não Informado'
      let idRef = ''
      let docRef = ''
      let chaveSecundaria = 'Geral'

      if (tipoRelatorio === 'fornecedor') {
        const info = getChaveFornecedorOuDespesaDireta(lanc)
        chavePrincipal = info.chave
        docRef = info.documento
        idRef = lanc.fornecedor?.id || ''
        chaveSecundaria = lanc.centro_custo?.nome || lanc.tipo_despesa?.nome || 'Geral'
      } else if (tipoRelatorio === 'centro_custo') {
        if (lanc.centro_custo?.nome) {
          chavePrincipal = lanc.centro_custo.nome
        } else if (isRec) {
          chavePrincipal = 'Receitas Operacionais (Sem Centro de Custo)'
        } else {
          chavePrincipal = 'Despesas Gerais (Sem Centro de Custo)'
        }
        idRef = lanc.centro_custo?.id || ''
        chaveSecundaria = lanc.fornecedor?.razao_social || lanc.tipo_despesa?.nome || 'Geral'
      } else if (tipoRelatorio === 'tipo_despesa') {
        if (lanc.tipo_despesa?.nome) {
          chavePrincipal = lanc.tipo_despesa.nome
        } else if (isRec) {
          chavePrincipal = 'Receitas Não Classificadas'
        } else {
          chavePrincipal = 'Despesas Não Classificadas'
        }
        idRef = lanc.tipo_despesa?.id || ''
        chaveSecundaria = lanc.fornecedor?.razao_social || lanc.centro_custo?.nome || 'Geral'
      } else if (tipoRelatorio === 'conta') {
        chavePrincipal = lanc.conta?.nome || 'Sem Conta Bancária'
        idRef = lanc.conta?.id || ''
        chaveSecundaria = lanc.fornecedor?.razao_social || lanc.centro_custo?.nome || 'Geral'
      }

      if (!mapaGrupos.has(chavePrincipal)) {
        mapaGrupos.set(chavePrincipal, {
          chave: chavePrincipal,
          idReferencia: idRef,
          documento: docRef,
          total: 0,
          quantidade: 0,
          isReceita: isRec,
          lancamentos: [],
          subgruposMap: new Map()
        })
      }

      const grupo = mapaGrupos.get(chavePrincipal)!
      // Somar sempre a magnitude do valor dentro do grupo
      grupo.total += val
      grupo.quantidade += 1
      grupo.lancamentos.push(lanc)

      // Adicionar no subgrupo
      if (!grupo.subgruposMap.has(chaveSecundaria)) {
        grupo.subgruposMap.set(chaveSecundaria, { isReceita: isRec, lancamentos: [] })
      }
      grupo.subgruposMap.get(chaveSecundaria)!.lancamentos.push(lanc)
    })

    // 6. Formatar array final estruturado com cálculo exato de %
    const grupos: GrupoAnalitico[] = Array.from(mapaGrupos.values()).map(g => {
      // Subgrupos ordenados
      const subgrupos: ItemAnaliticoSubgrupo[] = Array.from(g.subgruposMap.entries()).map(([subChave, itemSub]) => {
        const subtotal = itemSub.lancamentos.reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0)
        return {
          chave: subChave,
          subtotal,
          isReceita: itemSub.isReceita,
          lancamentos: itemSub.lancamentos
        }
      })

      // Ordenar subgrupos por maior valor
      subgrupos.sort((a, b) => b.subtotal - a.subtotal)

      // Base de cálculo do percentual:
      // Se for grupo de despesas, divide pelo total de despesas; se for receitas, pelo total de receitas.
      const baseCalculo = g.isReceita ? (totalReceitas || 1) : (totalDespesas || 1)
      const percentual = Number(((g.total / baseCalculo) * 100).toFixed(1))

      return {
        chave: g.chave,
        idReferencia: g.idReferencia,
        documento: g.documento,
        total: g.total,
        quantidade: g.quantidade,
        percentual,
        isReceita: g.isReceita,
        subgrupos,
        lancamentos: g.lancamentos
      }
    })

    // Ordenar grupos por maior valor decrescente
    grupos.sort((a, b) => b.total - a.total)

    // KPIs adicionais
    const totalItens = filtrados.length
    const maiorGrupo = grupos.length > 0 ? grupos[0] : null
    const valorReferenciaTotal = natureza === 'despesas' ? totalDespesas : natureza === 'receitas' ? totalReceitas : saldoLiquido
    const ticketMedio = totalItens > 0 ? (natureza === 'despesas' ? totalDespesas : totalReceitas || totalDespesas) / totalItens : 0

    return {
      grupos,
      totalDespesas,
      totalReceitas,
      saldoLiquido,
      valorReferenciaTotal,
      totalItens,
      maiorGrupo,
      ticketMedio
    }
  }, [lancamentos, tipoRelatorio, natureza, busca])

  // Toggle de expansão individual
  const toggleGroup = (chave: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(chave)) {
        next.delete(chave)
      } else {
        next.add(chave)
      }
      return next
    })
  }

  // Expandir / Recolher Todos
  const toggleExpandAll = () => {
    if (expandedGroups.size === dadosProcessados.grupos.length) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(dadosProcessados.grupos.map(g => g.chave)))
    }
  }

  // Título e Nomes amigáveis
  const getTituloRelatorio = () => {
    const nomes = {
      'fornecedor': 'Relatório por Fornecedor & Despesas Diretas',
      'centro_custo': 'Relatório por Centro de Custo',
      'tipo_despesa': 'Relatório por Categoria (Tipo de Despesa)',
      'conta': 'Relatório por Conta Bancária'
    }
    const natTexto = natureza === 'despesas' ? 'de Despesas' : natureza === 'receitas' ? 'de Receitas' : 'Geral Consolidado'
    return `${nomes[tipoRelatorio]} — ${natTexto}`
  }

  const getTextoPeriodo = () => {
    if (tipoPeriodo === 'mes') {
      try {
        const d = parseISO(mesAno + '-01')
        return format(d, "MMMM 'de' yyyy", { locale: ptBR })
      } catch {
        return mesAno
      }
    }
    return `${formatDateBR(dataInicioPersonalizada)} até ${formatDateBR(dataFimPersonalizada)}`
  }

  // Exportação Excel avançada com abas Sintética e Analítica
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new()

    // --- ABA 1: SINTÉTICA (Resumo Executivo) ---
    const wsSinteticaData = [
      [empresaAtiva?.razao_social || 'CoupleFin Financial Management'],
      [getTituloRelatorio().toUpperCase()],
      [`Período: ${getTextoPeriodo()} | Regime: ${visao === 'contabil' ? 'Contábil (Competência)' : 'Financeiro (Caixa)'} | Âmbito: ${modo === 'empresa' ? 'Empresa Selecionada' : 'Consolidado do Grupo'}`],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Usuário: ${user?.email || '-'}`],
      [],
      ['Descrição / Agrupamento', 'Documento / Classificação', 'Natureza', 'Qtd. Lançamentos', 'Representatividade (%)', 'Valor Consolidado (R$)']
    ]

    dadosProcessados.grupos.forEach(g => {
      wsSinteticaData.push([
        g.chave,
        g.documento || '-',
        g.isReceita ? 'Receita' : 'Despesa',
        g.quantidade.toString(),
        `${g.percentual}%`,
        g.total.toFixed(2)
      ])
    })

    wsSinteticaData.push([])
    wsSinteticaData.push([
      'TOTAL GERAL',
      '',
      natureza === 'despesas' ? 'Despesas' : natureza === 'receitas' ? 'Receitas' : 'Resultado Líquido',
      dadosProcessados.totalItens.toString(),
      '100%',
      dadosProcessados.valorReferenciaTotal.toFixed(2)
    ])

    const wsSintetica = XLSX.utils.aoa_to_sheet(wsSinteticaData)
    wsSintetica['!cols'] = [
      { wch: 42 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 25 }
    ]
    XLSX.utils.book_append_sheet(wb, wsSintetica, "Resumo Sintético")

    // --- ABA 2: ANALÍTICA (Detalhamento Completo por Lançamento) ---
    const wsAnaliticaData = [
      [empresaAtiva?.razao_social || 'CoupleFin Financial Management'],
      [`DETALHAMENTO ANALÍTICO — ${getTituloRelatorio().toUpperCase()}`],
      [`Período: ${getTextoPeriodo()} | Regime: ${visao === 'contabil' ? 'Contábil' : 'Financeiro'}`],
      [],
      [
        'Data', 
        'Grupo Principal', 
        'Fornecedor / Favorecido', 
        'Centro de Custo', 
        'Tipo de Despesa', 
        'Histórico / Descrição', 
        'Nº Documento / NF', 
        'Conta Financeira', 
        'Natureza',
        'Valor (R$)'
      ]
    ]

    dadosProcessados.grupos.forEach(g => {
      g.lancamentos.forEach(l => {
        const dataStr = visao === 'contabil' ? l.data_competencia : (l.data_pagamento || l.data_competencia)
        const isRec = isReceitaLancamento(l)
        const val = Number(l.valor) || 0

        wsAnaliticaData.push([
          formatDateBR(dataStr),
          g.chave,
          l.fornecedor?.razao_social || (isRec ? 'Receita/Cliente' : 'Despesa Direta'),
          l.centro_custo?.nome || '-',
          l.tipo_despesa?.nome || '-',
          l.descricao || '-',
          l.numero_documento || '-',
          l.conta?.nome || '-',
          isRec ? 'Receita' : 'Despesa',
          val.toFixed(2)
        ])
      })
    })

    const wsAnalitica = XLSX.utils.aoa_to_sheet(wsAnaliticaData)
    wsAnalitica['!cols'] = [
      { wch: 14 },
      { wch: 35 },
      { wch: 32 },
      { wch: 25 },
      { wch: 25 },
      { wch: 35 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 18 }
    ]
    XLSX.utils.book_append_sheet(wb, wsAnalitica, "Detalhamento Analítico")

    const nomeArquivo = `Relatorio_${tipoRelatorio}_${natureza}_${tipoPeriodo === 'mes' ? mesAno : 'personalizado'}.xlsx`
    XLSX.writeFile(wb, nomeArquivo)
  }

  // Impressão corporativa direta
  const dispararImpressao = () => {
    window.print()
  }

  return (
    <Layout>
      <PageHeader
        title="Relatórios Executivos"
        subtitle="Análise gerencial aprofundada, visão analítica e exportação corporativa"
      />

      {/* Painel de Filtros Avançados (Oculto na impressão) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 space-y-4 no-print">
        {/* Linha 1 de Filtros: Tipo, Natureza, Visão e Modo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Tipo de Relatório
            </label>
            <Select 
              value={tipoRelatorio} 
              onChange={e => setTipoRelatorio(e.target.value as any)}
              options={[
                { value: 'fornecedor', label: 'Por Fornecedor & Despesas Diretas' },
                { value: 'centro_custo', label: 'Por Centro de Custo (Áreas)' },
                { value: 'tipo_despesa', label: 'Por Categoria (Tipo de Despesa)' },
                { value: 'conta', label: 'Por Conta Bancária' }
              ]}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Natureza
            </label>
            <Select 
              value={natureza} 
              onChange={e => setNatureza(e.target.value as any)}
              options={[
                { value: 'despesas', label: 'Apenas Despesas (Recomendado)' },
                { value: 'receitas', label: 'Apenas Receitas' },
                { value: 'todas', label: 'Todas (Receitas e Despesas)' }
              ]}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Regime de Visão
            </label>
            <Select 
              value={visao} 
              onChange={e => setVisao(e.target.value as any)}
              options={[
                { value: 'contabil', label: 'Contábil (Competência)' },
                { value: 'financeiro', label: 'Financeiro (Fluxo Liquidado)' }
              ]}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Âmbito da Empresa
            </label>
            <Select 
              value={modo} 
              onChange={e => setModo(e.target.value as any)}
              options={[
                { value: 'empresa', label: 'Empresa Selecionada' },
                { value: 'consolidado', label: 'Consolidado do Grupo' }
              ]}
            />
          </div>
        </div>

        {/* Linha 2 de Filtros: Período, Busca e Botões de Exportação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end pt-2 border-t border-slate-100">
          {/* Seletor do Tipo de Período */}
          <div className="lg:col-span-2 min-w-0">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Tipo Período
            </label>
            <Select 
              value={tipoPeriodo} 
              onChange={e => setTipoPeriodo(e.target.value as any)}
              options={[
                { value: 'mes', label: 'Mês Fechado' },
                { value: 'personalizado', label: 'Período Livre' }
              ]}
            />
          </div>

          {/* Input de Data */}
          {tipoPeriodo === 'mes' ? (
            <div className="lg:col-span-3 min-w-0">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Mês / Ano
              </label>
              <input 
                type="month" 
                className="w-full bg-slate-50 hover:bg-white focus:bg-white px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-fast"
                value={mesAno}
                onChange={e => setMesAno(e.target.value)}
              />
            </div>
          ) : (
            <div className="lg:col-span-4 min-w-0 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Data Inicial
                </label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800"
                  value={dataInicioPersonalizada}
                  onChange={e => setDataInicioPersonalizada(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Data Final
                </label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800"
                  value={dataFimPersonalizada}
                  onChange={e => setDataFimPersonalizada(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Busca Rápida */}
          <div className={`${tipoPeriodo === 'mes' ? 'lg:col-span-4' : 'lg:col-span-3'} min-w-0`}>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Filtrar na Lista
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Ex: Fornecedor, Salário, Safra, NF..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>

          {/* Botões Excel & Impressão */}
          <div className="lg:col-span-3 flex gap-2 w-full">
            <Button 
              variant="secondary" 
              className="flex-1 py-2 px-3 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium shadow-xs" 
              onClick={exportarExcel} 
              icon={<Download className="w-4 h-4 text-emerald-600" />}
            >
              Excel
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1 py-2 px-3 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium shadow-xs" 
              onClick={dispararImpressao} 
              icon={<Printer className="w-4 h-4 text-primary" />}
            >
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState icon={<Building2 className="w-12 h-12 text-slate-300" />} title="Selecione uma empresa" description="Escolha uma empresa para carregar as movimentações financeiras." />
      ) : dadosProcessados.grupos.length === 0 ? (
        <EmptyState icon={<Filter className="w-12 h-12 text-slate-300" />} title="Nenhum registro encontrado" description="Tente alterar os filtros de período, natureza ou termos de busca." />
      ) : (
        <div className="space-y-6 print-area">
          {/* ============================================================== */}
          {/* CABEÇALHO OFICIAL DE IMPRESSÃO / PAPEL TIMBRADO (Só no Print) */}
          {/* ============================================================== */}
          <div className="hidden print:block border-b-2 border-slate-800 pb-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {empresaAtiva?.logo_url ? (
                  <img src={empresaAtiva.logo_url} alt="Logo" className="h-16 w-auto object-contain max-w-[140px]" />
                ) : (
                  <div className="w-14 h-14 bg-slate-900 text-white flex items-center justify-center rounded-xl font-bold text-2xl">
                    {empresaAtiva?.nome_fantasia?.charAt(0) || empresaAtiva?.razao_social?.charAt(0) || 'C'}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                    {empresaAtiva?.razao_social || 'COUPLEFIN'}
                  </h1>
                  {empresaAtiva?.cnpj && (
                    <p className="text-xs text-slate-600 font-mono">CNPJ: {empresaAtiva.cnpj}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {empresaAtiva?.nome_fantasia ? `Nome Fantasia: ${empresaAtiva.nome_fantasia} | ` : ''}
                    Âmbito: {modo === 'empresa' ? 'Empresa Selecionada' : 'Consolidado do Grupo'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-md tracking-wider border border-slate-300">
                  Relatório Gerencial
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </p>
                <p className="text-[11px] text-slate-400">
                  Responsável: {user?.email || 'Sistema'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 uppercase">{getTituloRelatorio()}</span>
              </div>
              <div className="flex gap-4">
                <span><strong>Período:</strong> {getTextoPeriodo()}</span>
                <span><strong>Regime:</strong> {visao === 'contabil' ? 'Contábil (Competência)' : 'Financeiro (Caixa)'}</span>
                <span><strong>Natureza:</strong> {natureza === 'despesas' ? 'Apenas Despesas' : natureza === 'receitas' ? 'Apenas Receitas' : 'Receitas e Despesas'}</span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* CARDS DE KPI EXECUTIVOS (Exibidos em tela e no relatório)     */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {natureza === 'todas' ? (
              <>
                {/* Total Receitas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Receitas</p>
                    <h3 className="text-xl font-bold text-emerald-600 truncate">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.totalReceitas)}
                    </h3>
                  </div>
                </div>

                {/* Total Despesas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                    <ArrowDownRight className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Despesas</p>
                    <h3 className="text-xl font-bold text-slate-900 truncate">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.totalDespesas)}
                    </h3>
                  </div>
                </div>

                {/* Resultado Líquido */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${dadosProcessados.saldoLiquido >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resultado do Período</p>
                    <h3 className={`text-xl font-bold truncate ${dadosProcessados.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {dadosProcessados.saldoLiquido >= 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.saldoLiquido)}
                    </h3>
                  </div>
                </div>

                {/* Maior Concentração */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Maior Despesa</p>
                    <h3 className="text-sm font-bold text-slate-800 truncate" title={dadosProcessados.maiorGrupo?.chave || '-'}>
                      {dadosProcessados.maiorGrupo?.chave || '-'}
                    </h3>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">
                      {dadosProcessados.maiorGrupo ? `${dadosProcessados.maiorGrupo.percentual}% das despesas` : '-'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Total Consolidado */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${natureza === 'despesas' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {natureza === 'despesas' ? 'Total de Despesas' : 'Total de Receitas'}
                    </p>
                    <h3 className={`text-xl font-bold truncate ${natureza === 'despesas' ? 'text-slate-900' : 'text-emerald-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.valorReferenciaTotal)}
                    </h3>
                  </div>
                </div>

                {/* Maior Concentração */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Maior Concentração</p>
                    <h3 className="text-sm font-bold text-slate-800 truncate" title={dadosProcessados.maiorGrupo?.chave || '-'}>
                      {dadosProcessados.maiorGrupo?.chave || '-'}
                    </h3>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">
                      {dadosProcessados.maiorGrupo ? `${dadosProcessados.maiorGrupo.percentual}% do total (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.maiorGrupo.total)})` : '-'}
                    </p>
                  </div>
                </div>

                {/* Total de Lançamentos */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lançamentos</p>
                    <h3 className="text-xl font-bold text-slate-800">
                      {dadosProcessados.totalItens} <span className="text-xs font-normal text-slate-400">registros</span>
                    </h3>
                  </div>
                </div>

                {/* Ticket Médio */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket Médio</p>
                    <h3 className="text-xl font-bold text-slate-800 truncate">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.ticketMedio)}
                    </h3>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Barra de Ações Rápidas da Tabela (Oculta na impressão) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Exibindo {dadosProcessados.grupos.length} agrupamentos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleExpandAll}
                icon={<ChevronsUpDown className="w-3.5 h-3.5" />}
                className="text-xs font-medium border-slate-200 text-slate-600 hover:text-slate-900"
              >
                {expandedGroups.size === dadosProcessados.grupos.length ? 'Recolher Todos' : 'Expandir Todos (Analítico)'}
              </Button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TABELA ANALÍTICA HIERÁRQUICA                                  */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center no-print"></th>
                  <th className="py-3.5 px-4">
                    {tipoRelatorio === 'fornecedor' ? 'Fornecedor / Despesa Direta' : tipoRelatorio === 'centro_custo' ? 'Centro de Custo' : tipoRelatorio === 'tipo_despesa' ? 'Categoria / Despesa' : 'Conta Financeira'}
                  </th>
                  <th className="py-3.5 px-4 text-center hidden sm:table-cell">Lançamentos</th>
                  <th className="py-3.5 px-4 text-center hidden md:table-cell w-48">Participação (%)</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {dadosProcessados.grupos.map((grupo) => {
                  const isExpanded = expandedGroups.has(grupo.chave)

                  return (
                    <Fragment key={grupo.chave}>
                      {/* Linha Principal (Nível 1) */}
                      <tr 
                        onClick={() => toggleGroup(grupo.chave)}
                        className={`group cursor-pointer transition-colors duration-fast ${isExpanded ? 'bg-slate-50/80 font-semibold' : 'hover:bg-slate-50/60'}`}
                      >
                        {/* Botão de Expandir / Recolher */}
                        <td className="py-3.5 px-4 text-center text-slate-400 group-hover:text-primary transition-colors no-print">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 inline-block text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 inline-block" />
                          )}
                        </td>

                        {/* Nome do Agrupamento */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                                {grupo.chave}
                              </span>
                              {grupo.isReceita && (
                                <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  Receita
                                </span>
                              )}
                            </div>
                            {grupo.documento && (
                              <span className="text-xs text-slate-400 font-mono mt-0.5">
                                {grupo.documento}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantidade de Lançamentos */}
                        <td className="py-3.5 px-4 text-center text-slate-600 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {grupo.quantidade} itens
                          </span>
                        </td>

                        {/* Barra de Progresso / % Participação */}
                        <td className="py-3.5 px-4 text-center hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${grupo.isReceita ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${Math.min(grupo.percentual, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-12 text-right">
                              {grupo.percentual}%
                            </span>
                          </div>
                        </td>

                        {/* Valor Consolidado */}
                        <td className={`py-3.5 px-4 text-right font-bold text-base ${grupo.isReceita ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {grupo.isReceita ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grupo.total)}
                        </td>
                      </tr>

                      {/* Linha Expandida: Detalhamento Analítico (Drilldown Nível 2 e 3) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="py-3 px-4 sm:px-8 border-b border-slate-200">
                            <div className="space-y-4">
                              {/* Subgrupos */}
                              {grupo.subgrupos.map((sub, sIdx) => (
                                <div key={sIdx} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                                  {/* Header do Subgrupo */}
                                  <div className="bg-slate-100/60 px-4 py-2.5 flex items-center justify-between border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        {sub.chave}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        ({sub.lancamentos.length} {sub.lancamentos.length === 1 ? 'registro' : 'registros'})
                                      </span>
                                    </div>
                                    <span className={`text-xs font-bold ${sub.isReceita ? 'text-emerald-600' : 'text-slate-800'}`}>
                                      {sub.isReceita ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.subtotal)}
                                    </span>
                                  </div>

                                  {/* Listagem Analítica de Lançamentos */}
                                  <table className="w-full text-left text-xs">
                                    <thead className="text-[10px] uppercase font-semibold text-slate-400 bg-white border-b border-slate-100">
                                      <tr>
                                        <th className="py-2 px-3">Data</th>
                                        <th className="py-2 px-3">
                                          {tipoRelatorio === 'fornecedor' ? 'Centro de Custo' : 'Fornecedor / Favorecido'}
                                        </th>
                                        <th className="py-2 px-3">Categoria</th>
                                        <th className="py-2 px-3">Descrição / Histórico</th>
                                        <th className="py-2 px-3">Nº Doc/NF</th>
                                        <th className="py-2 px-3">Conta</th>
                                        <th className="py-2 px-3 text-right">Valor</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {sub.lancamentos.map((l, lIdx) => {
                                        const dt = visao === 'contabil' ? l.data_competencia : (l.data_pagamento || l.data_competencia)
                                        const valL = Number(l.valor) || 0
                                        const isRecL = isReceitaLancamento(l)

                                        return (
                                          <tr key={l.id || lIdx} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2 px-3 font-mono text-slate-600">
                                              {formatDateBR(dt)}
                                            </td>
                                            <td className="py-2 px-3 text-slate-700 font-medium">
                                              {tipoRelatorio === 'fornecedor' ? (l.centro_custo?.nome || '-') : (l.fornecedor?.razao_social || 'Despesa Direta')}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">
                                              {l.tipo_despesa?.nome || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-slate-800 max-w-xs truncate" title={l.descricao}>
                                              {l.descricao || '-'}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-slate-500">
                                              {l.numero_documento || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-slate-500">
                                              {l.conta?.nome || '-'}
                                            </td>
                                            <td className={`py-2 px-3 text-right font-medium font-mono ${isRecL ? 'text-emerald-600 font-semibold' : 'text-slate-900'}`}>
                                              {isRecL ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valL)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>

              {/* Linha de Totalizador Geral */}
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-4 px-4 no-print"></td>
                  <td className="py-4 px-4 text-base uppercase">
                    {natureza === 'despesas' ? 'TOTAL DE DESPESAS' : natureza === 'receitas' ? 'TOTAL DE RECEITAS' : 'RESULTADO DO PERÍODO'}
                  </td>
                  <td className="py-4 px-4 text-center hidden sm:table-cell">
                    {dadosProcessados.totalItens} lançamentos
                  </td>
                  <td className="py-4 px-4 text-center hidden md:table-cell">
                    100%
                  </td>
                  <td className={`py-4 px-4 text-right text-lg ${natureza === 'receitas' ? 'text-emerald-600' : natureza === 'despesas' ? 'text-slate-900' : dadosProcessados.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {natureza === 'todas' && dadosProcessados.saldoLiquido >= 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosProcessados.valorReferenciaTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Rodapé Corporativo de Impressão (Só no Print) */}
          <div className="hidden print:flex items-center justify-between pt-4 border-t border-slate-300 text-[10px] text-slate-500">
            <span>CoupleFin Gestão Financeira Inteligente — Relatório Gerencial Executivo</span>
            <span>Documento emitido eletronicamente para fins de controle e tomada de decisão</span>
          </div>
        </div>
      )}
    </Layout>
  )
}