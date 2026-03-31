import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientFeatureService } from './patientService';
import { useAuthStore } from '@/store/useAuthStore';
import { Patient } from '@/types';

export function usePatients(page = 1, pageSize = 10) {
  const { tenant } = useAuthStore();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ['patients', tenant?.id, page, pageSize],
    queryFn: async () => {
      const all = await patientFeatureService.getAll(tenant!.id);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        data: all.slice(start, end),
        total: all.length,
        totalPages: Math.ceil(all.length / pageSize)
      };
    },
    enabled: !!tenant?.id,
  });

  const createPatientMutation = useMutation({
    mutationFn: (newPatient: Patient) => patientFeatureService.create(newPatient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', tenant?.id] });
    },
  });

  return {
    patients: patientsQuery.data?.data || [],
    total: patientsQuery.data?.total || 0,
    totalPages: patientsQuery.data?.totalPages || 0,
    isLoading: patientsQuery.isLoading,
    isError: patientsQuery.isError,
    createPatient: createPatientMutation.mutate,
  };
}
