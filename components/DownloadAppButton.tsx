'use client';

import { useSyncExternalStore, type MouseEvent } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const APK_PATH = '/api/download-apk';

export function isNativeAndroidApp() {
  if (typeof navigator === 'undefined') return false;
  return /FlowexaApp/i.test(navigator.userAgent);
}

const emptySubscribe = () => () => {};
const getAppSnapshot = () => isNativeAndroidApp();
const getServerAppSnapshot = () => false;

interface DownloadAppButtonProps {
  className?: string;
  label?: string;
  variant?: 'primary' | 'outline' | 'header';
}

export function DownloadAppButton({
  className,
  label = 'تحميل تطبيق أندرويد',
  variant = 'primary',
}: DownloadAppButtonProps) {
  const hidden = useSyncExternalStore(emptySubscribe, getAppSnapshot, getServerAppSnapshot);

  if (hidden) return null;

  const styles = {
    primary:
      'h-16 px-10 bg-[#163C85] hover:bg-[#0f2c66] text-white text-xl font-bold rounded-full shadow-xl shadow-blue-900/20 transition-all hover:scale-105 hover:-translate-y-1',
    outline:
      'h-16 px-10 text-xl font-bold rounded-full border-2 border-[#163C85] text-[#163C85] bg-white hover:bg-blue-50 transition-all',
    header:
      'inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-sm',
  }[variant];

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const res = await fetch(APK_PATH, { method: 'HEAD' });
      if (!res.ok) {
        toast.info('حزمة التطبيق (APK) قيد التجهيز من ملفات الأندرويد، يمكنك أيضاً استخدام التطبيق مباشرة وتثبيته كـ PWA من المتصفح.');
        return;
      }
      const link = document.createElement('a');
      link.href = APK_PATH;
      link.download = 'Flowexa.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = APK_PATH;
    }
  };

  return (
    <a
      href={APK_PATH}
      download="Flowexa.apk"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        styles,
        className
      )}
    >
      <Download className={variant === 'header' ? 'w-4 h-4' : 'w-6 h-6'} />
      {label}
    </a>
  );
}
