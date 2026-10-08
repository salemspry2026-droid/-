# ROLE_PERMISSION_MATRIX

Legend: ALLOWED / DENIED / CONDITIONAL / UNKNOWN. Two columns of truth are kept apart:
- **RULES** = what `firestore.rules` (repo, HEAD `94fe721`) permits per static reading. Deployed rules: EXTERNAL VERIFICATION REQUIRED.
- **INTENT** = intended behavior from Web UI/services (DEC-002/003/004). Where they differ the cell says so.

Roles: visitor (unauthenticated), client, sales, admin, owner, pending_employee. Owner is counted as admin by the rules (`isCompanyAdmin`) plus owner-only operations. Per-user `permissions` (UI only) can further reduce staff rights in the UI; they are never enforced by rules.

## Read

| Capability | Visitor | Client | Pending | Sales | Admin | Owner |
|---|---|---|---|---|---|---|
| Company public info (`companies`) | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| Company join codes | RULES: ALLOWED (leak, KI-005) / INTENT: DENIED for non-staff | same | same | ALLOWED | ALLOWED | ALLOWED |
| Products / categories / brands | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| Own profile | n/a | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| Other users' profiles | DENIED | DENIED | DENIED | DENIED | CONDITIONAL (same `companyId`; Web phone-lookup of client profiles is denied by rules — OPEN-004) | CONDITIONAL (same) |
| Customers (CRM) | DENIED | RULES: CONDITIONAL — ALLOWED if the client profile has a `companyId` (Android model, KI-003) / INTENT: DENIED | RULES: CONDITIONAL — ALLOWED if profile has `companyId` (Android model) / INTENT: DENIED | ALLOWED | ALLOWED | ALLOWED |
| `customerPhones` | DENIED | DENIED | DENIED | ALLOWED | ALLOWED | ALLOWED |
| Own orders | n/a | ALLOWED (`createdBy`/`clientUid`) | DENIED | ALLOWED | ALLOWED | ALLOWED |
| All company orders | DENIED | RULES: CONDITIONAL (member via `companyId`, KI-003) / INTENT: DENIED | RULES: CONDITIONAL (same) / INTENT: DENIED | ALLOWED | ALLOWED | ALLOWED |
| Other clients' private data | DENIED | INTENT: DENIED; RULES: DENIED for profiles, CONDITIONAL for orders/customers (see above) | DENIED | ALLOWED (company's own clients' orders) | ALLOWED | ALLOWED |
| Notifications | DENIED | ALLOWED (own `clientUid`/`userId`) | ALLOWED (own `userId`) | ALLOWED (company) | ALLOWED | ALLOWED |
| Locations / order stages | DENIED | UNKNOWN intent (OPEN-005); RULES: member-only | same | ALLOWED | ALLOWED | ALLOWED |
| Audit logs | DENIED | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |

## Create

| Capability | Visitor | Client | Pending | Sales | Admin | Owner |
|---|---|---|---|---|---|---|
| Own profile | n/a | ALLOWED | ALLOWED | n/a | n/a | ALLOWED |
| Profile with role `owner`/`admin`/`sales` for self | DENIED (intent) | RULES: ALLOWED (KI-001) / INTENT: DENIED (owner only for a company the user created) | RULES: ALLOWED | RULES: ALLOWED | RULES: ALLOWED | ALLOWED |
| Company | DENIED | ALLOWED (any signed-in user) | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| Customer | DENIED | DENIED | DENIED | ALLOWED | ALLOWED | ALLOWED |
| Order | DENIED | RULES: CONDITIONAL — only if profile `companyId == order.companyId` (blocks Web clients, KI-004) / INTENT: ALLOWED for any company | DENIED | ALLOWED | ALLOWED | ALLOWED |
| Product / category / brand | DENIED | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| Location / order stage | DENIED | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| Notification | DENIED | RULES: CONDITIONAL (`isCompanyClient`, same blocker); `join_request` self-notification ALLOWED for any user | ALLOWED only `join_request` with own `userId` | ALLOWED | ALLOWED | ALLOWED |
| Audit log | DENIED | RULES: CONDITIONAL (member) | DENIED/CONDITIONAL (member) | ALLOWED | ALLOWED | ALLOWED |

## Update

| Capability | Client | Sales | Admin | Owner |
|---|---|---|---|---|
| Own profile (non-role fields) | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| Own `role` | DENIED | DENIED | DENIED | DENIED |
| Own `companyId` | RULES: ALLOWED for every role (KI-002) / INTENT: DENIED for staff | RULES: ALLOWED / INTENT: DENIED | same | same |
| Own `permissions` | RULES: ALLOWED (UI-only field; KI-002) / INTENT: DENIED | same | same | same |
| Another profile (role, `permissions`, `jobTitle`, approval) | DENIED | DENIED | ALLOWED (rules do not stop setting `owner` or moving members, KI-002) | ALLOWED |
| Company document | DENIED | DENIED | DENIED | ALLOWED |
| Customer | DENIED | ALLOWED (not `isDeleted`) | ALLOWED | ALLOWED |
| Order | CONDITIONAL (own order, not status/items/totals/company/customer) | ALLOWED (not `isDeleted`) | ALLOWED | ALLOWED |
| Order status | DENIED | ALLOWED | ALLOWED | ALLOWED |
| Product / category / brand / location / stage | DENIED | DENIED (products view-only by default) | ALLOWED | ALLOWED |
| Notification (mark read etc.) | RULES: member-or-own | ALLOWED | ALLOWED | ALLOWED |

## Delete (soft delete via `isDeleted`; no hard deletes)

| Capability | Client | Sales | Admin | Owner |
|---|---|---|---|---|
| Customer | DENIED | DENIED | ALLOWED | ALLOWED |
| Order | DENIED | DENIED | ALLOWED | ALLOWED |
| Product | DENIED | DENIED | ALLOWED | ALLOWED |
| Customer phone | DENIED | ALLOWED (soft delete) | ALLOWED | ALLOWED |
| Employee removal | DENIED | DENIED | UNKNOWN — Web writes `{companyId:null, role:null}` which fails rules validation (KI-019, OPEN-008) | same |
| Any document hard delete | DENIED | DENIED | DENIED | DENIED |

## Approve / manage

| Capability | Client | Pending | Sales | Admin | Owner |
|---|---|---|---|---|---|
| Approve/reject employee join request | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| Change staff role (`admin`/`sales`) | DENIED | DENIED | DENIED | ALLOWED (Web UI offers only these; owner profile locked in UI) | ALLOWED |
| Manage per-employee permissions (UI) | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| Edit company settings | DENIED | DENIED | DENIED | DENIED (rules: owner only; Web `handleSave` owner-only) | ALLOWED |
| Manage order stages / locations | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| Generate AI product description (API) | RULES n/a — API unauthenticated (KI-012): effectively ALLOWED for anyone | | | | |

## Notes

- System admin (hardcoded verified email in rules) can read/update broadly; not a product role.
- Android `PermissionManager` implements a UI ceiling mirroring the rules and Web defaults; it is not used by screens (C-06).
- All RULES statements are static readings and carry status VERIFIED (static) / deployment EXTERNAL VERIFICATION REQUIRED. Nothing here is runtime verified.
