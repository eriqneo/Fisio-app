import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Clock, 
  BookOpen, 
  Users,
  Mail,
  Edit2,
  Trash2,
  X,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  ShieldCheck,
  UserPlus,
  Filter,
  ArrowRight,
  User
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';
import { User as SystemUser, PERMISSIONS, ROLE_PERMISSIONS, Role } from '@/types';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function StaffManagement() {
  const { users, auditLogs } = useTenantDb();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SystemUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role>('therapist');
  const [allowLogin, setAllowLogin] = useState(true);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'danger',
    confirmText: ''
  });

  const PERMISSION_DESCRIPTIONS: Record<string, string> = {
    view_patients: 'View patient profiles and basic information',
    manage_patients: 'Create, edit, and archive patient records',
    view_appointments: 'View the clinic schedule and appointments',
    manage_appointments: 'Book, reschedule, and cancel appointments',
    view_billing: 'View invoices, payments, and financial records',
    manage_billing: 'Generate invoices and process payments',
    manage_staff: 'Manage clinic staff, roles, and permissions',
    view_audit_logs: 'View system activity and security logs',
    manage_settings: 'Modify clinic-wide configuration and preferences',
    view_medical_records: 'View SOAP notes, treatment plans, and history',
    manage_medical_records: 'Create and sign clinical documentation',
    view_reports: 'Access clinical and financial performance reports',
    manage_reports: 'Generate and export custom data reports'
  };

  const PERMISSION_GROUPS = [
    {
      name: 'Clinical Operations',
      permissions: ['view_patients', 'manage_patients', 'view_medical_records', 'manage_medical_records']
    },
    {
      name: 'Administrative Control',
      permissions: ['view_appointments', 'manage_appointments', 'view_billing', 'manage_billing', 'view_reports', 'manage_reports']
    },
    {
      name: 'System Settings',
      permissions: ['manage_staff', 'view_audit_logs', 'manage_settings']
    }
  ];

  const { data: allUsers, isLoading } = useQuery({ 
    queryKey: ['admin', 'users'], 
    queryFn: () => users.list() 
  });

  const staffMembers = allUsers?.filter(u => u.role !== 'patient') || [];
  const filteredStaff = staffMembers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions([...ROLE_PERMISSIONS[role]]);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const specialtiesRaw = formData.get('specialties') as string;
    const specialties = specialtiesRaw ? specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const data = {
      name: formData.get('name') as string,
      email: (formData.get('email') as string).toLowerCase().trim(),
      role: selectedRole,
      permissions: selectedRole === 'admin' ? [...PERMISSIONS] : selectedPermissions,
      specialties,
      isDeleted: !allowLogin,
      workingHours: {
        start: formData.get('start') as string,
        end: formData.get('end') as string,
        days: [1, 2, 3, 4, 5]
      }
    };

    const password = formData.get('password') as string;

    try {
      if (editingStaff) {
        const updates: any = { ...data };
        if (password) updates.passwordHash = password;
        
        await users.update(editingStaff.id!, updates);
        await auditLogs.log('update', 'user', editingStaff.id, `Updated staff member ${data.name} (${data.role})`);
        toast.success('Staff member updated successfully');
      } else {
        if (!password) {
          toast.error('Password is required for new staff');
          return;
        }
        const newStaff = {
          ...data,
          passwordHash: password,
          requiresPasswordChange: true,
          createdAt: Date.now(),
          isDeleted: false
        };
        const id = await users.create(newStaff);
        await auditLogs.log('create', 'user', id, `Created staff member ${data.name} (${data.role})`);
        toast.success('Staff member created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsModalOpen(false);
      setEditingStaff(null);
    } catch (err) {
      console.error('Failed to save staff:', err);
      toast.error('Failed to save staff member');
    }
  };

  const handleToggleStatus = async (member: SystemUser) => {
    const newStatus = !member.isDeleted;
    const action = newStatus ? 'deactivate' : 'reactivate';
    
    setConfirmModal({
      isOpen: true,
      title: `${newStatus ? 'Suspend' : 'Reactivate'} Staff Member`,
      description: `You are about to ${action} ${member.name}. This will ${newStatus ? 'restrict' : 'restore'} their access to the clinic system.`,
      variant: newStatus ? 'danger' : 'info',
      confirmText: newStatus ? 'Suspend Access' : 'Restore Access',
      onConfirm: async () => {
        try {
          await users.update(member.id!, { isDeleted: newStatus });
          await auditLogs.log(newStatus ? 'delete' : 'update', 'user', member.id, `${newStatus ? 'Deactivated' : 'Reactivated'} staff member ${member.name}`);
          queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
          toast.success(`Staff member ${newStatus ? 'deactivated' : 'reactivated'}`);
        } catch (err) {
          console.error(`Failed to ${action} staff:`, err);
          toast.error(`Failed to ${action} staff member`);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const openModal = (staff: SystemUser | null = null) => {
    if (staff) {
      setEditingStaff(staff);
      setSelectedRole(staff.role as Role);
      setSelectedPermissions(staff.permissions || []);
      setAllowLogin(!staff.isDeleted);
    } else {
      setEditingStaff(null);
      setSelectedRole('therapist');
      setSelectedPermissions([...ROLE_PERMISSIONS['therapist']]);
      setAllowLogin(true);
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/5">
              Team Directory
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Operations</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-serif text-primary tracking-tighter leading-none">
            Staff <span className="italic text-primary/20">Management</span>
          </h1>
          <p className="text-primary/40 font-medium text-xl max-w-2xl leading-relaxed">
            Manage your team and their roles efficiently, 
            ensuring seamless clinic operations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => openModal()}
            className="group relative flex items-center gap-4 px-12 py-6 bg-primary text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <UserPlus size={18} className="relative z-10 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10">Add New Staff</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={24} />
          <input 
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-20 pr-8 py-7 bg-white border border-primary/5 rounded-[3rem] text-lg focus:ring-8 focus:ring-accent/5 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.04)] placeholder:text-primary/10 outline-none"
          />
        </div>
        <button className="px-10 py-7 bg-white border border-primary/5 rounded-[3rem] text-primary/40 hover:text-primary transition-all shadow-[0_40px_100px_rgba(0,0,0,0.04)] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[500px] bg-white rounded-[4rem] animate-pulse border border-primary/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredStaff.map((member, i) => (
            <motion.div 
              key={member.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden group flex flex-col hover:scale-[1.02] hover:shadow-[0_60px_120px_rgba(0,0,0,0.08)] transition-all duration-700"
            >
              <div className="p-12 space-y-10 flex-1 relative">
                <div className="absolute top-12 right-12">
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    member.isDeleted 
                      ? 'bg-error/5 text-error border-error/10' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {member.isDeleted ? 'Inactive' : 'Active'}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-8">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-[2rem] bg-primary/5 flex items-center justify-center text-primary text-4xl font-serif relative group-hover:bg-primary group-hover:text-white transition-all duration-700 shadow-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-accent text-primary flex items-center justify-center border-4 border-white shadow-xl">
                        <ShieldCheck size={18} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold text-primary tracking-tighter truncate">{member.name}</h3>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest rounded-md">
                            {member.role}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-primary/10" />
                          <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest">ID: {member.id?.toString().padStart(4, '0')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-primary/40 truncate">
                          <Mail size={12} className="shrink-0" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-surface-muted/30 p-8 rounded-[2.5rem] space-y-3 border border-primary/5 group-hover:bg-white transition-colors duration-500">
                    <div className="flex items-center gap-2 text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">
                      <Clock size={12} />
                      Operational Shift
                    </div>
                    <p className="text-base font-bold text-primary tracking-tight">
                      {member.workingHours?.start || '09:00'} — {member.workingHours?.end || '17:00'}
                    </p>
                  </div>
                  <div className="bg-surface-muted/30 p-8 rounded-[2.5rem] space-y-3 border border-primary/5 group-hover:bg-white transition-colors duration-500">
                    <div className="flex items-center gap-2 text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">
                      <Activity size={12} />
                      System Tenure
                    </div>
                    <p className="text-base font-bold text-primary tracking-tight">
                      {new Date(member.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">
                      <Zap size={12} />
                      Clinical Specialization
                    </div>
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Verified</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {(member.specialties && member.specialties.length > 0) ? (
                      member.specialties.map(s => (
                        <span key={s} className="px-5 py-2.5 bg-white text-primary text-[10px] font-black uppercase tracking-[0.1em] rounded-2xl border border-primary/10 shadow-sm group-hover:border-accent/30 transition-colors">
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="w-full p-6 bg-primary/[0.02] rounded-[2rem] border border-dashed border-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary/20 uppercase tracking-widest italic">General Clinical Practice</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-12 py-8 bg-surface-muted/20 border-t border-primary/5 flex items-center justify-between">
                <button 
                  onClick={() => openModal(member)}
                  className="flex items-center gap-3 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] hover:text-primary transition-all group/btn"
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
                    <Edit2 size={14} />
                  </div>
                  Edit Profile
                </button>
                <button 
                  onClick={() => handleToggleStatus(member)}
                  className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all group/status ${
                    member.isDeleted 
                      ? 'text-emerald-500/40 hover:text-emerald-500' 
                      : 'text-error/40 hover:text-error'
                  }`}
                >
                  <div className={`p-2 bg-white rounded-xl shadow-sm transition-all ${
                    member.isDeleted 
                      ? 'group-hover/status:bg-emerald-500 group-hover/status:text-white' 
                      : 'group-hover/status:bg-error group-hover/status:text-white'
                  }`}>
                    {member.isDeleted ? <CheckCircle2 size={14} /> : <Trash2 size={14} />}
                  </div>
                  {member.isDeleted ? 'Reactivate' : 'Suspend'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-primary/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 60, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 60, filter: 'blur(10px)' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-[90vw] lg:max-w-7xl bg-white rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.4)] overflow-hidden my-auto"
            >
              <form onSubmit={handleSave} className="flex flex-col h-full max-h-[90vh]">
                <div className="p-16 border-b border-primary/5 flex items-center justify-between shrink-0 bg-surface-muted/30 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-primary to-accent animate-gradient-x" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full">
                        Staff Details
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <h2 className="text-5xl font-serif text-primary tracking-tight">
                      {editingStaff ? 'Edit Profile' : 'Add New Staff'}
                    </h2>
                    <p className="text-primary/30 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Staff Profile & Access Settings</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-5 hover:bg-white rounded-3xl transition-all text-primary/20 hover:text-primary hover:rotate-90 group relative z-10"
                  >
                    <X size={40} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 lg:p-20 grid grid-cols-1 lg:grid-cols-12 gap-20 custom-scrollbar">
                  {/* Left Column - Identity & Credentials */}
                  <div className="lg:col-span-5 space-y-16">
                    <div className="space-y-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                          <User size={24} />
                        </div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Profile Information</h3>
                      </div>
                      
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6 text-accent">Full Legal Name</label>
                          <div className="relative group">
                            <input 
                              name="name"
                              defaultValue={editingStaff?.name}
                              required
                              placeholder="e.g. Dr. Julian Sterling"
                              className="w-full px-10 py-6 bg-surface-muted/30 border border-primary/5 rounded-[2.5rem] text-base font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 focus:border-accent/20 transition-all outline-none placeholder:text-primary/10 shadow-inner"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                              <ShieldCheck size={20} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6">Operational Role</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
                            {['admin', 'therapist', 'receptionist', 'doctor'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleChange(role as Role)}
                                className={`px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 relative overflow-hidden group/role ${
                                  selectedRole === role 
                                    ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/20' 
                                    : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                                }`}
                              >
                                <div className={`absolute inset-0 bg-white/10 translate-y-full group-hover/role:translate-y-0 transition-transform duration-500 ${selectedRole === role ? 'hidden' : ''}`} />
                                <span className="relative z-10">{role}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                          <Key size={24} />
                        </div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Access Credentials</h3>
                      </div>

                      <div className="space-y-8">
                        <div className="p-8 bg-surface-muted/50 rounded-[3rem] border border-primary/5 flex items-center justify-between group hover:bg-white transition-all duration-500">
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${allowLogin ? 'bg-emerald-50 text-emerald-500' : 'bg-primary/5 text-primary/20'}`}>
                              <ShieldCheck size={24} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Authorize Login</p>
                              <p className="text-[9px] text-primary/30 font-medium mt-1 uppercase tracking-widest">System access status</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAllowLogin(!allowLogin)}
                            className={`w-16 h-8 rounded-full transition-all relative shadow-inner ${allowLogin ? 'bg-accent' : 'bg-primary/10'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xl ${allowLogin ? 'left-9' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6 text-accent">Primary Email</label>
                          <div className="relative group">
                            <input 
                              name="email"
                              type="email"
                              defaultValue={editingStaff?.email}
                              required
                              placeholder="julian@clinic.nexus"
                              className="w-full px-10 py-6 bg-surface-muted/30 border border-primary/5 rounded-[2.5rem] text-base font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 focus:border-accent/20 transition-all outline-none placeholder:text-primary/10 shadow-inner"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                              <Mail size={20} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6 text-accent">
                            {editingStaff ? 'Update Security Key' : 'Initial Security Key'}
                          </label>
                          <div className="relative group">
                            <input 
                              name="password"
                              id="staff-password"
                              type="text"
                              required={!editingStaff}
                              placeholder={editingStaff ? 'Leave blank to keep current' : 'e.g. Nexus@2026'}
                              className="w-full px-10 py-6 bg-surface-muted/30 border border-primary/5 rounded-[2.5rem] text-base font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 focus:border-accent/20 transition-all outline-none placeholder:text-primary/10 shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const pass = Math.random().toString(36).slice(-8) + '!' + Math.floor(Math.random() * 100);
                                const input = document.getElementById('staff-password') as HTMLInputElement;
                                if (input) input.value = pass;
                              }}
                              className="absolute right-8 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl hover:scale-110 transition-all shadow-lg"
                              title="Generate Random Password"
                            >
                              <Zap size={16} />
                            </button>
                          </div>
                          {!editingStaff && (
                            <p className="text-[9px] font-bold text-accent uppercase tracking-widest ml-6 mt-2 flex items-center gap-2">
                              <AlertCircle size={10} />
                              Staff will be prompted to change this on first login
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Profile & Schedule */}
                  <div className="lg:col-span-7 space-y-16">
                    <div className="space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                            <Shield size={24} />
                          </div>
                          <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Access Permissions</h3>
                        </div>
                        <div className="px-4 py-2 bg-accent/10 rounded-full flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                          <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em]">
                            {selectedPermissions.length} Permissions Selected
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-surface-muted/30 rounded-[4rem] p-12 border border-primary/5 space-y-12">
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.name} className="space-y-6">
                            <div className="flex items-center gap-4">
                              <h4 className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] whitespace-nowrap">
                                {group.name}
                              </h4>
                              <div className="h-[1px] flex-1 bg-primary/5" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {group.permissions.map((perm) => {
                                const isDefault = ROLE_PERMISSIONS[selectedRole].includes(perm as any);
                                const isSelected = selectedRole === 'admin' || selectedPermissions.includes(perm);
                                
                                return (
                                  <button
                                    key={perm}
                                    type="button"
                                    disabled={selectedRole === 'admin'}
                                    onClick={() => togglePermission(perm)}
                                    className={`flex flex-col p-6 rounded-[2rem] transition-all duration-500 text-left border relative overflow-hidden group/perm ${
                                      isSelected 
                                        ? 'bg-white text-primary border-primary/10 shadow-xl shadow-primary/5' 
                                        : 'bg-transparent text-primary/30 border-transparent hover:bg-white/50'
                                    } ${selectedRole === 'admin' ? 'cursor-default opacity-80' : ''}`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-700 ${
                                        isSelected ? 'bg-accent text-primary rotate-0' : 'bg-primary/5 text-transparent -rotate-90'
                                      }`}>
                                        <CheckCircle2 size={16} />
                                      </div>
                                      {isDefault && selectedRole !== 'admin' && (
                                        <span className="text-[8px] font-black text-accent uppercase tracking-[0.2em] bg-accent/5 px-2 py-1 rounded-md">
                                          Core
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] block">
                                      {perm.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[9px] font-medium opacity-40 block mt-2 leading-relaxed">
                                      {PERMISSION_DESCRIPTIONS[perm]}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                          <Clock size={24} />
                        </div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Operational Window</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6">Shift Start</label>
                          <div className="relative group">
                            <input 
                              name="start"
                              type="time"
                              defaultValue={editingStaff?.workingHours?.start || '09:00'}
                              className="w-full px-10 py-6 bg-surface-muted/50 border border-transparent rounded-[2.5rem] text-xl font-mono font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 transition-all outline-none"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                              <Clock size={20} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6">Shift End</label>
                          <div className="relative group">
                            <input 
                              name="end"
                              type="time"
                              defaultValue={editingStaff?.workingHours?.end || '17:00'}
                              className="w-full px-10 py-6 bg-surface-muted/50 border border-transparent rounded-[2.5rem] text-xl font-mono font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 transition-all outline-none"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                              <Clock size={20} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-16 bg-surface-muted/30 border-t border-primary/5 flex items-center justify-end gap-10 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="text-primary/30 font-black text-[10px] uppercase tracking-[0.3em] hover:text-primary transition-colors"
                  >
                    Abort Changes
                  </button>
                  <button 
                    type="submit"
                    className="group relative flex items-center gap-4 px-20 py-7 bg-primary text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10">{editingStaff ? 'Save Changes' : 'Add Staff Member'}</span>
                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
