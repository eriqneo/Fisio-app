import React from 'react';
import { Outlet } from 'react-router-dom';
import DoctorSidebar from './DoctorSidebar';
import { LogOut, Bell, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function DoctorLayout() {
  const { logout, user } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-primary/5 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-primary/40 uppercase tracking-[0.2em]">Doctor Workspace</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="p-2 text-primary/20 hover:text-primary transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-doctor-accent rounded-full border-2 border-white" />
            </button>
            
            <div className="h-8 w-px bg-primary/5" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-primary">{user?.name}</p>
                <p className="text-[10px] text-primary/40 uppercase tracking-widest">Specialist</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-muted border border-primary/5 flex items-center justify-center text-doctor-accent font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>

            <div className="h-8 w-px bg-primary/5" />

            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-xs uppercase tracking-widest group shadow-sm hover:shadow-red-500/20"
              title="Log Out"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:inline">Log Out</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
