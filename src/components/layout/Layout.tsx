import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import { 
  LayoutDashboard, 
  Building2, 
  Building,
  WalletCards, 
  Users, 
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Tags,
  Bookmark,
  Wallet,
  Briefcase,
  Store,
  CalendarClock,
  ShieldCheck,
  Lock,
  Calculator,
  FileBarChart
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { 
    name: 'Organização', icon: Building2, 
    children: [
      { name: 'Grupos', path: '/grupos', icon: Building2 },
      { name: 'Empresas', path: '/empresas', icon: Building },
    ]
  },
  {
    name: 'Cadastros', icon: Tags,
    children: [
      { name: 'Centros de Custo', path: '/centros-custo', icon: Tags },
      { name: 'Tipos de Despesa', path: '/tipos-despesa', icon: Bookmark },
      { name: 'Contas', path: '/contas', icon: Wallet },
      { name: 'Destinos de Pagamento', path: '/destinos-pagamento', icon: Briefcase },
      { name: 'Fornecedores', path: '/fornecedores', icon: Store },
    ]
  },
  { name: 'Financeiro', path: '/financeiro', icon: WalletCards },
  { name: 'Contas a Pagar', path: '/contas-pagar', icon: CalendarClock },
  { name: 'DRE', path: '/dre', icon: Calculator },
  { name: 'Relatórios', path: '/relatorios', icon: FileBarChart },
  { name: 'Equipe', path: '/equipe', icon: Users },
  { name: 'Auditoria', path: '/auditoria', icon: ShieldCheck },
  { name: 'Fechamento', path: '/fechamento', icon: Lock },
  { name: 'Configurações', path: '/configuracoes', icon: Settings },
]

// Mapeia rota → título dinâmico do header
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral das suas finanças' },
  '/grupos': { title: 'Grupos Econômicos', subtitle: 'Gerencie a estrutura do grupo' },
  '/empresas': { title: 'Empresas', subtitle: 'Gerencie CNPJs e filiais' },
  '/centros-custo': { title: 'Centros de Custo', subtitle: 'Organize as despesas e receitas por áreas ou departamentos' },
  '/tipos-despesa': { title: 'Tipos de Despesa', subtitle: 'Categorize as movimentações financeiras para o DRE' },
  '/contas': { title: 'Contas Financeiras', subtitle: 'Gerencie contas bancárias e caixas da empresa' },
  '/destinos-pagamento': { title: 'Destinos de Pagamento', subtitle: 'Agrupe os recebedores das saídas financeiras' },
  '/fornecedores': { title: 'Fornecedores', subtitle: 'Gerencie fornecedores do grupo econômico' },
  '/financeiro': { title: 'Financeiro', subtitle: 'Controle de lançamentos' },
  '/contas-pagar': { title: 'Contas a Pagar', subtitle: 'Acompanhe seus vencimentos e compromissos' },
  '/dre': { title: 'DRE', subtitle: 'Demonstração do Resultado do Exercício' },
  '/relatorios': { title: 'Relatórios', subtitle: 'Análises gerenciais e listagens avançadas' },
  '/equipe': { title: 'Equipe', subtitle: 'Gestão de usuários e perfis' },
  '/auditoria': { title: 'Auditoria', subtitle: 'Rastreabilidade de alterações no sistema' },
  '/fechamento': { title: 'Fechamento de Período', subtitle: 'Congele os lançamentos de meses já finalizados' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Cores, logo e preferências do sistema' },
}

export default function Layout({ children }: LayoutProps) {
  const { 
    user, empresas, empresaAtivaId, setEmpresaAtiva,
    sidebarCollapsed, toggleSidebar, 
    sidebarMobileOpen, toggleMobileSidebar, closeMobileSidebar,
    expandedMenus, setExpandedMenus
  } = useAppStore()
  const location = useLocation()
  
  // Hook reativo de media query para desktop
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )

  const toggleMenu = (name: string) => {
    if (sidebarCollapsed) {
      toggleSidebar()
      setExpandedMenus(prev => ({ ...prev, [name]: true }))
    } else {
      setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }))
    }
  }
  
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    setIsDesktop(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const pageInfo = pageTitles[location.pathname] || { title: 'CoupleFin', subtitle: '' }

  // Fechar sidebar mobile ao navegar
  useEffect(() => {
    closeMobileSidebar()
  }, [location.pathname, closeMobileSidebar])

  // Fechar sidebar mobile ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileSidebar()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [closeMobileSidebar])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const SidebarContent = () => (
    <>
      {/* Top Section */}
      <div>
        {/* Logo Area */}
        <div className={`h-16 flex items-center relative mb-2 mt-1 ${sidebarCollapsed ? 'justify-center' : 'px-4'}`}>
          <Link to="/" className="flex items-center gap-2.5 text-primary font-bold text-lg overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-lg font-black tracking-tighter">CF</span>
            </div>
            {!sidebarCollapsed && (
              <span className="whitespace-nowrap">CoupleFin</span>
            )}
          </Link>

          {/* Botão colapsar — só desktop (Flutuante na borda direita) */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full transition-all duration-fast shadow-sm absolute top-1/2 -translate-y-1/2 -right-3 z-50"
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Botão fechar — só mobile */}
          {!sidebarCollapsed && (
            <button
              onClick={closeMobileSidebar}
              className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-fast"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const isExpanded = expandedMenus[item.name]
              const hasActiveChild = item.children.some(child => location.pathname === child.path)

              return (
                <div key={item.name} className="space-y-0.5">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-fast group relative
                      ${hasActiveChild && sidebarCollapsed ? 'bg-primary/8 text-primary' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
                      ${sidebarCollapsed ? 'justify-center px-0' : ''}
                    `}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${hasActiveChild && sidebarCollapsed ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDown 
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`} 
                        />
                      </>
                    )}
                    
                    {/* Tooltip quando colapsado */}
                    {sidebarCollapsed && (
                      <div className="
                        absolute left-full ml-2 px-2.5 py-1.5 
                        bg-slate-800 text-white text-xs font-medium rounded-md 
                        opacity-0 group-hover:opacity-100 pointer-events-none
                        transition-opacity duration-fast whitespace-nowrap
                        z-50
                      ">
                        {item.name}
                      </div>
                    )}
                  </button>

                  {!sidebarCollapsed && (
                    <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="pl-9 space-y-0.5 mt-0.5">
                          {item.children.map(child => {
                            const isChildActive = location.pathname === child.path
                            return (
                              <Link
                                key={child.name}
                                to={child.path!}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                                  transition-all duration-fast group relative
                                  ${isChildActive 
                                    ? 'bg-primary/8 text-primary' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                  }
                                `}
                              >
                                <child.icon className={`w-4 h-4 shrink-0 ${isChildActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <span>{child.name}</span>
                                {isChildActive && (
                                  <div className="ml-auto w-1 h-4 bg-primary rounded-full" />
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path!}
                title={sidebarCollapsed ? item.name : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-fast group relative
                  ${isActive 
                    ? 'bg-primary/8 text-primary' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }
                  ${sidebarCollapsed ? 'justify-center px-0' : ''}
                `}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!sidebarCollapsed && (
                  <>
                    <span>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1 h-5 bg-primary rounded-full" />
                    )}
                  </>
                )}
                
                {/* Tooltip quando colapsado */}
                {sidebarCollapsed && (
                  <div className="
                    absolute left-full ml-2 px-2.5 py-1.5 
                    bg-slate-800 text-white text-xs font-medium rounded-md 
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-fast whitespace-nowrap
                    z-50
                  ">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 space-y-0.5 mb-1">

        <button 
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Sair' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium 
            text-primary border border-primary hover:bg-primary/10 rounded-lg 
            transition-all duration-fast
            ${sidebarCollapsed ? 'justify-center px-0' : ''}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex font-sans text-slate-800">
      
      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside 
        className={`
          hidden lg:flex flex-col justify-between
          bg-white border-r border-slate-200/80 
          fixed h-full transition-all duration-base
          ${sidebarCollapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'}
        `}
        style={{ zIndex: 'var(--z-sidebar)' }}
      >
        <SidebarContent />
      </aside>

      {/* ===== SIDEBAR MOBILE (Drawer) ===== */}
      {sidebarMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0"
          style={{ zIndex: 'var(--z-overlay)' }}
        >
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] overlay-enter"
            onClick={closeMobileSidebar}
          />
          {/* Drawer */}
          <aside 
            className="absolute left-0 top-0 h-full w-[var(--sidebar-width)] bg-white shadow-xl flex flex-col justify-between"
            style={{ animation: 'slideInLeft var(--transition-slow) ease forwards' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <main 
        className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-base"
        style={{ 
          marginLeft: isDesktop 
            ? (sidebarCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)') 
            : '0' 
        }}
      >
        
        {/* ===== HEADER ===== */}
        <header 
          className="h-16 sm:h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0"
          style={{ zIndex: 'var(--z-header)' }}
        >
          {/* Left side */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Hamburger — só mobile */}
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-fast"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-slate-800 truncate">{pageInfo.title}</h1>
              <p className="text-xs sm:text-sm text-slate-400 truncate hidden sm:block">{pageInfo.subtitle}</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor de empresa */}
            {empresas.length > 0 && (
              <div className="hidden sm:flex items-center">
                <select 
                  value={empresaAtivaId || ''} 
                  onChange={(e) => setEmpresaAtiva(e.target.value)}
                  className="
                    bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm
                    rounded-lg px-3 py-2 pr-8
                    focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none
                    transition-all duration-fast
                    max-w-[200px] lg:max-w-[260px] truncate
                    appearance-none cursor-pointer
                    bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]
                    bg-[length:14px] bg-[right_8px_center] bg-no-repeat
                  "
                >
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome_fantasia || emp.razao_social}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notifications */}
            <button className="
              w-9 h-9 sm:w-10 sm:h-10 
              bg-slate-50 border border-slate-200 rounded-lg 
              flex items-center justify-center text-slate-500 
              hover:text-primary hover:border-primary/30 hover:bg-primary/5
              transition-all duration-fast relative
            ">
              <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
            </button>

            {/* User Info no Header */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 ml-1 sm:ml-2 border-l border-slate-200">
              <div className="hidden md:block text-right overflow-hidden min-w-0 max-w-[120px] lg:max-w-[160px]">
                <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{user?.nome}</p>
                <p className="text-xs text-slate-500 truncate leading-tight">{user?.email}</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm sm:text-base shrink-0 border border-primary/20">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* ===== PAGE CONTENT (Scrollable) ===== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
