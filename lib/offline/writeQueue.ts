'use client';

import localforage from 'localforage';
import { isBrowserOnline, useNetworkStore } from './network';

export type QueuedWrite = {
  id: string;
  createdAt: number;
  collection: string;
  action: 'set' | 'update';
  docId: string;
  data: Record<string, unknown>;
};

const QUEUE_KEY = 'flowexa-offline-write-queue';

const store = typeof window === 'undefined'
  ? null
  : localforage.createInstance({
      name: 'flowexa',
      storeName: 'offline_queue',
    });

async function readQueue(): Promise<QueuedWrite[]> {
  if (!store) return [];
  const items = await store.getItem<QueuedWrite[]>(QUEUE_KEY);
  return items || [];
}

function toPlainData(data: Record<string, unknown>) {
  try {
    return JSON.parse(JSON.stringify(data, (_key, value) => {
      if (typeof value === 'function') return undefined;
      if (value && typeof value === 'object' && ('_methodName' in value || 'methodName' in value)) {
        return undefined;
      }
      return value;
    }));
  } catch {
    return { ...data };
  }
}

async function saveQueue(items: QueuedWrite[]) {
  if (!store) return;
  await store.setItem(QUEUE_KEY, items);
  useNetworkStore.getState().setPendingCount(items.length);
}

export async function getPendingCount() {
  const items = await readQueue();
  return items.length;
}

export async function enqueueWrite(entry: Omit<QueuedWrite, 'id' | 'createdAt'>) {
  const items = await readQueue();
  const next: QueuedWrite = {
    ...entry,
    data: toPlainData(entry.data),
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  items.push(next);
  await saveQueue(items);
  return next.id;
}

export async function flushWriteQueue(
  processor: (item: QueuedWrite) => Promise<void>
) {
  const items = await readQueue();
  if (!items.length) return 0;

  const remaining: QueuedWrite[] = [];
  let flushed = 0;

  for (const item of items) {
    try {
      await processor(item);
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return flushed;
}

export async function withOfflineWrite<T>(
  entry: Omit<QueuedWrite, 'id' | 'createdAt'>,
  onlineFn: () => Promise<T>,
  offlineResult: T
): Promise<T> {
  if (!isBrowserOnline()) {
    await enqueueWrite(entry);
    return offlineResult;
  }

  try {
    return await onlineFn();
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    const isNetwork =
      code.includes('unavailable') ||
      code.includes('network') ||
      code.includes('offline') ||
      code.includes('Failed to get document') ||
      error?.name === 'FirebaseError' && code.includes('failed-precondition');

    if (isNetwork) {
      await enqueueWrite(entry);
      return offlineResult;
    }
    throw error;
  }
}

export async function refreshPendingCount() {
  const count = await getPendingCount();
  useNetworkStore.getState().setPendingCount(count);
  return count;
}
