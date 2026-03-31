import { useAuthStore } from '@/store/useAuthStore';
import { db } from './schema';
import { Table } from 'dexie';

/**
 * Hook to get a tenant-scoped database interface.
 * Automatically filters queries by the current tenantId.
 */
export function useTenantDb() {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id;

  if (!tenantId) {
    throw new Error('Tenant context is missing. useTenantDb must be used within an authenticated session.');
  }

  const scopeTable = <T extends { tenantId: number; isDeleted?: boolean }>(table: Table<T, number>) => {
    return {
      table,
      find: () => table.where('tenantId').equals(tenantId).and(item => !item.isDeleted),
      findById: (id: number) => table.where({ id, tenantId }).first(),
      create: (data: Omit<T, 'id' | 'tenantId'>) => {
        return table.add({ ...data, tenantId } as T);
      },
      update: (id: number, data: Partial<T>) => {
        return table.where({ id, tenantId }).modify(data as any);
      },
      softDelete: (id: number) => {
        return table.where({ id, tenantId }).modify({ isDeleted: true } as any);
      }
    };
  };

  return {
    patients: scopeTable(db.patients),
    appointments: scopeTable(db.appointments),
    soapNotes: scopeTable(db.soapNotes),
    treatmentPlans: scopeTable(db.treatmentPlans),
    hepPrograms: scopeTable(db.hepPrograms),
    notifications: scopeTable(db.notifications),
    feedback: scopeTable(db.feedback),
    users: scopeTable(db.users),
    // Tenants table is usually global or handled differently
    tenants: db.tenants
  };
}
