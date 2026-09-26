import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Modal, EmptyState, PageHeader, Badge, Toggle } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Store, Check, XCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface Fornecedor {
  id: string
  grupo_id: string
  razao_social: string
  cnpj_cpf: string
  email: string
  telefone: string
  endereco: string
  ativo: boolean
  created_at: string
}

export default function Fornecedores() {
  const { empresas } = useAppStore()
  
  // Como fornecedores são vinculados ao grupo, pegamos o grupo_id da primeira empresa disponível
  const grupo_id = empresas.length > 0 ? empresas[0].grupo_id : null

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    razao_social: '', 
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    ativo: true
  })

  useEffect(() => {
    if (grupo_id) {
      carregarDados()
    } else {
      setFornecedores([])
      setLoading(false)
    }
  }, [grupo_id])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('grupo_id', grupo_id)
      .order('razao_social', { ascending: true })
    
    if (!error && data) setFornecedores(data)
    setLoading(false)
  }

  const openModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setFormData({ 
        id: fornecedor.id, 
        razao_social: fornecedor.razao_social, 
        cnpj_cpf: fornecedor.cnpj_cpf || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        endereco: fornecedor.endereco || '',
        ativo: fornecedor.ativo
      })
    } else {
      setFormData({ 
        id: '', 
        razao_social: '', 
        cnpj_cpf: '',
        email: '',
        telefone: '',
        endereco: '',
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
    if (!formData.razao_social.trim() || !formData.cnpj_cpf.trim() || !grupo_id) return

    setIsSubmitting(true)
    
    const payload = {
      razao_social: formData.razao_social,
      cnpj_cpf: formData.cnpj_cpf.replace(/\D/g, ''), // Salvar apenas números
      email: formData.email,
      telefone: formData.telefone,
      endereco: formData.endereco,
      ativo: formData.ativo,
      grupo_id: grupo_id
    }

    if (formData.id) {
      // Editar
      await supabase.from('fornecedores').update(payload).eq('id', formData.id)
    } else {
      // Criar
      await supabase.from('fornecedores').insert([payload])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Deseja inativar o fornecedor "${nome}"? Ele deixará de aparecer nas opções de lançamento de qualquer empresa do grupo.`)) {
      await supabase.from('fornecedores').update({ ativo: false }).eq('id', id)
      carregarDados()
    }
  }

  const formatCnpjCpf = (value: string) => {
    const numeric = value.replace(/\D/g, '')
    if (numeric.length === 11) {
      return numeric.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    } else if (numeric.length === 14) {
      return numeric.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return value
  }

  return (
    <Layout>
      <PageHeader
        title="Fornecedores"
        subtitle="Gerencie os fornecedores de todo o grupo econômico."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!grupo_id}
          >
            Novo Fornecedor
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : !grupo_id ? (
        <EmptyState
          icon={<Store className="w-full h-full" />}
          title="Grupo não identificado"
          description="Você precisa estar vinculado a pelo menos uma empresa para gerenciar os fornecedores do grupo."
        />
      ) : fornecedores.length === 0 ? (
        <EmptyState
          icon={<Store className="w-full h-full" />}
          title="Nenhum fornecedor cadastrado"
          description="Os fornecedores são compartilhados entre todas as empresas do grupo."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Cadastrar Fornecedor
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Razão Social</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ / CPF</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-800">{fornecedor.razao_social}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-mono">{formatCnpjCpf(fornecedor.cnpj_cpf)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         {fornecedor.email && <span className="text-sm text-slate-600">{fornecedor.email}</span>}
                         {fornecedor.telefone && <span className="text-sm text-slate-600">{fornecedor.telefone}</span>}
                         {!fornecedor.email && !fornecedor.telefone && <span className="text-sm text-slate-400 italic">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {fornecedor.ativo ? (
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
                          onClick={() => openModal(fornecedor)}
                          title="Editar"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        />
                        {fornecedor.ativo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluir(fornecedor.id, fornecedor.razao_social)}
                            title="Inativar"
                            className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {fornecedores.map((fornecedor) => (
              <div key={fornecedor.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{fornecedor.razao_social}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{formatCnpjCpf(fornecedor.cnpj_cpf)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(fornecedor)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />
                    {fornecedor.ativo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluir(fornecedor.id, fornecedor.razao_social)}
                        className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    )}
                  </div>
                </div>
                
                {(fornecedor.email || fornecedor.telefone) && (
                  <div className="mt-2 text-xs text-slate-600">
                    {fornecedor.email && <div>{fornecedor.email}</div>}
                    {fornecedor.telefone && <div>{fornecedor.telefone}</div>}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {fornecedor.ativo ? (
                    <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                  ) : (
                    <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formData.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        subtitle={formData.id ? 'Altere os dados do fornecedor' : 'Cadastre um novo fornecedor para o grupo'}
        icon={<Store className="w-5 h-5" />}
        size="lg"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Razão Social / Nome"
                type="text"
                autoFocus
                value={formData.razao_social}
                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                placeholder="Ex: Enel Distribuição"
                required
              />

              <Input
                label="CNPJ ou CPF"
                type="text"
                value={formData.cnpj_cpf}
                onChange={(e) => setFormData({...formData, cnpj_cpf: e.target.value})}
                placeholder="00.000.000/0000-00"
                className="font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="E-mail (Opcional)"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contato@empresa.com"
              />

              <Input
                label="Telefone (Opcional)"
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>

            <Input
              label="Endereço (Opcional)"
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              placeholder="Rua, Número, Bairro, Cidade - UF"
            />

            <div className="pt-2">
              <Toggle
                checked={formData.ativo}
                onChange={(checked) => setFormData({...formData, ativo: checked})}
                label={formData.ativo ? 'Fornecedor Ativo' : 'Fornecedor Inativo'}
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

