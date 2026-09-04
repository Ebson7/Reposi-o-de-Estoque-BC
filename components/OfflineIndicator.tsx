import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showRestored) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:right-auto sm:left-6 z-50 flex items-center justify-center sm:justify-start gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold shadow-xl animate-fade-in">
        <Wifi className="w-4 h-4" />
        <span>Conexão restabelecida. Sincronização em tempo real ativa.</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:right-auto sm:left-6 z-50 flex items-center justify-center sm:justify-start gap-2 rounded-2xl bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-xl animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>Modo Offline — Exibindo dados locais do catálogo em cache.</span>
    </div>
  );
};
