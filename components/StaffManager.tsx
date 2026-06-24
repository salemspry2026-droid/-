'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Shield, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { companyService } from '@/lib/services/companyService';

export function StaffManager() {
  const { profile, user } = useStore();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.companyId) return;

    const unsubscribe = companyService.subscribeToCompanyStaff(profile.companyId, (users) => {
      setStaff(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.companyId]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';

  const handleUpdateEmployee = async (empId: string, field: string, value: string) => {
    if (!isAdmin || !user?.uid) return;
    try {
      await companyService.updateEmployee(empId, { [field]: value }, user.uid, profile.companyId);
      toast.success('تم التحديث بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-[#163C85] flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" /> 
            إدارة الموظفين والصلاحيات
          </h2>
          <p className="text-gray-500 mt-2">تحديد الأدوار الوظيفية والصلاحيات داخل الشركة</p>
        </div>
      </div>
      
      {!isAdmin && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          <p className="font-bold">عذراً، لا تملك الصلاحيات الكافية</p>
          <p className="text-sm mt-1">يجب أن تكون مديراً أو مالكاً للوصول إلى هذه الإعدادات</p>
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(emp => (
            <EmployeeCard key={`${emp.id}-${emp.jobTitle || ''}`} emp={emp} isAdmin={isAdmin} currentUserId={user?.uid!} onUpdate={handleUpdateEmployee} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ emp, isAdmin, currentUserId, onUpdate }: { emp: any, isAdmin: boolean, currentUserId: string, onUpdate: (id: string, field: string, val: string) => void }) {
  const [jobTitle, setJobTitle] = useState(emp.jobTitle || '');

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-2 w-full ${emp.role === 'owner' ? 'bg-yellow-500' : emp.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`} />
      <CardContent className="p-5">
        <div className="flex gap-3 items-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
             {emp.displayName?.charAt(0) || 'م'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{emp.displayName}</h3>
            <p className="text-xs text-gray-500" dir="ltr">{emp.email}</p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-gray-700">مستوى الصلاحية</Label>
            <Select 
              value={emp.role} 
              onValueChange={(val) => val && onUpdate(emp.id, 'role', val)}
              disabled={!isAdmin || emp.role === 'owner' || emp.id === currentUserId}
            >
              <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير نظام</SelectItem>
                <SelectItem value="sales">مندوب مبيعات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-gray-700">المسمى الوظيفي</Label>
            <Input 
              value={jobTitle} 
              onChange={(e) => setJobTitle(e.target.value)}
              onBlur={() => {
                if (jobTitle !== (emp.jobTitle || '')) {
                  onUpdate(emp.id, 'jobTitle', jobTitle);
                }
              }}
              disabled={!isAdmin}
              className="h-10 text-sm bg-gray-50 border-gray-200"
              placeholder="مثال: مندوب مبيعات منطقة الرياض"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
