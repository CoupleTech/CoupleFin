import Modal from './Modal'
import Button from './Button'
import { RefreshCw } from 'lucide-react'
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateModal() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered', r)
      if (r) {
        // Checar por nova versão a cada 60 segundos
        setInterval(() => {
          console.log('Checando atualização do PWA...')
          r.update()
        }, 60 * 1000)
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error)
    },
  })

  return (
    <Modal
      isOpen={needRefresh}
      onClose={() => setNeedRefresh(false)}
      title="Atualização Disponível"
      subtitle="Uma nova versão do sistema está disponível. Recarregue a página para aplicar."
      icon={<RefreshCw className="w-5 h-5 text-primary" />}
      size="sm"
    >
      <div className="flex gap-3 justify-end mt-4">
        <Button variant="secondary" onClick={() => setNeedRefresh(false)}>
          Mais tarde
        </Button>
        <Button onClick={() => updateServiceWorker(true)} icon={<RefreshCw className="w-4 h-4" />}>
          Atualizar Agora
        </Button>
      </div>
    </Modal>
  )
}
