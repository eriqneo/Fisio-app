import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  Search, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  FileText, 
  Save,
  Dumbbell,
  Settings2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXERCISE_LIBRARY, Exercise } from '@/data/exercises';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 30, borderBottom: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 5 },
  exerciseCard: { marginBottom: 20, padding: 15, border: 1, borderColor: '#eee', borderRadius: 8 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  exerciseName: { fontSize: 16, fontWeight: 'bold' },
  exerciseMeta: { fontSize: 10, color: '#666' },
  exerciseDesc: { fontSize: 11, color: '#444', lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center', fontSize: 10, color: '#999' }
});

// PDF Document Component
const HEPDocument = ({ patientName, exercises }: { patientName: string, exercises: any[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Exercise Program</Text>
        <Text style={styles.subtitle}>Prepared for: {patientName} • Date: {new Date().toLocaleDateString()}</Text>
      </View>

      {exercises.map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <Text style={styles.exerciseMeta}>{ex.sets} Sets x {ex.reps} Reps • {ex.frequency || 'Daily'}</Text>
          </View>
          <Text style={styles.exerciseDesc}>{ex.description}</Text>
          {ex.notes && (
            <Text style={[styles.exerciseDesc, { marginTop: 8, fontStyle: 'italic', color: '#666' }]}>
              Notes: {ex.notes}
            </Text>
          )}
        </View>
      ))}

      <Text style={styles.footer}>PhysioFlow - Empowering Your Recovery</Text>
    </Page>
  </Document>
);

export default function HEPBuilder() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients, hepPrograms } = useTenantDb();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patients.findById(Number(patientId)),
    enabled: !!patientId
  });

  const { data: existingHep } = useQuery({
    queryKey: ['hepProgram', patientId],
    queryFn: async () => {
      const programs = await hepPrograms.list();
      return programs.find(p => p.patientId === Number(patientId));
    },
    enabled: !!patientId
  });

  // Load existing program if any
  React.useEffect(() => {
    if (existingHep) {
      setSelectedExercises(existingHep.exercises);
    }
  }, [existingHep]);

  const filteredExercises = EXERCISE_LIBRARY.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addExercise = (ex: Exercise) => {
    if (selectedExercises.find(item => item.id === ex.id)) return;
    setSelectedExercises([...selectedExercises, {
      ...ex,
      sets: ex.defaultSets,
      reps: ex.defaultReps,
      frequency: 'Daily',
      notes: ''
    }]);
  };

  const removeExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, updates: any) => {
    setSelectedExercises(selectedExercises.map(ex => 
      ex.id === id ? { ...ex, ...updates } : ex
    ));
  };

  const handleSave = async () => {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const programData = {
        patientId: Number(patientId),
        exercises: selectedExercises,
        adherenceLog: existingHep?.adherenceLog || {},
        updatedAt: Date.now()
      };

      if (existingHep) {
        await hepPrograms.update(existingHep.id!, programData);
      } else {
        await hepPrograms.create(programData);
      }

      queryClient.invalidateQueries({ queryKey: ['hepProgram', patientId] });
      navigate(`/treatment/${patientId}`);
    } catch (err) {
      console.error('Failed to save HEP', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate(`/treatment/${patientId}`)}
            className="flex items-center gap-2 text-primary/40 hover:text-primary font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Plan
          </button>
          <h1 className="text-4xl font-bold text-primary tracking-tight">HEP Builder</h1>
          <p className="text-primary/40 font-medium">
            Designing program for {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedExercises.length > 0 && (
            <PDFDownloadLink 
              document={<HEPDocument patientName={`${patient.firstName} ${patient.lastName}`} exercises={selectedExercises} />}
              fileName={`HEP_${patient.lastName}.pdf`}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-primary/10 text-primary rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary/5 transition-all"
            >
              {({ loading }) => (
                <>
                  <Download size={18} />
                  {loading ? 'Preparing...' : 'Export PDF'}
                </>
              )}
            </PDFDownloadLink>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving || selectedExercises.length === 0}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Program'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Exercise Library */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Exercise Library</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
              <input 
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3 bg-primary/5 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 w-64 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredExercises.map((ex) => (
              <motion.div 
                key={ex.id}
                layout
                className="bg-white p-4 rounded-2xl border border-primary/5 shadow-sm hover:border-primary/20 transition-all group"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                  <img 
                    src={ex.imageUrl} 
                    alt={ex.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => addExercise(ex)}
                      className="p-3 bg-white text-primary rounded-full shadow-xl"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-primary">{ex.name}</h3>
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{ex.muscleGroup}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Selected Exercises / Customization */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Program Preview</h2>
            <span className="px-3 py-1 bg-primary/5 rounded-lg text-[10px] font-bold text-primary/40 uppercase tracking-widest">
              {selectedExercises.length} Exercises
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {selectedExercises.length > 0 ? (
                selectedExercises.map((ex) => (
                  <motion.div 
                    key={ex.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-[24px] border border-primary/5 shadow-sm space-y-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                          <Dumbbell size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-primary">{ex.name}</h3>
                          <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{ex.muscleGroup}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeExercise(ex.id)}
                        className="p-2 text-primary/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Sets</label>
                        <input 
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(ex.id, { sets: Number(e.target.value) })}
                          className="w-full px-4 py-2 bg-primary/5 border-none rounded-lg text-sm font-bold text-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Reps</label>
                        <input 
                          type="number"
                          value={ex.reps}
                          onChange={(e) => updateExercise(ex.id, { reps: Number(e.target.value) })}
                          className="w-full px-4 py-2 bg-primary/5 border-none rounded-lg text-sm font-bold text-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Frequency</label>
                        <select 
                          value={ex.frequency}
                          onChange={(e) => updateExercise(ex.id, { frequency: e.target.value })}
                          className="w-full px-4 py-2 bg-primary/5 border-none rounded-lg text-sm font-bold text-primary"
                        >
                          <option>Daily</option>
                          <option>2x Daily</option>
                          <option>3x Weekly</option>
                          <option>Every Other Day</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Therapist Notes</label>
                      <textarea 
                        value={ex.notes}
                        onChange={(e) => updateExercise(ex.id, { notes: e.target.value })}
                        placeholder="Specific instructions for this exercise..."
                        className="w-full h-20 px-4 py-3 bg-primary/5 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center space-y-4 bg-primary/5 rounded-[32px] border border-dashed border-primary/10">
                  <div className="w-16 h-16 rounded-full bg-white mx-auto flex items-center justify-center text-primary/20">
                    <Plus size={32} />
                  </div>
                  <p className="text-primary/30 font-medium">Select exercises from the library to start building the program.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
