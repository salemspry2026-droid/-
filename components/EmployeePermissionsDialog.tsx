import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppPermissions } from "@/lib/store";

export function EmployeePermissionsDialog({ emp, isAdmin }: { emp: any, isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Default structure
  const defaultPermissions: AppPermissions = {
    customers: { view: false, create: false, edit: false, delete: false },
    products: { view: false, create: false, edit: false, delete: false },
    orders: { view: false, create: false, edit: false, delete: false },
    staff: { view: false, create: false, edit: false, delete: false },
    companySettings: { view: false, create: false, edit: false, delete: false },
  };

  const [permissions, setPermissions] = useState<AppPermissions>(defaultPermissions);

  useEffect(() => {
    if (open) {
      if (emp.permissions) {
        setPermissions({
           customers: { ...defaultPermissions.customers, ...emp.permissions.customers },
           products: { ...defaultPermissions.products, ...emp.permissions.products },
           orders: { ...defaultPermissions.orders, ...emp.permissions.orders },
           staff: { ...defaultPermissions.staff, ...emp.permissions.staff },
           companySettings: { ...defaultPermissions.companySettings, ...emp.permissions.companySettings },
        });
      } else {
        // Init based on role heuristics if missing
        const isSales = emp.role === 'sales';
        const isAdmin = emp.role === 'admin';
        setPermissions({
           customers: { view: true, create: isAdmin || isSales, edit: isAdmin || isSales, delete: isAdmin },
           products: { view: true, create: isAdmin, edit: isAdmin, delete: isAdmin },
           orders: { view: true, create: isAdmin || isSales, edit: isAdmin || isSales, delete: isAdmin },
           staff: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
           companySettings: { view: isAdmin, create: false, edit: isAdmin, delete: false },
        });
      }
    }
  }, [open, emp]);

  const handleToggle = (module: string, action: 'view' | 'create' | 'edit' | 'delete', checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'userProfiles', emp.id), {
        permissions,
        updatedAt: serverTimestamp()
      });
      toast.success('تم حفظ الصلاحيات بنجاح');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'فشل حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { id: 'customers', label: 'العملاء' },
    { id: 'products', label: 'الأصناف (الكتالوج)' },
    { id: 'orders', label: 'الطلبات' },
    { id: 'staff', label: 'إدارة الموظفين' },
    { id: 'companySettings', label: 'معلومات الشركة والإدارة' },
  ];

  if (!isAdmin || emp.role === 'owner') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs h-8 text-blue-600 border-blue-200">
          <Settings2 className="w-4 h-4 ml-2" />
          الصلاحيات المتقدمة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] select-none" dir="rtl">
        <DialogHeader>
          <DialogTitle>صلاحيات الموظف: {emp.displayName}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
           <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
             تحذير: سيتم تجاوز الصلاحيات الافتراضية بمجرد حفظ الإعدادات من هنا. 
             تأكد من إعطاء صلاحية "العرض" إذا كنت تريد للموظف التعديل أو الحذف.
           </div>

           <div className="space-y-4">
              {modules.map(mod => (
                <div key={mod.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-bold text-gray-900 mb-4">{mod.label}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(['view', 'create', 'edit', 'delete'] as const).map(action => {
                      const translations = {
                        view: 'العرض',
                        create: 'الاضافة',
                        edit: 'التعديل',
                        delete: 'الحذف'
                      };
                      return (
                        <div key={action} className="flex items-center gap-2">
                          <Checkbox 
                            id={`${mod.id}-${action}`}
                            checked={permissions[mod.id]?.[action] || false}
                            onCheckedChange={(c) => handleToggle(mod.id, action, c as boolean)}
                          />
                          <Label htmlFor={`${mod.id}-${action}`} className="text-sm cursor-pointer">{translations[action]}</Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
