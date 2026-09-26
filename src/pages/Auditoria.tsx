import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Input, Select, Badge, EmptyState, PageHeader } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { 
  ShieldCheck, 
  Search,
  Activity,
  User,
  Clock
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Historico {
  id: string
  tabela: string
  registro_id: string
  campo_alterado: string | null
  valor_anterior: string | null
  valor_novo: string | null
  acao: string
  created_at: string
  usuarios?: { nome: string }
}

export default function Auditoria() {
  const [historicos, setHistoricos] = useState<Historico[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [acaoFiltro, setAcaoFiltro] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('historico_alteracoes')
      .select(`
        *,
        usuarios(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(100) // Traz apenas as últimas 100 alterações para não pesar

    if (!error && data) {
      setHistoricos(data as unknown as Historico[])
    }
    setLoading(false)
  }

  const getAcaoStyle = (acao: string) => {
    switch(acao) {
      case 'criacao': return { label: 'Criação', variant: 'success' as const }
      case 'edicao': return { label: 'Edição', variant: 'warning' as const }
      case 'estorno': return { label: 'Estorno', variant: 'danger' as const }
      case 'reabertura_periodo': return { label: 'Reabertura', variant: 'neutral' as const }
      default: return { label: acao, variant: 'neutral' as const }
    }
  }

  // Filtragem local
  const historicosFiltrados = historicos.filter(h => {
    if (acaoFiltro && h.acao !== acaoFiltro) return false
    
    if (busca) {
      const search = busca.toLowerCase()
      const user = (h.usuarios?.nome || '').toLowerCase()
      const table = (h.tabela || '').toLowerCase()
      const field = (h.campo_alterado || '').toLowerCase()
      return user.includes(search) || table.includes(search) || field.includes(search)
    }
    
    return true
  })

  return (
    <Layout>
      <PageHeader
        title="Auditoria de Sistema"
        subtitle="Rastreabilidade total: veja quem alterou, o que alterou e quando."
      />

      {loading ? (
        <PageLoading />
      ) : historicos.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-full h-full text-primary" />}
          title="Nenhum registro de auditoria"
          description="Ainda não houveram alterações rastreáveis no sistema."
        />
      ) : (
        <div className="space-y-6">
          
          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto flex-1">
              <Input
                label="Buscar (Usuário, Tabela, Campo)"
                placeholder="Digite para filtrar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                label="Tipo de Ação"
                value={acaoFiltro}
                onChange={(e) => setAcaoFiltro(e.target.value)}
                options={[
                  { value: '', label: 'Todas as ações' },
                  { value: 'criacao', label: 'Criação' },
                  { value: 'edicao', label: 'Edição' },
                  { value: 'estorno', label: 'Estorno' },
                ]}
              />
            </div>
          </div>

          {/* Timeline de Auditoria */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Últimas 100 atividades
              </h3>
            </div>
            
            <div className="p-6">
              {historicosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">Nenhum registro corresponde à sua busca.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8">
                  {historicosFiltrados.map((hist, idx) => {
                    const acaoFormatada = getAcaoStyle(hist.acao)
                    const isFirst = idx === 0
                    
                    return (
                      <div key={hist.id} className="relative pl-6 md:pl-8">
                        {/* Ponto na timeline */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isFirst ? 'bg-primary animate-pulse' : 'bg-slate-300'}`}></div>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={acaoFormatada.variant}>{acaoFormatada.label}</Badge>
                              <span className="text-sm font-medium text-slate-700">
                                na tabela <span className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{hist.tabela}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span title={format(new Date(hist.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}>
                                {formatDistanceToNow(new Date(hist.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-800">{hist.usuarios?.nome || 'Sistema'}</span>
                            </div>
                            
                            <div className="text-sm">
                              {hist.campo_alterado && (
                                <div className="text-slate-600">
                                  Alterou <span className="font-medium">"{hist.campo_alterado}"</span>:
                                  <div className="mt-1 flex items-center gap-2 font-mono text-xs overflow-x-auto">
                                    <span className="bg-danger/10 text-danger px-1.5 py-0.5 rounded line-through">
                                      {hist.valor_anterior || 'null'}
                                    </span>
                                    <span>→</span>
                                    <span className="bg-success/10 text-success px-1.5 py-0.5 rounded">
                                      {hist.valor_novo || 'null'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {!hist.campo_alterado && hist.acao === 'estorno' && (
                                <span className="text-danger italic">O registro foi estornado e invalidado.</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-mono overflow-hidden">
                            <span>ID:</span>
                            <span className="truncate">{hist.registro_id}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
