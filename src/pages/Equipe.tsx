import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle, Pagination } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Users, Edit2, Shield, Check, XCircle, Building, Search, Copy, CheckCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePagination } from '../hooks/usePagination'
import { toast } from '../store/useToastStore'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil_id: string | null
  ativo: boolean
  perfis_usuario?: { nome: string }
  usuarios_grupos?: { grupo_id: string; grupos_economicos?: { nome: string } }[]
}

interface Perfil {
  id: string
  nome: string
}

interface Grupo {
  id: string
  nome: string
}



export default function Equipe() {
  const { user } = useAppStore()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    perfil_id: '',
    ativo: true,
    grupos_vinculados: [] as string[],
    grupos_vinculados_originais: [] as string[]
  })

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePerfilId, setInvitePerfilId] = useState('')
  const [inviteGrupoId, setInviteGrupoId] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const [busca, setBusca] = useState('')

  const usuariosFiltrados = usuarios.filter(u => {
    if (!busca) return true
    const search = busca.toLowerCase()
    return u.nome.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
  })

  const {
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    paginatedItems, totalItems
  } = usePagination(usuariosFiltrados)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    
    // Buscar Perfis
    const { data: perfisData } = await supabase.from('perfis_usuario').select('*').order('nome')
    if (perfisData) setPerfis(perfisData)

    // Buscar Grupos
    const { data: gruposData } = await supabase.from('grupos_economicos').select('*').order('nome')
    if (gruposData) setGrupos(gruposData)

    // Buscar Usuários (com perfil e vínculos de grupo)
    const { data: usuariosData, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        perfis_usuario(nome),
        usuarios_grupos(
          grupo_id,
          grupos_economicos(nome)
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
      grupos_vinculados: usuario.usuarios_grupos?.map(v => v.grupo_id) || [],
      grupos_vinculados_originais: usuario.usuarios_grupos?.map(v => v.grupo_id) || []
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleToggleGrupo = (grupoId: string) => {
    setFormData(prev => {
      const isLinked = prev.grupos_vinculados.includes(grupoId)
      if (isLinked) {
        return { ...prev, grupos_vinculados: prev.grupos_vinculados.filter(id => id !== grupoId) }
      } else {
        return { ...prev, grupos_vinculados: [...prev.grupos_vinculados, grupoId] }
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

    // 2. Atualiza vínculos de grupo calculando o diff
    const originais = formData.grupos_vinculados_originais;
    const atuais = formData.grupos_vinculados;
    
    const paraRemover = originais.filter(g => !atuais.includes(g));
    const paraAdicionar = atuais.filter(g => !originais.includes(g));

    if (paraRemover.length > 0) {
      await supabase.from('usuarios_grupos')
        .delete()
        .eq('usuario_id', formData.id)
        .in('grupo_id', paraRemover)
    }
    
    if (paraAdicionar.length > 0) {
      const novosVinculos = paraAdicionar.map(grupo_id => ({
        usuario_id: formData.id,
        grupo_id
      }))
      await supabase.from('usuarios_grupos').insert(novosVinculos)
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const openInviteModal = () => {
    setInviteEmail('')
    setInvitePerfilId('')
    setInviteGrupoId(grupos.length > 0 ? grupos[0].id : '')
    setGeneratedLink('')
    setIsCopied(false)
    setIsInviteModalOpen(true)
  }

  const handleGerarConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    
    if (!inviteGrupoId) {
      toast.error('Selecione um grupo para o convite.')
      setIsSubmitting(false)
      return
    }

    // Insere na tabela convites_equipe
    const { data, error } = await supabase
      .from('convites_equipe')
      .insert({
        grupo_id: inviteGrupoId,
        email: inviteEmail,
        perfil_id: invitePerfilId,
        criado_por: user.id
      })
      .select('token')
      .single()

    if (error) {
      console.error(error)
      toast.error('Erro ao gerar convite.')
      setIsSubmitting(false)
      return
    }

    const link = `${window.location.origin}/aceitar-convite?token=${data.token}`
    setGeneratedLink(link)
    setIsSubmitting(false)
    toast.success('Convite gerado com sucesso!')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast.success('Link copiado!')
  }

  const perfisOptions = [
    { value: '', label: 'Sem Perfil (Acesso Restrito)' },
    ...perfis.map(p => ({ value: p.id, label: p.nome }))
  ]

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Equipe e Usuários"
          subtitle="Gerencie os acessos, perfis e vínculos das pessoas no sistema."
          action={
            <Button 
              onClick={openInviteModal} 
              icon={<Shield className="w-4 h-4" />}
              variant="primary"
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto flex-1">
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupos Vinculados</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedItems.map((user) => (
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
                        {user.usuarios_grupos && user.usuarios_grupos.length > 0 ? (
                          user.usuarios_grupos.map(v => (
                            <Badge key={v.grupo_id} variant="primary" className="!bg-primary/5 !text-primary !border-primary/10">
                              {v.grupos_economicos?.nome || 'Grupo'}
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
            {paginatedItems.map((user) => (
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
                   {user.usuarios_grupos && user.usuarios_grupos.length > 0 ? (
                      user.usuarios_grupos.map(v => (
                        <Badge key={v.grupo_id} variant="primary" className="!bg-primary/5 !text-primary !border-primary/10 text-[10px]">
                          {v.grupos_economicos?.nome || 'Grupo'}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhum grupo vinculado</span>
                    )}
                </div>
              </div>
            ))}
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
              <p className="block text-sm font-medium text-slate-700 mb-2">Grupos Vinculados</p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                {grupos.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Nenhum grupo cadastrado no sistema.</p>
                ) : (
                  <div className="space-y-3">
                    {grupos.map(grupo => {
                      const isLinked = formData.grupos_vinculados.includes(grupo.id)
                      return (
                        <div 
                          key={grupo.id} 
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                          onClick={() => handleToggleGrupo(grupo.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Building className={`w-4 h-4 ${isLinked ? 'text-primary' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${isLinked ? 'text-slate-800' : 'text-slate-500'}`}>
                              {grupo.nome}
                            </span>
                          </div>
                          <div className="pointer-events-none">
                            <Toggle 
                              checked={isLinked} 
                              onChange={() => {}} 
                              label="" 
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                O usuário terá acesso a todas as empresas vinculadas aos grupos selecionados acima.
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

      {/* Modal Convidar Usuário */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Convidar Novo Usuário"
        subtitle="Gere um link de convite seguro para sua equipe."
        icon={<Shield className="w-5 h-5" />}
        size="md"
      >
        {!generatedLink ? (
          <form onSubmit={handleGerarConvite}>
            <div className="space-y-4 mb-6">
              <Input
                label="E-mail do Convidado"
                type="email"
                placeholder="exemplo@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Select
                label="Perfil de Acesso"
                value={invitePerfilId}
                onChange={(e) => setInvitePerfilId(e.target.value)}
                options={perfisOptions.filter(p => p.value !== '')}
                required
              />
              <Select
                label="Grupo Econômico"
                value={inviteGrupoId}
                onChange={(e) => setInviteGrupoId(e.target.value)}
                options={grupos.map(g => ({ value: g.id, label: g.nome }))}
                required
              />
              <p className="text-sm text-slate-500 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                O usuário será convidado diretamente para este grupo econômico.
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setIsInviteModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Gerar Link de Convite
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 mb-2">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-green-800">Convite Gerado!</h3>
              <p className="text-sm text-green-600 mt-1">Copie o link abaixo e envie para o convidado.</p>
            </div>
            
            <div className="flex gap-2">
              <Input 
                label=""
                value={generatedLink}
                readOnly
                className="flex-1 bg-slate-50"
              />
              <Button 
                type="button"
                variant={isCopied ? "secondary" : "primary"}
                onClick={copyToClipboard}
                icon={isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {isCopied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      </div>
    </Layout>
  )
}

