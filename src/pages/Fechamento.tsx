import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Select, Badge, EmptyState, PageHeader } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Lock, Unlock, Calendar } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { format } from 'date-fns'
import { parseDateSafe } from '../lib/dateUtils'
import { ptBR } from 'date-fns/locale'

interface Periodo {
  id?: string
  competencia: string // YYYY-MM-01
  status: 'aberto' | 'fechado'
  fechado_por?: string
  fechado_em?: string
  usuarios?: { nome: string }
}

export default function Fechamento() {
  const { empresaAtivaId, user } = useAppStore()
  
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setLoading(false)
    }
  }, [empresaAtivaId, anoFiltro])

  const carregarDados = async () => {
    setLoading(true)
    
    // Buscar periodos no banco do ano selecionado
    const dataInicio = `${anoFiltro}-01-01`
    const dataFim = `${anoFiltro}-12-31`
    
    const { data, error } = await supabase
      .from('periodos_fechamento')
      .select(`*, usuarios:fechado_por(nome)`)
      .eq('empresa_id', empresaAtivaId)
      .gte('competencia', dataInicio)
      .lte('competencia', dataFim)

    if (!error && data) {
      // Mesclar os retornados com a lista completa de 12 meses
      const mesclado: Periodo[] = []
      for (let mes = 1; mes <= 12; mes++) {
        const compDate = new Date(parseInt(anoFiltro), mes - 1, 1)
        const compStr = format(compDate, 'yyyy-MM-dd')
        
        const noBanco = data.find(p => p.competencia === compStr)
        if (noBanco) {
          mesclado.push(noBanco as any)
        } else {
          mesclado.push({
            competencia: compStr,
            status: 'aberto'
          })
        }
      }
      setPeriodos(mesclado)
    }
    setLoading(false)
  }

  const handleTogglePeriodo = async (periodo: Periodo) => {
    if (!empresaAtivaId || !user) return
    setIsSubmitting(true)

    const isFechado = periodo.status === 'fechado'
    const novoStatus = isFechado ? 'aberto' : 'fechado'

    if (isFechado) {
      if (!confirm('ATENÇÃO: Reabrir um período permite que alterações e novos lançamentos sejam criados nesta competência. Esta ação será registrada na auditoria. Deseja continuar?')) {
        setIsSubmitting(false)
        return
      }
    } else {
      if (!confirm('Fechar o período bloqueará permanentemente a criação e edição de lançamentos neste mês. Deseja continuar?')) {
        setIsSubmitting(false)
        return
      }
    }

    const payload = {
      empresa_id: empresaAtivaId,
      competencia: periodo.competencia,
      status: novoStatus,
      fechado_por: novoStatus === 'fechado' ? user.id : null,
      fechado_em: novoStatus === 'fechado' ? new Date().toISOString() : null
    }

    if (periodo.id) {
      // Update
      await supabase.from('periodos_fechamento').update(payload).eq('id', periodo.id)
    } else {
      // Insert
      const { data } = await supabase.from('periodos_fechamento').insert([payload]).select().single()
      if (data) periodo.id = data.id // Atualiza o id pro fluxo de auditoria
    }

    // Se estiver reabrindo, logar na auditoria obrigatoriamente
    if (novoStatus === 'aberto' && periodo.id) {
      await supabase.from('historico_alteracoes').insert([{
        tabela: 'periodos_fechamento',
        registro_id: periodo.id,
        usuario_id: user.id,
        acao: 'reabertura_periodo',
        campo_alterado: 'status',
        valor_anterior: 'fechado',
        valor_novo: 'aberto'
      }])
    }

    await carregarDados()
    setIsSubmitting(false)
  }

  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i
    return { value: year.toString(), label: year.toString() }
  })

  return (
    <Layout>
      <PageHeader
        title="Fechamento de Mês"
        subtitle="Congele e proteja os meses já consolidados contra alterações na base de dados."
      />

      {loading && periodos.length === 0 ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<Lock className="w-full h-full text-slate-400" />}
          title="Selecione uma empresa"
          description="O fechamento de período é específico por CNPJ."
        />
      ) : (
        <div className="space-y-6 max-w-5xl">
          
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Exercício Contábil</h3>
                <p className="text-xs text-slate-500">Selecione o ano para visualizar os períodos.</p>
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select
                label=""
                value={anoFiltro}
                onChange={(e) => setAnoFiltro(e.target.value)}
                options={anosDisponiveis}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {periodos.map((periodo) => {
              const dataComp = parseDateSafe(periodo.competencia)!
              const mesNome = format(dataComp, 'MMMM', { locale: ptBR })
              const isFechado = periodo.status === 'fechado'

              return (
                <div 
                  key={periodo.competencia} 
                  className={`bg-white rounded-xl border ${isFechado ? 'border-slate-200 bg-slate-50' : 'border-success/30 hover:border-success/50'} shadow-sm overflow-hidden flex flex-col`}
                >
                  <div className={`p-4 border-b ${isFechado ? 'border-slate-200' : 'border-success/10'} flex items-center justify-between`}>
                    <h4 className="font-semibold text-slate-800 capitalize text-lg">{mesNome}</h4>
                    {isFechado ? (
                      <Badge variant="neutral" icon={<Lock className="w-3 h-3" />}>Fechado</Badge>
                    ) : (
                      <Badge variant="success" className="!bg-success/10 !text-success" icon={<Unlock className="w-3 h-3" />}>Em Aberto</Badge>
                    )}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="text-sm text-slate-600 mb-4 min-h-[40px]">
                      {isFechado ? (
                        <>
                          Bloqueado por <span className="font-medium text-slate-800">{periodo.usuarios?.nome || 'Sistema'}</span>
                          {periodo.fechado_em && (
                            <span className="block text-xs text-slate-400 mt-0.5">
                              em {format(new Date(periodo.fechado_em), "dd/MM/yyyy 'às' HH:mm")}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500">Lançamentos permitidos para este mês.</span>
                      )}
                    </div>
                    
                    <Button
                      variant={isFechado ? "secondary" : "primary"}
                      className={!isFechado ? "!bg-slate-800 hover:!bg-slate-900" : ""}
                      icon={isFechado ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      onClick={() => handleTogglePeriodo(periodo)}
                      loading={isSubmitting}
                      fullWidth
                    >
                      {isFechado ? "Reabrir Período" : "Fechar Mês"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}
    </Layout>
  )
}
