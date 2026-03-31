import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTIONS = [
  { id: 'pain', text: 'Was your pain addressed during today\'s session?', type: 'boolean' },
  { id: 'explanation', text: 'Were the exercises clearly explained to you?', type: 'boolean' },
  { id: 'recommend', text: 'Would you recommend our clinic to others?', type: 'boolean' },
];

export default function SatisfactionSurvey() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { feedback, appointments, auditLogs } = useTenantDb();
  const [step, setStep] = useState(0); // 0: Overall, 1: Specifics, 2: Comments, 3: Success
  const [ratings, setRatings] = useState<Record<string, number>>({ Overall: 0 });
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState('');

  const handleFinish = async () => {
    try {
      const appt = await appointments.findById(Number(appointmentId));
      if (!appt) return;

      await feedback.create({
        patientId: appt.patientId,
        sessionId: appt.id!,
        ratings: {
          ...ratings,
          ...Object.entries(answers).reduce((acc, [key, val]) => ({ ...acc, [key]: val ? 5 : 1 }), {})
        },
        comments,
        submittedAt: Date.now()
      });

      await auditLogs.log('create', 'feedback', undefined, `Patient submitted feedback for appointment #${appointmentId}`);
      setStep(3);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 md:p-10">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-10 right-10 p-3 text-primary/20 hover:text-primary transition-colors"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-xl space-y-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-10"
            >
              <div className="space-y-4">
                <h1 className="text-4xl font-serif text-primary tracking-tight">How was your session?</h1>
                <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Overall experience rating</p>
              </div>
              
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onClick={() => {
                      setRatings({ ...ratings, Overall: star });
                      setStep(1);
                    }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      ratings.Overall === star ? 'bg-accent text-primary scale-110' : 'bg-primary/5 text-primary/20 hover:bg-primary/10'
                    }`}
                  >
                    <Star size={32} fill={ratings.Overall >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-10"
            >
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-serif text-primary">A few more details...</h2>
                <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Help us improve our care</p>
              </div>

              <div className="space-y-6">
                {QUESTIONS.map(q => (
                  <div key={q.id} className="bg-surface-muted/50 p-8 rounded-[32px] flex items-center justify-between gap-6">
                    <p className="text-sm font-bold text-primary leading-relaxed">{q.text}</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setAnswers({ ...answers, [q.id]: true })}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          answers[q.id] === true ? 'bg-emerald-500 text-white' : 'bg-white text-primary/20'
                        }`}
                      >
                        <ThumbsUp size={20} />
                      </button>
                      <button 
                        onClick={() => setAnswers({ ...answers, [q.id]: false })}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          answers[q.id] === false ? 'bg-error text-white' : 'bg-white text-primary/20'
                        }`}
                      >
                        <ThumbsDown size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-6">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                  <ChevronLeft size={16} /> Back
                </button>
                <button 
                  onClick={() => setStep(2)}
                  disabled={Object.keys(answers).length < QUESTIONS.length}
                  className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-30"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-10"
            >
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-serif text-primary">Any other thoughts?</h2>
                <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Your feedback matters</p>
              </div>

              <div className="relative">
                <textarea 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  className="w-full p-8 bg-surface-muted border-none rounded-[32px] text-lg focus:ring-2 focus:ring-accent/20 transition-all min-h-[200px] resize-none"
                />
                <MessageSquare className="absolute right-8 top-8 text-primary/10" size={32} />
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleFinish}
                  className="w-full py-6 bg-primary text-white rounded-[24px] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-primary/20"
                >
                  Submit Feedback
                </button>
                <button onClick={() => setStep(1)} className="text-[10px] font-bold text-primary/30 uppercase tracking-widest text-center">
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-serif text-primary">Thank you!</h2>
                <p className="text-primary/60 text-lg">Your feedback helps us provide better care for everyone.</p>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="px-10 py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
