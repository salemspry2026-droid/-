import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'owner' | 'admin' | 'sales' | 'client' | null;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  role: UserRole;
  companyName?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
}

interface AppState {
  // Auth Slice
  user: any | null; // Firebase User
  profile: UserProfile | null;
  isAuthReady: boolean;
  isProfileLoaded: boolean;
  setUser: (user: any | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setIsAuthReady: (ready: boolean) => void;
  setIsProfileLoaded: (loaded: boolean) => void;
  clearAuth: () => void;

  // UI Slice
  activeTab: string;
  isNotificationsOpen: boolean;
  isCallRecordingsOpen: boolean;
  incomingCall: { name: string, tel: string } | null;
  selectedOrderId: string | null;
  setActiveTab: (tab: string) => void;
  setIsNotificationsOpen: (open: boolean) => void;
  setIsCallRecordingsOpen: (open: boolean) => void;
  setIncomingCall: (call: { name: string, tel: string } | null) => void;
  setSelectedOrderId: (id: string | null) => void;

  // Client Context Slice
  clientSelectedCompany: any | null;
  setClientSelectedCompany: (company: any | null) => void;

  // Notifications Slice
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // --- Auth Slice ---
      user: null,
      profile: null,
      isAuthReady: false,
      isProfileLoaded: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile, isProfileLoaded: true }),
      setIsAuthReady: (ready) => set({ isAuthReady: ready }),
      setIsProfileLoaded: (loaded) => set({ isProfileLoaded: loaded }),
      clearAuth: () => set({
        user: null,
        profile: null,
        isProfileLoaded: false,
        activeTab: 'home',
        clientSelectedCompany: null,
        unreadNotifications: 0
      }),

      // --- UI Slice ---
      activeTab: 'home',
      isNotificationsOpen: false,
      isCallRecordingsOpen: false,
      incomingCall: null,
      selectedOrderId: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
      setIsCallRecordingsOpen: (open) => set({ isCallRecordingsOpen: open }),
      setIncomingCall: (call) => set({ incomingCall: call }),
      setSelectedOrderId: (id) => set({ selectedOrderId: id }),

      // --- Client Context Slice ---
      clientSelectedCompany: null,
      setClientSelectedCompany: (company) => set({ clientSelectedCompany: company }),

      // --- Notifications Slice ---
      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        clientSelectedCompany: state.clientSelectedCompany,
      }),
    }
  )
);
