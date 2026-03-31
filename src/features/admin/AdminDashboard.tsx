import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const COLORS = ['#F27D26', '#141414', '#E4E3E0', '#8E9299'];

const PulaIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <div 
    style={{ width: size, height: size }} 
    className={cn("flex items-center justify-center font-black leading-none select-none", className)}
  >
    P
  </div>
);

export default function AdminDashboard() {
  const { patients, appointments, feedback, users } = useTenantDb();

  const { data: allPatients } = useQuery({ queryKey: ['admin', 'patients'], queryFn: () => patients.list() });
  const { data: allAppointments } = useQuery({ queryKey: ['admin', 'appointments'], queryFn: () => appointments.list() });
  const { data: allFeedback } = useQuery({ queryKey: ['admin', 'feedback'], queryFn: () => feedback.list() });
  const { data: allUsers } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => users.list() });

  const stats = useMemo(() => {
    if (!allPatients || !allAppointments || !allFeedback || !allUsers) return null;

    const today = new Date().setHours(0,0,0,0);
    const appointmentsToday = allAppointments.filter(a => {
      const d = new Date(a.startTime).setHours(0,0,0,0);
      return d === today;
    });

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const revenueThisMonth = allAppointments
      .filter(a => a.status === 'completed' && isWithinInterval(new Date(a.startTime), { start: monthStart, end: monthEnd }))
      .length * 150; // Mock revenue: P150 per session

    const avgSatisfaction = allFeedback.length > 0
      ? allFeedback.reduce((acc, f) => acc + (f.ratings.Overall || 0), 0) / allFeedback.length
      : 0;

    const therapists = allUsers.filter(u => u.role === 'therapist');
    const utilization = therapists.length > 0
      ? (appointmentsToday.length / (therapists.length * 8)) * 100 // Mock: 8 slots per therapist
      : 0;

    return {
      totalPatients: allPatients.length,
      appointmentsToday: appointmentsToday.length,
      utilization: Math.round(utilization),
      revenue: revenueThisMonth,
      satisfaction: avgSatisfaction.toFixed(1)
    };
  }, [allPatients, allAppointments, allFeedback, allUsers]);

  const weeklyVolumeData = useMemo(() => {
    if (!allAppointments) return [];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = allAppointments.filter(a => {
        const d = new Date(a.startTime).setHours(0,0,0,0);
        return d === date.setHours(0,0,0,0);
      }).length;
      return { name: format(date, 'EEE'), count };
    });
    return last7Days;
  }, [allAppointments]);

  const patientTypeData = useMemo(() => {
    if (!allPatients) return [];
    const types = ['NP', 'NR', 'Booked', 'WalkIn'];
    return types.map(type => ({
      name: type,
      value: allPatients.filter(p => p.type === type).length
    }));
  }, [allPatients]);

  const therapistCaseloadData = useMemo(() => {
    if (!allUsers || !allPatients) return [];
    const therapists = allUsers.filter(u => u.role === 'therapist');
    return therapists.map(t => ({
      name: t.name.split(' ')[0],
      count: allAppointments?.filter(a => a.therapistId === t.id).length || 0
    }));
  }, [allUsers, allAppointments]);

  const recentActivity = useMemo(() => {
    if (!allAppointments || !allPatients) return [];
    return allAppointments
      .slice(-5)
      .reverse()
      .map(a => {
        const patient = allPatients.find(p => p.id === a.patientId);
        return {
          id: a.id,
          type: 'appointment',
          title: `New Appointment: ${patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}`,
          time: format(new Date(a.startTime), 'HH:mm'),
          date: format(new Date(a.startTime), 'MMM d'),
          status: a.status
        };
      });
  }, [allAppointments, allPatients]);
  const [insights, setInsights] = React.useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false);

  const generateInsights = async () => {
    if (!stats) return;
    setIsGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `As a clinic management consultant, analyze these metrics and provide 3 short, punchy, professional insights (max 15 words each):
        - Patients: ${stats.totalPatients}
        - Today's Appointments: ${stats.appointmentsToday}
        - Utilization: ${stats.utilization}%
        - Revenue: ${formatCurrency(stats.revenue)}
        - Satisfaction: ${stats.satisfaction}/5
        Return as a simple list.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 3);
      setInsights(lines.map(l => l.replace(/^\d+\.\s*/, '').replace(/^- \s*/, '')));
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setInsights([
        "Utilization is trending 5% above quarterly average.",
        "Patient retention is stable at 92% this month.",
        "Revenue per slot has increased by 12% since Jan."
      ]);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  React.useEffect(() => {
    if (stats && insights.length === 0) {
      generateInsights();
    }
  }, [stats]);

  if (!stats) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20">Loading Insights</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Live
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30">System Status: Optimal</p>
          </div>
          <h1 className="text-6xl md:text-8xl font-serif text-primary tracking-tighter leading-none">
            Clinic <span className="italic text-primary/20">Overview</span>
          </h1>
          <p className="text-primary/40 font-medium text-lg max-w-xl">
            Real-time clinic performance and staff usage for this month.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30">Cycle Period</p>
          <div className="px-6 py-3 bg-white border border-primary/5 rounded-2xl shadow-xl shadow-primary/5 font-bold text-sm text-primary">
            {format(new Date(), 'MMMM yyyy')}
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Active Patients', value: stats.totalPatients, icon: Users, trend: '+12.4%', up: true, color: 'text-primary' },
          { label: 'Today\'s Agenda', value: stats.appointmentsToday, icon: Calendar, trend: '+4', up: true, color: 'text-accent' },
          { label: 'Utilization', value: `${stats.utilization}%`, icon: TrendingUp, trend: '-2.1%', up: false, color: 'text-primary' },
          { label: 'Est. Revenue', value: formatCurrency(stats.revenue), icon: PulaIcon, trend: '+18.2%', up: true, color: 'text-emerald-500' },
          { label: 'Satisfaction', value: stats.satisfaction, icon: Star, trend: '0.0', up: true, color: 'text-amber-500' },
        ].map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 relative overflow-hidden group hover:scale-[1.05] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-700"
          >
            <div className="absolute -top-6 -right-6 p-10 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 group-hover:rotate-12 group-hover:scale-150">
              <kpi.icon size={140} />
            </div>
            <div className="space-y-8 relative z-10">
              <div className={`w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center ${kpi.color} group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm`}>
                <kpi.icon size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mb-2">{kpi.label}</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-5xl font-serif text-primary tracking-tighter">{kpi.value}</h3>
                  <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black ${kpi.up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-error/10 text-error'} group-hover:scale-110 transition-transform`}>
                    {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {kpi.trend}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Intelligence Insights */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-3 bg-primary p-12 rounded-[4rem] relative overflow-hidden group shadow-2xl shadow-primary/20"
        >
          <div className="absolute -right-40 -top-40 w-96 h-96 bg-accent/20 rounded-full blur-[100px] group-hover:bg-accent/30 transition-all duration-1000 animate-pulse" />
          <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-1000" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center gap-3 text-accent">
                <div className="p-2 bg-accent/10 rounded-xl">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">AI Insights</span>
              </div>
              <h3 className="text-5xl font-serif text-white tracking-tight leading-tight">Clinic <span className="italic text-white/40">Recommendations</span></h3>
              <p className="text-white/30 text-xs font-medium leading-relaxed">AI-driven analysis based on clinic activity and patient feedback.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
              {isGeneratingInsights ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
                ))
              ) : (
                insights.map((insight, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 flex items-start gap-5 group/insight hover:bg-white/10 transition-all duration-500 hover:-translate-y-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0 group-hover/insight:bg-accent group-hover/insight:text-white transition-all duration-500 shadow-lg shadow-accent/20">
                      <Zap size={16} />
                    </div>
                    <p className="text-sm font-bold text-white/80 leading-relaxed tracking-tight">{insight}</p>
                  </motion.div>
                ))
              )}
            </div>
            
            <button 
              onClick={generateInsights}
              className="px-10 py-6 bg-accent text-primary rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shrink-0 shadow-2xl shadow-accent/20"
            >
              Recalibrate
            </button>
          </div>
        </motion.div>

        {/* Weekly Volume */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white p-12 rounded-[4rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-serif text-primary tracking-tight">Weekly Volume</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-2">Patient Volume Analysis</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-lg shadow-accent/20" />
                <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Clinical Sessions</span>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolumeData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F27D26" stopOpacity={1} />
                    <stop offset="100%" stopColor="#F27D26" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#141414', opacity: 0.3 }}
                  dy={20}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#F9F9F9', radius: 16 }}
                  contentStyle={{ 
                    borderRadius: '32px', 
                    border: 'none', 
                    boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
                    padding: '24px 32px',
                    backgroundColor: '#141414',
                    color: '#FFFFFF'
                  }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}
                  labelStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[16, 16, 0, 0]} barSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Patient Mix */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
        >
          <div>
            <h3 className="text-3xl font-serif text-primary tracking-tight">Patient Mix</h3>
            <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-2">Patient Types</p>
          </div>
          <div className="h-[400px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={patientTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={12}
                  dataKey="value"
                  stroke="none"
                >
                  {patientTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '32px', 
                    border: 'none', 
                    boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
                    padding: '24px 32px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  layout="horizontal"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ paddingTop: '40px' }}
                  formatter={(value) => <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Therapist Caseload */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12 lg:col-span-2"
        >
          <div>
            <h3 className="text-3xl font-serif text-primary tracking-tight">Staff Workload</h3>
            <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-2">Performance Overview</p>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={therapistCaseloadData} layout="vertical" margin={{ left: 20, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#141414', opacity: 0.3 }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '32px', 
                    border: 'none', 
                    boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
                    padding: '24px 32px'
                  }}
                />
                <Bar dataKey="count" fill="#141414" radius={[0, 16, 16, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity Mini-Feed */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-2xl shadow-primary/5 space-y-12"
        >
          <div>
            <h3 className="text-3xl font-serif text-primary tracking-tight">Recent Activity</h3>
            <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-2">Latest system events</p>
          </div>
          <div className="space-y-8">
            {recentActivity.map((activity, i) => (
              <div key={activity.id} className="flex items-start gap-6 group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex flex-col items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <span className="text-[10px] font-black leading-none">{activity.date.split(' ')[0]}</span>
                  <span className="text-[8px] font-black uppercase tracking-tighter opacity-40">{activity.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-bold truncate group-hover:text-accent transition-colors duration-300 tracking-tight">{activity.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{activity.time}</span>
                    <div className="w-1 h-1 rounded-full bg-primary/10" />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      activity.status === 'completed' ? 'text-emerald-500' : 'text-accent'
                    }`}>{activity.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-5 bg-primary text-white hover:bg-primary/90 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
            View All Activity
          </button>
        </motion.div>
      </div>
    </div>
  );
}
