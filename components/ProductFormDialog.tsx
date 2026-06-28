'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Sparkles, X, Gift, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, compressImage } from '@/lib/utils';
import { productService } from '@/lib/services/productService';
import { settingsService } from '@/lib/services/settingsService';
import { notificationService } from '@/lib/services/notificationService';
import Image from 'next/image';

export function ProductFormDialog({ 
  children, 
  productToEdit,
  isOpen,
  onOpenChange 
}: { 
  children?: React.ReactNode,
  productToEdit?: any,
  isOpen?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
  const { profile, user } = useStore();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = isOpen !== undefined ? isOpen : internalOpen;
  
  const populateForm = (p: any) => {
    setName(p.name || '');
    setScientificName(p.scientificName || '');
    setPrice(p.price?.toString() || '');
    setCurrency(p.currency || '');
    setDescription(p.description || '');
    setCategoryId(p.categoryId || 'none');
    setUnit(p.unit || 'كرتون');
    setBrandId(p.brandId || 'none');
    setImageUrl(p.imageUrl || '');
    setNotes(p.notes || '');
    setExpiryDates(p.expiryDates || []);
    setInStock(p.inStock !== false);
    setIsNewProduct(p.isNewProduct || false);
    setIsLowStock(p.isLowStock || false);
    
    if (p.specialOffer?.isActive) {
        setHasSpecialOffer(true);
        setOfferPrice(p.specialOffer.price?.toString() || '');
        setOfferBonus(p.specialOffer.bonus || '');
        setOfferExpiryDate(p.specialOffer.targetExpiryDate || '');
        setOfferQuantity(p.specialOffer.quantity?.toString() || '');
        setOfferCondition(p.specialOffer.conditionType || 'quantity');
        setOfferEndDate(p.specialOffer.endDate || '');
    } else {
        setHasSpecialOffer(false);
    }
    
    setInvoiceTypeRestriction(p.invoiceTypeRestriction || 'all');
    setCurrencyRestrictionType(p.currencyRestrictionType || 'any');
    setSpecificCurrencies(p.specificCurrencies || []);
    setBonusType(p.bonusType || 'none');
    setBonusFixedPercent(p.bonusFixedPercent?.toString() || '');
    setBonusTiers(p.bonusTiers || []);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data sources
  const [companyBrands, setCompanyBrands] = useState<any[]>([]);
  const [companyCategories, setCompanyCategories] = useState<any[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Basic Info Fields
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('none');
  const [unit, setUnit] = useState('كرتون');
  const [brandId, setBrandId] = useState('none');
  
  // New Basic Info Fields
  const [imageUrl, setImageUrl] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [notes, setNotes] = useState('');
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [inStock, setInStock] = useState(true);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isLowStock, setIsLowStock] = useState(false);

  // Special Offer Fields
  const [hasSpecialOffer, setHasSpecialOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerBonus, setOfferBonus] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerCondition, setOfferCondition] = useState('quantity');
  const [offerEndDate, setOfferEndDate] = useState('');
  
  // Advanced Selling Policies
  const [invoiceTypeRestriction, setInvoiceTypeRestriction] = useState('all'); 
  const [currencyRestrictionType, setCurrencyRestrictionType] = useState('any'); // any, primary_only, specific
  const [specificCurrencies, setSpecificCurrencies] = useState<string[]>([]);
  
  // Bonus Configuration
  const [bonusType, setBonusType] = useState('none'); // none, fixed, tiered
  const [bonusFixedPercent, setBonusFixedPercent] = useState('');
  const [bonusTiers, setBonusTiers] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !profile?.companyId) return;

    const unsubB = settingsService.subscribeToCollection(profile.companyId, 'productBrands', setCompanyBrands);
    const unsubC = settingsService.subscribeToCollection(profile.companyId, 'productCategories', setCompanyCategories);
    const unsubComp = settingsService.subscribeToCompanySettings(profile.companyId, (data) => {
        if(data) {
            setCompanyDetails(data);
            setCurrency(prev => prev || data.primaryCurrency || 'SAR');
        }
    });

    return () => { unsubB(); unsubC(); unsubComp(); };
  }, [open, profile?.companyId]);

  const resetForm = () => {
    setName(''); setScientificName(''); setPrice(''); setDescription(''); setCategoryId('none'); setUnit('كرتون'); setBrandId('none');
    setInvoiceTypeRestriction('all'); setCurrencyRestrictionType('any'); setSpecificCurrencies([]);
    setBonusType('none'); setBonusFixedPercent(''); setBonusTiers([]);
    setImageUrl(''); setNewBrandName(''); setNewCategoryName(''); setNewUnitName(''); setNotes(''); setExpiryDates([]);
    setNewExpiryDate(''); setInStock(true); setIsNewProduct(false); setIsLowStock(false); setHasSpecialOffer(false); setOfferPrice('');
    setOfferBonus(''); setOfferExpiryDate(''); setOfferQuantity(''); setOfferCondition('quantity'); setOfferEndDate('');
  };

  useEffect(() => {
    if (open) {
        if (productToEdit) {
            populateForm(productToEdit);
        } else {
            resetForm();
        }
    }
  }, [open, productToEdit]);

  const handleOpenChange = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    setInternalOpen(v);
  };

  const activeCurrencies = [
      (companyDetails?.primaryCurrency || 'SAR'),
      ...(companyDetails?.secondaryCurrencies || [])
  ];

  const handleSaveProduct = async () => {
    if (!profile?.companyId || !user || !name || !price) {
        toast.error('يرجى تعبئة الحقول الأساسية');
        return;
    }

    setSaving(true);
    try {
      let finalBrandId = brandId === 'none' ? null : brandId;
      if (brandId === 'other' && newBrandName.trim()) {
        const docRef = await settingsService.addDocument(profile.companyId, 'productBrands', {
          name: newBrandName.trim()
        }, user.uid);
        finalBrandId = docRef.id;
      }

      let finalCategoryId = categoryId === 'none' ? null : categoryId;
      if (categoryId === 'other' && newCategoryName.trim()) {
        const docRef = await settingsService.addDocument(profile.companyId, 'productCategories', {
          name: newCategoryName.trim()
        }, user.uid);
        finalCategoryId = docRef.id;
      }

      let finalUnit = unit;
      if (unit === 'other' && newUnitName.trim()) {
        finalUnit = newUnitName.trim();
        try {
          await settingsService.addCompanyUnit(profile.companyId, finalUnit);
        } catch (e) {
          console.error("Could not save new unit", e);
        }
      }

      const productData: any = {
        name,
        scientificName,
        description,
        price: parseFloat(price),
        currency: currency || companyDetails?.primaryCurrency || 'SAR',
        categoryId: finalCategoryId,
        unit: finalUnit,
        brandId: finalBrandId,
        imageUrl,
        notes,
        expiryDates,
        inStock,
        isNewProduct,
        isLowStock,
        specialOffer: hasSpecialOffer ? {
          isActive: true,
          price: parseFloat(offerPrice) || 0,
          bonus: offerBonus,
          targetExpiryDate: offerExpiryDate,
          quantity: parseInt(offerQuantity) || 0,
          conditionType: offerCondition,
          endDate: offerEndDate
        } : { isActive: false },
        invoiceTypeRestriction,
        currencyRestrictionType,
        specificCurrencies: currencyRestrictionType === 'specific' ? specificCurrencies : [],
        bonusType,
        bonusFixedPercent: bonusType === 'fixed' ? parseFloat(bonusFixedPercent || '0') : null,
        bonusTiers: bonusType === 'tiered' ? bonusTiers : [],
      };

      if (productToEdit) {
        const changes: string[] = [];
        if (productToEdit.inStock === false && inStock === true) changes.push('أصبح متوفراً للطلب');
        else if (productToEdit.inStock !== false && inStock === false) changes.push('نفدت كميته');
        if (!productToEdit.isLowStock && isLowStock) changes.push('قاربت كميته على الانتهاء');
        if (!productToEdit.isNewProduct && isNewProduct) changes.push('سجل كمنتج جديد');
        if (!productToEdit.specialOffer?.isActive && hasSpecialOffer) changes.push('يحمل عرضاً خاصاً جديداً');

        await productService.updateProduct(productToEdit.id, productData, user.uid, profile.companyId);

        if (changes.length > 0) {
           try {
             const { authService } = await import('@/lib/services/authService');
             const clients = await authService.findClientsWithFavoriteProduct(profile.companyId, productToEdit.id);
             if (clients.length > 0) {
                const promises = clients.map(d => {
                  return notificationService.createNotification({
                      companyId: profile.companyId,
                      title: 'تحديث حالة صنف',
                      message: `الصنف (${productToEdit.name}) الذي تفضله ${changes.join('، و ')}.`,
                      type: 'product_update',
                      orderId: productToEdit.id,
                      clientUid: d.id,
                  }, user.uid);
                });
                await Promise.all(promises);
             }
           } catch (notifErr) {
             console.error("Failed to push notifications", notifErr);
           }
        }

        toast.success('تم تحديث الصنف بنجاح');
      } else {
        const productId = `prod_${Math.random().toString(36).substring(2, 11)}`;
        productData.companyId = profile.companyId;
        productData.isActive = true;
        await productService.createProduct(productId, productData, user.uid, profile.companyId);
        toast.success('تم إضافة الصنف بنجاح');
      }

      handleOpenChange(false);
    } catch (error: any) {
      handleFirestoreError(error, productToEdit ? OperationType.UPDATE : OperationType.CREATE, 'products');
      toast.error(productToEdit ? 'فشل تحديث الصنف' : 'فشل إضافة الصنف');
    } finally {
        setSaving(false);
    }
  };

  const generateDescription = async () => {
    if (!name) { toast.error('الرجاء إدخال اسم الصنف أولاً'); return; }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categoryId })
      });
      if (!response.ok) throw new Error('Failed to generate description');
      
      const data = await response.json();
      if (data.text) { 
        setDescription(data.text.trim()); 
        toast.success('تم إنشاء الوصف!'); 
      }
    } catch (error: any) {
      console.error(error);
      toast.error('فشل إنشاء الوصف');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6" dir="rtl">
        <DialogHeader>
          <DialogTitle>{productToEdit ? 'تعديل الصنف' : 'إضافة صنف جديد (بخيارات متقدمة)'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">الأساسيات</TabsTrigger>
            <TabsTrigger value="policies">سياسة البيع</TabsTrigger>
            <TabsTrigger value="bonus">المكافآت (البونص)</TabsTrigger>
          </TabsList>
          
          {/* Basic Info */}
          <TabsContent value="basic" className="space-y-4 pt-4">
            {/* 1. Image */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
                {imageUrl ? (
                  <Image src={imageUrl} alt="Product" fill className="object-contain p-2 pointer-events-none" unoptimized referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-gray-400 text-xs text-center p-2">اضف صورة (CV)</span>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressedBase64 = await compressImage(file, 800, 0.7);
                        setImageUrl(compressedBase64);
                      } catch (err) {
                        console.error('Failed to compress image', err);
                      }
                    }
                  }}
                />
              </div>
              {imageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setImageUrl('')} className="text-red-500 h-6 px-2 text-xs">
                  إزالة الصورة
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>اسم الصنف *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>الاسم العلمي (اختياري)</Label>
                <Input value={scientificName} onChange={e => setScientificName(e.target.value)} placeholder="مثال: Paracetamol 500mg" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>السعر الافتراضي *</Label>
                <div className="flex gap-2">
                    <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} />
                    <Select value={currency} onValueChange={(v) => setCurrency(v || '')}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{activeCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>الوحدة *</Label>
                <div className="flex flex-col gap-2">
                  <Select value={unit} onValueChange={(v) => setUnit(v || 'كرتون')}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                        {Array.from(new Set(['حبة', 'كرتون', 'مجموعة', 'طقم', ...(companyDetails?.productUnits || [])])).map(u => (
                          <SelectItem key={u as string} value={u as string}>{u}</SelectItem>
                        ))}
                        <SelectItem value="other" className="text-blue-600 font-bold">آخر (إضافة وحدة جديدة)</SelectItem>
                    </SelectContent>
                  </Select>
                  {unit === 'other' && (
                    <Input placeholder="اسم الوحدة الجديدة (مثال: درزن)" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>العلامة التجارية</Label>
                <div className="flex flex-col gap-2">
                  <Select value={brandId} onValueChange={(v) => setBrandId(v || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر...">
                        {brandId && brandId !== 'none' && brandId !== 'other' 
                          ? (companyBrands.find(b => b.id === brandId)?.name || (productToEdit?.brand && productToEdit.brand.length !== 20 && !productToEdit.brand.startsWith('brand_') ? productToEdit.brand : brandId.length === 20 ? 'علامة تجارية غير معروفة' : brandId)) 
                          : brandId === 'none' ? 'بدون علامة تجارية' 
                          : brandId === 'other' ? 'آخر' 
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">بدون علامة تجارية</SelectItem>
                        {companyBrands.map(b => {
                          if (b.isDeleted && b.id !== brandId) return null;
                          return <SelectItem key={b.id} value={b.id}>{`${b.name}${b.isDeleted ? ' (محذوف)' : ''}`}</SelectItem>;
                        })}
                        <SelectItem value="other" className="text-blue-600 font-bold">آخر (إضافة علامة تجارية جديدة)</SelectItem>
                    </SelectContent>
                  </Select>
                  {brandId === 'other' && (
                    <Input placeholder="اسم العلامة التجارية الجديدة" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <div className="flex flex-col gap-2">
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر...">
                        {categoryId && categoryId !== 'none' && categoryId !== 'other' 
                          ? (companyCategories.find(c => c.id === categoryId)?.name || (productToEdit?.category && productToEdit.category.length !== 20 && !productToEdit.category.startsWith('cat_') ? productToEdit.category : categoryId.length === 20 ? 'تصنيف غير معروف' : categoryId)) 
                          : categoryId === 'none' ? 'بدون تصنيف' 
                          : categoryId === 'other' ? 'آخر' 
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">بدون تصنيف</SelectItem>
                        {companyCategories.map(c => {
                          if (c.isDeleted && c.id !== categoryId) return null;
                          return <SelectItem key={c.id} value={c.id}>{`${c.name}${c.isDeleted ? ' (محذوف)' : ''}`}</SelectItem>;
                        })}
                        <SelectItem value="other" className="text-blue-600 font-bold">آخر (إضافة تصنيف جديد)</SelectItem>
                    </SelectContent>
                  </Select>
                  {categoryId === 'other' && (
                    <Input placeholder="اسم التصنيف الجديد" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex justify-between items-center">
                  <Label>الوصف</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={generateDescription} disabled={isGenerating || !name} className="h-8 text-blue-600">
                    {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    إنشاء تفاصيل
                  </Button>
                </div>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>ملاحظات أخرى عن الصنف</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="أضف أي ملاحظات إضافية هنا..." />
              </div>

              {/* In Stock & Expiry Dates */}
              <div className="space-y-4 col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Label className="font-bold">حالة المخزون والمؤشرات وتواريخ الصلاحية</Label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="inStock" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <Label htmlFor="inStock" className="cursor-pointer">متوفر (متاح)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isLowStock" checked={isLowStock} onChange={(e) => setIsLowStock(e.target.checked)} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
                      <Label htmlFor="isLowStock" className="cursor-pointer text-orange-700">قارب على الانتهاء</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isNewProduct" checked={isNewProduct} onChange={(e) => setIsNewProduct(e.target.checked)} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                      <Label htmlFor="isNewProduct" className="cursor-pointer text-purple-700">جديد</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">تواريخ الصلاحية (يمكن إضافة أكثر من تاريخ)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} className="flex-1" />
                    <Button type="button" onClick={() => {
                      if (newExpiryDate && !expiryDates.includes(newExpiryDate)) {
                        setExpiryDates([...expiryDates, newExpiryDate]);
                        setNewExpiryDate('');
                      }
                    }} variant="secondary">إضافة تاريخ</Button>
                  </div>
                  {expiryDates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {expiryDates.map((date, idx) => (
                        <div key={idx} className="bg-white border rounded-full px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                          <span dir="ltr">{date}</span>
                          <button type="button" onClick={() => setExpiryDates(expiryDates.filter(d => d !== date))} className="text-red-500 hover:text-red-700">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Special Offer */}
              <div className={`space-y-4 col-span-2 p-4 rounded-xl border transition-colors mt-2 ${hasSpecialOffer ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="hasOffer" checked={hasSpecialOffer} onChange={(e) => setHasSpecialOffer(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                  <Label htmlFor="hasOffer" className="font-bold cursor-pointer text-green-800">تفعيل خيار عرض خاص</Label>
                </div>
                
                {hasSpecialOffer && (
                  <div className="grid grid-cols-2 gap-4 mt-4 bg-white p-4 rounded-lg shadow-sm border border-green-100">
                    <div className="space-y-2">
                      <Label>سعر العرض للصنف *</Label>
                      <Input type="number" step="0.01" min="0" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} required={hasSpecialOffer} />
                    </div>
                    <div className="space-y-2">
                      <Label>بونص العرض (اختياري)</Label>
                      <Input placeholder="مثال: +2 مجاناً" value={offerBonus} onChange={(e) => setOfferBonus(e.target.value)} />
                    </div>
                    
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label>يستهدف تاريخ صلاحية (اختياري)</Label>
                      <Select value={offerExpiryDate} onValueChange={(v) => setOfferExpiryDate(v || '')}>
                        <SelectTrigger><SelectValue placeholder="اختر تاريخ..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">أي تاريخ (الكل)</SelectItem>
                          {expiryDates.map(date => (
                            <SelectItem key={date} value={date} dir="ltr">{date}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label>كمية العرض (حبة/كرتون)</Label>
                      <Input type="number" min="1" value={offerQuantity} onChange={(e) => setOfferQuantity(e.target.value)} />
                    </div>

                    <div className="space-y-2 col-span-2 mt-2 pt-4 border-t border-gray-100">
                      <Label className="font-bold">متى ينتهي العرض؟</Label>
                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <input type="radio" id="cond_qty" name="offer_cond" checked={offerCondition === 'quantity'} onChange={() => setOfferCondition('quantity')} className="w-4 h-4 text-green-600" />
                          <label htmlFor="cond_qty" className="text-sm cursor-pointer">ينتهي بانتهاء الكمية المحددة أعلاه</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="radio" id="cond_date" name="offer_cond" checked={offerCondition === 'time'} onChange={() => setOfferCondition('time')} className="w-4 h-4 text-green-600" />
                          <label htmlFor="cond_date" className="text-sm cursor-pointer">ينتهي في تاريخ محدد</label>
                        </div>
                        {offerCondition === 'time' && (
                          <div className="pr-6 mt-1 w-full md:w-1/2">
                            <Input type="date" value={offerEndDate} onChange={(e) => setOfferEndDate(e.target.value)} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Sales Policies */}
          <TabsContent value="policies" className="space-y-6 pt-4">
            <div className="p-4 bg-gray-50 rounded-xl border space-y-4">
                <h4 className="font-bold text-gray-900 border-b pb-2">طريقة الدفع المسموحة للصنف</h4>
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                        <input type="radio" id="inv_all" name="inv_type" checked={invoiceTypeRestriction === 'all'} onChange={() => setInvoiceTypeRestriction('all')} className="w-4 h-4 text-blue-600" />
                        <label htmlFor="inv_all" className="text-sm">مسموح بجميع الطرق (نقدي، نقدي معلق، آجل)</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="radio" id="inv_cash" name="inv_type" checked={invoiceTypeRestriction === 'cash_only'} onChange={() => setInvoiceTypeRestriction('cash_only')} className="w-4 h-4 text-blue-600" />
                        <label htmlFor="inv_cash" className="text-sm">نقدي فقط</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="radio" id="inv_cash_pending" name="inv_type" checked={invoiceTypeRestriction === 'cash_or_pending'} onChange={() => setInvoiceTypeRestriction('cash_or_pending')} className="w-4 h-4 text-blue-600" />
                        <label htmlFor="inv_cash_pending" className="text-sm">نقدي أو نقدي معلق فقط (لا يباع بالآجل)</label>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border space-y-4">
                <h4 className="font-bold text-gray-900 border-b pb-2">قيود بيع العملة</h4>
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                        <input type="radio" id="curr_any" name="curr_type" checked={currencyRestrictionType === 'any'} onChange={() => setCurrencyRestrictionType('any')} className="w-4 h-4 text-blue-600" />
                        <label htmlFor="curr_any" className="text-sm border-b border-transparent">مرونة بيع بأي عملة (حسب نظام أسعار الصرف للشركة)</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="radio" id="curr_primary" name="curr_type" checked={currencyRestrictionType === 'primary_only'} onChange={() => setCurrencyRestrictionType('primary_only')} className="w-4 h-4 text-blue-600" />
                        <label htmlFor="curr_primary" className="text-sm">يباع بالعملة المحددة له فقط ولا يمكن بيعه بعمله أخرى</label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input type="radio" id="curr_specific" name="curr_type" checked={currencyRestrictionType === 'specific'} onChange={() => setCurrencyRestrictionType('specific')} className="w-4 h-4 text-blue-600" />
                            <label htmlFor="curr_specific" className="text-sm">يباع بعملتين محددتين فقط</label>
                        </div>
                        {currencyRestrictionType === 'specific' && (
                            <div className="mr-6 flex flex-wrap gap-2">
                                {activeCurrencies.map(curr => (
                                    <button 
                                        key={curr} 
                                        onClick={() => setSpecificCurrencies(prev => prev.includes(curr) ? prev.filter(c => c !== curr) : [...prev, curr])}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${specificCurrencies.includes(curr) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </TabsContent>

          {/* Bonus */}
          <TabsContent value="bonus" className="space-y-4 pt-4">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-max">
                  <button onClick={() => setBonusType('none')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${bonusType === 'none' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>لا يوجد بونص</button>
                  <button onClick={() => setBonusType('fixed')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${bonusType === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>ثابت (نسبة)</button>
                  <button onClick={() => setBonusType('tiered')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${bonusType === 'tiered' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>حسب الكمية / الفاتورة</button>
              </div>

              {bonusType === 'fixed' && (
                  <div className="p-4 border rounded-xl bg-orange-50/50 space-y-4">
                       <Label className="text-orange-900">نسبة البونص المئوية (%) المحتسبة بناءً على الكمية المطلوبة</Label>
                       <div className="flex items-center gap-2">
                           <Input type="number" min="0" max="100" value={bonusFixedPercent} onChange={(e) => setBonusFixedPercent(e.target.value)} className="w-32 bg-white" placeholder="مثال: 10" />
                           <span className="text-gray-500 font-bold">%</span>
                       </div>
                       <p className="text-xs text-orange-600">مثال: إذا حددت 10% واشترى العميل 10 حبات، سيتم إضافة 1 حبة مجانية.</p>
                  </div>
              )}

              {bonusType === 'tiered' && (
                  <div className="space-y-3">
                      {bonusTiers.map((tier, idx) => (
                          <div key={idx} className="p-3 border rounded-xl bg-white flex flex-wrap gap-3 items-end shadow-sm">
                              <div className="space-y-1">
                                  <Label className="text-xs">الكمية من</Label>
                                  <Input type="number" className="w-20 h-8" value={tier.minQty} onChange={(e) => { const nt = [...bonusTiers]; nt[idx].minQty = parseInt(e.target.value) || 0; setBonusTiers(nt); }} />
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-xs">الكمية إلى</Label>
                                  <Input type="number" className="w-20 h-8" placeholder="مفتوح" value={tier.maxQty} onChange={(e) => { const nt = [...bonusTiers]; nt[idx].maxQty = e.target.value ? parseInt(e.target.value) : undefined; setBonusTiers(nt); }} />
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-xs text-orange-600">نسبة البونص %</Label>
                                  <Input type="number" className="w-20 h-8 border-orange-200" value={tier.percent} onChange={(e) => { const nt = [...bonusTiers]; nt[idx].percent = parseInt(e.target.value) || 0; setBonusTiers(nt); }} />
                              </div>
                              <div className="space-y-1 flex-1 min-w-[120px]">
                                  <Label className="text-xs">تطبق على نوع فاتورة</Label>
                                  <Select value={tier.invoiceType} onValueChange={(v) => { const nt = [...bonusTiers]; nt[idx].invoiceType = v; setBonusTiers(nt); }}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل الأنواع</SelectItem>
                                        <SelectItem value="cash">نقدي</SelectItem>
                                        <SelectItem value="pending_cash">نقدي معلق</SelectItem>
                                        <SelectItem value="credit">آجل</SelectItem>
                                    </SelectContent>
                                  </Select>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 rounded-full" onClick={() => setBonusTiers(bonusTiers.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                      ))}
                      <Button variant="outline" type="button" onClick={() => setBonusTiers([...bonusTiers, { minQty: 1, maxQty: '', percent: 10, invoiceType: 'all' }])} className="w-full border-dashed text-blue-600 bg-blue-50/50 hover:bg-blue-50">
                          <Plus className="w-4 h-4 ml-2" /> شرائح بونص إضافية
                      </Button>
                  </div>
              )}
          </TabsContent>
        </Tabs>
        
        <div className="pt-4 border-t mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>إلغاء</Button>
            <Button onClick={handleSaveProduct} disabled={saving} className="bg-blue-600 hover:bg-blue-700 w-32">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ الصنف'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
