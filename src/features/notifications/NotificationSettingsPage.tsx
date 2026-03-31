import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Clock, 
  ChevronLeft,
  Save,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import PushPermissionModal from '@/components/PushPermissionModal';

export default function NotificationSettingsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients } = useTenantDb();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patients.findById(Number(patientId)),
    enabled: !!patientId
  });

  const [settings, setSettings] = useState({
    email: true,
    sms: true,
    push: false,
    preferredReminderTime: '08:00'
  });

  useEffect(() => {
    if (patient?.notificationSettings) {
      setSettings(patient.notificationSettings);
    }
  }, [patient]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: typeof settings) => 
      patients.update(Number(patientId), { notificationSettings: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      // Show success toast or feedback
    }
  });

  const handleToggle = (key: keyof typeof settings) => {
    if (key === 'push' && !settings.push) {
      setIsModalOpen(true);
      return;
    }
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const requestPushPermission = async () => {
    setIsModalOpen(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, push: true }));
        console.log('Push permission granted');
      }
    } catch (err) {
      console.error('Push permission error:', err);
    }
  };

  if (!patient) return null;

  return (
    <div className="max-w-4xl mx-auto p-12 space-y-12">
      <PushPermissionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={requestPushPermission} 
      />
      
      <button 
        onClick={() => navigate(`/patients/${patientId}`)}
        className="flex items-center gap-3 text-primary/20 hover:text-primary font-black text-[10px] uppercase tracking-[0.3em] transition-all group"
      >
        <div className="p-2 bg-primary/5 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
          <ChevronLeft size={16} />
        </div>
        Back to Profile
      </button>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/5">
            Privacy & Security
          </div>
        </div>
        <h1 className="text-6xl font-serif text-primary tracking-tighter leading-none">
          Messaging <span className="italic text-primary/20">Settings</span>
        </h1>
        <p className="text-primary/40 font-medium text-lg max-w-xl">
          Manage automated messages and notification channels for {patient.firstName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Channels */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] space-y-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary shadow-sm">
                <Bell size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">Channels</h2>
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Outreach Mediums</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { id: 'email', label: 'Email', icon: Mail, desc: 'Clinical reports & summaries' },
              { id: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Session reminders' },
              { id: 'push', label: 'Push', icon: Smartphone, desc: 'Real-time alerts' }
            ].map((channel) => (
              <div 
                key={channel.id}
                className="flex items-center justify-between p-8 bg-surface-muted/30 rounded-[2.5rem] border border-transparent hover:border-primary/5 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-primary/20 group-hover:text-primary transition-colors shadow-sm">
                    <channel.icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-primary tracking-tight">{channel.label}</p>
                    <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-1">{channel.desc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggle(channel.id as any)}
                  className={`w-16 h-9 rounded-full transition-all relative shadow-inner ${settings[channel.id as keyof typeof settings] ? 'bg-primary' : 'bg-primary/10'}`}
                >
                  <div className={`absolute top-1.5 w-6 h-6 rounded-full bg-white shadow-lg transition-all ${settings[channel.id as keyof typeof settings] ? 'left-8.5' : 'left-1.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Preferences */}
        <div className="space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] space-y-10"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary shadow-sm">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">Schedule</h2>
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Timing Preferences</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] block ml-2">Preferred Window</label>
                <div className="relative group">
                  <input 
                    type="time"
                    value={settings.preferredReminderTime}
                    onChange={(e) => setSettings({ ...settings, preferredReminderTime: e.target.value })}
                    className="w-full px-10 py-6 bg-surface-muted/50 border border-transparent rounded-[2.5rem] text-xl font-mono font-bold text-primary focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all shadow-sm"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                    <Clock size={24} />
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest">Daily schedule update</p>
                </div>
              </div>

              <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-emerald-900 tracking-tight">Consent Verified</p>
                  <p className="text-xs text-emerald-700/70 leading-relaxed font-medium">
                    Automated messaging is enabled. All messages follow standard clinic guidelines.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-end">
            <button 
              onClick={() => updateMutation.mutate(settings)}
              disabled={updateMutation.isPending}
              className="group relative flex items-center gap-4 px-16 py-6 bg-primary text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Save size={20} className="relative z-10" />
              <span className="relative z-10">{updateMutation.isPending ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
