'use client';

import { enableNetwork, waitForPendingWrites } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { flushWriteQueue, refreshPendingCount } from './writeQueue';
import { useNetworkStore } from './network';

let started = false;

async function processQueuedWrites() {
  await flushWriteQueue(async (item) => {
    const { doc, setDoc, updateDoc } = await import('firebase/firestore');
    const ref = doc(db, item.collection, item.docId);
    const { serverTimestamp } = await import('firebase/firestore');
    const payload = {
      ...item.data,
      updatedAt: serverTimestamp(),
      ...(item.action === 'set' && !item.data.createdAt ? { createdAt: serverTimestamp() } : {}),
    };
    if (item.action === 'update') {
      await updateDoc(ref, payload as any);
    } else {
      await setDoc(ref, payload as any, { merge: true });
    }
  });
}

export async function syncNow() {
  const { setStatus, setLastSyncedAt } = useNetworkStore.getState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('offline');
    return;
  }

  setStatus('syncing');
  try {
    await enableNetwork(db);
    await processQueuedWrites();
    await waitForPendingWrites(db);
    await refreshPendingCount();
    setLastSyncedAt(Date.now());
    setStatus('online');
  } catch {
    await refreshPendingCount();
    setStatus(typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline');
  }
}

export function startOfflineSync() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const { setStatus } = useNetworkStore.getState();
  setStatus(navigator.onLine ? 'online' : 'offline');
  refreshPendingCount();

  if (navigator.onLine) {
    syncNow();
  }

  window.addEventListener('online', () => {
    syncNow();
  });

  window.addEventListener('offline', () => {
    setStatus('offline');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncNow();
    }
  });

  setInterval(() => {
    if (navigator.onLine) {
      syncNow();
    }
  }, 60_000);
}
