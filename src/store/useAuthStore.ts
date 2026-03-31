import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Tenant } from '../types';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  hasRole: (role: User['role'] | User['role'][]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, tenant, token) => {
        set({ user, tenant, token, isAuthenticated: true });
        sessionStorage.setItem('pf_token', token);
      },

      updateUser: (user) => set({ user }),

      logout: () => {
        set({ user: null, tenant: null, token: null, isAuthenticated: false });
        sessionStorage.removeItem('pf_token');
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },
    }),
    {
      name: 'physioflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
