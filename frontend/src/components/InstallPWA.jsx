import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Предотвращаем автоматический показ браузерного промпта
      e.preventDefault();
      // Сохраняем событие для последующего использования
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Проверяем, уже установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✓ Приложение запущено в standalone режиме');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Показываем промпт установки
    deferredPrompt.prompt();

    // Ждем ответа пользователя
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✓ Пользователь принял установку');
    } else {
      console.log('✗ Пользователь отклонил установку');
    }

    // Очищаем промпт
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Показываем снова через 7 дней
    localStorage.setItem('installPromptDismissed', Date.now());
  };

  // Не показываем если недавно было отклонено
  useEffect(() => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  if (!showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
      <div className="bg-[#2F2F2F] border border-[#404040] rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-[#C48B64] rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#E8E8E8] mb-1">
              Установить HelpDesk
            </h3>
            <p className="text-xs text-[#B8B8B8] mb-3">
              Установите приложение на устройство для быстрого доступа и работы без интернета
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-[#C48B64] hover:bg-[#D49A75] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all"
              >
                Установить
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
  );
}

export default InstallPWA;

