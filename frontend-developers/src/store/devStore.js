import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDevStore = create(
  persist(
    (set) => ({
      developer: null,
      token: null,
      isAuthenticated: false,

      setAuth: (developer, token) => {
        localStorage.setItem('dev_token', token);
        set({ developer, token, isAuthenticated: true });
      },

      updateDeveloper: (updates) =>
        set((state) => ({
          developer: { ...state.developer, ...updates }
        })),

      logout: () => {
        localStorage.removeItem('dev_token');
        set({ developer: null, token: null, isAuthenticated: false });
      }
    }),
    {
      name: 'dds-dev-auth',
      partialize: (state) => ({
        developer: state.developer,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useDevStore;
