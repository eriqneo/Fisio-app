import React from 'react';
import { Bell, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PushPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PushPermissionModal({ isOpen, onClose, onConfirm }: PushPermissionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-primary/20 hover:text-primary transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-10 text-center space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-primary/5 rounded-[32px] rotate-6" />
                <div className="absolute inset-0 bg-primary/5 rounded-[32px] -rotate-3" />
                <div className="relative w-full h-full bg-primary text-white rounded-[32px] flex items-center justify-center shadow-xl shadow-primary/20">
                  <Bell size={40} />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-primary tracking-tight">Stay Connected</h2>
                <p className="text-primary/40 text-sm font-medium leading-relaxed">
                  Enable push notifications to receive real-time appointment reminders and HEP updates directly on your device.
                </p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={onConfirm}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
                >
                  Enable Notifications
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-white text-primary/40 rounded-2xl font-bold text-sm uppercase tracking-widest hover:text-primary transition-all"
                >
                  Maybe Later
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-primary/20 uppercase tracking-widest">
                <ShieldCheck size={12} />
                Secure & Private • No Spam
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
