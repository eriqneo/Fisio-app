import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Track visits to show prompt after 2nd visit
    const visits = parseInt(localStorage.getItem('app_visits') || '0');
    localStorage.setItem('app_visits', (visits + 1).toString());

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show if it's at least the 2nd visit
      if (visits >= 1) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-6 right-6 md:left-auto md:right-10 md:w-96 bg-primary text-white p-6 rounded-[32px] shadow-2xl z-[100] border border-white/10"
        >
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={18} className="text-white/40" />
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-primary shrink-0 shadow-lg shadow-accent/20">
              <Smartphone size={28} />
            </div>
            <div className="space-y-1 pr-8">
              <h3 className="text-lg font-bold leading-tight">Install PhysioFlow Pro</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Add to your home screen for a faster, offline-capable experience and native features.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleInstall}
              className="flex-1 py-4 bg-accent text-primary rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Install Now
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-6 py-4 bg-white/5 text-white/60 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
