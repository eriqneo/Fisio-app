import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2, ShieldAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  const variants = {
    danger: {
      icon: Trash2,
      color: 'text-error',
      bg: 'bg-error/5',
      button: 'bg-error hover:bg-error/90 shadow-error/20',
      border: 'border-error/10'
    },
    warning: {
      icon: ShieldAlert,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
      border: 'border-orange-200'
    },
    info: {
      icon: Info,
      color: 'text-primary',
      bg: 'bg-primary/5',
      button: 'bg-primary hover:bg-primary/90 shadow-primary/20',
      border: 'border-primary/10'
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/60 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-white rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.4)] overflow-hidden border border-primary/5"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
            <div className="p-16 space-y-12">
              <div className="flex flex-col items-center text-center space-y-8">
                <div className={cn("w-24 h-24 rounded-[3rem] flex items-center justify-center shadow-2xl relative group", config.bg, config.color)}>
                  <div className="absolute inset-0 bg-current opacity-10 rounded-[3rem] animate-pulse" />
                  <Icon size={48} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-serif text-primary tracking-tight">{title}</h3>
                  <p className="text-primary/40 text-base font-medium leading-relaxed max-w-xs mx-auto">
                    {description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-10 py-6 bg-surface-muted/50 text-primary/30 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:text-primary hover:bg-surface-muted transition-all"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onConfirm}
                  className={cn(
                    "flex-1 px-10 py-6 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
                    config.button
                  )}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Icon size={18} className="group-hover:rotate-12 transition-transform" />
                  )}
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
