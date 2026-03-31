import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function FeedbackReport() {
  const { feedback: feedbackService } = useTenantDb();
  const { user } = useAuthStore();

  const { data: feedbackList } = useQuery({
    queryKey: ['therapist-feedback', user?.id],
    queryFn: () => feedbackService.list() // In real app, filter by therapistId
  });

  const stats = React.useMemo(() => {
    if (!feedbackList?.length) return null;
    
    const total = feedbackList.length;
    const avgOverall = feedbackList.reduce((acc, f) => acc + (f.ratings.Overall || 0), 0) / total;
    const positiveCount = feedbackList.filter(f => f.ratings.Overall >= 4).length;
    const positiveRate = (positiveCount / total) * 100;

    // Chart data
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dayStart = startOfDay(date).getTime();
      const dayEnd = dayStart + 86400000;
      
      const dayFeedback = feedbackList.filter(f => f.submittedAt >= dayStart && f.submittedAt < dayEnd);
      const avg = dayFeedback.length > 0 
        ? dayFeedback.reduce((acc, f) => acc + (f.ratings.Overall || 0), 0) / dayFeedback.length 
        : null;

      return {
        date: format(date, 'MMM d'),
        rating: avg
      };
    }).filter(d => d.rating !== null);

    return { total, avgOverall, positiveRate, chartData: last30Days };
  }, [feedbackList]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-serif text-primary tracking-tight">Performance Insights</h1>
        <p className="text-primary/40 font-bold uppercase tracking-widest text-xs mt-2">Patient satisfaction and feedback trends</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Average Rating', value: stats?.avgOverall.toFixed(1) || '0.0', icon: Star, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Positive Feedback', value: `${stats?.positiveRate.toFixed(0) || '0'}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Reviews', value: stats?.total || '0', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[40px] border border-primary/5 shadow-2xl shadow-primary/5 flex items-center gap-6"
          >
            <div className={`w-16 h-16 rounded-[24px] ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-bold text-primary mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white p-10 rounded-[48px] border border-primary/5 shadow-2xl shadow-primary/5 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-primary">Rating Trends</h3>
            <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Average patient rating over last 30 days</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-primary/5 rounded-xl text-[10px] font-bold text-primary/40 uppercase tracking-widest">Last 30 Days</div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.chartData}>
              <defs>
                <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F27D26" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141408" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#14141440' }}
                dy={10}
              />
              <YAxis 
                domain={[0, 5]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#14141440' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  border: 'none', 
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
                itemStyle={{ color: '#F27D26' }}
              />
              <Area 
                type="monotone" 
                dataKey="rating" 
                stroke="#F27D26" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorRating)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Comments */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-primary">Recent Patient Comments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbackList?.filter(f => f.comments).slice(0, 4).map((f, i) => (
            <motion.div 
              key={f.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={12} 
                      className={star <= (f.ratings.Overall || 0) ? 'text-accent fill-accent' : 'text-primary/10'} 
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">
                  {format(f.submittedAt, 'MMM d, yyyy')}
                </span>
              </div>
              <p className="text-sm text-primary/60 italic leading-relaxed">"{f.comments}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-primary/5">
                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/40">
                  <User size={14} />
                </div>
                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Verified Patient</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
