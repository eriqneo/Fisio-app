import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  Dumbbell,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTenantDb } from '@/hooks/useTenantDb';
import BookingModal from '../appointments/BookingModal';
import AddPatientModal from '../patients/AddPatientModal';

const stats = [
  { label: 'Total Patients', value: '1,284', icon: Users, trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Appointments Today', value: '24', icon: Calendar, trend: '8 slots left', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Monthly Revenue', value: '$12,450', icon: TrendingUp, trend: '+8.4%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Avg. Session Time', value: '45m', icon: Clock, trend: '-2m', color: 'text-amber-600', bg: 'bg-amber-50' },
];

const adherenceData = [
  { day: 'Mon', completion: 85 },
  { day: 'Tue', completion: 72 },
  { day: 'Wed', completion: 90 },
  { day: 'Thu', completion: 65 },
  { day: 'Fri', completion: 88 },
  { day: 'Sat', completion: 45 },
  { day: 'Sun', completion: 30 },
];

export default function Dashboard() {
  const { appointments, patients } = useTenantDb();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);

  const { data: allAppointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['dashboard', 'appointments'],
    queryFn: () => appointments.list()
  });

  const { data: allPatients, isLoading: isLoadingPatients } = useQuery({
    queryKey: ['dashboard', 'patients'],
    queryFn: () => patients.list()
  });

  const today = new Date();
  const todaysAppointments = allAppointments?.filter(app => 
    isSameDay(new Date(app.startTime), today) && !app.isDeleted
  ).sort((a, b) => a.startTime - b.startTime) || [];

  const getPatientName = (patientId: number) => {
    const patient = allPatients?.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const isLoading = isLoadingAppointments || isLoadingPatients;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-primary/5 shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between mb-4">
              <div className={stat.bg + " p-3 rounded-xl " + stat.color}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-primary/40 bg-surface-muted px-2 py-1 rounded-lg uppercase tracking-wider">
                {stat.trend}
              </span>
            </div>
            <h3 className="text-primary/40 text-xs font-bold uppercase tracking-widest">{stat.label}</h3>
            <p className="text-3xl font-serif text-primary mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Adherence Chart */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <Dumbbell size={20} />
                </div>
                <h3 className="text-xl font-bold text-primary">HEP Adherence</h3>
              </div>
              <p className="text-primary/40 text-xs font-bold uppercase tracking-widest">Weekly Patient Completion Rate</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Target 80%</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adherenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#1a1a1a40' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#1a1a1a40' }} 
                  unit="%"
                />
                <Tooltip 
                  cursor={{ fill: '#f8f8f8' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    padding: '12px'
                  }}
                />
                <Bar dataKey="completion" radius={[6, 6, 0, 0]} barSize={40}>
                  {adherenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.completion >= 80 ? '#1a1a1a' : '#1a1a1a40'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-xl font-bold text-primary">Quick Actions</h3>
          </div>
          <div className="space-y-4">
            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="block w-full py-5 px-6 bg-primary text-white rounded-2xl font-bold text-xs text-center uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              New Appointment
            </button>
            <button 
              onClick={() => setIsAddPatientModalOpen(true)}
              className="block w-full py-5 px-6 bg-white text-primary border border-primary/10 rounded-2xl font-bold text-xs text-center uppercase tracking-widest hover:bg-primary/5 transition-all"
            >
              Register New Patient
            </button>
            <Link 
              to="/feedback/report"
              className="block w-full py-5 px-6 bg-white text-primary border border-primary/10 rounded-2xl font-bold text-xs text-center uppercase tracking-widest hover:bg-primary/5 transition-all"
            >
              Generate Report
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 overflow-hidden">
        <div className="p-8 border-b border-primary/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-primary">Today's Appointments</h3>
          <Link 
            to="/appointments"
            className="text-primary/40 text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors"
          >
            View Calendar
          </Link>
        </div>
        <div className="divide-y divide-primary/5">
          {isLoading ? (
            <div className="p-12 text-center text-primary/30 font-bold uppercase tracking-widest text-xs">
              Loading appointments...
            </div>
          ) : todaysAppointments.length === 0 ? (
            <div className="p-12 text-center text-primary/30 font-bold uppercase tracking-widest text-xs">
              No appointments scheduled for today
            </div>
          ) : (
            todaysAppointments.map((app) => (
              <div key={app.id} className="p-6 hover:bg-primary/5 transition-colors flex items-center gap-8">
                <div className="w-20 text-center">
                  <p className="text-sm font-bold text-primary">{format(app.startTime, 'hh:mm a')}</p>
                  <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">{app.status}</p>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-primary">{getPatientName(app.patientId)}</p>
                  <p className="text-xs text-primary/40 font-bold uppercase tracking-widest">{app.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link 
                    to={`/patients/${app.patientId}`}
                    className="px-6 py-2 bg-primary/5 text-primary rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-all"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      <AddPatientModal 
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
      />
    </div>
  );
}
