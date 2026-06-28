import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { companyService } from '@/lib/services/companyService';
import { notificationService } from '@/lib/services/notificationService';

export function JoinRequestDialog({
  notif,
  open,
  onOpenChange
}: {
  notif: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useStore();

  if (!notif) return null;

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!user) return;
    setLoading(true);
    try {
      if (action === 'approve') {
        // Update user profile to become an active employee
        await companyService.updateEmployee(notif.userId, {
          companyId: notif.companyId,
          pendingCompanyId: null,
          role: 'sales', // Default to sales
        }, user.uid);
        toast.success(`تم إضافة ${notif.userName || 'المستخدم'} للشركة بنجاح`);
      } else {
        // Reject - clear pending state
        await companyService.updateEmployee(notif.userId, {
          pendingCompanyId: null,
          companyId: null,
          role: 'client', // Revert to generic role or keep null
        }, user.uid);
        toast.success('تم رفض طلب الانضمام');
      }

      // Mark notification as fully processed/read by everyone (or deleted)
      await notificationService.deleteNotification(notif.id, user.uid);

      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء معالجة الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب انضمام للشركة</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-gray-600 text-sm">يطلب المستخدم التالي الانضمام إلى شركتك كموظف:</p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <div>
              <span className="text-xs text-gray-500 font-bold block mb-1">الاسم:</span>
              <span className="text-gray-900 font-bold">{notif.userName || 'غير محدد'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block mb-1">البريد الإلكتروني:</span>
              <span className="text-gray-900" dir="ltr">{notif.userEmail}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction('approve')}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
              قبول الموظف
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => handleAction('reject')}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
              رفض
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
