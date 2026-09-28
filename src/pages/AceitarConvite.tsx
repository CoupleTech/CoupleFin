import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Input, PageHeader } from '../components/ui'
import { toast } from '../store/useToastStore'
import { CheckCircle, Shield } from 'lucide-react'

export default function AceitarConvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [convite, setConvite] = useState<any>(null)
  
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')

  useEffect(() => {
    if (!token) {
      toast.error('Token inválido ou não fornecido.')
      navigate('/login')
      return
    }

    // Busca o convite para mostrar o email na tela
    async function verificarConvite() {
      const { data, error } = await supabase
        .from('convites_equipe')
        .select('email, status')
        .eq('token', token)
        .single()

      if (error || !data) {
        toast.error('Convite não encontrado ou inválido.')
        navigate('/login')
        return
      }

      if (data.status !== 'pendente') {
        toast.error('Este convite já foi utilizado ou está expirado.')
        navigate('/login')
        return
      }

      setConvite(data)
      setLoading(false)
    }

    verificarConvite()
  }, [token, navigate])

  const handleAceitarConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !convite) return

    setIsSubmitting(true)
    
    // 1. Cria a conta no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: convite.email,
      password: senha,
      options: {
        data: {
          nome: nome
        }
      }
    })

    if (authError) {
      toast.error(authError.message || 'Erro ao criar conta.')
      setIsSubmitting(false)
      return
    }

    if (!authData.user) {
      toast.error('Erro desconhecido ao criar usuário.')
      setIsSubmitting(false)
      return
    }

    // Verifica se precisa de confirmação de email, se o supabase estiver com Auto-Confirm off
    // Aqui assumimos que o login funciona logo após signUp ou que o token já é uma prova de confiança

    // O usuário já está logado após signUp (se email confirm não for obrigatório)
    // 2. Chama a RPC para vincular
    const { error: rpcError } = await supabase.rpc('aceitar_convite_usuario', { p_token: token })

    if (rpcError) {
      console.error(rpcError)
      toast.error('Conta criada, mas houve erro ao vincular a empresa. Contate o administrador.')
      setIsSubmitting(false)
      // Idealmente, poderíamos tentar novamente ou avisar
      return
    }

    toast.success('Convite aceito com sucesso! Bem-vindo(a) à equipe.')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Aceitar Convite
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Você foi convidado para acessar o sistema. Crie sua senha abaixo para entrar.
        </p>

        <form onSubmit={handleAceitarConvite} className="space-y-4">
          <Input
            label="Seu E-mail"
            type="email"
            value={convite?.email}
            readOnly
            className="bg-slate-50 text-slate-500 cursor-not-allowed"
          />

          <Input
            label="Seu Nome Completo"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João da Silva"
            required
          />

          <Input
            label="Crie uma Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
          />

          <Button type="submit" className="w-full mt-6" loading={isSubmitting} icon={<CheckCircle className="w-4 h-4" />}>
            Finalizar Cadastro
          </Button>
        </form>
      </div>
    </div>
  )
}
