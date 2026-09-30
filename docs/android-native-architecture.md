# Flowexa Native Android Architecture & Implementation Guide

## 1. نظرة عامة (Overview)
- **android-app:** المشروع الرسمي لتطبيق الأندرويد الناتيف (Official Canonical Android Application).
- **android:** مجلد قديم مهمل (Deprecated / Legacy Only) - ممنوع استخدامه في أي بناء إنتاجي أو خطوط CI.

تم تحويل تطبيق Flowexa Android من تطبيق هجين يعتمد على WebView و Java إلى تطبيق Native حقيقي 100% مبني بأحدث معايير تطوير أندرويد الرسمية.

- **اللغة:** Kotlin
- **واجهة المستخدم:** Jetpack Compose + Material 3
- **الاتجاه:** RTL أصيل (الواجهة مصممة أصلاً باللغة العربية)
- **قاعدة البيانات المحلية:** Room Database (Source of Truth للواجهة)
- **المزامنة والعمل دون اتصال:** Outbox Pattern + WorkManager + SyncEngine
- **السحابة:** Firebase Android SDK (Authentication, Firestore, Storage)
- **معرف قاعدة Firestore:** `ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9`

---

## 2. مصفوفة الإصدارات والبيئة (Verified Stack)

| المكوّن | الإصدار المعتمد |
|---|---|
| **Android Gradle Plugin (AGP)** | 8.7.0 |
| **Gradle Distribution** | 8.9 (الحد الأدنى المتوافق مع AGP 8.7) |
| **JDK** | 17 (Temurin) |
| **Kotlin** | 2.0.20 |
| **Compose Compiler Plugin** | 2.0.20 |
| **Compose BOM** | 2024.09.02 |
| **Room Database** | 2.6.1 |
| **WorkManager** | 2.9.1 |
| **Firebase BoM** | 34.19.0 (حزم أساسية غير KTX) |
| **Compile SDK / Target SDK** | 35 |
| **Min SDK** | 24 (Android 7.0+) |

---

## 3. التكامل مع Firebase (`google-services.json`)
يتطلب تفعيل Firebase قبل أول تشغيل فعلي:
- **Project ID:** `gen-lang-client-0196712383`
- **Application ID / Package:** `com.flowexa.app`
- **ملف الإعداد المطلوب محليًا/في CI:** `android-app/app/google-services.json`
- **قاعدة البيانات:** اتصال صريح بالقاعدة المسماة `ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9`.

الملف `google-services.json` لا يُحفظ في Git لأنه مرتبط بتهيئة Firebase الخاصة بالمشروع. يجب توفيره من Firebase Console عبر Secret أو خطوة إعداد آمنة قبل البناء الإنتاجي.

---

## 4. تدفق البيانات والعمل دون اتصال (Offline-First Architecture)

```
[واجهة المستخدم Jetpack Compose]
             │
             ▼
   [Room DAO & Database]  <── (المصدر الموثوق والوحيد للواجهة)
             │
             ├── PENDING / LOCAL DRAFT
             ▼
    [SyncOperationEntity (Outbox)]
             │
             ▼
  [SyncEngine & WorkManager]
             │ (عند توفر الإنترنت)
             ▼
     [Firebase Firestore]
```

1. **حماية التعديلات المحلية:** لا يقوم محرك المزامنة باستبدال أي سجل محلي إذا كانت حالته `PENDING` أو `PROCESSING`.
2. **تحديث حالة المزامنة:** يتم تحديث حقل `syncState` إلى `SYNCED` فور تأكيد نجاح الرفع إلى Firestore.
3. **تنبيهات فورية للمستخدم:** شارة ملونة في الشريط العلوي توضح عدد العمليات المنتظرة وحالة الاتصال (متصل / غير متصل).

---

## 5. خط أنابيب البناء والإصدار (CI/CD Pipeline)

الملف: `.github/workflows/build-flowexa-apk.yml`
- **بيئة التشغيل:** `ubuntu-24.04` (مستقرة ومزودة بحزم Android SDK).
- **إجراء Java:** `actions/setup-java@v5` (متوافق مع أحدث بيئات تشغيل Node.js).
- **إجراء Gradle:** `gradle/actions/setup-gradle@v4`.
- **الهدف الحصري:** يبني فقط من مجلد `android-app` دون أي رجوع للنسخة القديمة.
- **نوع البناء:** `assembleRelease` حصراً.
- **التوقيع:** يستعيد مفتاح الإصدار الدائم من `FLOWEXA_KEYSTORE_BASE64`؛ يفشل CI إذا غابت أسرار التوقيع ولا ينشئ مفتاحًا بديلًا.
- **النشر:** يرفع الـ APK إلى GitHub Artifacts وينشر إصداراً رسمياً على GitHub Releases تحت مسمى `Flowexa.apk`.
