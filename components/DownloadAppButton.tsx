'use client';

import { useState, useEffect, useSyncExternalStore, type MouseEvent } from 'react';
import { Download, Smartphone, CheckCircle, ExternalLink, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const APK_PATH = '/api/download-apk';
const GITHUB_RELEASE_URL = 'https://github.com/salemspry2026-droid/-/releases/latest/download/Flowexa.apk';

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
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (hidden) return null;

  const styles = {
    primary:
      'h-16 px-10 bg-[#163C85] hover:bg-[#0f2c66] text-white text-xl font-bold rounded-full shadow-xl shadow-blue-900/20 transition-all hover:scale-105 hover:-translate-y-1',
    outline:
      'h-16 px-10 text-xl font-bold rounded-full border-2 border-[#163C85] text-[#163C85] bg-white hover:bg-blue-50 transition-all',
    header:
      'inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-sm',
  }[variant];

  const triggerApkDownload = () => {
    setIsDownloading(true);
    toast.success('جاري بدء تحميل حزمة Flowexa.apk...');

    try {
      const link = document.createElement('a');
      link.href = APK_PATH;
      link.download = 'Flowexa.apk';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(APK_PATH, '_blank');
    }

    setTimeout(() => {
      setIsDownloading(false);
    }, 2500);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    triggerApkDownload();
    setShowModal(true);
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('تم تثبيت التطبيق بنجاح على شاشتك الرئيسية!');
        setDeferredPrompt(null);
        setShowModal(false);
      }
    } else {
      toast.info('لتثبيت التطبيق مباشرة: اضغط على خيارات المتصفح (⋮) ثم اختر "إضافة إلى الشاشة الرئيسية" (Install App).');
    }
  };

  return (
    <>
      <a
        href={APK_PATH}
        download="Flowexa.apk"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-2 cursor-pointer',
          styles,
          className
        )}
      >
        <Download className={variant === 'header' ? 'w-4 h-4' : 'w-6 h-6'} />
        {label}
      </a>

      {/* Download & Installation Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          dir="rtl"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-right overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-[#163C85] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">تحميل وتثبيت تطبيق Flowexa</h3>
              <p className="text-sm text-gray-600">اختر الطريقة الأنسب لهاتفك للبدء فوراً في استخدام التطبيق</p>
            </div>

            {/* Action 1: APK Download */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100 mb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-bold text-[#163C85] text-base flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#163C85]" />
                    حزمة أندرويد الرسمية (APK)
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">تطبيق متكامل للأندرويد، يدعم العمل بدون إنترنت والوصول السريع.</p>
                </div>
                <span className="inline-block px-2 py-0.5 text-[11px] font-bold bg-blue-200 text-blue-800 rounded-full shrink-0">
                  موصى به
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={triggerApkDownload} 
                  disabled={isDownloading}
                  className="flex-1 bg-[#163C85] hover:bg-[#0f2c66] text-white font-bold h-11 rounded-xl shadow-md gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? 'جاري التحميل...' : 'إعادة تحميل APK الآن'}
                </Button>
                <a
                  href={GITHUB_RELEASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 gap-1"
                >
                  <span>رابط بديل (GitHub)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Action 2: PWA Web App Install */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 mb-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-bold text-emerald-800 text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    تثبيت فوري على الشاشة الرئيسية (PWA)
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    يعمل كتطبيق هاتف فوري وخفيف دون الحاجة لتحميل ملفات وتأكيد أذونات خارجية.
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePwaInstall}
                variant="outline"
                className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-100/70 hover:text-emerald-800 font-bold h-11 rounded-xl gap-2"
              >
                <Smartphone className="w-4 h-4" />
                تثبيت كتطبيق فوري على الهاتف
              </Button>
            </div>

            {/* Installation Steps Guide */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <h5 className="font-bold text-gray-800 text-xs flex items-center gap-1.5 mb-2.5">
                <HelpCircle className="w-4 h-4 text-gray-500" />
                خطوات تثبيت ملف APK على هاتفك:
              </h5>
              <ol className="space-y-2 text-xs text-gray-600 pr-1">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>افتح ملف <strong>Flowexa.apk</strong> من شريط الإشعارات أو مجلد التنزيلات (Downloads).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>إذا ظهر تنبيه الأمان، انقر على <strong>الإعدادات</strong> وفعل خيار <strong>&ldquo;السماح بتثبيت التطبيقات من هذا المصدر&rdquo;</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>اضغط على <strong>&ldquo;تثبيت&rdquo; (Install)</strong>، ثم افتح التطبيق وسجل دخولك مباشرة!</span>
                </li>
              </ol>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
