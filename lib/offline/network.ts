'use client';

import { create } from 'zustand';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface NetworkState {
  status: ConnectionStatus;
  lastSyncedAt: number | null;
  pendingCount: number;
  setStatus: (status: ConnectionStatus) => void;
  setLastSyncedAt: (ts: number | null) => void;
  setPendingCount: (count: number) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  lastSyncedAt: null,
  pendingCount: 0,
  setStatus: (status) => set({ status }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function formatLastSync(ts: number | null) {
  if (!ts) return 'لم تتم المزامنة بعد';
  const diff = Date.now() - ts;
  if (diff < 15_000) return 'الآن';
  if (diff < 60_000) return 'منذ لحظات';
  if (diff < 3_600_000) return `منذ ${Math.floor(diff / 60_000)} دقيقة`;
  return new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
