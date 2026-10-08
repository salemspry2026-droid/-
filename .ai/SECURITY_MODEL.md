# SECURITY_MODEL

Three layers are kept separate in every section: **POLICY** (intended; see `FLOWEXA_BUSINESS_POLICY.md`), **IMPLEMENTATION** (current repo source), **VERIFICATION** (what is actually proven). Static reading of `firestore.rules` at HEAD `94fe721` is the basis. **Nothing here proves production rules, Storage rules, Auth/OAuth settings or runtime behavior.** Never write "secure" about production on the basis of the local rules file.

Intentionally public company-facing information (company name/logo/contact, products, prices, offers, bonuses, categories, brands, availability) is NOT a vulnerability (DEC-003). The security boundary is tenant-to-tenant and client-to-client private data (DEC-004).

## 1. Tenant isolation (company A ↔ company B)

- POLICY: staff of A must not read/write B's customers, orders, staff, audit logs, settings.
- IMPLEMENTATION: `isCompanyMember(c)` = authenticated and `profile.companyId == c` (line ~28; **no role check**). Admin/sales/owner helpers build on it. Collections check the document's own `companyId`.
- Holes: a user can set their own `companyId` (self-update, any role) or self-create as `owner` of any company (`userProfiles` rules, lines ~267-292) → cross-tenant takeover (KI-001, KI-002).
- VERIFICATION: static only. No rules tests exist. Deployed rules EXTERNAL VERIFICATION REQUIRED.

## 2. Company membership

- POLICY: members = owner/admin/sales. Clients are not members (Web writes `companyId ''`). Pending employees are not members until approved.
- IMPLEMENTATION: membership is role-blind; any profile with `companyId == X` is a member. Android assigns `companyId` to clients (`joinAsClient`) and to pending employees (`joinAsEmployee`), so on Android-created profiles they pass `isCompanyMember` (KI-003).
- Admin edits of other profiles: `isCompanyAdmin(resource.companyId)` or admin of `pendingCompanyId`; no restriction on the new `role`/`companyId` (can set `owner`, can move members) (KI-002).
- VERIFICATION: static only.

## 3. Client isolation and customer privacy

- POLICY: Client A must not read Client B's profile, phone, address, orders, quantities, notes, activity; clients never read CRM `customers`.
- IMPLEMENTATION:
  - Profiles: readable only by self, same-company admin, system admin → client-to-client profile read is blocked. VERIFIED (static).
  - Orders: read allowed for members, creator (`createdBy == uid`), `clientUid == uid`, system admin. Web client queries are scoped by `createdBy`/`clientUid`. A client who is a *member* (Android-model profile with `companyId`) can read ALL company orders and customers via `isCompanyMember` (KI-003). Android `SyncEngine.syncCompanyData` pulls them for any role (KI-006).
  - `customerPhones`: staff-only (`isCompanyStaff`) — the only strictly role-scoped collection. Publication UNKNOWN.
  - `clientUid`, `customerId`, `status`, `items`, `totalAmountByCurrency` are free-form on order create; `clientUid` is not forced to the writer's uid (KI-020) — integrity risk (order injected into another client's list), not a confidentiality leak (the victim's orders cannot be read).
- VERIFICATION: static only; never runtime-tested.

## 4. Order ownership and authorization

- Create: `isValidOrder` + `createdBy/updatedBy == uid` + (`isCompanyMember(companyId)` or `isCompanyClient(companyId)`). `isCompanyClient` requires `profile.companyId == companyId` → blocks Web clients (`companyId ''`) (KI-004).
- Update: admin/owner (any), sales (not `isDeleted`), creator (not `status, totals, items, companyId, customerId, linkedCrmCustomerId, isDeleted`). `createdAt/createdBy/companyId` unchanged-or-backfilled.
- Soft delete only by admin/owner. No hard deletes.

## 5. Role authorization (rules)

- Helpers: `isCompanyAdmin` (admin or owner), `isCompanyOwner`, `isCompanySales`, `isCompanyStaff` (admin|sales — owner counted via admin), `isSystemAdmin` (hardcoded email + `email_verified`, KI-026 Low).
- Per-user `permissions` (Web `hasPermission`, Android `PermissionManager`) are **UI-only**; rules never read them. A sales user's UI restrictions are not security boundaries. `permissions` is also self-writable by the owner of the profile (no immutability) (KI-002).

## 6. Immutable / security-sensitive fields

| Collection | Immutable today | Should be (proposed in T01/T02, NOT implemented) |
|---|---|---|
| userProfiles | `createdAt`, `createdBy`; `role` for self-update | also `permissions` (self), `companyId` for staff roles (self); admin may not set `owner` or move members |
| companies | `createdAt`, `createdBy`, `ownerId` | — |
| customers/products/locations/stages/categories/brands | `createdAt`, `createdBy`, `companyId` | — |
| orders | see §4 | — |
| notifications | `createdAt`, `createdBy`, `companyId`, `type` | — |
| auditLogs | all (no update/delete) | — |

Security-sensitive fields: `userProfiles.role/companyId/pendingCompanyId/permissions`, `companies.ownerId/joinCode/clientJoinCode/taxId`, `orders.clientUid/customerId/status/items/totals`.

## 7. Public data and join codes

- `companies`, `products`, `productCategories`, `productBrands` read: `if true`. Intentional for catalog data (DEC-003). Unintentional side effect: `joinCode`, `clientJoinCode`, `taxId`, `ownerId`, `email`, `notes` are readable by anyone (KI-005). The repo documents this and a staged plan (`docs/public-data-migration-plan.md`, DEC-009); plan not executed. Join codes were publicly readable, so rotation is advised after any fix (V6).

## 8. Secondary collections

- `notifications`: read by members, `clientUid`/`userId` owner; update by any member (including clients with `companyId`) (KI-025).
- `locations`, `orderStages`: read by any member; client visibility policy OPEN-005.
- `auditLogs`: create by any member (KI-025); read admin/owner.

## 9. Backend/API

- `/api/generate-description`: unauthenticated; spends `GEMINI_API_KEY`; no rate limit (KI-012). Key is server-side env (not in repo; not inspected).
- `/api/download-apk`: public redirect to a GitHub release asset (no secret).

## 10. Android-specific

- Cached business data (customers, phones, orders, outbox) in Room; `allowBackup="true"`, no extraction rules (KI-013); logout deletes only the profile row (KI-007); sync pulls everything by `companyId` for non-staff (KI-006).
- Network: cleartext disabled, system trust anchors only. VERIFIED (static).
- Signing: release keystore is gitignored and restored from GitHub Secrets in CI; expected signer SHA-256 file and `assetlinks.json` carry public fingerprints. CI signing correctness EXTERNAL VERIFICATION REQUIRED. Secrets were never read in the audit.
- App links: `autoVerify` only on the Vercel `/c/` filter; email-link filter is unverified and matches the whole auth host (`DeepLinkParser` restricts to `/__/auth/`).

## 11. Web-specific

- Logout does not clear the offline write queue or Firestore IndexedDB persistence (KI-018). `firebase-applet-config.json` holds public Firebase web config (not secret by design). No security headers/CSP reviewed (UNKNOWN).

## 12. Verified protections (static) vs not verified

| Protection | Status |
|---|---|
| `createdBy/updatedBy` must equal writer uid | VERIFIED (static) in rules; Android `SyncEngine` supplies uid; runtime NOT VERIFIED |
| Profile read limited to self/company admin/system admin | VERIFIED (static); deployed state EXTERNAL VERIFICATION REQUIRED |
| `customerPhones` staff-only + company isolation | VERIFIED (static); not published per docs |
| Audit logs immutable | VERIFIED (static) |
| No hard deletes | VERIFIED (static) |
| `companies.ownerId` immutable | VERIFIED (static) |
| Cleartext HTTP disabled on Android | VERIFIED (static) |
| Any of the above in production | EXTERNAL VERIFICATION REQUIRED |
| Rules behavior under the Firebase Emulator | NOT VERIFIED (no tests exist) |
