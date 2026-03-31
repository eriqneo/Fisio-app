import Dexie, { Table } from 'dexie';
import { 
  Tenant, User, Patient, Appointment, 
  SOAPNote, SOAPNoteDraft, TreatmentPlan, HEPProgram, 
  Notification, Feedback, WaitlistEntry, AuditLog,
  ChatMessage, ExerciseVideo,  SyncQueueItem,
  Doctor, ClinicalEncounter, MedicalHistory, PhysicalExamination,
  ClinicalImpression, DoctorOrder, Prescription, MedicalCertificate,
  ImagingRequest, ProgressReport, PatientDocument,
  BillingItem, Invoice, Receipt
} from '../types';

export class PhysioFlowDB extends Dexie {
  tenants!: Table<Tenant, number>;
  users!: Table<User, number>;
  patients!: Table<Patient, number>;
  appointments!: Table<Appointment, number>;
  soapNotes!: Table<SOAPNote, number>;
  soapNoteDrafts!: Table<SOAPNoteDraft, number>;
  treatmentPlans!: Table<TreatmentPlan, number>;
  hepPrograms!: Table<HEPProgram, number>;
  notifications!: Table<Notification, number>;
  feedback!: Table<Feedback, number>;
  waitlist!: Table<WaitlistEntry, number>;
  auditLogs!: Table<AuditLog, number>;
  chatMessages!: Table<ChatMessage, number>;
  exerciseVideos!: Table<ExerciseVideo, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  patientDocuments!: Table<PatientDocument, number>;

  // Billing Module Tables
  billingItems!: Table<BillingItem, number>;
  invoices!: Table<Invoice, number>;
  receipts!: Table<Receipt, number>;

  // Doctor Module Tables
  doctors!: Table<Doctor, number>;
  clinicalEncounters!: Table<ClinicalEncounter, number>;
  medicalHistories!: Table<MedicalHistory, number>;
  physicalExaminations!: Table<PhysicalExamination, number>;
  clinicalImpressions!: Table<ClinicalImpression, number>;
  doctorOrders!: Table<DoctorOrder, number>;
  prescriptions!: Table<Prescription, number>;
  medicalCertificates!: Table<MedicalCertificate, number>;
  imagingRequests!: Table<ImagingRequest, number>;
  progressReports!: Table<ProgressReport, number>;

  constructor() {
    super('PhysioFlowDB_v9');
    
    // Schema definition v9
    this.version(9).stores({
      tenants: '++id, &slug, name, plan, createdAt',
      users: '++id, tenantId, role, name, email, passwordHash, avatar, isDeleted',
      patients: '++id, tenantId, type, firstName, lastName, dob, phone, email, insuranceInfo, medicalHistory, consentSigned, createdAt, isDeleted',
      appointments: '++id, tenantId, patientId, therapistId, startTime, endTime, status, type, notes, isDeleted',
      soapNotes: '++id, tenantId, appointmentId, patientId, therapistId, subjective, objective, assessment, plan, createdAt, updatedAt, isDeleted',
      soapNoteDrafts: '++id, tenantId, appointmentId, patientId, therapistId, updatedAt',
      treatmentPlans: '++id, tenantId, patientId, modalities, goals, progressNotes, status, isDeleted',
      hepPrograms: '++id, tenantId, patientId, exercises, adherenceLog, isDeleted',
      notifications: '++id, tenantId, patientId, type, scheduledAt, sentAt, status, message, isDeleted',
      feedback: '++id, tenantId, patientId, sessionId, ratings, comments, submittedAt, isDeleted',
      waitlist: '++id, tenantId, patientId, preferredTherapistId, preferredDate, status, createdAt, isDeleted',
      auditLogs: '++id, tenantId, userId, action, entityType, timestamp',
      chatMessages: '++id, tenantId, senderId, receiverId, timestamp, isDeleted',
      exerciseVideos: '++id, tenantId, patientId, therapistId, createdAt, isDeleted',
      syncQueue: '++id, operation, table, timestamp, retries',
      patientDocuments: '++id, tenantId, patientId, doctorId, encounterId, uploadedAt, isDeleted',

      // Billing Module
      billingItems: '++id, tenantId, name, category, isDeleted',
      invoices: '++id, tenantId, patientId, appointmentId, invoiceNumber, status, dueDate, createdAt, isDeleted',
      receipts: '++id, tenantId, patientId, appointmentId, invoiceId, receiptNumber, paymentMethod, createdAt, isDeleted',

      // Doctor Module
      doctors: '++id, tenantId, userId, licenseNumber, isDeleted',
      clinicalEncounters: '++id, tenantId, patientId, doctorId, appointmentId, encounterDate, status, isDeleted',
      medicalHistories: '++id, tenantId, patientId, doctorId, recordedAt',
      physicalExaminations: '++id, tenantId, encounterId, patientId, doctorId, examinedAt',
      clinicalImpressions: '++id, tenantId, encounterId, patientId, doctorId',
      doctorOrders: '++id, tenantId, encounterId, patientId, doctorId, issuedAt, orderType, status',
      prescriptions: '++id, tenantId, encounterId, patientId, doctorId, issuedAt, status',
      medicalCertificates: '++id, tenantId, patientId, doctorId, encounterId, issuedAt, certificateType',
      imagingRequests: '++id, tenantId, patientId, doctorId, encounterId, requestedAt, modality, urgency',
      progressReports: '++id, tenantId, patientId, doctorId, reportDate, reportType'
    });

    // Schema definition v8
    this.version(8).stores({
      tenants: '++id, &slug, name, plan, createdAt',
      users: '++id, tenantId, role, name, email, passwordHash, avatar, isDeleted',
      patients: '++id, tenantId, type, firstName, lastName, dob, phone, email, insuranceInfo, medicalHistory, consentSigned, createdAt, isDeleted',
      appointments: '++id, tenantId, patientId, therapistId, startTime, endTime, status, type, notes, isDeleted',
      soapNotes: '++id, tenantId, appointmentId, patientId, therapistId, subjective, objective, assessment, plan, createdAt, updatedAt, isDeleted',
      soapNoteDrafts: '++id, tenantId, appointmentId, patientId, therapistId, updatedAt',
      treatmentPlans: '++id, tenantId, patientId, modalities, goals, progressNotes, status, isDeleted',
      hepPrograms: '++id, tenantId, patientId, exercises, adherenceLog, isDeleted',
      notifications: '++id, tenantId, patientId, type, scheduledAt, sentAt, status, message, isDeleted',
      feedback: '++id, tenantId, patientId, sessionId, ratings, comments, submittedAt, isDeleted',
      waitlist: '++id, tenantId, patientId, preferredTherapistId, preferredDate, status, createdAt, isDeleted',
      auditLogs: '++id, tenantId, userId, action, entityType, timestamp',
      chatMessages: '++id, tenantId, senderId, receiverId, timestamp',
      exerciseVideos: '++id, tenantId, patientId, therapistId, createdAt',
      syncQueue: '++id, operation, table, timestamp, retries',

      // Doctor Module
      doctors: '++id, tenantId, userId, licenseNumber, isDeleted',
      clinicalEncounters: '++id, tenantId, patientId, doctorId, appointmentId, encounterDate, status, isDeleted',
      medicalHistories: '++id, tenantId, patientId, doctorId, recordedAt',
      physicalExaminations: '++id, tenantId, encounterId, patientId, doctorId, examinedAt',
      clinicalImpressions: '++id, tenantId, encounterId, patientId, doctorId',
      doctorOrders: '++id, tenantId, encounterId, patientId, doctorId, issuedAt, orderType, status',
      prescriptions: '++id, tenantId, encounterId, patientId, doctorId, issuedAt, status',
      medicalCertificates: '++id, tenantId, patientId, doctorId, encounterId, issuedAt, certificateType',
      imagingRequests: '++id, tenantId, patientId, doctorId, encounterId, requestedAt, modality, urgency',
      progressReports: '++id, tenantId, patientId, doctorId, reportDate, reportType'
    });

    // Schema definition v5 (for reference/migration)
    this.version(5).stores({
      tenants: '++id, &slug, name, plan, createdAt',
      users: '++id, tenantId, role, name, email, passwordHash, avatar, isDeleted',
      patients: '++id, tenantId, type, firstName, lastName, dob, phone, email, insuranceInfo, medicalHistory, consentSigned, createdAt, isDeleted',
      appointments: '++id, tenantId, patientId, therapistId, startTime, endTime, status, type, notes, isDeleted',
      soapNotes: '++id, tenantId, appointmentId, patientId, therapistId, subjective, objective, assessment, plan, createdAt, updatedAt, isDeleted',
      soapNoteDrafts: '++id, tenantId, appointmentId, patientId, therapistId, updatedAt',
      treatmentPlans: '++id, tenantId, patientId, modalities, goals, progressNotes, status, isDeleted',
      hepPrograms: '++id, tenantId, patientId, exercises, adherenceLog, isDeleted',
      notifications: '++id, tenantId, patientId, type, scheduledAt, sentAt, status, message, isDeleted',
      feedback: '++id, tenantId, patientId, sessionId, ratings, comments, submittedAt, isDeleted',
      waitlist: '++id, tenantId, patientId, preferredTherapistId, preferredDate, status, createdAt, isDeleted',
      auditLogs: '++id, tenantId, userId, action, entityType, timestamp',
      chatMessages: '++id, tenantId, senderId, receiverId, timestamp',
      exerciseVideos: '++id, tenantId, patientId, therapistId, createdAt',
      syncQueue: '++id, operation, table, timestamp, retries'
    });
  }
}

export const db = new PhysioFlowDB();

db.open().catch(err => {
  console.error('Failed to open PhysioFlowDB:', err);
});
