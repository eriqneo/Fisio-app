import React, { useEffect, Suspense, lazy } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { DashboardSkeleton, PatientListSkeleton, ProfileSkeleton } from './components/pwa/LoadingSkeleton';
import OfflineBanner from './components/pwa/OfflineBanner';
import InstallPrompt from './components/pwa/InstallPrompt';

// Lazy load features
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const PatientPortalDashboard = lazy(() => import('./features/patients/PatientPortalDashboard'));
const PatientDashboard = lazy(() => import('./features/patients/PatientDashboard'));
const PatientProfilePage = lazy(() => import('./features/patients/PatientProfilePage'));
const IntakeForm = lazy(() => import('./features/patients/IntakeForm'));
const CalendarView = lazy(() => import('./features/appointments/CalendarView'));
const TherapistScheduleView = lazy(() => import('./features/appointments/TherapistScheduleView'));
const ReceptionCheckIn = lazy(() => import('./features/clinical/ReceptionCheckIn'));
const QueueBoard = lazy(() => import('./features/clinical/QueueBoard'));
const PhysioSOAPEditor = lazy(() => import('./features/clinical/PhysioSOAPEditor'));
const TreatmentPlanPage = lazy(() => import('./features/treatment/TreatmentPlanPage'));
const SessionLog = lazy(() => import('./features/treatment/SessionLog'));
const HEPBuilder = lazy(() => import('./features/treatment/HEPBuilder'));
const HEPPatientView = lazy(() => import('./features/treatment/HEPPatientView'));
const NotificationSettingsPage = lazy(() => import('./features/notifications/NotificationSettingsPage'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const StaffManagement = lazy(() => import('./features/admin/StaffManagement'));
const FeedbackDashboard = lazy(() => import('./features/admin/FeedbackDashboard'));
const AuditLog = lazy(() => import('./features/admin/AuditLog'));
const TenantSettingsPage = lazy(() => import('./features/admin/TenantSettingsPage'));
const TelehealthRoom = lazy(() => import('./features/telehealth/TelehealthRoom'));
const SatisfactionSurvey = lazy(() => import('./features/feedback/SatisfactionSurvey'));
const FeedbackReport = lazy(() => import('./features/feedback/FeedbackReport'));
const DesignTokens = lazy(() => import('./components/DesignTokens'));
const DoctorDashboard = lazy(() => import('./features/doctor/DoctorDashboard'));
const MedicalHistoryWizard = lazy(() => import('./features/doctor/MedicalHistoryWizard'));
const DoctorLayout = lazy(() => import('./components/doctor/DoctorLayout'));
const PatientList = lazy(() => import('./features/patients/PatientList'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const BillingDashboard = lazy(() => import('./features/billing/BillingDashboard'));

import ProtectedRoute from './features/auth/ProtectedRoute';
import TenantResolver from './features/auth/TenantResolver';
import { createDemoTenant } from './db/seed';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppInitializer() {
  useNotificationScheduler();
  return null;
}

function DashboardSwitcher() {
  const { user } = useAuthStore();
  if (user?.role === 'patient') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <PatientPortalDashboard />
      </Suspense>
    );
  }
  if (user?.role === 'doctor') {
    return <Navigate to="/doctor" replace />;
  }
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    createDemoTenant();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <TenantResolver>
        <AppInitializer />
        <Router>
          <OfflineBanner />
          <InstallPrompt />
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/intake/:tenantSlug" element={<IntakeForm />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardSwitcher />} />
                <Route path="patients" element={
                  <Suspense fallback={<PatientListSkeleton />}>
                    <PatientList />
                  </Suspense>
                } />
                <Route path="patients/:id" element={
                  <Suspense fallback={<ProfileSkeleton />}>
                    <PatientProfilePage />
                  </Suspense>
                } />
                <Route path="appointments" element={<CalendarView />} />
                <Route path="agenda" element={<TherapistScheduleView />} />
                <Route path="clinical" element={<ReceptionCheckIn />} />
                <Route path="clinical/queue" element={<QueueBoard />} />
                <Route path="clinical/note" element={<PhysioSOAPEditor />} />
                <Route path="clinical/new" element={<PhysioSOAPEditor />} />
                <Route path="treatment/:patientId" element={<TreatmentPlanPage />} />
                <Route path="treatment/:patientId/log" element={<SessionLog />} />
                <Route path="treatment/:patientId/hep" element={<HEPBuilder />} />
                <Route path="hep/:patientId" element={<HEPPatientView />} />
                <Route path="patients/:patientId/notifications" element={<NotificationSettingsPage />} />
                
                {/* Admin Routes */}
                <Route path="admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="admin/staff" element={<ProtectedRoute roles={['admin']}><StaffManagement /></ProtectedRoute>} />
                <Route path="admin/feedback" element={<ProtectedRoute roles={['admin']}><FeedbackDashboard /></ProtectedRoute>} />
                <Route path="admin/audit" element={<ProtectedRoute roles={['admin']}><AuditLog /></ProtectedRoute>} />
                <Route path="admin/settings" element={<ProtectedRoute roles={['admin']}><TenantSettingsPage /></ProtectedRoute>} />
                
                {/* Billing Routes */}
                <Route path="billing" element={<ProtectedRoute roles={['admin', 'receptionist']}><BillingDashboard /></ProtectedRoute>} />
                <Route path="billing/:type" element={<ProtectedRoute roles={['admin', 'receptionist']}><BillingDashboard /></ProtectedRoute>} />

                {/* Telehealth & Feedback */}
                <Route path="telehealth/:appointmentId" element={<ProtectedRoute><TelehealthRoom /></ProtectedRoute>} />
                <Route path="feedback/survey/:appointmentId" element={<SatisfactionSurvey />} />
                <Route path="feedback/report" element={<ProtectedRoute roles={['admin', 'therapist']}><FeedbackReport /></ProtectedRoute>} />
                
                <Route path="design-system" element={<DesignTokens />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<div className="p-4 bg-white rounded-xl border border-primary/5 shadow-xl shadow-primary/5">Settings Placeholder</div>} />
              </Route>
              
              <Route path="/doctor" element={
                <ProtectedRoute roles={['doctor']}>
                  <DoctorLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DoctorDashboard />} />
                <Route path="queue" element={<QueueBoard />} />
                <Route path="appointments" element={<CalendarView />} />
                <Route path="patients" element={<PatientList />} />
                <Route path="encounters/:id/history" element={
                  <Suspense fallback={<div className="p-12 text-center text-primary/30">Loading Medical History Wizard...</div>}>
                    <MedicalHistoryWizard 
                      patientId={1} 
                      encounterId={1} 
                      onComplete={() => console.log('Proceed to Physical Exam')} 
                    />
                  </Suspense>
                } />
                <Route path="encounters" element={<div className="p-10">Doctor Encounters Placeholder</div>} />
                <Route path="orders" element={<div className="p-10">Doctor Orders Placeholder</div>} />
                <Route path="prescriptions" element={<div className="p-10">Doctor Prescriptions Placeholder</div>} />
                <Route path="certificates" element={<div className="p-10">Doctor Certificates Placeholder</div>} />
                <Route path="reports" element={<div className="p-10">Doctor Reports Placeholder</div>} />
                <Route path="referrals" element={<div className="p-10">Doctor Referrals Placeholder</div>} />
                <Route path="settings" element={<div className="p-10">Doctor Settings Placeholder</div>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </TenantResolver>
    </QueryClientProvider>
  );
}
