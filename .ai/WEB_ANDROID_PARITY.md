# WEB_ANDROID_PARITY

Rule (DEC-002): Web is the behavioral reference unless a confirmed security/correctness defect says otherwise. Do not change Web merely to match Android.
Gap status: CONFIRMED (verified in source), INTENTIONAL, NEEDS VERIFICATION, FIXED. All CONFIRMED items are static findings (runtime NOT VERIFIED). No gap is FIXED yet. Basis: 2026-10-06/07 audit; Android screens/Web components not fully read are marked.

| ID | Area | Web | Android | Status | Issue/Task |
|---|---|---|---|---|---|
| P-01 | Landing page | `LandingPage` for visitors | Splash → Login, no landing | CONFIRMED difference; intent undecided (OPEN-002) | — |
| P-02 | Logo | `public/logo.jpg` via `AppLogo` | `AppLogoView` draws Material `AutoGraph` icon; real asset `res/drawable/flowexa_logo.png` is used only by launcher/splash. Assets look like the same mark (visual check only) | CONFIRMED | KI-015, T12 |
| P-03 | Login methods | email/password, Google, email-link | email/password, Google | CONFIRMED (email-link send missing) | KI-016, T09 |
| P-04 | Email-link | send (`sendSignInLinkToEmail` with `android` settings) + complete | complete only (`EmailLinkDialog`, `completeEmailLinkSignIn`); intent filter has no `autoVerify` | CONFIRMED; app-open behavior NEEDS VERIFICATION (V3) | KI-016 |
| P-05 | Google Sign-In | popup → redirect fallback | Credential Manager → `GoogleAuthProvider` | NEEDS VERIFICATION (OAuth/SHA external, V2) | — |
| P-06 | Registration | auth user only; Onboarding creates profile | pre-creates `client` profile; later role change is forbidden by rules | CONFIRMED | KI-008, T06 |
| P-07 | Profile write semantics | `setDoc` full doc with `createdAt` | outbox `UPDATE` (`set(merge)`) without `createdAt` for new docs | CONFIRMED | KI-009, T06 |
| P-08 | Employee join | `pending_employee`, `companyId ''`, `pendingCompanyId`, `join_request` notification with `userId` | `companyId` = company, no `pendingCompanyId`, type `staff_join`, payload lacks `isDeleted`/`userId` | CONFIRMED | KI-008, KI-010, T06 |
| P-09 | Employee reject | `companyId '' ; role client; pendingCompanyId null` | soft-delete profile only (role/company unchanged) | CONFIRMED | KI-022, T06 |
| P-10 | Staff list/approval | staff via company profile query; approval via `join_request` notification dialog | `StaffScreen` reads Room only; other users' profiles never synced | CONFIRMED (Staff/Notifications screens not read in full) | KI-011, T11 |
| P-11 | Client joining | phone + store name; `companyId ''` | `clientJoinCode` lookup; profile gets `companyId` | CONFIRMED difference (not necessarily by design; OPEN-001) | KI-003, KI-006 |
| P-12 | Client data access | queries by `createdBy`/`clientUid`; no customers | pulls all company customers/orders/notifications by `companyId` | CONFIRMED | KI-006, T03 |
| P-13 | Order `source` | `'customer'` | `'client'` | CONFIRMED | KI-014, T10 |
| P-14 | Order status at creation | first order-stage name, else `pending` | always `pending` | CONFIRMED; status mapping on Android screens NEEDS VERIFICATION | C-04 |
| P-15 | Order customer link | existing `linkedCrmCustomerId`, else uid | `crm_client_<uid>` or Room customer with `appUserId` | CONFIRMED difference; Android lookup depends on the customer cache | — |
| P-16 | Bonus tiers | first matching tier, percent only | highest `minQty` wins (ties: later), supports `fixedBonus` | CONFIRMED | KI-017, T13 |
| P-17 | Invoice restrictions | `cash_only`, `cash_or_pending` | same rules in `OrderRules`; Android also checks stock and currency restrictions | PARTIALLY VERIFIED (Web stock/currency checks not verified) | — |
| P-18 | Special offers / cart | offer price in cart; cart in `ClientProducts` | not inspected | NEEDS VERIFICATION | — |
| P-19 | Permissions | `hasPermission` (UI only) | `PermissionManager` (unused by screens) | CONFIRMED | C-06 |
| P-20 | Public catalog | `/c/{companyId}` page | `PublicCatalogScreen` + deep link `/c/{id}` | CONFIRMED present on both; live link verification EXTERNAL | V3 |
| P-21 | Favorites | `favoriteProductIds` via `toggleFavoriteProduct` | `FavoritesRepository` (ARRAY_ADD/REMOVE ops) | PARTIALLY VERIFIED | — |
| P-22 | Offline | localforage queue, retries forever, not cleared at logout | Room outbox + WorkManager, permanent errors visible | INTENTIONAL difference in design; both have logout gaps | KI-007, KI-018 |
| P-23 | Logout | `signOut` only | deletes profile row only | CONFIRMED (both leave data) | KI-007, KI-018, T04, T14 |
| P-24 | Backup | n/a | `allowBackup=true`, no rules | CONFIRMED | KI-013, T07 |
| P-25 | Deep links | n/a (web URLs) | `/c/` (autoVerify) + auth-host filter | INTENTIONAL (Android only) | — |
| P-26 | Colors/typography/spacing/splash/empty states | — | — | NEEDS VERIFICATION (not compared) | — |
| P-27 | Notifications | `join_request`, `client_order`, reminders | `staff_join` (invalid), general | CONFIRMED difference | KI-010 |
| P-28 | AI description generation | `/api/generate-description` via ProductFormDialog | none seen | NEEDS VERIFICATION | — |
| P-29 | Employee removal | CompanySettings writes `{companyId:null, role:null}` | none seen | CONFIRMED defect on Web side vs rules | KI-019 |
| P-30 | Customers/CRM, phones, merge | `CustomersManager` | `CustomerRepository` with phones + merge | PARTIALLY VERIFIED (Web phone model uses `contactNumbers`; Android adds `customerPhones`) | — |

## Intentional differences (explicit)

- Android is offline-first with Room/outbox; Web is online-first with a small queue (DEC-007 architecture fact).
- Android handles app links/deep links; Web does not need them.
