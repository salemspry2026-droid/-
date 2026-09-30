'use client';

import { useEffect } from 'react';
import { startOfflineSync } from '@/lib/offline/syncManager';

export function ServiceWorkerRegister() {
  useEffect(() => {
    startOfflineSync();

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        console.warn('Service worker registration failed', error);
      }
    };

    register();
  }, []);

  return null;
}
