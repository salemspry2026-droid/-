import { create } from 'zustand';

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
  user: any | null; // Firebase User
  profile: UserProfile | null;
  isAuthReady: boolean;
  isProfileLoaded: boolean;
  isNotificationsOpen: boolean;
  isCallRecordingsOpen: boolean;
  incomingCall: { name: string, tel: string } | null;
  selectedOrderId: string | null;
  activeTab: string;
  clientSelectedCompany: any | null;
  setUser: (user: any | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setIsAuthReady: (ready: boolean) => void;
  setIsProfileLoaded: (loaded: boolean) => void;
  setIsNotificationsOpen: (open: boolean) => void;
  setIsCallRecordingsOpen: (open: boolean) => void;
  setIncomingCall: (call: { name: string, tel: string } | null) => void;
  setSelectedOrderId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setClientSelectedCompany: (company: any | null) => void;
  clearAuth: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  isAuthReady: false,
  isProfileLoaded: false,
  isNotificationsOpen: false,
  isCallRecordingsOpen: false,
  incomingCall: null,
  selectedOrderId: null,
  activeTab: 'home',
  clientSelectedCompany: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile, isProfileLoaded: true }),
  setIsAuthReady: (ready) => set({ isAuthReady: ready }),
  setIsProfileLoaded: (loaded) => set({ isProfileLoaded: loaded }),
  setIsNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
  setIsCallRecordingsOpen: (open) => set({ isCallRecordingsOpen: open }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setSelectedOrderId: (id) => set({ selectedOrderId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setClientSelectedCompany: (company) => set({ clientSelectedCompany: company }),
  clearAuth: () => set({ user: null, profile: null, isProfileLoaded: false, activeTab: 'home', clientSelectedCompany: null }),
}));
