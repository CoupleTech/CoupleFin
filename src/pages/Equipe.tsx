import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Users, Edit2, Shield, Check, XCircle, Building } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil_id: string | null
  ativo: boolean
  perfis_usuario?: { nome: string }
  usuarios_empresas?: { empresa_id: string; empresas?: { nome_fantasia: string } }[]
}

interface Perfil {
  id: string
  nome: string
}

interface Empresa {
  id: string
  nome_fantasia: string
}

export default function Equipe() {
  const { empresas: todasEmpresas } = useAppStore()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    perfil_id: '',
    ativo: true,
    empresas_vinculadas: [] as string[]
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    
    // Buscar Perfis
    const { data: perfisData } = await supabase.from('perfis_usuario').select('*').order('nome')
    if (perfisData) setPerfis(perfisData)

    // Buscar Usuários (com perfil e vínculos de empresa)
    const { data: usuariosData, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        perfis_usuario(nome),
        usuarios_empresas(
          empresa_id,
          empresas(nome_fantasia)
        )
      `)
      .order('nome', { ascending: true })
    
    if (!error && usuariosData) {
      setUsuarios(usuariosData as unknown as Usuario[])
    }
    setLoading(false)
  }

  const openModal = (usuario: Usuario) => {
    setFormData({ 
      id: usuario.id, 
      nome: usuario.nome,
      perfil_id: usuario.perfil_id || '',
      ativo: usuario.ativo,
      empresas_vinculadas: usuario.usuarios_empresas?.map(v => v.empresa_id) || []
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleToggleEmpresa = (empresaId: string) => {
    setFormData(prev => {
      const isLinked = prev.empresas_vinculadas.includes(empresaId)
      if (isLinked) {
        return { ...prev, empresas_vinculadas: prev.empresas_vinculadas.filter(id => id !== empresaId) }
      } else {
        return { ...prev, empresas_vinculadas: [...prev.empresas_vinculadas, empresaId] }
      }
    })
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.id) return // No momento, apenas edição é permitida pelo frontend

    setIsSubmitting(true)
    
    // 1. Atualiza dados base do usuário
    await supabase.from('usuarios').update({
      nome: formData.nome,
      perfil_id: formData.perfil_id || null,
      ativo: formData.ativo
    }).eq('id', formData.id)

    // 2. Atualiza vínculos de empresa
    // Primeiro remove todos os vínculos atuais
    await supabase.from('usuarios_empresas').delete().eq('usuario_id', formData.id)
    
    // Depois insere os novos
    if (formData.empresas_vinculadas.length > 0) {
      const novosVinculos = formData.empresas_vinculadas.map(empresa_id => ({
        usuario_id: formData.id,
        empresa_id
      }))
      await supabase.from('usuarios_empresas').insert(novosVinculos)
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const perfisOptions = [
    { value: '', label: 'Sem Perfil (Acesso Restrito)' },
    ...perfis.map(p => ({ value: p.id, label: p.nome }))
  ]

  return (
    <Layout>
      <PageHeader
        title="Equipe e Usuários"
        subtitle="Gerencie os acessos, perfis e vínculos das pessoas no sistema."
        action={
          <Button 
            onClick={() => alert("Para adicionar novos usuários com segurança, o administrador deve enviar um convite via backend (Supabase Admin Auth). Esta função será integrada na fase de PWA/Finalização.")} 
            icon={<Shield className="w-4 h-4" />}
            variant="outline"
          >
            Convidar Usuário
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icon={<Users className="w-full h-full" />}
          title="Nenhum usuário cadastrado"
          description="Você precisa registrar usuários para utilizar o sistema."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresas Vinculadas</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-slate-800">{user.nome}</span>
                          <span className="block text-xs text-slate-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.perfis_usuario ? (
                        <Badge variant="neutral">{user.perfis_usuario.nome}</Badge>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Sem Perfil</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.usuarios_empresas && user.usuarios_empresas.length > 0 ? (
                          user.usuarios_empresas.map(v => (
                            <Badge key={v.empresa_id} variant="brand" className="!bg-primary/5 !text-primary !border-primary/10">
                              {v.empresas?.nome_fantasia || v.empresas?.razao_social}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400 italic">Nenhum vínculo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.ativo ? (
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
                          onClick={() => openModal(user)}
                          title="Gerenciar Acessos"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Gerenciar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {usuarios.map((user) => (
              <div key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{user.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(user)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
                
                <div className="mt-3 pl-13 flex flex-wrap gap-2">
                  {user.perfis_usuario ? (
                    <Badge variant="neutral">{user.perfis_usuario.nome}</Badge>
                  ) : (
                    <Badge variant="neutral" className="opacity-50">Sem Perfil</Badge>
                  )}
                  
                  {user.ativo ? (
                    <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                  ) : (
                    <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                  )}
                </div>
                
                <div className="mt-2 pl-13 flex flex-wrap gap-1">
                   {user.usuarios_empresas && user.usuarios_empresas.length > 0 ? (
                      user.usuarios_empresas.map(v => (
                        <Badge key={v.empresa_id} variant="brand" className="!bg-primary/5 !text-primary !border-primary/10 text-[10px]">
                          {v.empresas?.nome_fantasia || v.empresas?.razao_social}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhuma empresa vinculada</span>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Edição de Acessos */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Gerenciar Acessos do Usuário"
        subtitle="Defina o perfil e a quais empresas este usuário tem acesso."
        icon={<Shield className="w-5 h-5" />}
        size="md"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-6 mb-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome"
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />

              <Select
                label="Perfil de Acesso"
                value={formData.perfil_id}
                onChange={(e) => setFormData({...formData, perfil_id: e.target.value})}
                options={perfisOptions}
              />
            </div>
            
            <div>
              <p className="block text-sm font-medium text-slate-700 mb-2">Empresas Vinculadas</p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                {todasEmpresas.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Nenhuma empresa cadastrada no sistema.</p>
                ) : (
                  <div className="space-y-3">
                    {todasEmpresas.map(empresa => {
                      const isLinked = formData.empresas_vinculadas.includes(empresa.id)
                      return (
                        <div 
                          key={empresa.id} 
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                          onClick={() => handleToggleEmpresa(empresa.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Building className={`w-4 h-4 ${isLinked ? 'text-primary' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${isLinked ? 'text-slate-800' : 'text-slate-500'}`}>
                              {empresa.nome_fantasia || empresa.razao_social}
                            </span>
                          </div>
                          <Toggle 
                            checked={isLinked} 
                            onChange={() => handleToggleEmpresa(empresa.id)} 
                            label="" 
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                O usuário só poderá visualizar lançamentos, contas e relatórios das empresas selecionadas acima.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Toggle
                checked={formData.ativo}
                onChange={(checked) => setFormData({...formData, ativo: checked})}
                label={formData.ativo ? 'Usuário com acesso Ativo' : 'Acesso Bloqueado (Inativo)'}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

