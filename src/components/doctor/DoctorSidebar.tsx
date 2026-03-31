import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Stethoscope, 
  Pill, 
  FileText, 
  BarChart3, 
  Mail, 
  Settings,
  LogOut,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const SidebarItem = ({ to, icon: Icon, label, badge }: SidebarItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
      ${isActive 
        ? 'bg-doctor-accent text-doctor-sidebar font-bold shadow-lg shadow-doctor-accent/20' 
        : 'text-white/60 hover:bg-doctor-sidebar-hover hover:text-white'}
    `}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} className="transition-transform group-hover:scale-110" />
      <span className="text-sm tracking-wide">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className="bg-doctor-accent text-doctor-sidebar text-[10px] font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </NavLink>
);

export default function DoctorSidebar() {
  const { logout, user } = useAuthStore();

  return (
    <aside className="w-72 bg-doctor-sidebar h-screen flex flex-col border-r border-white/5 sticky top-0">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-doctor-accent rounded-xl flex items-center justify-center shadow-lg shadow-doctor-accent/20">
            <Stethoscope className="text-doctor-sidebar" size={24} />
          </div>
          <div>
            <h1 className="text-white font-serif text-xl leading-none">PhysioFlow</h1>
            <p className="text-doctor-accent text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Doctor Portal</p>
          </div>
        </div>

        <nav className="space-y-2">
          <SidebarItem to="/doctor" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/doctor/queue" icon={ClipboardList} label="Live Queue" badge={3} />
          <SidebarItem to="/doctor/appointments" icon={Calendar} label="Appointments" />
          <SidebarItem to="/doctor/patients" icon={Users} label="My Patients" />
          <SidebarItem to="/doctor/encounters" icon={ClipboardList} label="Encounter Records" />
          <SidebarItem to="/doctor/orders" icon={BarChart3} label="Orders & Results" />
          <SidebarItem to="/doctor/prescriptions" icon={Pill} label="Prescriptions" />
          <SidebarItem to="/doctor/certificates" icon={FileText} label="Medical Certificates" />
          <SidebarItem to="/doctor/reports" icon={BarChart3} label="Progress Reports" />
          <SidebarItem to="/doctor/referrals" icon={Mail} label="Referral Letters" />
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5">
        <div className="flex items-center gap-4 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-doctor-sidebar-hover flex items-center justify-center text-doctor-accent font-bold border border-white/10">
            {user?.name?.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">Specialist</p>
          </div>
          <NavLink to="/doctor/settings" className="text-white/20 hover:text-doctor-accent transition-colors">
            <Settings size={18} />
          </NavLink>
        </div>

        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 group font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:shadow-red-500/20"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
