import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle, Pagination } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Briefcase, Check, XCircle, Search } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePagination } from '../hooks/usePagination'

interface DestinoPagamento {
  id: string
  nome: string
  tipo: string
  ativo: boolean
  empresa_id: string
  created_at: string
}

const tiposDestino = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'socio', label: 'Sócio' },
  { value: 'outro', label: 'Outro' },
]

export default function DestinosPagamento() {
  const { empresaAtivaId } = useAppStore()
  const [destinos, setDestinos] = useState<DestinoPagamento[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    tipo: 'fornecedor',
    ativo: true
  })

  const [busca, setBusca] = useState('')

  const destinosFiltrados = destinos.filter(d => {
    if (!busca) return true
    const search = busca.toLowerCase()
    return d.nome.toLowerCase().includes(search)
  })

  const {
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    paginatedItems, totalItems
  } = usePagination(destinosFiltrados)

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setDestinos([])
      setLoading(false)
    }
  }, [empresaAtivaId])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('destinos_pagamento')
      .select('*')
      .eq('empresa_id', empresaAtivaId)
      .order('nome', { ascending: true })
    
    if (!error && data) setDestinos(data)
    setLoading(false)
  }

  const openModal = (destino?: DestinoPagamento) => {
    if (destino) {
      setFormData({ 
        id: destino.id, 
        nome: destino.nome, 
        tipo: destino.tipo,
        ativo: destino.ativo
      })
    } else {
      setFormData({ 
        id: '', 
        nome: '', 
        tipo: 'fornecedor',
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
    if (!formData.nome.trim() || !formData.tipo || !empresaAtivaId) return

    setIsSubmitting(true)
    
    const payload = {
      nome: formData.nome,
      tipo: formData.tipo,
      ativo: formData.ativo,
      empresa_id: empresaAtivaId
    }

    if (formData.id) {
      // Editar
      await supabase.from('destinos_pagamento').update(payload).eq('id', formData.id)
    } else {
      // Criar
      await supabase.from('destinos_pagamento').insert([payload])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Deseja inativar o destino "${nome}"? Ele deixará de aparecer nas opções de lançamento.`)) {
      await supabase.from('destinos_pagamento').update({ ativo: false }).eq('id', id)
      carregarDados()
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Destinos de Pagamento"
        subtitle="Agrupe os recebedores das saídas financeiras."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!empresaAtivaId}
          >
            Novo Destino
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<Briefcase className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página para gerenciar os destinos de pagamento."
        />
      ) : destinos.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-full h-full" />}
          title="Nenhum destino cadastrado"
          description="Os destinos representam para onde o dinheiro está indo (agrupamento geral)."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Criar Destino
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto flex-1">
              <Input
                placeholder="Buscar por nome..."
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
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedItems.map((destino) => {
                  const tipoObj = tiposDestino.find(t => t.value === destino.tipo)
                  return (
                    <tr key={destino.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">{destino.nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="neutral">{tipoObj ? tipoObj.label : destino.tipo}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {destino.ativo ? (
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
                            onClick={() => openModal(destino)}
                            title="Editar"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                          {destino.ativo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluir(destino.id, destino.nome)}
                              title="Inativar"
                              className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                            />
                          )}
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
            {paginatedItems.map((destino) => {
              const tipoObj = tiposDestino.find(t => t.value === destino.tipo)
              return (
                <div key={destino.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{destino.nome}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(destino)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      />
                      {destino.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluir(destino.id, destino.nome)}
                          className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="neutral">{tipoObj ? tipoObj.label : destino.tipo}</Badge>
                    {destino.ativo ? (
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
        title={formData.id ? 'Editar Destino' : 'Novo Destino de Pagamento'}
        subtitle={formData.id ? 'Altere os dados' : 'Crie uma nova classificação de recebedores'}
        icon={<Briefcase className="w-5 h-5" />}
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
              placeholder="Ex: Fornecedores Locais"
              required
            />

            <Select
              label="Tipo"
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              options={tiposDestino}
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
    </Layout>
  )
}

