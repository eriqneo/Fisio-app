import { db } from './schema';
import { 
  Patient, Appointment, SOAPNote, SOAPNoteDraft,
  TreatmentPlan, HEPProgram, Notification, 
  Feedback, User, Tenant, WaitlistEntry, AuditLog,
  ChatMessage, ExerciseVideo,
  Doctor, ClinicalEncounter, MedicalHistory, PhysicalExamination,
  ClinicalImpression, DoctorOrder, Prescription, MedicalCertificate,
  ImagingRequest, ProgressReport, EncounterBundle, PatientDocument,
  BillingItem, Invoice, Receipt
} from '../types';
import { Table } from 'dexie';
import { syncEngine } from './syncEngine';

/**
 * Generic CRUD service factory for Dexie tables with Sync support
 */
function createService<T extends { id?: number; tenantId: number; isDeleted?: boolean }>(table: Table<T, number>) {
  const tableName = table.name;
  
  return {
    create: async (data: T) => {
      const id = await table.add(data);
      await syncEngine.enqueue('create', tableName, { ...data, id });
      return id;
    },
    update: async (id: number, updates: Partial<T>) => {
      const result = await table.update(id, updates as any);
      await syncEngine.enqueue('update', tableName, { id, ...updates });
      return result;
    },
    findById: async (id: number) => {
      return await table.get(id);
    },
    listByTenant: async (tenantId: number) => {
      return await table.where('tenantId').equals(tenantId).and(item => !item.isDeleted).toArray();
    },
    softDelete: async (id: number) => {
      const result = await table.update(id, { isDeleted: true } as any);
      await syncEngine.enqueue('delete', tableName, { id });
      return result;
    },
    hardDelete: async (id: number) => {
      const result = await table.delete(id);
      await syncEngine.enqueue('delete', tableName, { id });
      return result;
    }
  };
}

export const patientService = createService<Patient>(db.patients);
export const appointmentService = {
  ...createService<Appointment>(db.appointments),
  listByPatient: async (tenantId: number, patientId: number) => {
    return await db.appointments
      .where('tenantId').equals(tenantId)
      .and(a => a.patientId === patientId && !a.isDeleted)
      .reverse()
      .sortBy('startTime');
  }
};
export const soapNoteService = {
  ...createService<SOAPNote>(db.soapNotes),
  listByPatient: async (tenantId: number, patientId: number) => {
    return await db.soapNotes
      .where('tenantId').equals(tenantId)
      .and(n => n.patientId === patientId && !n.isDeleted)
      .reverse()
      .sortBy('createdAt');
  }
};
export const soapNoteDraftService = createService<SOAPNoteDraft>(db.soapNoteDrafts);
export const treatmentPlanService = createService<TreatmentPlan>(db.treatmentPlans);
export const hepProgramService = createService<HEPProgram>(db.hepPrograms);

// Doctor Module Services
export const doctorService = createService<Doctor>(db.doctors);
export const clinicalEncounterService = {
  ...createService<ClinicalEncounter>(db.clinicalEncounters),
  listByPatient: async (tenantId: number, patientId: number) => {
    return await db.clinicalEncounters
      .where('tenantId').equals(tenantId)
      .and(e => e.patientId === patientId && !e.isDeleted)
      .reverse()
      .sortBy('encounterDate');
  }
};
export const medicalHistoryService = createService<MedicalHistory>(db.medicalHistories as any);
export const physicalExaminationService = createService<PhysicalExamination>(db.physicalExaminations as any);
export const clinicalImpressionService = createService<ClinicalImpression>(db.clinicalImpressions as any);
export const doctorOrderService = createService<DoctorOrder>(db.doctorOrders);
export const prescriptionService = createService<Prescription>(db.prescriptions);
export const medicalCertificateService = createService<MedicalCertificate>(db.medicalCertificates as any);
export const imagingRequestService = createService<ImagingRequest>(db.imagingRequests as any);
export const progressReportService = createService<ProgressReport>(db.progressReports as any);
export const patientDocumentService = createService<PatientDocument>(db.patientDocuments as any);

/**
 * Specialized service for managing complex Clinical Encounters
 */
export class DoctorEncounterService {
  /**
   * Starts a new clinical encounter
   */
  static async startEncounter(data: Omit<ClinicalEncounter, 'id' | 'status' | 'encounterDate'>) {
    const encounter: ClinicalEncounter = {
      ...data,
      status: 'Draft',
      encounterDate: Date.now(),
    };
    return await clinicalEncounterService.create(encounter);
  }

  /**
   * Saves encounter data as draft
   */
  static async saveAsDraft(encounterId: number, updates: Partial<ClinicalEncounter>) {
    const encounter = await clinicalEncounterService.findById(encounterId);
    if (!encounter || encounter.status !== 'Draft') {
      throw new Error('Can only save drafts for encounters in Draft status');
    }
    return await clinicalEncounterService.update(encounterId, updates);
  }

  /**
   * Signs and locks the encounter
   */
  static async signAndLock(encounterId: number, doctorId: number) {
    const encounter = await clinicalEncounterService.findById(encounterId);
    if (!encounter || encounter.status !== 'Draft') {
      throw new Error('Can only sign encounters in Draft status');
    }
    
    return await clinicalEncounterService.update(encounterId, {
      status: 'Signed',
      signedAt: Date.now(),
      signedBy: doctorId
    });
  }

  /**
   * Amends a signed encounter
   */
  static async amendSigned(encounterId: number, doctorId: number, reason: string, updates: Partial<ClinicalEncounter>) {
    const encounter = await clinicalEncounterService.findById(encounterId);
    if (!encounter || encounter.status === 'Draft') {
      throw new Error('Can only amend signed or already amended encounters');
    }

    const previousData = { ...encounter };
    const amendmentHistory = encounter.amendmentHistory || [];
    amendmentHistory.push({
      amendedAt: Date.now(),
      amendedBy: doctorId,
      reason,
      previousData
    });

    return await clinicalEncounterService.update(encounterId, {
      ...updates,
      status: 'Amended',
      amendmentHistory
    });
  }

  /**
   * Retrieves all linked records for an encounter in one bundle
   */
  static async getFullEncounterBundle(encounterId: number): Promise<EncounterBundle> {
    const encounter = await clinicalEncounterService.findById(encounterId);
    if (!encounter) throw new Error('Encounter not found');

    const [
      medicalHistory,
      physicalExam,
      clinicalImpression,
      orders,
      prescriptions,
      imagingRequests
    ] = await Promise.all([
      db.medicalHistories.where('patientId').equals(encounter.patientId).and(h => h.recordedAt <= encounter.encounterDate).reverse().first(),
      db.physicalExaminations.where('encounterId').equals(encounterId).first(),
      db.clinicalImpressions.where('encounterId').equals(encounterId).first(),
      db.doctorOrders.where('encounterId').equals(encounterId).toArray(),
      db.prescriptions.where('encounterId').equals(encounterId).toArray(),
      db.imagingRequests.where('encounterId').equals(encounterId).toArray()
    ]);

    return {
      encounter,
      medicalHistory,
      physicalExam,
      clinicalImpression,
      orders,
      prescriptions,
      imagingRequests
    };
  }
}

export const notificationService = {
  ...createService<Notification>(db.notifications),
  markAsRead: (id: number) => db.notifications.update(id, { isRead: true, readAt: Date.now() }),
  markAllAsRead: (tenantId: number) => db.notifications.where('tenantId').equals(tenantId).modify({ isRead: true, readAt: Date.now() }),
  getPending: (tenantId: number) => db.notifications.where('tenantId').equals(tenantId).and(n => n.status === 'pending' && n.scheduledAt <= Date.now()).toArray(),
  getRecent: (tenantId: number, limit = 10) => db.notifications.where('tenantId').equals(tenantId).reverse().limit(limit).toArray(),
  listByPatient: (tenantId: number, patientId: number) => db.notifications.where('tenantId').equals(tenantId).and(n => n.patientId === patientId).toArray(),
  schedule: (data: Omit<Notification, 'id' | 'status' | 'createdAt'>) => db.notifications.add({ ...data, status: 'pending' } as Notification)
};
export const feedbackService = createService<Feedback>(db.feedback);
export const waitlistService = createService<WaitlistEntry>(db.waitlist);
export const auditLogService = {
  ...createService<AuditLog>(db.auditLogs),
  log: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    return await db.auditLogs.add({
      ...log,
      timestamp: Date.now()
    } as AuditLog);
  },
  listRecent: (tenantId: number, limit = 50) => {
    return db.auditLogs.where('tenantId').equals(tenantId).reverse().limit(limit).toArray();
  }
};

export const chatMessageService = {
  ...createService<ChatMessage>(db.chatMessages),
  listConversation: (tenantId: number, user1Id: number, user2Id: number) => {
    return db.chatMessages
      .where('tenantId').equals(tenantId)
      .and(msg => 
        (msg.senderId === user1Id && msg.receiverId === user2Id) ||
        (msg.senderId === user2Id && msg.receiverId === user1Id)
      )
      .sortBy('timestamp');
  },
  markAsRead: (tenantId: number, senderId: number, receiverId: number) => {
    return db.chatMessages
      .where('tenantId').equals(tenantId)
      .and(msg => msg.senderId === senderId && msg.receiverId === receiverId && !msg.isRead)
      .modify({ isRead: true });
  }
};

export const exerciseVideoService = {
  ...createService<ExerciseVideo>(db.exerciseVideos),
  listByPatient: (tenantId: number, patientId: number) => {
    return db.exerciseVideos.where('tenantId').equals(tenantId).and(v => v.patientId === patientId && !v.isDeleted).toArray();
  },
  addComment: (videoId: number, comment: ExerciseVideo['comments'][0]) => {
    return db.exerciseVideos.where('id').equals(videoId).modify(v => {
      v.comments.push(comment);
    });
  }
};

export const userService = {
  ...createService<User>(db.users),
  create: async (data: User) => {
    if (data.email) {
      data.email = data.email.toLowerCase().trim();
    }
    const id = await db.users.add(data);
    await syncEngine.enqueue('create', 'users', { ...data, id });
    return id;
  },
  findByEmail: (email: string) => db.users.where('email').equals(email.toLowerCase().trim()).first()
};

export const tenantService = {
  create: (data: Tenant) => db.tenants.add(data),
  update: (id: number, updates: Partial<Tenant>) => db.tenants.update(id, updates),
  findById: (id: number) => db.tenants.get(id),
  findBySlug: (slug: string) => db.tenants.where('slug').equals(slug).first(),
  listAll: () => db.tenants.toArray()
};

export const billingItemService = createService<BillingItem>(db.billingItems);

export const invoiceService = {
  ...createService<Invoice>(db.invoices),
  listByPatient: async (tenantId: number, patientId: number) => {
    return await db.invoices
      .where('tenantId').equals(tenantId)
      .and(i => i.patientId === patientId && !i.isDeleted)
      .reverse()
      .sortBy('createdAt');
  },
  listByAppointment: async (tenantId: number, appointmentId: number) => {
    return await db.invoices
      .where('tenantId').equals(tenantId)
      .and(i => i.appointmentId === appointmentId && !i.isDeleted)
      .toArray();
  }
};

export const receiptService = {
  ...createService<Receipt>(db.receipts),
  listByPatient: async (tenantId: number, patientId: number) => {
    return await db.receipts
      .where('tenantId').equals(tenantId)
      .and(r => r.patientId === patientId && !r.isDeleted)
      .reverse()
      .sortBy('createdAt');
  },
  listByInvoice: async (tenantId: number, invoiceId: number) => {
    return await db.receipts
      .where('tenantId').equals(tenantId)
      .and(r => r.invoiceId === invoiceId && !r.isDeleted)
      .toArray();
  }
};
