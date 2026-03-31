import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  Bell, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  BarChart2,
  Shield,
  Star,
  Database,
  CreditCard,
  ChevronDown,
  AlertCircle,
  Key,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import NotificationCenter from './NotificationCenter';
import ChatWidget from '@/features/telehealth/ChatWidget';

interface NavItem {
  icon: any;
  label: string;
  href: string;
  roles: string[];
  subItems?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', roles: ['admin', 'therapist', 'receptionist'] },
  { icon: Users, label: 'Patients', href: '/patients', roles: ['admin', 'therapist', 'receptionist'] },
  { icon: Calendar, label: 'Appointments', href: '/appointments', roles: ['admin', 'therapist', 'receptionist'] },
  { icon: ClipboardList, label: 'Clinical', href: '/clinical', roles: ['admin', 'therapist'] },
  { icon: Users, label: 'Queue', href: '/clinical/queue', roles: ['admin', 'therapist', 'receptionist'] },
  { icon: ClipboardList, label: 'Agenda', href: '/agenda', roles: ['therapist'] },
  { 
    icon: CreditCard, 
    label: 'Billing', 
    href: '/billing', 
    roles: ['admin', 'receptionist'],
    subItems: [
      { label: 'Invoices', href: '/billing/invoices' },
      { label: 'Receipts', href: '/billing/receipts' }
    ]
  },
  { icon: Bell, label: 'Notifications', href: '/notifications', roles: ['admin', 'receptionist', 'therapist', 'doctor'] },
  { icon: BarChart2, label: 'Admin Panel', href: '/admin', roles: ['admin'] },
  { icon: Users, label: 'Staff', href: '/admin/staff', roles: ['admin'] },
  { icon: Star, label: 'Feedback', href: '/admin/feedback', roles: ['admin'] },
  { icon: Database, label: 'Audit Log', href: '/admin/audit', roles: ['admin'] },
  { icon: Settings, label: 'Clinic Settings', href: '/admin/settings', roles: ['admin'] },
];

export default function PageShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const location = useLocation();
  const { user, tenant, logout, hasRole, updateUser } = useAuthStore();
  const { users } = useTenantDb();

  useEffect(() => {
    if (user?.requiresPasswordChange) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (user?.id) {
        await users.update(user.id, {
          passwordHash: newPassword,
          requiresPasswordChange: false
        });
        
        updateUser({
          ...user,
          requiresPasswordChange: false
        });
        
        setShowPasswordModal(false);
        toast.success('Password updated successfully');
      }
    } catch (err) {
      console.error('Failed to update password:', err);
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));

  const toggleSubMenu = (label: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-primary text-white transition-all duration-300 ease-in-out border-r border-white/5",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-2xl font-serif text-accent tracking-tight">PhysioFlow</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">
                {tenant?.name || 'Private Clinic'}
              </p>
            </div>
          )}
          <button 
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              if (!isCollapsed) setOpenSubMenu(null);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-auto"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || (item.subItems?.some(sub => location.pathname === sub.href));
            const isSubMenuOpen = openSubMenu === item.label;

            if (item.subItems) {
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleSubMenu(item.label)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                      isActive 
                        ? "bg-white/10 text-accent" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={20} className={cn("shrink-0", isActive ? "text-accent" : "group-hover:scale-110 transition-transform")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left animate-in slide-in-from-left-2 duration-300">{item.label}</span>
                        <ChevronDown size={14} className={cn("transition-transform duration-300", isSubMenuOpen && "rotate-180")} />
                      </>
                    )}
                  </button>
                  {!isCollapsed && isSubMenuOpen && (
                    <div className="ml-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                      {item.subItems.map((sub) => {
                        const isSubActive = location.pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            className={cn(
                              "block px-4 py-2 rounded-lg text-xs font-medium transition-all",
                              isSubActive 
                                ? "text-accent bg-white/5" 
                                : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-accent text-primary shadow-lg shadow-accent/10" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "group-hover:scale-110 transition-transform")} />
                {!isCollapsed && <span className="animate-in slide-in-from-left-2 duration-300">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl bg-white/5",
            isCollapsed && "justify-center"
          )}>
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in duration-500">
                <p className="text-sm font-bold truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider truncate">{user?.role || 'Therapist'}</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-white/40 hover:text-error hover:bg-error/10 rounded-xl transition-all group",
              isCollapsed && "justify-center px-0"
            )}
            title="Log Out"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform shrink-0" />
            {!isCollapsed && <span className="text-sm font-bold uppercase tracking-widest">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-primary/5 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search records, patients, or schedules..." 
                className="w-full pl-12 pr-4 py-2.5 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="h-8 w-px bg-primary/5" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Clinic</p>
                <p className="text-sm font-bold text-primary">{tenant?.name || 'City Physio'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-muted border border-primary/5 p-1">
                <img 
                  src="https://picsum.photos/seed/clinic/100/100" 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="h-8 w-px bg-primary/5 mx-2" />
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error/5 text-error hover:bg-error hover:text-white transition-all duration-300 font-bold text-xs uppercase tracking-widest group shadow-sm hover:shadow-error/20"
              title="Log Out"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:inline">Log Out</span>
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto bg-surface p-4 md:p-6 pb-24 md:pb-6">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-primary/5 flex items-center justify-around px-4 z-50">
          {filteredNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 transition-all",
                  isActive ? "text-accent" : "text-primary/30"
                )}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.slice(0, 4)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {user?.role === 'patient' && (
        <ChatWidget 
          otherUserId={1} // Mock therapist ID
          otherUserName="Dr. Sarah Smith" 
        />
      )}

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-primary/80 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-[0_80px_160px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <form onSubmit={handlePasswordChange} className="p-12 space-y-10">
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent mx-auto">
                    <Shield size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif text-primary tracking-tight">Security Update Required</h2>
                    <p className="text-primary/40 text-sm font-medium">To protect your account, please set a new personal password for your first login.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6">New Security Key</label>
                    <div className="relative group">
                      <input 
                        name="newPassword"
                        type="password"
                        required
                        placeholder="Minimum 8 characters"
                        className="w-full px-10 py-6 bg-surface-muted/50 border border-transparent rounded-[2rem] text-base font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 transition-all outline-none"
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                        <Key size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-6">Confirm Security Key</label>
                    <div className="relative group">
                      <input 
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="Repeat new password"
                        className="w-full px-10 py-6 bg-surface-muted/50 border border-transparent rounded-[2rem] text-base font-bold text-primary focus:bg-white focus:ring-8 focus:ring-accent/5 transition-all outline-none"
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary/10 group-focus-within:text-accent transition-colors">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-accent/5 rounded-3xl flex items-start gap-4">
                  <AlertCircle className="text-accent shrink-0 mt-1" size={20} />
                  <p className="text-xs text-accent/80 font-medium leading-relaxed">
                    Choose a strong password that you haven't used before. This will be your permanent key for all future clinical operations.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full group relative flex items-center justify-center gap-4 py-7 bg-primary text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="relative z-10">{isChangingPassword ? 'Updating Security...' : 'Update & Continue'}</span>
                  {!isChangingPassword && <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
