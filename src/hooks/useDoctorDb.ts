import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  doctorService,
  clinicalEncounterService,
  medicalHistoryService,
  physicalExaminationService,
  clinicalImpressionService,
  doctorOrderService,
  prescriptionService,
  medicalCertificateService,
  imagingRequestService,
  progressReportService,
  patientDocumentService,
  DoctorEncounterService
} from '@/db/services';

/**
 * Hook for accessing Doctor Module services scoped by tenantId
 */
export function useDoctorDb() {
  const { tenant } = useAuthStore();

  if (!tenant) {
    throw new Error('useDoctorDb must be used within an authenticated context with a resolved tenant.');
  }

  const tenantId = tenant.id!;

  return useMemo(() => ({
    doctors: {
      create: (data: any) => doctorService.create({ ...data, tenantId }),
      update: (id: number, data: any) => doctorService.update(id, data),
      list: () => doctorService.listByTenant(tenantId),
      findById: (id: number) => doctorService.findById(id),
    },
    encounters: {
      start: (data: any) => DoctorEncounterService.startEncounter({ ...data, tenantId }),
      saveDraft: (id: number, data: any) => DoctorEncounterService.saveAsDraft(id, data),
      sign: (id: number, doctorId: number) => DoctorEncounterService.signAndLock(id, doctorId),
      amend: (id: number, doctorId: number, reason: string, data: any) => 
        DoctorEncounterService.amendSigned(id, doctorId, reason, data),
      getBundle: (id: number) => DoctorEncounterService.getFullEncounterBundle(id),
      list: () => clinicalEncounterService.listByTenant(tenantId),
      listByPatient: (patientId: number) => clinicalEncounterService.listByPatient(tenantId, patientId),
      findById: (id: number) => clinicalEncounterService.findById(id),
    },
    medicalHistories: {
      create: (data: any) => medicalHistoryService.create({ ...data, tenantId }),
      listByPatient: (patientId: number) => 
        medicalHistoryService.listByTenant(tenantId).then(list => list.filter(h => h.patientId === patientId)),
    },
    physicalExams: {
      create: (data: any) => physicalExaminationService.create({ ...data, tenantId }),
      findByEncounter: (encounterId: number) => 
        physicalExaminationService.listByTenant(tenantId).then(list => list.find(e => e.encounterId === encounterId)),
    },
    clinicalImpressions: {
      create: (data: any) => clinicalImpressionService.create({ ...data, tenantId }),
      findByEncounter: (encounterId: number) => 
        clinicalImpressionService.listByTenant(tenantId).then(list => list.find(i => i.encounterId === encounterId)),
    },
    orders: {
      create: (data: any) => doctorOrderService.create({ ...data, tenantId }),
      listByEncounter: (encounterId: number) => 
        doctorOrderService.listByTenant(tenantId).then(list => list.filter(o => o.encounterId === encounterId)),
      updateStatus: (id: number, status: any) => doctorOrderService.update(id, { status }),
    },
    prescriptions: {
      create: (data: any) => prescriptionService.create({ ...data, tenantId }),
      listByEncounter: (encounterId: number) => 
        prescriptionService.listByTenant(tenantId).then(list => list.filter(p => p.encounterId === encounterId)),
    },
    certificates: {
      create: (data: any) => medicalCertificateService.create({ ...data, tenantId }),
      listByPatient: (patientId: number) => 
        medicalCertificateService.listByTenant(tenantId).then(list => list.filter(c => c.patientId === patientId)),
    },
    imagingRequests: {
      create: (data: any) => imagingRequestService.create({ ...data, tenantId }),
      listByEncounter: (encounterId: number) => 
        imagingRequestService.listByTenant(tenantId).then(list => list.filter(r => r.encounterId === encounterId)),
    },
    progressReports: {
      create: (data: any) => progressReportService.create({ ...data, tenantId }),
      listByPatient: (patientId: number) => 
        progressReportService.listByTenant(tenantId).then(list => list.filter(r => r.patientId === patientId)),
    },
    documents: {
      create: (data: any) => patientDocumentService.create({ ...data, tenantId }),
      listByPatient: (patientId: number) => 
        patientDocumentService.listByTenant(tenantId).then(list => list.filter(d => d.patientId === patientId)),
      delete: (id: number) => patientDocumentService.softDelete(id),
    }
  }), [tenantId]);
}
