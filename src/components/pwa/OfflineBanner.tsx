import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const saved = localStorage.getItem('last_sync_time');
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events from our custom sync engine
    const handleSyncComplete = (e: any) => {
      const time = Date.now();
      setLastSync(time);
      localStorage.setItem('last_sync_time', time.toString());
    };
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-error text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2 px-4 flex items-center justify-center gap-3 z-[100] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
          <WifiOff size={14} className="relative z-10" />
          <span className="relative z-10">You are currently offline. Changes will be synced when you reconnect.</span>
          {lastSync && (
            <span className="relative z-10 opacity-60 ml-4">
              Last synced: {format(lastSync, 'HH:mm')}
            </span>
          )}
        </motion.div>
      )}
      {isOnline && lastSync && Date.now() - lastSync < 5000 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2 px-4 flex items-center justify-center gap-3 z-[100] relative"
        >
          <Wifi size={14} />
          <span>Back online. All changes synced successfully.</span>
          <RefreshCw size={12} className="animate-spin" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
