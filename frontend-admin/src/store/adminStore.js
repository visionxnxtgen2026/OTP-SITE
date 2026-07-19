import { create } from 'zustand';

// TODO: Enable secure Admin authentication before production deployment. Current bypass is for local development only.
export const useAdminStore = create((set) => ({
  admin: JSON.parse(localStorage.getItem('dds_admin_user') || 'null') || {
    email: 'admin@dds.internal',
    displayName: 'Development Admin'
  },
  token: localStorage.getItem('dds_admin_token') || 'dev_mock_token',
  isAuthenticated: true,

  setAdminAuth: (admin, token) => {
    localStorage.setItem('dds_admin_user', JSON.stringify(admin));
    localStorage.setItem('dds_admin_token', token);
    set({ admin, token, isAuthenticated: true });
  },

  logout: () => {
    // In dev mode bypass, logout simply resets to default dev state
    set({
      admin: { email: 'admin@dds.internal', displayName: 'Development Admin' },
      token: 'dev_mock_token',
      isAuthenticated: true
    });
  }
}));
