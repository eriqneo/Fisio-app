import React, { useEffect, useState } from 'react';
import { tenantService } from '@/db/services';
import { useAuthStore } from '@/store/useAuthStore';
import { Tenant } from '@/types';

interface TenantResolverProps {
  children: React.ReactNode;
}

export default function TenantResolver({ children }: TenantResolverProps) {
  const [isResolving, setIsResolving] = useState(true);
  const { tenant: currentTenant, logout } = useAuthStore();

  useEffect(() => {
    async function resolveTenant() {
      try {
        // 1. Try to resolve from subdomain
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        
        // Assuming subdomain format: clinic.physioflow.app or clinic.localhost
        let slug = '';
        if (parts.length >= 2 && parts[0] !== 'www' && !parts[0].includes('ais-dev')) {
          slug = parts[0];
        }

        // 2. If no subdomain, check if we have a tenant in store
        if (!slug && currentTenant) {
          slug = currentTenant.slug;
        }

        if (slug) {
          const tenant = await tenantService.findBySlug(slug);
          if (tenant) {
            // If tenant changed or wasn't set, we might need to logout if user doesn't belong to this tenant
            // But for now, we just ensure the tenant context is correct
            if (currentTenant && currentTenant.id !== tenant.id) {
              // Tenant mismatch, logout for safety
              logout();
            }
          } else {
            // Invalid tenant slug
            if (currentTenant) logout();
          }
        }
      } catch (error) {
        console.error('Tenant resolution failed:', error);
      } finally {
        setIsResolving(false);
      }
    }

    resolveTenant();
  }, [currentTenant, logout]);

  if (isResolving) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Resolving Clinic Context</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
