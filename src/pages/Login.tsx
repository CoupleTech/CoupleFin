import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input } from '../components/ui'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function Login() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { error, data } = isSignUp 
      ? await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { nome } }
        })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else if (isSignUp && !data.session) {
      setSuccess('Cadastro realizado! Verifique sua caixa de entrada para confirmar o e-mail.')
      setNome('')
      setPassword('')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — decorativo */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Accent glow */}
        <div 
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-primary)' }}
        />
        <div 
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-accent)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-lg font-black tracking-tighter">CF</span>
              </div>
              <span className="text-white font-bold text-xl">CoupleFin</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Controle contábil
              <br />
              <span style={{ color: 'var(--color-primary)' }}>simplificado</span> para
              <br />
              seu grupo econômico
            </h1>
            <p className="text-slate-400 text-base xl:text-lg max-w-md leading-relaxed">
              Gerencie lançamentos, empresas e relatórios financeiros em uma única plataforma integrada.
            </p>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Sistema protegido com criptografia end-to-end
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[var(--color-bg)]">
        <div className="w-full max-w-[400px]">
          
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-lg font-black tracking-tighter">CF</span>
            </div>
            <span className="text-primary font-bold text-xl">CoupleFin</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {isSignUp ? 'Criar sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isSignUp 
                ? 'Preencha os dados para começar' 
                : 'Entre com suas credenciais para continuar'
              }
            </p>
          </div>
          
          {error && (
            <div className="bg-danger-50 border border-danger-100 text-danger-600 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-accent-50 border border-accent-100 text-accent-700 px-4 py-3 rounded-xl mb-5 text-sm text-center">
              {success}
            </div>
          )}
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <Input
                label="Seu Nome"
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                icon={<User className="w-4 h-4" />}
                placeholder="Como você quer ser chamado"
                required={isSignUp}
              />
            )}

            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              placeholder="••••••••"
              required
            />

            <Button 
              type="submit" 
              loading={loading}
              className="w-full !py-3"
              iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }} 
              className="text-sm text-slate-500 hover:text-primary transition-colors duration-fast"
            >
              {isSignUp ? 'Já tenho uma conta →' : 'Criar nova conta →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
