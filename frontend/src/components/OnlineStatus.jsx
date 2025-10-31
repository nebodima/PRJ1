import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification && isOnline) {
    return null;
  }

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      showNotification ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
    }`}>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${
        isOnline 
          ? 'bg-[#6B8E6F] text-white' 
          : 'bg-[#B86B5C] text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Подключено к сети</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Нет подключения</span>
          </>
        )}
      </div>
    </div>
  );
}

export default OnlineStatus;

