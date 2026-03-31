import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  UserPlus, 
  CalendarCheck, 
  UserCheck,
  LayoutGrid,
  List,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery } from '@tanstack/react-query';
import PatientCard from './PatientCard';
import AddPatientModal from './AddPatientModal';
import BookingModal from '../appointments/BookingModal';
import { Patient } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';

const COLUMNS = [
  { id: 'NP', title: 'New Patients', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'NR', title: 'New Referrals', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'Booked', title: 'Booked', icon: CalendarCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'WalkIn', title: 'Walk-ins', icon: UserCheck, color: 'text-orange-500', bg: 'bg-orange-50' },
];

export default function PatientDashboard() {
  const { patients } = useTenantDb();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPatientForBooking, setSelectedPatientForBooking] = useState<Patient | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');

  const { data: patientList = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const filteredPatients = useMemo(() => {
    return patientList.filter(p => {
      const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [patientList, searchQuery, filterType]);

  const groupedPatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {
      NP: [],
      NR: [],
      Booked: [],
      WalkIn: [],
    };
    filteredPatients.forEach(p => {
      if (groups[p.type]) groups[p.type].push(p);
    });
    return groups;
  }, [filteredPatients]);

  // Virtualization for List View
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredPatients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of a list item
    overscan: 5,
  });

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif text-primary">Patient Management</h1>
          <p className="text-primary/40 text-sm font-medium uppercase tracking-widest mt-1">
            {patientList.length} Total Patients Registered
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-primary/5 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-primary text-white shadow-lg' : 'text-primary/40 hover:text-primary'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-primary/40 hover:text-primary'}`}
            >
              <List size={20} />
            </button>
          </div>

          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or ID..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-primary/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm shadow-primary/5"
            />
          </div>
          
          <div className="relative">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none pl-10 pr-10 py-3 bg-white border border-primary/5 rounded-2xl text-sm font-bold text-primary/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm shadow-primary/5"
            >
              <option value="all">All Types</option>
              <option value="NP">New Patients</option>
              <option value="NR">New Referrals</option>
              <option value="Booked">Booked</option>
              <option value="WalkIn">Walk-ins</option>
            </select>
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20 pointer-events-none" />
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${col.bg} ${col.color}`}>
                    <col.icon size={18} />
                  </div>
                  <h3 className="font-bold text-primary text-sm">{col.title}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-surface-muted text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                  {groupedPatients[col.id]?.length || 0}
                </span>
              </div>

              <div className="flex-1 bg-surface-muted/30 rounded-3xl p-3 space-y-4 border border-primary/5">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <div className="w-6 h-6 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">Loading...</p>
                  </div>
                ) : groupedPatients[col.id]?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-6">
                    <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">No patients in this stage</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {groupedPatients[col.id].map((patient) => (
                      <PatientCard 
                        key={patient.id} 
                        patient={patient} 
                        onCheckIn={(id) => console.log('Check-in', id)}
                        onBook={(p) => {
                          setSelectedPatientForBooking(p);
                          setIsBookingModalOpen(true);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          ref={parentRef}
          className="h-[600px] overflow-auto bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const patient = filteredPatients[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-6 py-2"
                >
                  <div className="bg-surface-muted/30 p-4 rounded-2xl border border-primary/5 flex items-center justify-between hover:bg-surface-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{patient.firstName} {patient.lastName}</h4>
                        <p className="text-xs text-primary/40">{patient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">Type</p>
                        <p className="text-xs font-bold text-primary">{patient.type}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedPatientForBooking(patient);
                          setIsBookingModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all"
                      >
                        <Calendar size={14} />
                        Book
                      </button>
                      <Link 
                        to={`/patients/${patient.id}`}
                        className="p-2 hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        <ChevronDown size={16} className="text-primary/20 -rotate-90" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedPatientForBooking(null);
        }}
        patientId={selectedPatientForBooking?.id}
      />
    </div>
  );
}
