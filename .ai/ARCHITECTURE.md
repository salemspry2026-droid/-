# ARCHITECTURE

Evidence: static reading, 2026-10-06/07, HEAD `94fe721`. Status VERIFIED (static) unless stated. Runtime behavior of everything below is NOT VERIFIED.

## 1. Repository map

| Path | What | Notes |
|---|---|---|
| `app/` | Next.js App Router | `page.tsx` (auth gate: landing/login/onboarding/dashboards), `c/[companyId]/page.tsx` (public catalog), `api/generate-description/route.ts`, `api/download-apk/route.ts` |
| `components/` | React components (~45) incl. `ui/` | Dashboards, dialogs, managers |
| `lib/` | `firebase.ts`, `store.ts`, `utils.ts`, `services/*`, `offline/*`, `hooks/*` | Service layer |
| `public/` | `logo.jpg`, `icons/`, `manifest.json`, `sw.js`, `.well-known/assetlinks.json` | PWA + app-link identity |
| `android-app/` | **Canonical native Android** | See §3 |
| `android/` | **Legacy, deprecated, do not touch** | Not inspected |
| `firestore.rules` | Firestore security rules (451 lines) | No `firebase.json`/indexes/storage rules in repo |
| `.github/workflows/` | `build-flowexa-apk.yml`, `print-signer-fingerprint.yml`, `verify-assetlinks-live.yml` | Protected |
| `scripts/ci/` | `validate-release-apk.sh`, `emulator-smoke.sh`, `verify-assetlinks-live.sh`, `lib-fingerprint.py` | Protected |
| `scripts/build-apk.sh` | Static checks + guidance (does not build locally) | per completion report |
| `docs/` | Human docs (mostly Arabic), historical | Source code wins |
| `firebase-applet-config.json`, `firebase-blueprint.json`, `metadata.json` | Web Firebase config / blueprint | Config values not copied here |
| root `test.js`, `res.txt`, `onsnapshot_usages.txt` | Scratch artifacts | UNKNOWN purpose; stale (C-07) |

## 2. Web architecture

- Stack: Next.js ^15.4.9, React ^19.2.1, TypeScript 5.9.3, Zustand ^5.0.12, Firebase JS SDK ^12.12.0, localforage ^1.10.0, `@google/genai` ^1.17.0 (server route). VERIFIED (package.json).
- `lib/firebase.ts`: `initializeAuth` with IndexedDB + local persistence and popup/redirect resolver; Firestore via `initializeFirestore` with `experimentalForceLongPolling` and `persistentLocalCache` (multi-tab) on the **named database** from `firebase-applet-config.json`; Storage; Google provider with `prompt: select_account`.
- Auth: `components/AuthProvider.tsx` → `onAuthStateChanged` → `authService.subscribeToUserProfile` → Zustand (`user`, `profile`, `isProfileLoaded`). `app/page.tsx` gates: not signed in → `LandingPage`/login; no profile → `Onboarding`; `pending_employee` → wait screen; `admin/owner/sales` → staff dashboards; else client dashboard.
- State: `lib/store.ts` (Zustand). Only `clientSelectedCompany` is persisted (`app-storage`). UI slice: activeTab, notifications, selected order, incoming call.
- **Service layer (`lib/services/`)**: `authService`, `onboardingService`, `companyService`, `customerService`, `orderService`, `productService`, `notificationService`, `settingsService`, `auditLogService`, `locationService`. Components call services; no component imports `firebase/firestore` directly (verified by grep; C-07 notes the stale artifact claiming otherwise). `settingsService.subscribeToCollection` is generic (`companyId`+`isDeleted==false`) used by `lib/hooks/useCompanyCollection.ts`.
- Authorization in the UI: `hasPermission(profile, module, action)` in `lib/utils.ts` (per-user `permissions` map with role defaults). **UI-only**; rules ignore `permissions`.
- Offline: `lib/offline/writeQueue.ts` (localforage queue; `withOfflineWrite` queues on network-type errors), `syncManager.ts` (flush on `online`, visibility, every 60 s; swallows errors and retries forever), `network.ts` (status store). Not cleared on logout (KI-018).
- PWA: `public/manifest.json`, `public/sw.js`, `ServiceWorkerRegister.tsx`.
- API routes: `/api/generate-description` (Gemini, unauthenticated — KI-012); `/api/download-apk` (307 redirect to the GitHub release asset `Flowexa.apk`).
- Build: `next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` (KI-023). Only script: `lint`.

## 3. Android architecture (`android-app/`)

- Package `com.flowexa.app`; AGP 8.7.0 / Gradle 8.9 / Kotlin 2.0.20 (per `docs/android-completion-report.md`, NOT re-verified); compile/target SDK 35, min 24; Compose + Material3; Room (v2, `exportSchema=true`, KSP schema location `app/schemas` which is absent from the repo); WorkManager; Firebase BoM 33.6.0 (docs) auth/firestore/storage/analytics; Credential Manager + `googleid`. Release minify off.
- Layers (`app/src/main/java/com/flowexa/app/`):
  - `MainActivity` (singleTask; parses deep links), `FlowexaApplication`.
  - `core/AppConfig` (collection names, roles, sync states, `FIRESTORE_DATABASE_ID`, `WEB_HOST`, `FIREBASE_AUTH_LINK_HOST`).
  - `auth/GoogleAuthManager`; `data/repository/AuthRepository` (`ProfileLoadResult` = Found/NotFound/Unavailable; offline-first profile cache).
  - `data/local/` — `FlowexaDatabase` (version 2, `MIGRATION_1_2`), 13 DAOs, entities (see `DATA_MODEL.md`).
  - `data/remote/` — `FirebaseProvider` (named Firestore DB), `FirestoreMappers`.
  - `data/repository/` — Auth, Company, Customer, Order, Product, ProductCategory, ProductBrand, Location, OrderStage, Notification, Favorites repositories: write to Room + enqueue `SyncOperationEntity`.
  - `domain/` — `BonusCalculator`/`BonusTier`/`BonusTierParser`, `OrderRules`, `PermissionManager` (unused by screens), `PhoneNormalizer`.
  - `sync/` — `SyncEngine` (single-flight outbox upload; `syncCompanyData` pull), `SyncWorker`, `SyncScheduler` (unique one-time + 15-min periodic work).
  - `navigation/` — `FlowexaApp.kt` (~1080 lines: routing, wiring, and several inline data operations), `Routes`, `DeepLink`/`DeepLinkParser`.
  - `ui/` — auth, onboarding, admin, products, customers, orders, staff, settings, notifications, client, catalog, components, theme. `service/PriceListPdfService`.
- Outbox: ops `CREATE/UPDATE/DELETE/ARRAY_ADD/ARRAY_REMOVE`; all applied as `set(..., merge)`; `createdAt` added only for `CREATE`; `updatedAt` always server timestamp; `updatedBy`/`createdBy` defaulted to the signed-in uid; permanent errors → `FAILED` (not auto-retried); transient errors stop the loop and retry.
- Pull (`syncCompanyData`): company, products, categories, brands, locations, stages, customers, customer phones (staff only), orders, notifications — by `companyId`. Other users' `userProfiles` are **never** pulled (KI-011).
- Routing (`FlowexaApp.routeAfterAuth`): pending → PendingApproval; no company and not client → Onboarding; client → ClientHome; else AdminHome. Splash → Login if no user.
- Deep links: `https://orderflow-topaz.vercel.app/c/{companyId}` (autoVerify) and Firebase email links on the `firebaseapp.com` auth host (no autoVerify). `DeepLinkParser` is pure and unit-tested.
- Manifest: `allowBackup="true"`, `networkSecurityConfig` (no cleartext), `FileProvider`. No `dataExtractionRules`.

## 4. Firebase integration

- Project shared by Web and Android; Firestore **named database** `ai-studio-c5fd0d2f-…` (VERIFIED static in both configs). Auth: email/password, Google, email-link (code). Providers actually enabled: EXTERNAL VERIFICATION REQUIRED.
- Rules in repo: `firestore.rules`. Deployed rules: EXTERNAL VERIFICATION REQUIRED. Storage: Web uploads client logos to `clientLogos/{uid}/…` (`authService.uploadProfileImage`); company-logo upload exists in `CompanySettings.tsx` but its storage path was not inspected; no `storage.rules` in repo.

## 5. CI/CD (`.github/workflows`, `scripts/ci`)

- `build-flowexa-apk.yml`: version from run number; restore keystore + `google-services.json` from GitHub Secrets; validate; unit tests (`testReleaseUnitTest`); `assembleRelease`; `validate-release-apk.sh` (zip, zipalign, aapt2, apksigner, expected signer from `android-app/signing/expected-signer-sha256.txt`, assetlinks content); upload APK; `runtime-smoke` on an API 35 emulator (`emulator-smoke.sh`: install, launch, crash/ANR scan, two deep links); `instrumented-migration-test` (NOT a gate); `publish-release` after build+smoke.
- `verify-assetlinks-live.yml`: retried live check of `https://orderflow-topaz.vercel.app/.well-known/assetlinks.json` (push/daily).
- Status of actual runs: EXTERNAL VERIFICATION REQUIRED (docs say never run). No Web CI, no rules tests in CI.

## 6. Important patterns

- Soft delete everywhere (`isDeleted`); rules define no hard deletes (no `allow delete` except `customerPhones: if false`).
- Audit fields on every document: `createdAt/By`, `updatedAt/By` enforced by rules (`isCreatedByCurrentUser`, `isUpdatedByCurrentUser`).
- Web = online-first with a small offline queue; Android = offline-first with Room + outbox.
- Company-scoped queries (`where companyId == X`) everywhere on staff paths; client paths query by `createdBy`/`clientUid`.
