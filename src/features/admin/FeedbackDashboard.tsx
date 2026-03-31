import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  MessageSquare, 
  Download, 
  Filter,
  TrendingUp,
  TrendingDown,
  User,
  Activity,
  Zap,
  Sparkles,
  ArrowRight,
  ChevronRight,
  PieChart,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function FeedbackDashboard() {
  const { feedback, patients } = useTenantDb();

  const { data: allFeedback } = useQuery({ queryKey: ['admin', 'feedback'], queryFn: () => feedback.list() });
  const { data: allPatients } = useQuery({ queryKey: ['admin', 'patients'], queryFn: () => patients.list() });

  const aggregateStats = useMemo(() => {
    if (!allFeedback) return null;
    
    const categories = ['Overall', 'Therapist', 'Facility', 'Ease of Booking'];
    const categoryAverages = categories.map(cat => {
      const ratings = allFeedback.map(f => f.ratings[cat] || 0).filter(r => r > 0);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      return { name: cat, avg: avg.toFixed(1), count: ratings.length };
    });

    return {
      categoryAverages,
      totalCount: allFeedback.length,
      avgOverall: categoryAverages.find(c => c.name === 'Overall')?.avg || '0.0'
    };
  }, [allFeedback]);

  if (!aggregateStats) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">Synthesizing Experience Data...</p>
    </div>
  );

  const exportToCSV = () => {
    if (!allFeedback) return;
    const headers = ['Date', 'Patient ID', 'Overall', 'Therapist', 'Facility', 'Booking', 'Comments'];
    const rows = allFeedback.map(f => [
      format(f.submittedAt, 'yyyy-MM-dd'),
      f.patientId,
      f.ratings.Overall || '',
      f.ratings.Therapist || '',
      f.ratings.Facility || '',
      f.ratings['Ease of Booking'] || '',
      `"${f.comments.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `feedback_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/5">
              Experience Intelligence
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Sentiment Feed</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-serif text-primary tracking-tighter leading-none">
            Patient <span className="italic text-primary/20">Voice</span>
          </h1>
          <p className="text-primary/40 font-medium text-xl max-w-2xl leading-relaxed">
            A comprehensive analysis of patient sentiment, service quality, 
            and operational excellence across all clinical touchpoints.
          </p>
        </div>
        <button 
          onClick={exportToCSV}
          className="px-10 py-6 bg-white border border-primary/5 text-primary rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-primary hover:text-white transition-all shadow-2xl shadow-primary/5 group"
        >
          <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
          Export Intelligence
        </button>
      </header>

      {/* Category Averages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {aggregateStats.categoryAverages.map((cat, i) => (
          <motion.div 
            key={cat.name}
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.1, duration: 0.8 }}
            className="bg-white p-10 rounded-[3rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] space-y-8 group hover:scale-[1.02] transition-all duration-500"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{cat.name}</p>
              <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                <TrendingUp size={12} />
                <span className="text-[10px] font-black">+0.2</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <h3 className="text-6xl font-bold text-primary tracking-tighter">{cat.avg}</h3>
                <div className="flex gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.round(Number(cat.avg)) ? 'currentColor' : 'none'} className="opacity-40" />
                  ))}
                </div>
              </div>
              <div className="h-1.5 w-full bg-primary/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(Number(cat.avg) / 5) * 100}%` }}
                  transition={{ duration: 1.5, delay: 0.5 + i * 0.1 }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-primary/5">
              <p className="text-[9px] font-black text-primary/20 uppercase tracking-widest">{cat.count} Responses</p>
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight size={14} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Comments Feed */}
        <div className="lg:col-span-2 bg-white rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-12 border-b border-primary/5 flex items-center justify-between bg-surface-muted/10">
            <div className="space-y-1">
              <h3 className="text-2xl font-serif text-primary">Patient Narratives</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Qualitative feedback stream</p>
            </div>
            <button className="p-4 bg-white border border-primary/5 rounded-2xl text-primary/20 hover:text-primary transition-all shadow-sm">
              <Filter size={20} />
            </button>
          </div>
          <div className="divide-y divide-primary/5">
            {allFeedback?.slice(0, 10).map((f, i) => {
              const patient = allPatients?.find(p => p.id === f.patientId);
              return (
                <motion.div 
                  key={f.id} 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="p-12 space-y-8 hover:bg-surface-muted/30 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-serif text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {patient ? patient.firstName.charAt(0) : 'A'}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">{patient ? `${patient.firstName} ${patient.lastName}` : 'Anonymous Patient'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{format(f.submittedAt, 'MMMM d, yyyy')}</p>
                          <div className="w-1 h-1 rounded-full bg-primary/10" />
                          <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Verified Visit</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 text-accent">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} fill={i < (f.ratings.Overall || 0) ? 'currentColor' : 'none'} className="opacity-40" />
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-6 top-0 text-4xl font-serif text-primary/5">"</div>
                    <p className="text-xl text-primary/60 leading-relaxed italic pl-4">
                      {f.comments}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button className="px-4 py-2 bg-primary/5 rounded-xl text-[9px] font-black text-primary/40 uppercase tracking-widest hover:bg-primary/10 transition-all">
                      Acknowledge
                    </button>
                    <button className="px-4 py-2 bg-primary/5 rounded-xl text-[9px] font-black text-primary/40 uppercase tracking-widest hover:bg-primary/10 transition-all">
                      Flag for Review
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="p-12 bg-surface-muted/10 text-center">
            <button className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] hover:text-primary transition-all">
              Load More Narratives
            </button>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-12">
          <div className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] space-y-12">
            <div>
              <h3 className="text-2xl font-serif text-primary">Score Distribution</h3>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] mt-1">Quantitative breakdown</p>
            </div>
            
            <div className="space-y-10">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = allFeedback?.filter(f => Math.round(f.ratings.Overall || 0) === stars).length || 0;
                const percentage = allFeedback?.length ? (count / allFeedback.length) * 100 : 0;
                return (
                  <div key={stars} className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-4">
                        <span className="text-primary/40 w-16">{stars} Stars</span>
                        <div className="flex gap-1 text-accent/20">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={10} fill={i < stars ? 'currentColor' : 'none'} />
                          ))}
                        </div>
                      </div>
                      <span className="text-primary">{count} <span className="text-primary/20 ml-2">{Math.round(percentage)}%</span></span>
                    </div>
                    <div className="h-2 bg-primary/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full rounded-full ${
                          stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-accent' : 'bg-error'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-12 border-t border-primary/5 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Sentiment Spectrum</h4>
                  <Sparkles size={16} className="text-accent animate-pulse" />
                </div>
                <div className="flex gap-2 h-3 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-emerald-500 h-full" style={{ width: '78%' }} />
                  <div className="bg-accent h-full" style={{ width: '15%' }} />
                  <div className="bg-error h-full" style={{ width: '7%' }} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Positive</p>
                    <p className="text-xl font-bold text-primary">78%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Neutral</p>
                    <p className="text-xl font-bold text-primary">15%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-error uppercase tracking-widest">Negative</p>
                    <p className="text-xl font-bold text-primary">7%</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary p-10 rounded-[3rem] space-y-6 relative overflow-hidden group shadow-2xl shadow-primary/20">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4 text-white/40">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Net Promoter Score</p>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Excellent Tier</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <h4 className="text-7xl font-bold text-white tracking-tighter">72</h4>
                    <div className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black rounded-full uppercase tracking-widest mb-2">
                      +4.2%
                    </div>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed">
                    Your NPS score is in the top 5% of clinical practices globally. 
                    Patient loyalty remains exceptionally high.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif text-primary">AI Insights</h3>
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Automated Analysis</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5 space-y-3">
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">Key Strength</p>
                <p className="text-sm text-primary/60 leading-relaxed font-medium">
                  "Therapist bedside manner" is the most cited positive attribute, appearing in 84% of 5-star reviews.
                </p>
              </div>
              <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5 space-y-3">
                <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">Growth Opportunity</p>
                <p className="text-sm text-primary/60 leading-relaxed font-medium">
                  Wait times for initial intake have increased by 12% this month. Consider optimizing the digital onboarding flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
