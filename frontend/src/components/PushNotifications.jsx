import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

function PushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      return;
    }
    
    checkSubscription();
    
    // Показываем промпт если уведомления не настроены
    const dismissed = localStorage.getItem('notificationPromptDismissed');
    if (!dismissed && permission === 'default') {
      setTimeout(() => setShowPrompt(true), 5000);
    }
  }, [permission]);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Ошибка проверки подписки:', error);
      }
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        console.log('Push-уведомления отклонены');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // VAPID публичный ключ (в production замените на свой)
      const vapidPublicKey = 'BOHId4t-m4dpLCHFCEii0YwTGEAbrx2Yef7Gtu3bdq9KcAA5xnv_azpK3ysfmiIR89n9pltCQbmP7NpLWSa1I-k';
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(sub);
      
      // Отправляем подписку на сервер
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      setShowPrompt(false);
      console.log('✓ Push-уведомления включены');
      
      // Показываем тестовое уведомление
      new Notification('HelpDesk', {
        body: 'Уведомления успешно включены! 🎉',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png'
      });
    } catch (error) {
      console.error('Ошибка подписки на push:', error);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // Удаляем подписку на сервере
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
        setSubscription(null);
        console.log('✓ Push-уведомления отключены');
      }
    } catch (error) {
      console.error('Ошибка отписки от push:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notificationPromptDismissed', Date.now());
  };

  if (!('Notification' in window) || !('PushManager' in window)) {
    return null;
  }

  return (
    <>
      {showPrompt && permission === 'default' && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
          <div className="bg-[#2F2F2F] border border-[#404040] rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#6B8E6F] rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#E8E8E8] mb-1">
                  Включить уведомления?
                </h3>
                <p className="text-xs text-[#B8B8B8] mb-3">
                  Получайте уведомления о новых задачах и комментариях
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={subscribeToPush}
                    className="flex-1 bg-[#6B8E6F] hover:bg-[#7A9D7E] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  >
                    Включить
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-[#B8B8B8] hover:text-[#E8E8E8] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={subscription ? unsubscribeFromPush : subscribeToPush}
        className={`p-1.5 rounded-lg text-sm transition-all ${
          subscription 
            ? 'text-[#6B8E6F] hover:bg-[#3A3A3A]' 
            : 'text-[#B8B8B8] hover:bg-[#3A3A3A] hover:text-[#E8E8E8]'
        }`}
        title={subscription ? 'Уведомления включены' : 'Включить уведомления'}
      >
        {subscription ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </button>
    </>
  );
}

export default PushNotifications;

