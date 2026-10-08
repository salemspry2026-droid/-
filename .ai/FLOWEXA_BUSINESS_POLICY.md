# FLOWEXA_BUSINESS_POLICY

Scope: the business model of Flowexa **as implemented by the Web application** (the behavioral reference — see DEC-002), plus explicit decisions recorded in `DECISIONS.md`.
Evidence basis: static reading of `lib/services/*`, `lib/store.ts`, `lib/utils.ts`, `app/page.tsx`, `app/c/[companyId]/page.tsx`, `components/{Onboarding,JoinRequestDialog,StaffManager,CompanySettings,ClientProducts,ClientHomeTab,ClientOrders,AdminDashboard,NotificationsDialog}.tsx` (partially), and `firestore.rules`. Components not listed were not read in full.

Tags: **[WEB]** = observed Web behavior (VERIFIED static). **[DECISION]** = explicit decision/instruction recorded in `DECISIONS.md`. **[UNKNOWN]** = not established. This file describes *intended/observed product behavior*, not whether rules enforce it (that is `SECURITY_MODEL.md`).

## 1. Product purpose

Flowexa is a B2B, multi-tenant SaaS for trading/distribution companies ("نُدير أعمالك .. ننمي مبيعاتك" tagline in the Android logo view). A company (tenant) manages products, customers (CRM) and orders with its sales staff; business clients (stores) browse a company's catalog and place orders. [WEB] VERIFIED (static).

## 2. Actors / roles

Roles in code: `owner`, `admin`, `sales`, `client`, `pending_employee` (`lib/store.ts` `UserRole`, rules, Android `AppConfig`). "Visitor" = unauthenticated user.

- **Visitor** — sees the public landing page (`LandingPage`) and public company catalog `/c/{companyId}`. [WEB]
- **Owner** — creates the company; full control; only role allowed to save company settings in the Web UI (`CompanySettings.handleSave` requires `role === 'owner'`) and by rules. [WEB]
- **Admin** — manages staff roles (to `admin`/`sales`), per-employee `permissions`, products, stages, locations; approves join requests. [WEB] (`StaffManager`, `EmployeePermissionsDialog`, `JoinRequestDialog`).
- **Sales** — back-office employee: customers and orders (no delete), products view-only by default. [WEB] (`lib/utils.ts hasPermission` defaults).
- **Client** — a business customer with a personal account; **not a member of any company**: profile `companyId` is `''` (`onboardingService.joinAsClient`). Chooses a company to shop at (`clientSelectedCompany`, persisted locally only). [WEB]
- **Pending employee** — someone who submitted a join code; profile `role: pending_employee`, `companyId: ''`, `pendingCompanyId: <company>`; no access until an admin approves. [WEB]

## 3. Account/onboarding flow [WEB]

1. Register/login (email+password, Google, email-link). Web registration creates **only** the Firebase Auth user (`createUserWithEmailAndPassword` + `updateProfile`); it does **not** create a `userProfiles` doc.
2. If no profile exists → `Onboarding` offers three paths:
   - **Create company** (`createCompany`): writes `companies/{comp_…}` (owner = uid, random `joinCode`) then profile `role: owner`, `companyId` = new company.
   - **Join as employee** (`joinAsEmployee`): looks up `companies` by `joinCode`; writes profile `pending_employee` (+`pendingCompanyId`, `companyName`); writes notification `join_{uid}` of type `join_request` with `userId`.
   - **Join as client** (`joinAsClient`): profile `role: client`, `phone`, `storeName`, `companyId: ''`. No company code is used on Web.
3. `pending_employee` sees a waiting screen. Approval (`JoinRequestDialog`): admin writes `companyId = notif.companyId`, `pendingCompanyId = null`, `role = 'sales'`; rejection writes `companyId: ''`, `pendingCompanyId: null`, `role: 'client'`; the notification is soft-deleted.
4. Company settings can generate a `clientJoinCode` (`CLI-xxxxxx`) — used by Android's client-join flow; the Web client flow does not use it. [WEB] + Android code.

## 4. Company model [WEB]

Company document holds: identity (name, logo, type), contact (phone, email, address, `contactNumbers`, working hours), `aboutUs`, `notes`, `taxId`, currencies (`primaryCurrency`, `secondaryCurrencies`, `exchangeRates`), `productUnits`, join codes (`joinCode`, `clientJoinCode`), `ownerId`. Soft-deleted via `isDeleted`.

Client-facing (shown in `ClientProducts` company-info panel and the public catalog): name, logo, phone, email, about, address, working hours, notes. → INTENTIONALLY VISIBLE [DECISION DEC-003].
Staff/owner only intent: `taxId`, `joinCode`, `clientJoinCode`, `ownerId`. The current rules do NOT protect these (see KI-005).

## 5. Catalog: products, categories, brands [WEB]

- Product fields (Android entity mirrors Web): name, scientific name, description, price, currency, category, brand, unit, image, notes, expiry dates, `inStock`, `isNewProduct`, `isLowStock`, `specialOffer` (active offer price replaces normal price in the client cart), `invoiceTypeRestriction` (`both`/`cash_only`/`cash_or_pending`), currency restriction (`all`/`primary_only`/`specific` + list), bonus (`none`/`fixed`/`tiered`), `isActive`, soft delete.
- Only admin/owner create/edit products (rules); sales view-only by default.
- Public catalog and client store show active, non-deleted products; prices, offers, bonuses, availability are **intentionally client-visible** [DECISION DEC-003].
- Clients can mark favorites (`favoriteProductIds` on their profile).

## 6. Pricing, offers, currencies, bonuses

- Each product has a price in its own currency; companies define primary/secondary currencies and exchange rates; order totals are stored per currency (`totalAmountByCurrency`). [WEB]
- Offer: when `specialOffer.isActive`, the offer price is used in the client cart. [WEB `ClientProducts.tsx`]
- Bonus (free quantity): fixed percent → `floor(qty × pct/100)`; tiered → **first** tier (in list order) matching quantity range and invoice type (`all` or equal), bonus `floor(qty × tier.percent/100)`. [WEB `ClientProducts.tsx`/`OrderRegistrationDialog.tsx`]. Android differs (KI-017).
- Invoice restrictions: `cash_only` blocks non-cash; `cash_or_pending` blocks `credit`. [WEB `OrderRegistrationDialog.tsx`]
- Prices/bonuses/totals in a client order are computed **client-side** and written as-is. Whether to validate them server-side is OPEN-006.

## 7. Customers (CRM) [WEB]

- Customers (`customers`) belong to a company and are created/edited by admin/sales; only admin/owner can soft-delete. They hold name, email, phone, `contactNumbers`, address, notes, type, optional `appUserId` (link to a client account).
- Customers are **private to the company's staff**. No Web client component reads them.
- Staff link a CRM customer to a client account by phone lookup (`authService.findClientByPhone`, used in `OrderRegistrationDialog`) which writes `clientUid` on staff-created orders. Whether staff should be allowed to read client profiles globally by phone is OPEN-004.
- `customerPhones` (normalized phone records per customer) exist for Android (Room `customer_phones` ↔ Firestore); staff only.

## 8. Orders [WEB]

- Client order (`placeClientOrder`): `companyId` = chosen company, `customerId` = linked CRM id from the client's earlier order, else the client's uid; `clientUid = uid`; `source: 'customer'`; `status` = first order stage name, or `'pending'` if the company has no stages; `createdBy = uid`; copies the client's `storeName`/`phone`/`address` into the order; also writes a `client_order` notification for the company.
- Staff order (`OrderRegistrationDialog`): staff select a customer, products, invoice type; may link `clientUid` via phone lookup.
- Status changes and edits: admin/owner/sales (rules); clients cannot change status/items/totals after creation (rules `orders` update).
- Soft delete only (`isDeleted`); admin/owner only.
- Client sees only their own orders (`createdBy == uid` or `clientUid == uid`). [WEB queries]

## 9. Notifications, locations, order stages, audit logs

- **Notifications:** staff see company notifications; clients see theirs by `clientUid`. Types seen: `join_request`, `client_order`, reminders (`remindAt`). `readBy` tracks readers. [WEB]
- **Locations:** per-company hierarchy (`country` → `governorate` → `region` → `neighborhood`) used by the address selector. Admin-managed. Intended visibility to clients: UNKNOWN (OPEN-005).
- **Order stages:** per-company ordered statuses with `allowedRoles`; admin-managed; used by staff dashboards and for the initial status of client orders. Intended visibility to clients: UNKNOWN (OPEN-005).
- **Audit logs:** written by services on staff actions (`auditLogService.logAction`: UPDATE_EMPLOYEE_ROLE, UPDATE_CUSTOMER, DELETE_CUSTOMER, UPDATE_ORDER_STATUS, UPDATE_ORDER, UPDATE/CREATE/DELETE_PRODUCT); read by admin/owner only (rules).

## 10. Public vs private information — the privacy boundary [DECISION DEC-003, DEC-004]

**Intentionally visible to clients and visitors (NOT a vulnerability by itself):** company name, logo, phone, email, address, working hours, about/notes shown in the catalog panel; products, prices, offers, bonuses, categories, brands, availability.

**Must stay private:**
- One client's data from another client: profile (store name, phone, address, notes, favorites, activity), private order history and order details (items, quantities purchased, totals), customer-specific notes.
- One company's private data from another company and from non-staff: customers, customer phones, all orders, staff profiles, audit logs, tax ID, join codes (intended).

**Exact examples:**
- Client A may read the company's product list and prices. Client A must NOT read Client B's order (even in the same company), Client B's phone/address, or the company's CRM `customers` documents.
- A visitor may open `/c/{companyId}` and see the catalog. A visitor must NOT see any order, customer or profile.
- Company X's admin must NOT read Company Y's customers/orders/staff.
- A join code is an onboarding secret; Flowexa's intended model treats it as non-public even though the current rules expose it (KI-005).

## 11. Offline behavior

- Web: PWA service worker, Firestore persistent cache, a `localforage` write queue replayed on reconnect/60 s interval. [WEB]
- Android: Room is the local store; writes go through an outbox synced by WorkManager. [Android code]

## 12. Things NOT established

- Whether clients should see `orderStages`/`locations` (OPEN-005). Whether staff may read client profiles by phone (OPEN-004). Whether client-supplied prices/status/customerId should be server-validated (OPEN-006). Whether Android should have a landing page (OPEN-002). What an employee removed by an admin becomes (OPEN-008). All require a user decision.
