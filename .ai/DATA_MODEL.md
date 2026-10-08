# DATA_MODEL

Sources: `firestore.rules` validators (`isValid*`), Web services/store types, Android Room entities and mappers. Status VERIFIED (static) unless noted. Fields listed are those seen in code; the schema is schemaless in Firestore, so documents may contain other fields (UNKNOWN). No field here is invented.

Common audit fields (required by rules on all main collections except where noted): `createdAt`, `updatedAt` (server timestamps), `createdBy`, `updatedBy` (must equal the writer's uid on create/update), `isDeleted` (bool, soft delete). Rules provide no hard delete (except `customerPhones` explicitly `delete: if false`; others simply have no `allow delete`).
Android mirrors documents as Room entities with `createdAtMs/updatedAtMs` and `syncState` (`SYNCED/PENDING/PROCESSING/FAILED/CONFLICT`).

## userProfiles/{uid}
- Purpose: account profile and role. Doc id = Firebase uid.
- Rules-required: `email, displayName, companyId (string ≤100 or null), role ∈ {owner,admin,sales,client,pending_employee}, createdAt, updatedAt, createdBy, updatedBy, isDeleted`.
- Optional (rules-validated): `jobTitle, pendingCompanyId, companyName, phone, storeName`. Seen in Web type (not rules-validated): `permissions` (per-module `{view,create,edit,delete}` for customers/products/orders/staff/companySettings), `address*`, `logoUrl`, `activityType(+Other)`, `notes`, `favoriteProductIds`.
- Ownership: self. Company relation: staff → `companyId` = their company; **Web clients → `companyId: ''`**; Web pending employee → `companyId: ''` + `pendingCompanyId`; **Android clients/pending employees → `companyId` = a company id** (divergence, KI-003/KI-006).
- Private: whole profile (client phone/address/notes). Read allowed: self, same-company admin/owner, system admin.
- Invariants intended: role/company changes only by admins/system admin (NOT enforced for self-create/self-`companyId`, KI-001/KI-002). `permissions` is UI-only.
- Android Room `user_profiles` has no `pendingCompanyId`/`jobTitle`/`permissions`-typed field (`permissionsJson` string only).

## companies/{companyId}
- Purpose: tenant. Rules-required: `name, ownerId, joinCode, createdAt, updatedAt, createdBy, updatedBy, isDeleted`.
- Optional (validated): `clientJoinCode, phone, address, taxId, contactNumbers (≤20), aboutUs, email, logoUrl, notes, workingHours, companyType, companyTypeOther, primaryCurrency, secondaryCurrencies (≤20), exchangeRates (map)`. Also seen: `productUnits`, `isActive`.
- Ownership: `ownerId` (immutable on update). Update: owner or system admin only.
- **Public read (`if true`)** — intended public fields: name, logo, phone, email, address, hours, about/notes, currencies. **Not intended public:** `joinCode`, `clientJoinCode`, `taxId`, `ownerId` (KI-005).

## customers/{customerId}
- Purpose: company CRM customer. Required: `companyId, name, createdAt, updatedAt, createdBy, updatedBy, isDeleted`. Optional: `email, phone, contactNumbers (≤5 validated entries of {name,countryCode,number}), address, notes, customerType(+Other), appUserId`.
- Immutable on update: `createdAt, createdBy, companyId`. Sales cannot change `isDeleted`.
- Private to company staff. Read rule: `isCompanyMember(companyId)` or system admin (role-blind today — KI-003).
- Android also keeps a `mergedInto` marker on merged duplicates (set by `OutboxOp.DELETE` payload).

## customerPhones/{phoneId} (Android-driven)
- Required: `companyId, customerId, phoneRaw (≤50), phoneNormalized (≤30), createdAt, updatedAt, createdBy, updatedBy, isDeleted`; optional `label, isPrimary`.
- Staff-only read/write; `customerId` must belong to the same company; `companyId` immutable; no delete. Rules implemented in repo, **publication status UNKNOWN** (docs: "not published").

## products/{productId}, productCategories, productBrands
- Product required: `companyId, name, price (number ≥0), currency, isActive (bool), createdAt, updatedAt, createdBy, updatedBy, isDeleted`. Android entity also shows: `scientificName, description, categoryId, unit, brandId, imageUrl, notes, expiryDates, inStock, isNewProduct, isLowStock, specialOffer, invoiceTypeRestriction, currencyRestrictionType, specificCurrencies, bonusType, bonusFixedPercent, bonusTiers`.
- Categories/brands required: `companyId, name` + audit fields.
- Public read; create/update admin/owner of the company; `companyId` immutable. Intentionally public (DEC-003).

## orders/{orderId}
- Required (rules): `companyId, customerId, customerName, items (list ≤200), totalAmountByCurrency (map), status (string), createdAt, updatedAt, createdBy, updatedBy, isDeleted`. Optional validated: `linkedCrmCustomerId, clientUid, customerPhone, customerAddress, invoiceType, source`.
- Other fields written by clients: `companyName`, `createdByName`, `notes`, `dueDate` (Android). Order **items** are an embedded array on the Web order document: `productId, productName, quantity, bonusQuantity, price, currency, note, isManualBonus` (Android writes this shape; Room keeps them in `order_items`). Item shape on Web not fully inspected.
- `source`: Web client orders `'customer'`; Android client orders `'client'` (KI-014); staff sources vary (`admin`/`sales` on Android).
- `status`: Web = order-stage name (first stage for client orders, else `pending`); Android = `"pending"` at creation (C-04).
- Ownership: `createdBy`; client link `clientUid` (not forced equal to the writer's uid — KI-020). Company relation: `companyId`.
- Private. Read rule: company member, creator, `clientUid` owner, or system admin. Update: admin/owner any non-immutable change; sales except `isDeleted`; creator (client) only fields outside `status, totalAmountByCurrency, items, companyId, customerId, linkedCrmCustomerId, isDeleted`.
- Invariants: totals/prices are client-computed (OPEN-006).

## notifications/{id}
- Required: `companyId, title, message, type, readBy (list ≤1000), createdAt, updatedAt, createdBy, updatedBy, isDeleted`. Optional: `orderId, clientUid, userId, userEmail, userName`, `remindAt` (Web).
- Types seen: `join_request` (id `join_{uid}`, has `userId`), `client_order`, reminders; Android writes `staff_join` and omits `isDeleted`/`userId` (KI-010).
- Read: company member, `clientUid` owner, `userId` owner, system admin.

## locations/{id}
- Required: `companyId, type ∈ {country,governorate,region,neighborhood}, name` + audit; optional `parentId`. Read: company member/system admin; write: admin/owner. Client visibility: OPEN-005.

## orderStages/{id}
- Required: `companyId, name (≤100), index (number), allowedRoles (list ≤10)` + audit. Read: company member/system admin; write: admin/owner. Client visibility: OPEN-005.

## auditLogs/{id}
- Required: `companyId, action, details, createdAt, createdBy`. Read: admin/owner of the company. Create: any company member (KI-025). Update/delete: never. No `updatedBy`/`isDeleted`.

## Company settings
- Not a separate collection; they are fields on `companies` (currencies, units, join codes, contact info). `productUnits` is updated via `settingsService.addCompanyUnit` (no `updatedBy`).

## Android-only local entities
`sync_operations` (outbox: `collectionName, documentId, operation, payloadJson, attempts, state, lastError`), `call_recordings` (local; purpose/sync not established — UNKNOWN), `order_items`, `customer_phones`, `product_categories`, `product_brands`, `locations`, `order_stages`.

## Relationships
- `userProfiles.companyId` → `companies`; `orders.companyId`/`customerId` (→ `customers`, or a client uid, or `crm_client_<uid>` on Android)/`clientUid` (→ `userProfiles`); `customerPhones.customerId` → `customers`; `customers.appUserId` → `userProfiles`; `notifications.orderId` → `orders`; `products.categoryId/brandId` → categories/brands.
