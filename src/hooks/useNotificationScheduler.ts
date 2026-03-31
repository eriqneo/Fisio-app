import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { notificationService, appointmentService } from '@/db/services';

export function useNotificationScheduler() {
  const { tenant } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.id) return;

    const tenantId = tenant.id;

    const checkPending = async () => {
      try {
        // 1. Process pending notifications
        const pending = await notificationService.getPending(tenantId);
        if (pending && pending.length > 0) {
          for (const n of pending) {
            await notificationService.update(n.id!, {
              status: 'sent',
              sentAt: Date.now()
            });

            if (Notification.permission === 'granted') {
              new Notification('PhysioFlow', {
                body: n.message,
                icon: '/pwa-192x192.png'
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }

        // 2. Queue surveys for completed appointments (1 hour after end)
        const completed = await appointmentService.listByTenant(tenantId); 
        if (!completed) return;

        const now = Date.now();
        const oneHour = 3600000;

        for (const appt of completed) {
          if (appt.status === 'completed' && (now - appt.endTime) >= oneHour) {
            // Check if survey notification already exists
            const existing = await notificationService.listByPatient(tenantId, appt.patientId);
            const hasSurvey = existing && existing.some(n => n.message.includes('feedback') && Math.abs(n.scheduledAt - (appt.endTime + oneHour)) < 60000);
            
            if (!hasSurvey) {
              await notificationService.schedule({
                tenantId,
                patientId: appt.patientId,
                type: 'follow_up_due',
                message: `How was your session? Please provide your feedback: /feedback/survey/${appt.id}`,
                scheduledAt: appt.endTime + oneHour,
                isRead: false
              });
            }
          }
        }
      } catch (err) {
        console.error('Notification scheduler error:', err);
      }
    };

    // Run on load
    checkPending();

    // Also run every minute
    const interval = setInterval(checkPending, 60000);
    return () => clearInterval(interval);
  }, [tenant?.id, queryClient]);
}
