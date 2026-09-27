'use client';

import { useEffect } from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { formatLastSync, useNetworkStore } from '@/lib/offline/network';
import { startOfflineSync, syncNow } from '@/lib/offline/syncManager';
import { cn } from '@/lib/utils';

export function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const { status, lastSyncedAt, pendingCount } = useNetworkStore();

  useEffect(() => {
    startOfflineSync();
  }, []);

  const isOffline = status === 'offline';
  const isSyncing = status === 'syncing';

  return (
    <div
      className={cn(
        'flex justify-between items-center rounded-xl border p-3',
        isOffline
          ? 'bg-amber-50/80 border-amber-200'
          : isSyncing
            ? 'bg-blue-50/80 border-blue-200'
            : 'bg-green-50/50 border-green-100'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isOffline ? 'bg-amber-500' : isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          )}
        />
        <div>
          <p className="text-sm font-bold text-gray-800">
            {isOffline ? 'وضع عدم الاتصال' : isSyncing ? 'جاري المزامنة...' : 'متصل بالسحابة'}
          </p>
          {!compact && (
            <p className="text-xs text-gray-500">
              {isOffline
                ? pendingCount > 0
                  ? `${pendingCount} عملية بانتظار المزامنة`
                  : 'يمكنك العمل الآن وستتم المزامنة عند عودة الإنترنت'
                : `آخر مزامنة: ${formatLastSync(lastSyncedAt)}`}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => syncNow()}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isOffline ? 'bg-amber-100 text-amber-700' : isSyncing ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        )}
        aria-label="مزامنة الآن"
      >
        {isOffline ? <CloudOff className="w-4 h-4" /> : isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
      </button>
    </div>
  );
}
