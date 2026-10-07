import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle, Pagination } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Bookmark, Check, XCircle, Search, Ban } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePagination } from '../hooks/usePagination'
import { toast } from '../store/useToastStore'

interface TipoDespesa {
  id: string
  nome: string
  codigo: string
  grupo_dre: string
  ativo: boolean
  empresa_id: string
  created_at: string
}

const gruposDRE = [
  { value: 'despesa_operacional', label: 'Despesa Operacional' },
  { value: 'despesa_administrativa', label: 'Despesa Administrativa' },
  { value: 'despesa_financeira', label: 'Despesa Financeira' },
  { value: 'custo', label: 'Custo Direto' },
  { value: 'receita', label: 'Receita' },
  { value: 'imposto', label: 'Imposto / Tributo' },
]

export default function TiposDespesa() {
  const { empresaAtivaId } = useAppStore()
  const [tipos, setTipos] = useState<TipoDespesa[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalExcluirOpen, setIsModalExcluirOpen] = useState(false)
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoDespesa | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    codigo: '',
    grupo_dre: 'despesa_operacional',
    ativo: true
  })

  const [busca, setBusca] = useState('')

  const tiposFiltrados = tipos.filter(t => {
    if (!busca) return true
    const search = busca.toLowerCase()
    return t.nome.toLowerCase().includes(search) || (t.codigo || '').toLowerCase().includes(search)
  })

  const {
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    paginatedItems, totalItems
  } = usePagination(tiposFiltrados)

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setTipos([])
      setLoading(false)
    }
  }, [empresaAtivaId])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tipo_despesa')
      .select('*')
      .eq('empresa_id', empresaAtivaId)
      .order('nome', { ascending: true })
    
    if (!error && data) setTipos(data)
    setLoading(false)
  }

  const openModal = (tipo?: TipoDespesa) => {
    if (tipo) {
      setFormData({ 
        id: tipo.id, 
        nome: tipo.nome, 
        codigo: tipo.codigo || '',
        grupo_dre: tipo.grupo_dre,
        ativo: tipo.ativo
      })
    } else {
      setFormData({ 
        id: '', 
        nome: '', 
        codigo: '',
        grupo_dre: 'despesa_operacional',
        ativo: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim() || !formData.grupo_dre || !empresaAtivaId) return

    setIsSubmitting(true)
    
    const payload = {
      nome: formData.nome,
      codigo: formData.codigo,
      grupo_dre: formData.grupo_dre,
      ativo: formData.ativo,
      empresa_id: empresaAtivaId
    }

    if (formData.id) {
      // Editar
      await supabase.from('tipo_despesa').update(payload).eq('id', formData.id)
    } else {
      // Criar
      await supabase.from('tipo_despesa').insert([payload])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleToggleAtivo = async (id: string, ativoAtual: boolean) => {
    await supabase.from('tipo_despesa').update({ ativo: !ativoAtual }).eq('id', id)
    carregarDados()
  }

  const handleExcluirClick = (tipo: TipoDespesa) => {
    setTipoParaExcluir(tipo)
    setIsModalExcluirOpen(true)
  }

  const handleConfirmarExcluir = async () => {
    if (!tipoParaExcluir) return
    setIsSubmitting(true)
    
    const { count } = await supabase.from('lancamentos').select('*', { count: 'exact', head: true }).eq('tipo_despesa_id', tipoParaExcluir.id)
    
    if (count && count > 0) {
       toast.error(`Existe lançamento atrelado ao tipo "${tipoParaExcluir.nome}". Não é possível excluir.`)
       setIsSubmitting(false)
       setIsModalExcluirOpen(false)
       return
    }

    const { error } = await supabase.from('tipo_despesa').delete().eq('id', tipoParaExcluir.id)
    
    if (error) {
      toast.error('Erro ao excluir tipo.')
    } else {
      toast.success('Tipo excluído com sucesso!')
    }
    
    setIsSubmitting(false)
    setIsModalExcluirOpen(false)
    carregarDados()
  }

  return (
    <Layout>
      <PageHeader
        title="Tipos de Despesa/Receita"
        subtitle="Categorize as movimentações financeiras para o DRE."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!empresaAtivaId}
          >
            Novo Tipo
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<Bookmark className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página para gerenciar seus tipos de despesa."
        />
      ) : tipos.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-full h-full" />}
          title="Nenhum tipo cadastrado"
          description="Os tipos definem como a movimentação será classificada no DRE contábil."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Criar Tipo
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto flex-1">
              <Input
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupo (DRE)</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedItems.map((tipo) => {
                  const grupoObj = gruposDRE.find(g => g.value === tipo.grupo_dre)
                  return (
                    <tr key={tipo.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">{tipo.nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        {tipo.codigo ? (
                          <span className="text-sm text-slate-600 font-mono">{tipo.codigo}</span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="neutral">{grupoObj ? grupoObj.label : tipo.grupo_dre}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tipo.ativo ? (
                          <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                        ) : (
                          <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(tipo)}
                            title="Editar"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAtivo(tipo.id, tipo.ativo)}
                            title={tipo.ativo ? "Inativar" : "Ativar"}
                            className={tipo.ativo ? "!text-warning hover:!bg-warning-50" : "!text-success hover:!bg-success-50"}
                            icon={tipo.ativo ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirClick(tipo)}
                            title="Excluir"
                            className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedItems.map((tipo) => {
              const grupoObj = gruposDRE.find(g => g.value === tipo.grupo_dre)
              return (
                <div key={tipo.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{tipo.nome}</p>
                      {tipo.codigo && <p className="text-xs text-slate-400 font-mono mt-0.5">{tipo.codigo}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(tipo)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtivo(tipo.id, tipo.ativo)}
                        className={tipo.ativo ? "!text-warning hover:!bg-warning-50" : "!text-success hover:!bg-success-50"}
                        icon={tipo.ativo ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluirClick(tipo)}
                        className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="neutral">{grupoObj ? grupoObj.label : tipo.grupo_dre}</Badge>
                    {tipo.ativo ? (
                      <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                    ) : (
                      <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formData.id ? 'Editar Tipo' : 'Novo Tipo de Despesa'}
        subtitle={formData.id ? 'Altere os dados de classificação' : 'Crie uma nova classificação contábil'}
        icon={<Bookmark className="w-5 h-5" />}
        size="sm"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-4 mb-6">
            <Input
              label="Nome"
              type="text"
              autoFocus
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Energia Elétrica, Vendas"
              required
            />

            <Input
              label="Código (Opcional)"
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({...formData, codigo: e.target.value})}
              placeholder="Ex: 3.1.2"
              className="font-mono"
            />

            <Select
              label="Grupo no DRE"
              value={formData.grupo_dre}
              onChange={(e) => setFormData({...formData, grupo_dre: e.target.value})}
              options={gruposDRE}
              required
            />

            <div className="pt-2">
              <Toggle
                checked={formData.ativo}
                onChange={(checked) => setFormData({...formData, ativo: checked})}
                label={formData.ativo ? 'Ativo' : 'Inativo'}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={isModalExcluirOpen}
        onClose={() => setIsModalExcluirOpen(false)}
        title="Excluir Tipo"
        subtitle="Atenção: A exclusão apaga definitivamente este tipo de despesa/receita."
        icon={<Trash2 className="w-5 h-5 text-danger" />}
        size="sm"
      >
        <div className="pt-2 pb-4 text-sm text-slate-600">
          Você tem certeza que deseja excluir <strong>{tipoParaExcluir?.nome}</strong>?
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
          <Button type="button" variant="ghost" onClick={() => setIsModalExcluirOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleConfirmarExcluir} className="!bg-danger hover:!bg-danger-dark !border-danger" loading={isSubmitting}>Sim, Excluir</Button>
        </div>
      </Modal>
    </Layout>
  )
}

