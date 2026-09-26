import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, PageHeader, EmptyState } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Settings, Save, Palette } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toast } from '../store/useToastStore'

export default function Configuracoes() {
  const { user, setUser, empresaAtivaId, empresas } = useAppStore()
  const grupo_id = empresas.length > 0 ? empresas[0].grupo_id : null

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [userProfile, setUserProfile] = useState({
    nome: user?.nome || '',
    senha: '',
    confirmarSenha: ''
  })
  
  const [cores, setCores] = useState({
    cor_primaria: '#f97316',
    cor_secundaria: '#475569',
    cor_terciaria: '#e2e8f0'
  })

  // ID do config do grupo (se existir)
  const [configId, setConfigId] = useState<string | null>(null)

  useEffect(() => {
    if (empresaAtivaId && grupo_id) {
      carregarDados()
    } else {
      setLoading(false)
    }
  }, [empresaAtivaId, grupo_id])

  const carregarDados = async () => {
    setLoading(true)
    
    // 1. Setar dados do usuario
    if (user) {
      setUserProfile(prev => ({ ...prev, nome: user.nome }))
    }

    // 2. Carregar cores do grupo
    const { data: config } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .eq('grupo_id', grupo_id)
      .maybeSingle()

    if (config) {
      setConfigId(config.id)
      setCores({
        cor_primaria: config.cor_primaria || '#f97316',
        cor_secundaria: config.cor_secundaria || '#475569',
        cor_terciaria: config.cor_terciaria || '#e2e8f0'
      })
    }

    setLoading(false)
  }



  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaAtivaId || !grupo_id) return
    setIsSubmitting(true)
    
    // 1. Atualizar Perfil de Usuário
    let erroUsuario = false
    try {
      // Nome do usuario
      if (userProfile.nome && userProfile.nome !== user?.nome) {
        const { error: errUpdateUser } = await supabase.from('usuarios').update({ nome: userProfile.nome }).eq('id', user?.id)
        if (errUpdateUser) throw errUpdateUser
        
        // Atualiza global state
        if (user) {
          setUser({ ...user, nome: userProfile.nome })
        }
      }

      // Senha
      if (userProfile.senha) {
        if (userProfile.senha !== userProfile.confirmarSenha) {
          toast.error('As senhas não conferem.')
          setIsSubmitting(false)
          return
        }
        const { error: errAuth } = await supabase.auth.updateUser({ password: userProfile.senha })
        if (errAuth) throw errAuth
      }
    } catch (err: any) {
      erroUsuario = true
      toast.error("Erro ao atualizar perfil do usuário: " + err.message)
    }

    // 2. Salvar Cores do Grupo (Upsert)
    const payloadConfig = {
      grupo_id: grupo_id,
      cor_primaria: cores.cor_primaria,
      cor_secundaria: cores.cor_secundaria,
      cor_terciaria: cores.cor_terciaria,
      updated_at: new Date().toISOString()
    }

    let configError = null;
    if (configId) {
      const { error } = await supabase.from('configuracoes_sistema').update(payloadConfig).eq('id', configId)
      configError = error;
    } else {
      const { data, error } = await supabase.from('configuracoes_sistema').insert([payloadConfig]).select().maybeSingle()
      configError = error;
      if (data) setConfigId(data.id)
    }

    setIsSubmitting(false)
    if (!erroUsuario) {
      if (configError) {
        toast.error("Erro ao salvar configurações de cores: " + configError.message)
      } else {
        toast.success("Configurações salvas com sucesso!")
        setUserProfile(prev => ({ ...prev, senha: '', confirmarSenha: '' })) // Limpa senhas
        
        // Aplica as cores na raiz do documento imediatamente
        document.documentElement.style.setProperty('--color-primary', cores.cor_primaria)
        if (user) setUser({ ...user, cor_tema: cores.cor_primaria })
      }
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Configurações e Identidade"
          subtitle="Personalize a aparência do sistema e da empresa selecionada."
        />

        {loading ? (
          <PageLoading />
        ) : !empresaAtivaId ? (
          <EmptyState
            icon={<Settings className="w-full h-full text-slate-400" />}
            title="Selecione uma empresa"
            description="Você precisa selecionar uma empresa no cabeçalho para configurá-la."
          />
        ) : (
          <form onSubmit={handleSalvar} className="space-y-6">
          
          {/* Seção Usuário */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Seu Perfil
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-6">
                Atualize seus dados pessoais de acesso.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 block mb-2">Nome Completo</label>
                  <Input 
                    type="text" 
                    value={userProfile.nome}
                    onChange={e => setUserProfile({...userProfile, nome: e.target.value})}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Nova Senha</label>
                  <Input 
                    type="password" 
                    value={userProfile.senha}
                    onChange={e => setUserProfile({...userProfile, senha: e.target.value})}
                    placeholder="Digite para alterar"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Confirmar Nova Senha</label>
                  <Input 
                    type="password" 
                    value={userProfile.confirmarSenha}
                    onChange={e => setUserProfile({...userProfile, confirmarSenha: e.target.value})}
                    placeholder="Confirme a senha"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção Grupo / Cores */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Cores do Grupo Econômico
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-6">
                Defina as cores padrão que serão utilizadas na paleta de exportação e nos documentos oficiais das empresas vinculadas ao seu grupo.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0" 
                      value={cores.cor_primaria}
                      onChange={(e) => setCores({...cores, cor_primaria: e.target.value})}
                    />
                    <Input 
                      type="text" 
                      className="font-mono text-sm uppercase" 
                      value={cores.cor_primaria} 
                      onChange={(e) => setCores({...cores, cor_primaria: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Cor Secundária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0" 
                      value={cores.cor_secundaria}
                      onChange={(e) => setCores({...cores, cor_secundaria: e.target.value})}
                    />
                    <Input 
                      type="text" 
                      className="font-mono text-sm uppercase" 
                      value={cores.cor_secundaria} 
                      onChange={(e) => setCores({...cores, cor_secundaria: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Cor Terciária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0" 
                      value={cores.cor_terciaria}
                      onChange={(e) => setCores({...cores, cor_terciaria: e.target.value})}
                    />
                    <Input 
                      type="text" 
                      className="font-mono text-sm uppercase" 
                      value={cores.cor_terciaria} 
                      onChange={(e) => setCores({...cores, cor_terciaria: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              icon={<Save className="w-5 h-5" />} 
              loading={isSubmitting}
            >
              Salvar Configurações
            </Button>
          </div>
        </form>
        )}
      </div>
    </Layout>
  )
}
