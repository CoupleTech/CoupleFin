import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  nome: string
  email: string
  cor_tema?: string
}

interface Empresa {
  id: string
  nome_fantasia: string
  razao_social: string
  cnpj: string
  grupo_id?: string
  logo_url?: string
}

interface AppState {
  user: User | null
  empresas: Empresa[]
  empresaAtivaId: string | null
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  expandedMenus: Record<string, boolean>
  setUser: (user: User | null) => void
  setEmpresas: (empresas: Empresa[]) => void
  setEmpresaAtiva: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setExpandedMenus: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      empresas: [],
      empresaAtivaId: null,
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      expandedMenus: {
        'Organização': true,
        'Cadastros': true
      },
      setUser: (user) => set({ user }),
      setEmpresas: (empresas) => set({ empresas }),
      setEmpresaAtiva: (id) => set({ empresaAtivaId: id }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleMobileSidebar: () => set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),
      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),
      setExpandedMenus: (updater) => set((state) => ({ expandedMenus: updater(state.expandedMenus) })),
    }),
    {
      name: 'couplefin-storage',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenus: state.expandedMenus,
        empresaAtivaId: state.empresaAtivaId
      }),
    }
  )
)
