import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Building, Check, XCircle, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import imageCompression from 'browser-image-compression'

interface Empresa {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  grupo_id: string
  ativo: boolean
  created_at: string
  logo_url?: string
}

interface Grupo {
  id: string
  nome: string
}

export default function Empresas() {
  const { user } = useAppStore()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    razao_social: '', 
    nome_fantasia: '', 
    cnpj: '', 
    grupo_id: '',
    ativo: true,
    logo_url: ''
  })
  
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    const [resEmpresas, resGrupos] = await Promise.all([
      supabase.from('empresas').select('*').order('created_at', { ascending: false }),
      supabase.from('grupos_economicos').select('id, nome')
    ])
    
    if (!resEmpresas.error && resEmpresas.data) setEmpresas(resEmpresas.data)
    if (!resGrupos.error && resGrupos.data) setGrupos(resGrupos.data)
    
    setLoading(false)
  }

  const openModal = (empresa?: Empresa) => {
    setLogoFile(null)
    if (empresa) {
      setFormData({ 
        id: empresa.id, 
        razao_social: empresa.razao_social, 
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '', 
        grupo_id: empresa.grupo_id,
        ativo: empresa.ativo,
        logo_url: empresa.logo_url || ''
      })
      setLogoPreview(empresa.logo_url || '')
    } else {
      setFormData({ 
        id: '', 
        razao_social: '', 
        nome_fantasia: '',
        cnpj: '', 
        grupo_id: grupos.length > 0 ? grupos[0].id : '',
        ativo: true,
        logo_url: ''
      })
      setLogoPreview('')
    }
    setIsModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.razao_social.trim() || !formData.cnpj.trim() || !formData.grupo_id) return

    setIsSubmitting(true)
    
    let publicUrl = formData.logo_url

    if (logoFile) {
      try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true }
        const compressedFile = await imageCompression(logoFile, options)
        const path = `logos/emp_${Date.now()}_${compressedFile.name}`
        const { error: uploadError } = await supabase.storage.from('anexos').upload(path, compressedFile)
        if (!uploadError) {
          const res = supabase.storage.from('anexos').getPublicUrl(path)
          publicUrl = res.data.publicUrl
        }
      } catch (err) {
        console.error("Erro upload logo:", err)
      }
    }
    
    const payload = {
      razao_social: formData.razao_social,
      nome_fantasia: formData.nome_fantasia,
      cnpj: formData.cnpj,
      grupo_id: formData.grupo_id,
      ativo: formData.ativo,
      logo_url: publicUrl
    }

    if (formData.id) {
      await supabase.from('empresas').update(payload).eq('id', formData.id)
    } else {
      const { data: novaEmpresa, error } = await supabase.from('empresas').insert([payload]).select().single()
      if (!error && novaEmpresa && user) {
        await supabase.from('usuarios_empresas').insert([{ usuario_id: user.id, empresa_id: novaEmpresa.id }])
      }
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleExcluir = async (id: string, nome: string) => {
    // Inativação Lógica ao invés de Deleção Física (soft delete)
    if (confirm(`Deseja inativar a empresa "${nome}"? Ela deixará de aparecer nas opções de lançamento.`)) {
      await supabase.from('empresas').update({ ativo: false }).eq('id', id)
      carregarDados()
    }
  }

  const grupoOptions = grupos.map(g => ({ value: g.id, label: g.nome }))

  return (
    <Layout>
      <PageHeader
        title="Empresas"
        subtitle="Gerencie os CNPJs, filiais e status do grupo."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
          >
            Nova Empresa
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : empresas.length === 0 ? (
        <EmptyState
          icon={<Building className="w-full h-full" />}
          title="Nenhuma empresa cadastrada"
          description="As empresas são as unidades financeiras do seu grupo. Você precisa de pelo menos uma para começar a lançar finanças."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Cadastrar Empresa
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupo</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {empresas.map((empresa) => {
                  const grupoNome = grupos.find(g => g.id === empresa.grupo_id)?.nome || 'Desconhecido'
                  
                  return (
                    <tr key={empresa.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center overflow-hidden text-primary font-bold text-sm shrink-0">
                            {empresa.logo_url ? (
                              <img src={empresa.logo_url} alt={empresa.nome_fantasia} className="w-full h-full object-cover" />
                            ) : (
                              (empresa.nome_fantasia || empresa.razao_social).charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 font-medium truncate">{empresa.nome_fantasia || empresa.razao_social}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{empresa.razao_social}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 font-mono">{empresa.cnpj}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="neutral">{grupoNome}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {empresa.ativo ? (
                          <Badge variant="success" icon={<Check className="w-3 h-3" />}>
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>
                            Inativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(empresa)}
                            title="Editar"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                          {empresa.ativo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluir(empresa.id, empresa.nome_fantasia || empresa.razao_social)}
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
            {empresas.map((empresa) => {
              const grupoNome = grupos.find(g => g.id === empresa.grupo_id)?.nome || 'Desconhecido'
              
              return (
                <div key={empresa.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center overflow-hidden text-primary font-bold text-sm shrink-0">
                        {empresa.logo_url ? (
                          <img src={empresa.logo_url} alt={empresa.nome_fantasia} className="w-full h-full object-cover" />
                        ) : (
                          (empresa.nome_fantasia || empresa.razao_social).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {empresa.nome_fantasia || empresa.razao_social}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{empresa.cnpj}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(empresa)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      />
                      {empresa.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluir(empresa.id, empresa.nome_fantasia || empresa.razao_social)}
                          className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 ml-[52px]">
                    <Badge variant="neutral">{grupoNome}</Badge>
                    {empresa.ativo ? (
                      <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                    ) : (
                      <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formData.id ? 'Editar Empresa' : 'Nova Empresa'}
        subtitle={formData.id ? 'Altere os dados da empresa' : 'Cadastre uma nova empresa no grupo'}
        icon={<Building className="w-5 h-5" />}
        size="lg"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-4 mb-6">
            <Input
              label="Razão Social"
              type="text"
              autoFocus
              value={formData.razao_social}
              onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
              placeholder="Razão Social Completa S.A."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome Fantasia"
                type="text"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                placeholder="Nome Comercial"
              />

              <Input
                label="CNPJ"
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                placeholder="00.000.000/0001-00"
                className="font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Select
                label="Grupo Econômico"
                value={formData.grupo_id}
                onChange={(e) => setFormData({...formData, grupo_id: e.target.value})}
                options={grupoOptions}
                placeholder="Selecione um grupo"
                required
              />

              <div className="py-2.5">
                <Toggle
                  checked={formData.ativo}
                  onChange={(checked) => setFormData({...formData, ativo: checked})}
                  label={formData.ativo ? 'Empresa Ativa' : 'Empresa Inativa'}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <span className="text-white text-[10px] font-medium text-center leading-tight">Trocar</span>
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Logo da Empresa</label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                    Escolher Imagem
                  </Button>
                  <span className="text-xs text-slate-500 max-w-[120px] truncate">
                    {logoFile ? logoFile.name : formData.logo_url ? 'Imagem atual' : 'Nenhuma imagem'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar Empresa
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

