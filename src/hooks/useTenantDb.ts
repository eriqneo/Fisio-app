import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  patientService, 
  appointmentService, 
  soapNoteService, 
  soapNoteDraftService,
  treatmentPlanService, 
  hepProgramService, 
  notificationService, 
  feedbackService,
  userService,
  auditLogService,
  tenantService,
  chatMessageService,
  exerciseVideoService,
  billingItemService,
  invoiceService,
  receiptService
} from '@/db/services';

export function useTenantDb() {
  const { tenant, user } = useAuthStore();

  if (!tenant) {
    throw new Error('useTenantDb must be used within an authenticated context with a resolved tenant.');
  }

  const tenantId = tenant.id!;

  return useMemo(() => ({
    tenant: {
      get: () => tenantService.findById(tenantId),
      update: (updates: any) => tenantService.update(tenantId, updates),
    },
    patients: {
      create: (data: any) => patientService.create({ ...data, tenantId }),
      update: (id: number, data: any) => patientService.update(id, data),
      list: () => patientService.listByTenant(tenantId),
      findById: (id: number) => patientService.findById(id),
      delete: (id: number) => patientService.softDelete(id),
    },
    appointments: {
      create: (data: any) => appointmentService.create({ ...data, tenantId }),
      update: (id: number, data: any) => appointmentService.update(id, data),
      list: () => appointmentService.listByTenant(tenantId),
      listByPatient: (patientId: number) => appointmentService.listByPatient(tenantId, patientId),
      findById: (id: number) => appointmentService.findById(id),
      delete: (id: number) => appointmentService.softDelete(id),
    },
    users: {
      list: () => userService.listByTenant(tenantId),
      findById: (id: number) => userService.findById(id),
      create: (data: any) => userService.create({ ...data, tenantId }),
      update: (id: number, data: any) => userService.update(id, data),
      delete: (id: number) => userService.softDelete(id),
    },
    soapNotes: {
      create: (data: any) => soapNoteService.create({ ...data, tenantId }),
      update: (id: number, data: any) => soapNoteService.update(id, data),
      list: () => soapNoteService.listByTenant(tenantId),
      listByPatient: (patientId: number) => soapNoteService.listByPatient(tenantId, patientId),
      findById: (id: number) => soapNoteService.findById(id),
    },
    soapNoteDrafts: {
      create: (data: any) => soapNoteDraftService.create({ ...data, tenantId }),
      update: (id: number, data: any) => soapNoteDraftService.update(id, data),
      list: () => soapNoteDraftService.listByTenant(tenantId),
      findById: (id: number) => soapNoteDraftService.findById(id),
      delete: (id: number) => soapNoteDraftService.hardDelete(id),
    },
    treatmentPlans: {
      create: (data: any) => treatmentPlanService.create({ ...data, tenantId }),
      update: (id: number, data: any) => treatmentPlanService.update(id, data),
      list: () => treatmentPlanService.listByTenant(tenantId),
    },
    hepPrograms: {
      create: (data: any) => hepProgramService.create({ ...data, tenantId }),
      update: (id: number, data: any) => hepProgramService.update(id, data),
      list: () => hepProgramService.listByTenant(tenantId),
    },
    notifications: {
      create: (data: any) => notificationService.create({ ...data, tenantId, isRead: false }),
      list: () => notificationService.listByTenant(tenantId),
      markAsRead: (id: number) => notificationService.markAsRead(id),
      markAllAsRead: () => notificationService.markAllAsRead(tenantId),
      getPending: () => notificationService.getPending(tenantId),
      getRecent: (limit?: number) => notificationService.getRecent(tenantId, limit),
      listByPatient: (patientId: number) => notificationService.listByPatient(tenantId, patientId),
      schedule: (data: any) => notificationService.schedule({ ...data, tenantId }),
      update: (id: number, data: any) => notificationService.update(id, data),
    },
    feedback: {
      create: (data: any) => feedbackService.create({ ...data, tenantId }),
      list: () => feedbackService.listByTenant(tenantId),
    },
    auditLogs: {
      log: (action: any, entityType: string, entityId?: number, details?: string) => 
        auditLogService.log({
          tenantId,
          userId: user?.id!,
          userName: user?.name || 'Unknown',
          action,
          entityType,
          entityId,
          details: details || ''
        }),
      listRecent: (limit?: number) => auditLogService.listRecent(tenantId, limit),
    },
    chat: {
      send: (receiverId: number, content: string) => 
        chatMessageService.create({
          tenantId,
          senderId: user?.id!,
          receiverId,
          content,
          timestamp: Date.now(),
          isRead: false
        }),
      listConversation: (otherUserId: number) => 
        chatMessageService.listConversation(tenantId, user?.id!, otherUserId),
      markAsRead: (senderId: number) => 
        chatMessageService.markAsRead(tenantId, senderId, user?.id!),
    },
    exerciseVideos: {
      upload: (data: any) => exerciseVideoService.create({ ...data, tenantId, createdAt: Date.now(), comments: [] }),
      listByPatient: (patientId: number) => exerciseVideoService.listByPatient(tenantId, patientId),
      addComment: (videoId: number, text: string, timestamp: number) => 
        exerciseVideoService.addComment(videoId, {
          timestamp,
          text,
          authorId: user?.id!,
          authorName: user?.name || 'Unknown',
          createdAt: Date.now()
        }),
      findById: (id: number) => exerciseVideoService.findById(id),
    },
    billing: {
      items: {
        create: (data: any) => billingItemService.create({ ...data, tenantId }),
        update: (id: number, data: any) => billingItemService.update(id, data),
        list: () => billingItemService.listByTenant(tenantId),
        delete: (id: number) => billingItemService.softDelete(id),
      },
      invoices: {
        create: (data: any) => invoiceService.create({ ...data, tenantId, createdAt: Date.now() }),
        update: (id: number, data: any) => invoiceService.update(id, data),
        list: () => invoiceService.listByTenant(tenantId),
        listByPatient: (patientId: number) => invoiceService.listByPatient(tenantId, patientId),
        listByAppointment: (appointmentId: number) => invoiceService.listByAppointment(tenantId, appointmentId),
        findById: (id: number) => invoiceService.findById(id),
        delete: (id: number) => invoiceService.softDelete(id),
      },
      receipts: {
        create: (data: any) => receiptService.create({ ...data, tenantId, createdAt: Date.now() }),
        update: (id: number, data: any) => receiptService.update(id, data),
        list: () => receiptService.listByTenant(tenantId),
        listByPatient: (patientId: number) => receiptService.listByPatient(tenantId, patientId),
        listByInvoice: (invoiceId: number) => receiptService.listByInvoice(tenantId, invoiceId),
        findById: (id: number) => receiptService.findById(id),
        delete: (id: number) => receiptService.softDelete(id),
      }
    }
  }), [tenantId, user?.id, user?.name]);
}
