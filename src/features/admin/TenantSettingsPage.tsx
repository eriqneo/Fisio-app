import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Save, 
  Upload, 
  Clock, 
  Settings, 
  Bell, 
  Stethoscope,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantSettingsPage() {
  const { tenant: tenantService, auditLogs } = useTenantDb();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: tenant } = useQuery({ 
    queryKey: ['admin', 'tenantSettings'], 
    queryFn: () => tenantService.get() 
  });

  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    email: 'contact@clinic.com',
    phone: '+1 (555) 000-0000',
    address: '123 Medical Plaza, Suite 400, New York, NY',
    socials: {
      instagram: '@clinic_official',
      facebook: 'clinic.medical'
    },
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 45,
    cancellationPolicy: '24 hours notice required for full refund.',
    modalities: [] as string[],
    notificationTemplates: {
      appointment: 'Reminder: Your appointment at {clinic} is on {date} at {time}.',
      hep: 'Time for your daily exercises! Stay consistent for the best results.'
    }
  });

  useEffect(() => {
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        name: tenant.name,
        // In a real app, we'd have more fields in the tenant object
      }));
    }
  }, [tenant]);

  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General Info', icon: Settings },
    { id: 'hours', label: 'Working Hours', icon: Clock },
    { id: 'clinical', label: 'Clinical Rules', icon: Stethoscope },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await tenantService.update({ name: formData.name });
      await auditLogs.log('update', 'tenant_settings', tenant?.id, 'Updated clinic settings');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenantSettings'] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[40px] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-primary tracking-tight">General Information</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Public Identity & Contact</p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-8">
                <div className="w-32 h-32 rounded-[40px] bg-primary/5 border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-primary/20 hover:text-primary hover:border-primary/30 transition-all cursor-pointer group shrink-0">
                  <Upload size={32} className="group-hover:-translate-y-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest mt-3">Logo</span>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Clinic Name</label>
                    <input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Contact Email</label>
                  <input 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Phone Number</label>
                  <input 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Physical Address</label>
                <input 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Instagram</label>
                  <input 
                    value={formData.socials.instagram}
                    onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })}
                    className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Facebook</label>
                  <input 
                    value={formData.socials.facebook}
                    onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, facebook: e.target.value } })}
                    className="w-full px-8 py-5 bg-surface-muted border-none rounded-3xl text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.section>
        );
      case 'hours':
        return (
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-12 rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-primary tracking-tight">Operational Hours</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Default Clinical Availability</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Clinic Opens</label>
                <div className="relative group">
                  <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={20} />
                  <input 
                    type="time"
                    value={formData.workingHours.start}
                    onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, start: e.target.value } })}
                    className="w-full pl-16 pr-8 py-6 bg-surface-muted border-none rounded-[2rem] text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Clinic Closes</label>
                <div className="relative group">
                  <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={20} />
                  <input 
                    type="time"
                    value={formData.workingHours.end}
                    onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, end: e.target.value } })}
                    className="w-full pl-16 pr-8 py-6 bg-surface-muted border-none rounded-[2rem] text-sm focus:ring-4 focus:ring-accent/5 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="p-8 bg-accent/5 rounded-[2rem] border border-accent/10 flex items-start gap-4">
              <AlertCircle className="text-accent shrink-0" size={20} />
              <p className="text-xs text-primary/60 leading-relaxed font-medium">
                These hours define the default scheduling grid for all therapists. 
                Individual staff members can override these in their personal profiles.
              </p>
            </div>
          </motion.section>
        );
      case 'clinical':
        return (
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-12 rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-primary tracking-tight">Clinic Settings</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Operational Constraints & Policies</p>
            </div>
            
            <div className="space-y-12">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Standard Session Duration</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[15, 30, 45, 60, 90].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, slotDuration: m })}
                      className={`px-6 py-6 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border transition-all ${
                        formData.slotDuration === m 
                          ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.05]' 
                          : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                      }`}
                    >
                      {m} Minutes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Cancellation & Refund Policy</label>
                <textarea 
                  rows={6}
                  value={formData.cancellationPolicy}
                  onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                  className="w-full px-10 py-8 bg-surface-muted border-none rounded-[2.5rem] text-sm focus:ring-4 focus:ring-accent/5 transition-all resize-none leading-relaxed"
                  placeholder="Describe your cancellation and refund terms..."
                />
              </div>
            </div>
          </motion.section>
        );
      case 'notifications':
        return (
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-12 rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-primary tracking-tight">Automated Communications</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Patient Engagement Templates</p>
            </div>
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Appointment Confirmation</label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </div>
                <textarea 
                  rows={4}
                  value={formData.notificationTemplates.appointment}
                  onChange={(e) => setFormData({ ...formData, notificationTemplates: { ...formData.notificationTemplates, appointment: e.target.value } })}
                  className="w-full px-10 py-8 bg-surface-muted border-none rounded-[2.5rem] text-sm focus:ring-4 focus:ring-accent/5 transition-all resize-none leading-relaxed"
                />
                <div className="flex flex-wrap gap-2 px-4">
                  {['clinic', 'date', 'time', 'patient'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-widest rounded-lg">
                      {`{${tag}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">HEP Engagement Prompt</label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </div>
                <textarea 
                  rows={4}
                  value={formData.notificationTemplates.hep}
                  onChange={(e) => setFormData({ ...formData, notificationTemplates: { ...formData.notificationTemplates, hep: e.target.value } })}
                  className="w-full px-10 py-8 bg-surface-muted border-none rounded-[2.5rem] text-sm focus:ring-4 focus:ring-accent/5 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </motion.section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/5">
              Clinic Configuration
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[8px] font-black text-accent uppercase tracking-widest">Clinic Details</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-serif text-primary tracking-tighter leading-none">
            Clinic <span className="italic text-primary/20">Settings</span>
          </h1>
          <p className="text-primary/40 font-medium text-xl max-w-2xl leading-relaxed">
            Define your clinical identity, manage clinic operations, 
            and set up patient notifications.
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-12 py-6 bg-primary text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 group"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} className="group-hover:-translate-y-1 transition-transform" />
          )}
          Save Settings
        </button>
      </header>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-500 text-white p-6 rounded-[2rem] flex items-center gap-4 shadow-2xl shadow-emerald-500/20"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Settings Saved</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Your changes have been applied successfully</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
        {/* Sidebar Nav */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] ml-6 mb-8">Navigation</p>
          {tabs.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-6 px-8 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all text-left border ${
                activeTab === item.id 
                  ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.05] z-10' 
                  : 'bg-white border-primary/5 text-primary/40 hover:text-primary hover:border-primary/20 hover:translate-x-2'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-accent' : 'text-primary/20'} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Form Area */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
