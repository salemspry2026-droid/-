# تقرير البنية المعمارية للمشروع (Project Architecture Report)

## 1. نظرة عامة (Overview)
يعتمد المشروع على إطار عمل **Next.js (App Router)** مع **Tailwind CSS** لتصميم الواجهات، ويستخدم **Firebase** (Firestore لقواعد البيانات و Authentication للمصادقة). 
التطبيق عبارة عن نظام SaaS متعدد المستأجرين (Multi-tenant) يخدم الشركات (المبيعات والإدارة) والعملاء عبر واجهات منفصلة تعتمد على الصلاحيات.

## 2. المسارات (Routes)
- `app/page.tsx`: المسار الرئيسي. يحتوي على منطق المصادقة (تسجيل الدخول، إنشاء حساب، استعادة كلمة المرور). يقوم بتوجيه المستخدمين إلى `AdminDashboard` أو `ClientDashboard` بناءً على دور المستخدم `profile.role`.
- `app/c/[companyId]/page.tsx`: صفحة عامة (Public Catalog) تعرض منتجات الشركة للزوار غير المسجلين. تقوم بإعادة توجيه المستخدمين المسجلين إلى التطبيق الرئيسي.
- `app/api/generate-description/route.ts`: نقطة نهاية (API endpoint) لإنشاء وصف المنتجات باستخدام الذكاء الاصطناعي.

## 3. الشاشات والمكونات (Screens & Components)
يتم تنظيم الواجهات داخل مجلد `components/` كالتالي:
- **AdminDashboard**: الواجهة الرئيسية للمدراء والمبيعات. تدير التنقل بين التبويبات وتستضيف الـ Overlays العامة (الإشعارات، المكالمات، إلخ).
- **ClientDashboard**: الواجهة الخاصة بعملاء الشركة. تحتوي على تبويبات (الرئيسية، المنتجات، الطلبات، المفضلة، الملف الشخصي).
- **المدراء (Managers)**:
  - `ProductsManager`: إدارة المنتجات، الفئات، العلامات التجارية، واستخدام الذكاء الاصطناعي لكتابة الوصف.
  - `CustomersManager`: إدارة بيانات العملاء والفروع.
  - `OrdersManager`: إدارة ومعالجة الطلبات الواردة وتغيير حالاتها.
  - `StaffManager`: دعوة الموظفين الجدد وإدارة صلاحياتهم (Permissions).
- **الصفحات الفرعية (Tabs)**: `HomeTab` و `ClientHomeTab` لعرض لوحة القيادة السريعة والإحصائيات.

## 4. إدارة الحالة (Contexts & State)
تتم إدارة الحالة العامة عبر مكتبة **Zustand** في ملف `lib/store.ts`:
- **Auth Slice**: `user`, `profile`, `isAuthReady`, `isProfileLoaded`.
- **UI Slice**: `activeTab`, `isNotificationsOpen`, `isCallRecordingsOpen`, `incomingCall`, `selectedOrderId`.
- **Client Slice**: `clientSelectedCompany`.
- **Notifications Slice**: `unreadNotifications`.

## 5. طبقة الخدمات (Services)
تم إنشاء مجلد `lib/services/` لفصل استعلامات قاعدة البيانات عن واجهات المستخدم (مرحلة جيدة، لكن مكونات الواجهة لا تزال تستدعيها بشكل مباشر):
- `productService.ts`
- `customerService.ts`
- `orderService.ts`
- `companyService.ts`
- `authService.ts`
- `auditLogService.ts`
- وغيرها...

## 6. استعلامات قاعدة البيانات وقواعد الحماية (Database & Security)
- **Multi-Tenancy**: جميع الكيانات مرتبطة بـ `companyId`.
- **Soft Delete**: يتم تمييز السجلات بـ `isDeleted: true` بدلاً من حذفها نهائياً.
- **التحديث المباشر**: يتم استخدام `onSnapshot` لجلب البيانات بشكل حي ومباشر في أغلب واجهات الإدارة (Products, Orders, Customers).

## 7. مجالات التحسين المطلوبة في المرحلة القادمة
- الواجهات ما زالت تقوم بجلب البيانات (Data Fetching) في `useEffect` بشكل مكثف مما قد يسبب Re-renders متكررة وضعف في الأداء.
- غياب الـ Pagination أو Infinite Scroll الواضح في بعض القوائم الضخمة (يوجد محاولات في العملاء ولكن تعتمد بشكل كبير على الـ Client-side).
- هيكلة الـ Components ضخمة جداً (مثل `app/c/[companyId]/page.tsx` و `CustomersManager`) وتحتاج لتقسيم (Separation of Concerns).
