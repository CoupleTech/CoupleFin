import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/useAppStore'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Grupos from './pages/Grupos'
import Empresas from './pages/Empresas'
import CentrosCusto from './pages/CentrosCusto'
import TiposDespesa from './pages/TiposDespesa'
import Contas from './pages/Contas'
import DestinosPagamento from './pages/DestinosPagamento'
import Equipe from './pages/Equipe'
import PerfisAcesso from './pages/PerfisAcesso'
import Fornecedores from './pages/Fornecedores'
import Financeiro from './pages/Financeiro'
import NovoLancamento from './pages/NovoLancamento'
import ContasPagar from './pages/ContasPagar'
import Auditoria from './pages/Auditoria'
import Configuracoes from './pages/Configuracoes'
import Fechamento from './pages/Fechamento'
import DRE from './pages/DRE'
import Relatorios from './pages/Relatorios'
import AceitarConvite from './pages/AceitarConvite'
import { UpdateModal } from './components/ui/UpdateModal'
import { ToastContainer } from './components/ui/ToastContainer'

function App() {
  const [loading, setLoading] = useState(true)
  const { setUser, setEmpresas, setEmpresaAtiva, user } = useAppStore()

  useEffect(() => {
    let mounted = true;
    
    async function checkUserSession(sessionUser: any) {
      if (!sessionUser) {
        setUser(null)
        setEmpresas([])
        setEmpresaAtiva(null)
        if (mounted) setLoading(false)
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', sessionUser.id)
        .single()

      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, cnpj, grupo_id, logo_url')
        .order('created_at', { ascending: true })

      const empresas = empresasData || []
      
      let cor_primaria = '#f97316' // Laranja Padrão
      
      if (empresas.length > 0) {
        const grupo_id = empresas[0].grupo_id
        const { data: config } = await supabase
          .from('configuracoes_sistema')
          .select('cor_primaria, cor_secundaria, cor_terciaria')
          .eq('grupo_id', grupo_id)
          .maybeSingle()
          
        if (config && config.cor_primaria) {
          cor_primaria = config.cor_primaria
        }
      }
      
      setUser({ 
        id: sessionUser.id, 
        email: sessionUser.email || '', 
        nome: usuario?.nome || sessionUser.user_metadata?.nome || '',
        cor_tema: cor_primaria 
      })
      setEmpresas(empresas)
      
      // Aplica a cor primária dinâmica no sistema inteiro
      document.documentElement.style.setProperty('--color-primary', cor_primaria)
      
      if (empresas.length > 0) {
        const currentState = useAppStore.getState()
        if (!currentState.empresaAtivaId || !empresas.some(e => e.id === currentState.empresaAtivaId)) {
          setEmpresaAtiva(empresas[0].id)
        }
      }

      if (mounted) setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserSession(session?.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserSession(session?.user)
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [setUser, setEmpresas, setEmpresaAtiva])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-xl font-black tracking-tighter">CF</span>
        </div>
        <span className="text-primary font-bold text-2xl">CoupleFin</span>
      </div>
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
    </div>
  )

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/aceitar-convite" element={<AceitarConvite />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/grupos" element={user ? <Grupos /> : <Navigate to="/login" />} />
        <Route path="/empresas" element={user ? <Empresas /> : <Navigate to="/login" />} />
        <Route path="/centros-custo" element={user ? <CentrosCusto /> : <Navigate to="/login" />} />
        <Route path="/tipos-despesa" element={user ? <TiposDespesa /> : <Navigate to="/login" />} />
        <Route path="/contas" element={user ? <Contas /> : <Navigate to="/login" />} />
        <Route path="/destinos-pagamento" element={user ? <DestinosPagamento /> : <Navigate to="/login" />} />
        <Route path="/equipe" element={user ? <Equipe /> : <Navigate to="/login" />} />
        <Route path="/perfis-acesso" element={user ? <PerfisAcesso /> : <Navigate to="/login" />} />
        <Route path="/fornecedores" element={user ? <Fornecedores /> : <Navigate to="/login" />} />
        <Route path="/financeiro/novo" element={user ? <NovoLancamento /> : <Navigate to="/login" />} />
        <Route path="/financeiro" element={user ? <Financeiro /> : <Navigate to="/login" />} />
        <Route path="/contas-pagar" element={user ? <ContasPagar /> : <Navigate to="/login" />} />
        <Route path="/dre" element={user ? <DRE /> : <Navigate to="/login" />} />
        <Route path="/relatorios" element={user ? <Relatorios /> : <Navigate to="/login" />} />
        <Route path="/auditoria" element={user ? <Auditoria /> : <Navigate to="/login" />} />
        <Route path="/fechamento" element={user ? <Fechamento /> : <Navigate to="/login" />} />
        <Route path="/configuracoes" element={user ? <Configuracoes /> : <Navigate to="/login" />} />
      </Routes>
      <UpdateModal />
      <ToastContainer />
    </Router>
  )
}

export default App
