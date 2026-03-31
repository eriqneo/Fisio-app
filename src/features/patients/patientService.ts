import { patientService } from '../../db/services';
import { Patient } from '../../types';

export const patientFeatureService = {
  async getAll(tenantId: number) {
    return patientService.listByTenant(tenantId);
  },

  async getById(id: number) {
    return patientService.findById(id);
  },

  async create(patient: Patient) {
    return patientService.create(patient);
  },

  async update(id: number, updates: Partial<Patient>) {
    return patientService.update(id, updates);
  },

  async delete(id: number) {
    return patientService.softDelete(id);
  }
};
