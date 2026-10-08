# KNOWN_ISSUES

Only verified (static) or explicitly unresolved issues. "Verified" = confirmed by reading current source (2026-10-06/07, HEAD `94fe721`); runtime/deployment is NOT VERIFIED unless noted. Each issue lists the proposed task from `claude/AUDIT_REPORT.md` (none implemented). Severity applies only to security items. Nothing intentionally public (DEC-003) is listed.
Status values: OPEN (confirmed, unfixed), OPEN–EXTERNAL (needs external verification to size), BLOCKED (needs a user decision).

---
**Issue ID:** KI-001
**Title:** Any user can self-create a profile as `owner` of any company
**Classification:** SECURITY VULNERABILITY
**Severity:** CRITICAL
**Status:** OPEN (rules in repo; deployed state EXTERNAL VERIFICATION REQUIRED)
**Description:** `userProfiles` create requires only `uid == userId`, valid shape and `createdBy/updatedBy == uid`; `role` may be `owner`; `companyId` may be any company.
**Evidence:** `firestore.rules` `match /userProfiles` (~lines 267-277); `isValidUserProfile` (~127).
**Affected Files:** `firestore.rules`
**Workaround:** none in repo.
**Required Action:** T01 (needs user authorization to edit `firestore.rules`; add Emulator rules tests; do not publish).
**Update 2026-10-07 (T01 review, VER-001):** a rules fix exists UNCOMMITTED in the working tree and was independently verified correct (83/83 Emulator tests; 24 attack tests fail on HEAD rules). Issue remains OPEN: the change is not committed/pushed/deployed, and T01 FAILED the release gate for missing tests and a `package.json` dependency conflict.

**Issue ID:** KI-002
**Title:** Self-update can change `companyId` and `permissions`; admin update can mint owners/move members
**Classification:** SECURITY VULNERABILITY
**Severity:** CRITICAL
**Status:** OPEN
**Description:** Self-update branch freezes only `role` (`areImmutableFieldsUnchanged(['role'])`, ~line 285): an admin of A can set own `companyId = B` and stay admin. Admin branch has no constraint on new `role`/`companyId`. `permissions` is self-writable (UI-only field).
**Evidence:** `firestore.rules` ~lines 279-292.
**Required Action:** T01 (+ Addendum for removal semantics).
**Update 2026-10-07 (T01 review, VER-001):** same status as KI-001 — verified-correct fix is in the uncommitted working tree; issue remains OPEN until T01 passes the gate and is committed and deployed. Residual by design: `client`/`pending_employee` may still change own `companyId` (KI-003/T02); admin may edit own `permissions`; Web employee removal still rejected (KI-019).

**Issue ID:** KI-003
**Title:** `isCompanyMember` is role-blind; clients/pending employees with `companyId` read all company data
**Classification:** SECURITY VULNERABILITY (conditional on profile `companyId`)
**Severity:** HIGH
**Status:** OPEN; exposure in production OPEN–EXTERNAL (depends on deployed rules and existing profile data, V1/V5)
**Description:** Membership = `profile.companyId == X`. Web clients have `companyId ''` (not members). Android sets `companyId` on clients (`joinAsClient`) and pending employees (`joinAsEmployee`), making them members who may read customers, orders, notifications, locations, order stages. Self-edit of `companyId` (KI-002) also grants it.
**Evidence:** `firestore.rules:28`; `CompanyRepository.kt` `joinAsClient` (~302-390), `joinAsEmployee` (~183-300); `onboardingService.joinAsClient`.
**Required Action:** T02 (role-aware membership) after T03/T06 ship; decision OPEN-001/OPEN-003.

**Issue ID:** KI-004
**Title:** Repo rules block Web client ordering/notifications/`orderStages`/phone lookup
**Classification:** IMPLEMENTATION BUG (rules vs Web)
**Severity:** n/a (functional)
**Status:** OPEN–EXTERNAL (if deployed rules differ, impact differs)
**Description:** `isCompanyClient` requires `profile.companyId == companyId`; Web clients have `companyId ''`, so client order create and `client_order` notification create fail; `orderStages` read requires membership; `authService.findClientByPhone` is a broad list query that the `userProfiles` read rule cannot satisfy (and `findClientsWithFavoriteProduct` filters `companyId == X` which never matches Web clients).
**Evidence:** `firestore.rules:49`, orders create (~364+), notifications create, `orderStages` read (~436); `orderService.placeClientOrder`, `authService.findClientByPhone`, `ClientProducts.tsx` (`subscribeToOrderStages`).
**Required Action:** V1 first; T02 for orders/notifications; OPEN-004/OPEN-005 for lookup/stages.

**Issue ID:** KI-005
**Title:** Join codes, tax ID and other non-catalog fields are publicly readable in `companies`
**Classification:** SECURITY VULNERABILITY
**Severity:** HIGH
**Status:** OPEN (documented in `docs/public-data-migration-plan.md`; plan not executed, DEC-009)
**Description:** `allow read: if true` on `companies` exposes `joinCode`, `clientJoinCode`, `taxId`, `ownerId`, `email`, `notes` (catalog fields are intentionally public, DEC-003).
**Evidence:** `firestore.rules:252`; Web `joinAsEmployee` queries `companies` by `joinCode`; Android `joinAsEmployee/joinAsClient` query by code.
**Required Action:** T05 (proposal); rotate codes after (V6).

**Issue ID:** KI-006
**Title:** Android `syncCompanyData` pulls all customers/orders/notifications for any role
**Classification:** SECURITY VULNERABILITY (client-privacy; relies on KI-003 to succeed)
**Severity:** HIGH
**Status:** OPEN
**Description:** Only `customerPhones` is role-gated. Customers (~321-329), orders (~351-363), notifications (~365-369) are pulled by `companyId` for non-staff and cached in Room. The pull aborts on its first exception.
**Evidence:** `android-app/.../sync/SyncEngine.kt`; `SyncWorker.kt`.
**Required Action:** T03.

**Issue ID:** KI-007
**Title:** Android logout leaves business data and outbox in Room
**Classification:** SECURITY VULNERABILITY (device-level)
**Severity:** HIGH (needs device/backup access)
**Status:** OPEN
**Description:** `AuthRepository.logout` calls `signOut` and deletes only the profile row; customers, phones, orders, outbox remain; WorkManager jobs not cancelled.
**Evidence:** `AuthRepository.kt` `logout` (~169-175); call sites in `FlowexaApp.kt`.
**Required Action:** T04.

**Issue ID:** KI-008
**Title:** Android register pre-creates a `client` profile; later owner/employee choice is a forbidden role change
**Classification:** IMPLEMENTATION BUG
**Severity:** n/a
**Status:** OPEN (runtime NOT VERIFIED; depends on deployed rules)
**Description:** `register` writes `role: client`. `createCompany` / `joinAsEmployee` then `UPDATE` role to `owner` / `pending_employee`; rules forbid self role change (~285). `routeAfterAuth` also sends existing `client` profiles to ClientHome, so Onboarding is unreachable on later launches (C-09).
**Evidence:** `AuthRepository.kt` `register` (~65-92); `CompanyRepository.kt`; `FlowexaApp.kt` `routeAfterAuth`; `firestore.rules`.
**Required Action:** T06; decision OPEN-003 for existing profiles.

**Issue ID:** KI-009
**Title:** Android profile writes use `UPDATE` (no `createdAt`) even when the doc may not exist
**Classification:** IMPLEMENTATION BUG
**Status:** OPEN (runtime NOT VERIFIED)
**Description:** `SyncEngine.applyOperation` adds `createdAt/createdBy` only for `CREATE`; first-time Google/email-link users have no remote profile, so a `set(merge)` is a rules create missing required `createdAt` → permanent failure.
**Evidence:** `SyncEngine.kt` (~170-190); `CompanyRepository.createCompany/joinAsEmployee/joinAsClient` use `UPDATE`.
**Required Action:** T06.

**Issue ID:** KI-010
**Title:** Android join-request notification is invalid and uses a different type than Web
**Classification:** IMPLEMENTATION BUG / PARITY
**Status:** OPEN
**Description:** Payload lacks `isDeleted` (required), uses `type: staff_join`, no `userId`; rules allow the join-request branch only for `type == 'join_request' && userId == uid`; Web `JoinRequestDialog` handles only `join_request` with `userId`.
**Evidence:** `CompanyRepository.kt` ~261-293; `firestore.rules` notifications create/`isValidNotification`; `JoinRequestDialog.tsx`.
**Required Action:** T06.

**Issue ID:** KI-011
**Title:** Android never syncs other users' profiles; Staff approval/list cannot work from synced data
**Classification:** FUNCTIONAL PARITY GAP
**Status:** OPEN (Staff/Notifications screens not read in full)
**Evidence:** `docToUserProfile` used only in `AuthRepository.refreshUserProfile`; no `userProfiles` pull in `SyncEngine`; `UserProfileDao.observeStaff/observePendingStaff`.
**Required Action:** T11 (code blocked until screens are read and T06 model decided).

**Issue ID:** KI-012
**Title:** `/api/generate-description` is unauthenticated
**Classification:** SECURITY VULNERABILITY
**Severity:** MEDIUM (cost abuse)
**Status:** OPEN
**Evidence:** `app/api/generate-description/route.ts` (no auth, no limits; uses `GEMINI_API_KEY`).
**Required Action:** T08.

**Issue ID:** KI-013
**Title:** Android `allowBackup="true"` with no extraction rules
**Classification:** SECURITY VULNERABILITY
**Severity:** LOW–MEDIUM (cached customers/phones/orders/outbox)
**Status:** OPEN
**Evidence:** `AndroidManifest.xml:9`; `res/xml` has only `file_paths.xml`, `network_security_config.xml`.
**Required Action:** T07.

**Issue ID:** KI-014
**Title:** Android client orders use `source: "client"`; Web uses `'customer'`
**Classification:** IMPLEMENTATION BUG (parity)
**Status:** OPEN
**Evidence:** `FlowexaApp.kt` (ClientCreateOrder, `source = "client"`); Web `getDashboardStats`, `OrdersManager.tsx:93,303`, `HomeTab.tsx:254`; `OrderEntity` comment (C-03).
**Required Action:** T10 (existing Android data backfill not specified).

**Issue ID:** KI-015
**Title:** `AppLogoView` shows a Material icon, not the Flowexa logo
**Classification:** UI/UX PARITY GAP
**Evidence:** `AppLogoView.kt` (`Icons.Default.AutoGraph`); real asset `res/drawable/flowexa_logo.png` unused there. **Required Action:** T12.

**Issue ID:** KI-016
**Title:** Android cannot send an email sign-in link
**Classification:** FUNCTIONAL PARITY GAP
**Evidence:** no `sendSignInLinkToEmail` in `android-app`; Web `app/page.tsx` has it. **Required Action:** T09 (depends on V3).

**Issue ID:** KI-017
**Title:** Bonus tier selection differs between Web and Android
**Classification:** IMPLEMENTATION BUG (parity; only with overlapping tiers or `fixedBonus`)
**Evidence:** Web `ClientProducts.tsx` `calculateBonus` (first match); `BonusCalculator.kt` `calculateTieredBonus` (highest `minQty`). **Status:** BLOCKED on OPEN-007. **Required Action:** T13.

**Issue ID:** KI-018
**Title:** Web logout does not clear the offline write queue / persistence; failed queue items retry forever
**Classification:** IMPLEMENTATION BUG (LOW security)
**Evidence:** `authService.logout`; `lib/offline/writeQueue.ts`, `syncManager.ts`. **Required Action:** T14.

**Issue ID:** KI-019
**Title:** Web "remove employee" writes `{companyId:null, role:null}`, which fails rules validation
**Classification:** IMPLEMENTATION BUG (rules vs Web) — found during KB initialization
**Status:** OPEN; BLOCKED on OPEN-008; runtime NOT VERIFIED
**Evidence:** `components/CompanySettings.tsx` `handleRemoveEmployee`; `firestore.rules` `isValidUserProfile` (`role in [...]`). **Required Action:** T15 (addendum) + amend T01.

**Issue ID:** KI-020
**Title:** Client-created orders carry unvalidated `status`, totals, prices, `customerId`, `clientUid`
**Classification:** POLICY DECISION REQUIRED (integrity)
**Status:** BLOCKED on OPEN-006
**Evidence:** `isValidOrder`; `placeClientOrder`; `clientUid` not forced to writer uid. A client could inject an order into another client's list (no read of theirs).

**Issue ID:** KI-021
**Title:** Room migration/CI never verified; schemas not committed
**Classification:** NEEDS VERIFICATION
**Evidence:** `Migration1To2Test` synthetic; no `app/schemas`; report §4 "not run". **Required Action:** V4.

**Issue ID:** KI-022
**Title:** Android "reject employee" only soft-deletes the profile
**Classification:** IMPLEMENTATION BUG (parity)
**Evidence:** `FlowexaApp.kt` Staff `onRejectEmployee` (`softDelete` + `DELETE` op) vs Web `JoinRequestDialog` reject payload. Rules ignore `isDeleted` for membership. **Required Action:** T06.

**Issue ID:** KI-023
**Title:** Web build ignores TypeScript and ESLint errors
**Classification:** QUALITY (LOW)
**Evidence:** `next.config.ts`. **Required Action:** none assigned.

**Issue ID:** KI-024
**Title:** Web phone lookup and favorite-client lookups cannot work under the repo rules
**Classification:** see KI-004; policy OPEN-004. (Merged for tracking.)

**Issue ID:** KI-025
**Title:** `auditLogs` create and `notifications` update allowed for any company member
**Classification:** SECURITY VULNERABILITY **Severity:** LOW
**Evidence:** `firestore.rules` auditLogs create (`isCompanyMember`), notifications update. Narrowed automatically by T02's role-aware membership.

**Issue ID:** KI-026
**Title:** System admin identified by a hardcoded email in rules
**Classification:** SECURITY (hardening) **Severity:** LOW
**Evidence:** `isSystemAdmin()` (requires `email_verified`). **Required Action:** none assigned (design decision).

## Verification-dependent items (not issues yet)

Google Sign-In config, app-link verification, deployed rules, Storage rules, CI results, runtime of all Android flows: see `TESTING_STATUS.md` and V1–V8 in `claude/AUDIT_REPORT.md`.
