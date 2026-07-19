import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // Core user session states (persisted via localStorage)
  user: JSON.parse(localStorage.getItem('dds_user')) || null,
  jwt: localStorage.getItem('dds_jwt') || null,
  firebaseUser: null, // Initialized as null, populated on login/auth state change
  
  // Computed authentication flags
  isAuthenticated: !!localStorage.getItem('dds_jwt'),
  mobileVerified: JSON.parse(localStorage.getItem('dds_user'))?.mobileVerified || false,
  
  // Loading & error states
  loading: false,
  error: null,

  // Socket & Live state tracking
  socketConnected: false,
  onlineCount: 0,
  notifications: [],
  liveActivity: [],
  activeVerificationRequest: null, // Holds active 3rd-party auth requests

  // Temporary onboarding states
  tempVerificationCountry: { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  tempPhoneForVerification: '',
  tempConfirmationResult: null,
  unreadNotificationsCount: 0, // Unread notifications badge counter

  // Actions
  setLoading: (isLoading) => set({ loading: isLoading }),
  setError: (error) => set({ error: error ? (error.message || error) : null }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  addNotification: (notif) => set((state) => ({ notifications: [notif, ...state.notifications] })),
  addLiveActivity: (act) => set((state) => ({ liveActivity: [act, ...state.liveActivity] })),
  clearNotifications: () => set({ notifications: [] }),
  setActiveVerificationRequest: (request) => set({ activeVerificationRequest: request }),
  incrementUnreadCount: () => set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 })),
  resetUnreadCount: () => set({ unreadNotificationsCount: 0 }),
  setTempVerificationData: (data) => set((state) => ({
    tempVerificationCountry: data.country !== undefined ? data.country : state.tempVerificationCountry,
    tempPhoneForVerification: data.phone !== undefined ? data.phone : state.tempPhoneForVerification,
    tempConfirmationResult: data.confirmationResult !== undefined ? data.confirmationResult : state.tempConfirmationResult
  })),
  
  setFirebaseUser: (fbUser) => set({ firebaseUser: fbUser }),

  updateUserProfile: (updatedFields) => set((state) => {
    if (!state.user) return state;
    const mergedUser = { ...state.user, ...updatedFields };
    localStorage.setItem('dds_user', JSON.stringify(mergedUser));
    return { 
      user: mergedUser,
      mobileVerified: mergedUser.mobileVerified
    };
  }),

  loginSuccess: (user, jwt, firebaseUser = null) => {
    localStorage.setItem('dds_jwt', jwt);
    localStorage.setItem('dds_user', JSON.stringify(user));
    set({
      user,
      jwt,
      firebaseUser,
      isAuthenticated: true,
      mobileVerified: user.mobileVerified,
      loading: false,
      error: null
    });
  },

  logout: () => {
    localStorage.removeItem('dds_jwt');
    localStorage.removeItem('dds_user');
    set({
      user: null,
      jwt: null,
      firebaseUser: null,
      isAuthenticated: false,
      mobileVerified: false,
      socketConnected: false,
      onlineCount: 0,
      notifications: [],
      liveActivity: [],
      error: null
    });
  }
}));
export default useAuthStore;
