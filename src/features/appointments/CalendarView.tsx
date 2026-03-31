import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  startOfDay, 
  endOfDay, 
  eachDayOfInterval, 
  isSameDay, 
  parse, 
  addMinutes,
  differenceInMinutes,
  startOfHour,
  setHours,
  setMinutes
} from 'date-fns';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MoreVertical,
  Video,
  Activity,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Appointment, User as Therapist, Patient } from '@/types';
import BookingModal from './BookingModal';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
const SLOT_HEIGHT = 60; // 60px per hour

interface DraggableAppointmentProps {
  appointment: Appointment;
  patient?: Patient;
  therapist?: Therapist;
  top: number;
  height: number;
}

function DraggableAppointment({ appointment, patient, therapist, top, height }: DraggableAppointmentProps) {
  const { appointments: appointmentApi } = useTenantDb();
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: { appointment }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getStatusColor = () => {
    switch (appointment.status) {
      case 'completed': return 'bg-emerald-500';
      case 'in-progress': return 'bg-indigo-500';
      case 'cancelled': return 'bg-rose-500';
      case 'arrived': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const handleStatusUpdate = async (e: React.MouseEvent, status: Appointment['status']) => {
    e.stopPropagation();
    try {
      await appointmentApi.update(appointment.id!, { status });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(`Appointment marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getTypeConfig = () => {
    if (appointment.type.includes('Assessment')) return {
      bg: 'bg-blue-50/90',
      border: 'border-blue-200/50',
      text: 'text-blue-700',
      icon: <Stethoscope size={10} />,
      accent: 'bg-blue-500'
    };
    if (appointment.type.includes('Manual')) return {
      bg: 'bg-purple-50/90',
      border: 'border-purple-200/50',
      text: 'text-purple-700',
      icon: <Activity size={10} />,
      accent: 'bg-purple-500'
    };
    if (appointment.type.includes('Telehealth')) return {
      bg: 'bg-indigo-50/90',
      border: 'border-indigo-200/50',
      text: 'text-indigo-700',
      icon: <Video size={10} />,
      accent: 'bg-indigo-500'
    };
    return {
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200/50',
      text: 'text-emerald-700',
      icon: <Activity size={10} />,
      accent: 'bg-emerald-500'
    };
  };

  const config = getTypeConfig();
  const isToday = isSameDay(appointment.startTime, new Date());

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isDragging ? 50 : 10,
      }}
      {...attributes}
      {...listeners}
      initial={false}
      animate={{ 
        scale: isDragging ? 1.05 : 1, 
        opacity: isDragging ? 0.8 : 1,
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}
      className={cn(
        "absolute left-1 right-1 rounded-2xl p-2.5 text-[10px] border backdrop-blur-md transition-all cursor-grab active:cursor-grabbing overflow-hidden group flex flex-col gap-1.5",
        config.bg,
        config.border,
        config.text,
        isDragging && "ring-2 ring-primary/20"
      )}
    >
      {/* Status Indicator Dot */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {appointment.status === 'arrived' && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        )}
        <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor())} />
      </div>

      <div className="flex items-center gap-2 min-w-0 pr-4">
        <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 text-[9px] font-black border border-black/5">
          {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '??'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate font-black tracking-tight leading-none mb-0.5">
            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
          </span>
          <div className="flex items-center gap-1 opacity-40 font-bold tabular-nums">
            <Clock size={8} />
            <span>{format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}</span>
          </div>
        </div>
      </div>

      {height > 50 && (
        <div className="flex items-center gap-1.5 opacity-40 font-bold text-[8px] uppercase tracking-widest">
          <User size={8} />
          <span className="truncate">{therapist?.name || 'No Therapist'}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className={cn("px-2 py-0.5 rounded-full flex items-center gap-1 font-black uppercase tracking-widest text-[7px] border", config.border, "bg-white/50")}>
          {config.icon}
          <span className="truncate max-w-[60px]">{appointment.type}</span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isToday && appointment.status === 'scheduled' && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => handleStatusUpdate(e, 'arrived')}
              className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              title="Check-in"
            >
              <CheckCircle2 size={10} />
            </button>
          )}
          {isToday && appointment.status === 'arrived' && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => handleStatusUpdate(e, 'in-progress')}
              className="p-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
              title="Start Session"
            >
              <Activity size={10} />
            </button>
          )}
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 hover:bg-black/5 rounded-md"
          >
            <MoreVertical size={10} />
          </button>
        </div>
      </div>

      {/* Subtle Progress Bar if in-progress */}
      {appointment.status === 'in-progress' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '60%' }}
            className={cn("h-full", config.accent)}
          />
        </div>
      )}
    </motion.div>
  );
}

interface DroppableColumnProps {
  therapist: Therapist;
  date: Date;
  appointments: Appointment[];
  patients: Patient[];
  onSlotClick?: (date: Date, therapistId: number) => void;
}

function DroppableColumn({ therapist, date, appointments, patients, onSlotClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${therapist.id}-${format(date, 'yyyy-MM-dd')}`,
    data: { therapistId: therapist.id, date }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "relative border-r border-primary/5 min-h-full transition-all duration-500 group/col",
        isOver ? 'bg-primary/[0.03]' : 'hover:bg-primary/[0.01]'
      )}
    >
      {/* Hover Slot Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/col:opacity-100 transition-opacity duration-300">
        {HOURS.map(hour => (
          <div 
            key={hour} 
            style={{ height: `${SLOT_HEIGHT}px` }} 
            className="border-b border-primary/5 hover:bg-primary/[0.03] cursor-pointer pointer-events-auto flex items-center justify-center group/slot transition-colors"
            onClick={() => onSlotClick?.(setHours(startOfDay(date), hour), therapist.id!)}
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-primary/5 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all scale-50 group-hover/slot:scale-100">
              <Plus size={14} className="text-primary" />
            </div>
          </div>
        ))}
      </div>

      {appointments.map(apt => {
        const start = new Date(apt.startTime);
        const dayStart = setMinutes(setHours(startOfDay(start), HOURS[0]), 0);
        const top = (differenceInMinutes(start, dayStart) / 60) * SLOT_HEIGHT;
        const duration = differenceInMinutes(new Date(apt.endTime), start);
        const height = (duration / 60) * SLOT_HEIGHT;
        const patient = patients.find(p => p.id === apt.patientId);

        return (
          <DraggableAppointment 
            key={apt.id} 
            appointment={apt} 
            patient={patient}
            top={top}
            height={height}
          />
        );
      })}
    </div>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, therapistId: number } | null>(null);
  const { appointments, patients, users } = useTenantDb();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: therapistList = [] } = useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const allUsers = await users.list();
      return allUsers.filter(u => u.role === 'therapist' || u.role === 'doctor');
    }
  });

  const { data: appointmentList = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointments.list(),
  });

  const { data: patientList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start,
      end: addDays(start, 4) // Mon-Fri
    });
  }, [currentDate]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const appointment = active.data.current?.appointment as Appointment;
    const { therapistId, date } = over.data.current as { therapistId: number, date: Date };

    if (appointment && therapistId && date) {
      const originalStart = new Date(appointment.startTime);
      const duration = differenceInMinutes(new Date(appointment.endTime), originalStart);
      
      const newStart = setMinutes(setHours(startOfDay(date), originalStart.getHours()), originalStart.getMinutes());
      const newEnd = addMinutes(newStart, duration);

      await appointments.update(appointment.id!, {
        therapistId,
        startTime: newStart.getTime(),
        endTime: newEnd.getTime()
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  };

  const handleSlotClick = (date: Date, therapistId: number) => {
    setSelectedSlot({
      date: format(date, 'yyyy-MM-dd'),
      therapistId
    });
    setIsBookingModalOpen(true);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Calendar Header */}
      <div className="px-8 py-6 border-b border-primary/5 flex items-center justify-between bg-white/80 backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-12">
          <div className="flex flex-col">
            <h2 className="text-4xl font-serif text-primary tracking-tight leading-none">{format(currentDate, 'MMMM')}</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em]">{format(currentDate, 'yyyy')}</p>
              <span className="w-1 h-1 rounded-full bg-primary/10" />
              <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Week {format(currentDate, 'w')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 p-1.5 bg-surface-muted rounded-2xl border border-primary/5">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-2.5 hover:bg-white hover:shadow-xl hover:shadow-primary/5 rounded-xl transition-all text-primary/40 hover:text-primary active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-all hover:bg-white hover:shadow-xl hover:shadow-primary/5 rounded-xl active:scale-95"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-2.5 hover:bg-white hover:shadow-xl hover:shadow-primary/5 rounded-xl transition-all text-primary/40 hover:text-primary active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="hidden xl:flex items-center gap-3 px-5 py-3 bg-surface-muted rounded-2xl border border-primary/5 group focus-within:border-accent/20 transition-all w-80">
            <Search size={16} className="text-primary/20 group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search appointments..."
              className="bg-transparent border-none text-[10px] font-black text-primary uppercase tracking-widest focus:ring-0 p-0 w-full placeholder:text-primary/10"
            />
          </div>

          <div className="flex items-center gap-1 p-1.5 bg-surface-muted rounded-2xl border border-primary/5">
            <button className="px-6 py-2.5 bg-white shadow-xl shadow-primary/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary">Week</button>
            <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-all rounded-xl">Day</button>
          </div>
          
          <button 
            onClick={() => {
              setSelectedSlot(null);
              setIsBookingModalOpen(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.25rem] font-bold text-sm hover:opacity-90 transition-all shadow-2xl shadow-primary/20 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-surface-muted/10">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="min-w-[1200px]">
            {/* Days Header */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-primary/5 sticky top-0 bg-white/90 backdrop-blur-xl z-40">
              <div className="p-6 bg-surface-muted/30 border-r border-primary/5 flex items-center justify-center">
                <Clock size={18} className="text-primary/10" />
              </div>
              {weekDays.map(day => (
                <div key={day.toString()} className="p-8 text-center border-r border-primary/5 bg-surface-muted/10 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.4em] mb-3 group-hover:text-primary transition-colors relative z-10">{format(day, 'EEEE')}</p>
                  <div className="flex items-center justify-center gap-4 relative z-10">
                    <p className={cn(
                      "text-4xl font-serif tracking-tighter transition-all duration-500",
                      isSameDay(day, new Date()) ? 'text-primary scale-110' : 'text-primary/40 group-hover:text-primary'
                    )}>
                      {format(day, 'd')}
                    </p>
                    {isSameDay(day, new Date()) && (
                      <motion.div 
                        layoutId="today-indicator"
                        className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/20" 
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Therapist Avatars Header */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-primary/5 bg-white/80 backdrop-blur-md sticky top-[120px] z-30">
              <div className="border-r border-primary/5"></div>
              {weekDays.map(day => (
                <div key={day.toString()} className={`grid grid-cols-${Math.max(1, therapistList.length)} border-r border-primary/5`}>
                  {therapistList.map(therapist => (
                    <div key={therapist.id} className="p-4 flex flex-col items-center gap-2.5 border-r border-primary/5 last:border-r-0 group/therapist">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-primary/5 text-primary/40 flex items-center justify-center text-[11px] font-black border border-primary/5 shadow-sm group-hover/therapist:bg-primary group-hover/therapist:text-white transition-all duration-300">
                          {therapist.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/30 group-hover/therapist:text-primary transition-colors truncate w-full text-center">
                        {therapist.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] relative">
              {/* Current Time Indicator */}
              <div 
                className="absolute left-[100px] right-0 h-px bg-primary z-40 pointer-events-none flex items-center"
                style={{ 
                  top: `${((new Date().getHours() - HOURS[0]) * 60 + new Date().getMinutes()) / 60 * SLOT_HEIGHT}px`,
                  display: new Date().getHours() >= HOURS[0] && new Date().getHours() < HOURS[HOURS.length-1] ? 'flex' : 'none'
                }}
              >
                <div className="w-3 h-3 rounded-full bg-primary shadow-xl shadow-primary/40 -ml-1.5 border-2 border-white" />
                <div className="flex-1 h-px bg-gradient-to-r from-primary to-transparent opacity-20" />
                <div className="absolute -left-12 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg">
                  {format(new Date(), 'HH:mm')}
                </div>
              </div>

              {/* Time Labels */}
              <div className="border-r border-primary/5 bg-white/50 backdrop-blur-sm">
                {HOURS.map(hour => (
                  <div key={hour} style={{ height: `${SLOT_HEIGHT}px` }} className="p-4 text-right border-b border-primary/5 flex flex-col justify-center group/time">
                    <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest tabular-nums group-hover/time:text-primary transition-colors">
                      {format(setHours(new Date(), hour), 'h:mm')}
                    </span>
                    <span className="text-[8px] font-bold text-primary/10 uppercase tracking-widest mt-1 group-hover/time:text-primary/40 transition-colors">
                      {format(setHours(new Date(), hour), 'a')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map(day => (
                <div key={day.toString()} className="relative border-r border-primary/5 group">
                  {/* Hour lines */}
                  {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${SLOT_HEIGHT}px` }} className="border-b border-primary/5"></div>
                  ))}
                  
                  {/* Therapist Sub-columns */}
                  <div className={`absolute inset-0 grid grid-cols-${Math.max(1, therapistList.length)}`}>
                    {therapistList.map(therapist => (
                      <DroppableColumn 
                        key={therapist.id}
                        therapist={therapist}
                        date={day}
                        appointments={appointmentList.filter(a => a.therapistId === therapist.id && isSameDay(new Date(a.startTime), day))}
                        patients={patientList}
                        onSlotClick={handleSlotClick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DragOverlay>
            {/* Drag overlay would go here for better UX */}
          </DragOverlay>
        </DndContext>
      </div>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedSlot(null);
        }}
        initialData={selectedSlot ? {
          date: selectedSlot.date,
          therapistId: selectedSlot.therapistId
        } : undefined}
      />
    </div>
  );
}
