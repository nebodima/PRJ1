import { useState, useEffect } from 'react';
import { Share, X, Home } from 'lucide-react';

function InstallPWAiOS() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверяем: iOS Safari и не установлено
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('installPromptIOSDismissed');
    
    if (isIOS && !isInStandaloneMode && !dismissed) {
      // Показываем промпт через 3 секунды
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptIOSDismissed', Date.now());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-[100] animate-fadeIn">
      <div className="bg-[#2F2F2F] rounded-t-3xl w-full max-w-lg border-t border-[#404040] shadow-2xl animate-slideUp pb-safe">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#E8E8E8] mb-2">
                Установить HelpDesk
              </h3>
              <p className="text-sm text-[#B8B8B8]">
                Добавьте приложение на главный экран для быстрого доступа
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-[#888] hover:text-[#E8E8E8] transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 bg-[#1F1F1F] p-4 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-[#5B7C99] rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#E8E8E8] mb-2">
                  Нажмите кнопку <span className="font-semibold">"Поделиться"</span>
                </p>
                <div className="flex items-center gap-2 bg-[#2F2F2F] px-3 py-2 rounded-lg">
                  <Share className="w-5 h-5 text-[#5B7C99]" />
                  <span className="text-xs text-[#B8B8B8]">внизу экрана (Safari)</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#1F1F1F] p-4 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-[#6B8E6F] rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#E8E8E8] mb-2">
                  Выберите <span className="font-semibold">"На экран Домой"</span>
                </p>
                <div className="flex items-center gap-2 bg-[#2F2F2F] px-3 py-2 rounded-lg">
                  <Home className="w-5 h-5 text-[#6B8E6F]" />
                  <span className="text-xs text-[#B8B8B8]">в меню действий</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#1F1F1F] p-4 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-[#C48B64] rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#E8E8E8]">
                  Нажмите <span className="font-semibold">"Добавить"</span>
                </p>
                <p className="text-xs text-[#888] mt-1">
                  Готово! Иконка появится на главном экране
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1F1F1F] border border-[#404040] rounded-xl p-4">
            <p className="text-xs text-[#888] mb-2">💡 После установки:</p>
            <ul className="text-xs text-[#B8B8B8] space-y-1 ml-4">
              <li>• Работа без интернета</li>
              <li>• Push-уведомления о задачах</li>
              <li>• Быстрый запуск с главного экрана</li>
            </ul>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-4 px-4 py-3 bg-[#3A3A3A] hover:bg-[#454545] text-[#E8E8E8] rounded-xl font-medium transition-all"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPWAiOS;

