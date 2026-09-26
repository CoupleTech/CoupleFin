import { useState, useEffect, useRef } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

export interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  tipo: string
  lida: boolean
  link_acao?: string
  created_at: string
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const { user } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return

    const fetchNotificacoes = async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setNotificacoes(data)
      }
    }

    fetchNotificacoes()

    // Realtime subscription
    const channel = supabase
      .channel('notificacoes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          setNotificacoes((prev) => [payload.new as Notificacao, ...prev].slice(0, 10))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarcarComoLida = async (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
  }

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
        w-9 h-9 sm:w-10 sm:h-10 
        bg-slate-50 border border-slate-200 rounded-lg 
        flex items-center justify-center transition-all duration-fast relative
        ${isOpen ? 'text-primary border-primary/30 bg-primary/5' : 'text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5'}
      `}>
        <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 text-sm">Notificações</h3>
            {naoLidas > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {naoLidas} novas
              </span>
            )}
          </div>
          
          <div className="max-h-[360px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Bell className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notificacoes.map((notificacao) => (
                  <div 
                    key={notificacao.id} 
                    className={`p-4 transition-colors hover:bg-slate-50 flex gap-3 ${!notificacao.lida ? 'bg-primary/[0.02]' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-slate-800 mb-0.5 ${!notificacao.lida ? 'text-slate-900' : ''}`}>
                        {notificacao.titulo}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(notificacao.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {notificacao.link_acao && (
                          <a href={notificacao.link_acao} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                            Ver mais <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {!notificacao.lida && (
                      <button 
                        onClick={() => handleMarcarComoLida(notificacao.id)}
                        className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors shrink-0"
                        title="Marcar como lida"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={async () => {
                const { subscribeToWebPush } = await import('../../lib/webpush')
                if (user?.id) {
                  const success = await subscribeToWebPush(user.id)
                  if (success) alert('Notificações ativadas com sucesso no navegador!')
                  else alert('Falha ao ativar notificações. Verifique as permissões ou se VAPID KEY está configurada.')
                }
              }}
              className="w-full text-xs text-center py-1.5 text-slate-500 hover:text-primary transition-colors font-medium"
            >
              Ativar notificações no navegador
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
