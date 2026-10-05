# خطة ترحيل البيانات العامة (المرحلة 4) — لم تُنفَّذ بعد

## المشكلة
`companies/{id}` و`products/{id}` و`productCategories` و`productBrands` قابلة للقراءة للجميع (`allow read: if true`).
قواعد Firestore لا تقيّد الحقول عند القراءة، فيُكشف حاليًا للعموم كل حقل في وثيقة الشركة، ومنها:
`ownerId`, `joinCode`, `clientJoinCode`, `taxId`, `notes`, `phone`, `email`, `contactNumbers`، إضافة إلى كل حقول الصنف.
`joinCode` هو سر الانضمام كموظف؛ تسريبه خطير.

## لماذا لا يُحذف `allow read: if true` الآن
1. الانضمام بالرمز: `onboardingService.joinAsEmployee` (ويب) و`CompanyRepository.joinAsEmployee/joinAsClient` (أندرويد) يستعلمان `companies` بـ `joinCode`/`clientJoinCode` قبل أن يملك المستخدم `companyId`.
2. الكتالوج العام (ويب `/c/[companyId]` وأندرويد `PublicCatalogScreen`) يقرأ `companies` و`products` مباشرة.
3. العملاء الحاليون يحتاجون قراءة الأصناف.

## الخطة (توسيع ثم انكماش)
**الإصدار A — إضافات لا تكسر شيئًا**
- مجموعة `publicCatalogs/{companyId}` (حقول العرض فقط: name, logoUrl, aboutUs, workingHours, primaryCurrency, secondaryCurrencies, exchangeRates, عناوين/هواتف العرض المقصودة) ومجموعة فرعية `products/{productId}` (الحقول التي يعرضها الكتالوج فقط، للأصناف `isActive && !isDeleted`).
- مجموعة `joinCodes/{CODE}` → `{ companyId, kind: 'employee'|'client' }` للبحث بالرمز دون قراءة وثيقة الشركة.
- قواعد: القراءة عامة لـ `publicCatalogs/**`؛ الكتابة لمالك/مدير الشركة فقط؛ `joinCodes` قراءة (get فقط) للمستخدم المسجَّل.
- الكتابة المزدوجة: الويب (`productService`, `companyService`, `settingsService`, `onboardingService`) وأندرويد (في `SyncEngine.applyOperation` بعد نجاح عملية على `products`/`companies`) تحدّثان الإسقاط.
- ترحيل البيانات الحالية (backfill) لكل الشركات والأصناف (سكربت لمرة واحدة بصلاحية المالك أو Admin SDK).

**الإصدار B — تحويل القراءة**
- الويب وأندرويد يقرآن الكتالوج العام من `publicCatalogs` وبحث الرمز من `joinCodes`.
- الانتظار حتى يتحدّث جميع المستخدمين (أو فرض حد أدنى لـ `versionCode`).

**الإصدار C — الانكماش**
- `companies` و`products` و`productCategories` و`productBrands`: القراءة لأعضاء الشركة فقط (ويحتاج العملاء قراءة الأصناف ضمن شركتهم).
- تدوير `joinCode` و`clientJoinCode` لكل الشركات لأنها كُشفت سابقًا.

## ملاحظة
الإسقاط المكتوب من العميل ليس "موثوقًا" (مالك خبيث قد يكتب ما يشاء في كتالوج شركته فقط، وهذا مقبول لأنه بياناته العامة). لا يلزم Cloud Functions في هذه المرحلة.
