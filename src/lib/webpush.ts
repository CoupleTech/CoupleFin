export const subscribeToWebPush = async (userId: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push não é suportado por este navegador.')
    return false
  }

  // A chave pública VAPID é necessária para inscrever o usuário
  // Substitua 'SUA_VAPID_PUBLIC_KEY' pela chave gerada no backend ou .env
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'SUA_VAPID_PUBLIC_KEY_AQUI'
  
  if (vapidPublicKey === 'SUA_VAPID_PUBLIC_KEY_AQUI') {
     console.warn('VAPID Public Key não configurada. Inscrição não realizada.')
     return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Permissão para notificações negada pelo usuário.')
      return false
    }

    const registration = await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    const subData = JSON.parse(JSON.stringify(subscription))

    // Salvar inscrição no Supabase
    const { supabase } = await import('./supabase')
    const { error } = await supabase.from('push_subscriptions').upsert({
      usuario_id: userId,
      endpoint: subData.endpoint,
      p256dh: subData.keys.p256dh,
      auth: subData.keys.auth
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Erro ao salvar inscrição no Supabase:', error)
      return false
    }

    console.log('Inscrição Web Push concluída com sucesso.')
    return true
  } catch (error) {
    console.error('Falha ao se inscrever no Web Push:', error)
    return false
  }
}

// Utilitário para converter a VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
