# DECISIONS

Append-only. Never edit or delete an existing decision; if a decision changes, append a new one that supersedes it and mark the old one `SUPERSEDED BY DEC-xxx` (status line only).
Format: Decision ID / Date / Title / Decision / Reason / Affected Areas / Evidence / Status.
Only explicit decisions (user instructions, committed project documentation or committed code conventions) are recorded. Audit opinions are NOT decisions. Open product questions are in the second part and are NOT decided.

## Part 1 — Recorded decisions

**Decision ID:** DEC-001
**Date:** (undated in repo; present at HEAD 2026-10-07)
**Title:** Canonical Android project is `android-app/`; `android/` is legacy
**Decision:** `android-app/` is the official native Android app. `android/` is deprecated, must not be used for production builds, release workflows or CI, and must remain untouched.
**Reason:** `android/` is a retired WebView hybrid prototype.
**Affected Areas:** Android, CI, all agents.
**Evidence:** root `README.md`; user instructions in the 2026-10-06/07 sessions ("Legacy android/ must remain untouched").
**Status:** ACTIVE

**Decision ID:** DEC-002
**Date:** 2026-10-07 (user instruction)
**Title:** Web is the behavioral reference
**Decision:** The Web application defines Flowexa's actual business behavior and product policy. Android is compared against Web. Web must not be changed merely to match Android unless a confirmed security/correctness defect requires it.
**Reason:** Stated by the user for the audit task.
**Affected Areas:** parity work, all implementation tasks.
**Evidence:** user task text ("The Web application is the primary reference…").
**Status:** ACTIVE

**Decision ID:** DEC-003
**Date:** 2026-10-07 (user instruction)
**Title:** Company-facing catalog information is intentionally visible to clients
**Decision:** Company name, logo, phone/contact, address, products, prices, offers, bonuses, categories, brands and availability are intentionally client-visible and are not vulnerabilities by themselves.
**Reason:** It is Flowexa's catalog/store model.
**Affected Areas:** SECURITY_MODEL, any rules/public-data work.
**Evidence:** user task text; Web `ClientProducts`/public catalog read companies/products directly; `firestore.rules` `allow read: if true` with commits "allow public access to product metadata" / "add public company profile page".
**Status:** ACTIVE (note: this does not decide that join codes/tax IDs inside the company document should be public — see OPEN-001/KI-005).

**Decision ID:** DEC-004
**Date:** 2026-10-07 (user instruction)
**Title:** Client-to-client and tenant-to-tenant privacy boundary
**Decision:** One client must not access another client's private data (profile, phone, address, orders, quantities, notes, activity). One company's staff must not access another company's private data.
**Reason:** B2B privacy.
**Affected Areas:** Firestore rules, Web queries, Android sync, caching.
**Evidence:** user task text; Web client queries by `createdBy`/`clientUid`.
**Status:** ACTIVE (enforcement gaps: KI-001..KI-007)

**Decision ID:** DEC-005
**Date:** 2026-10-06/07 (user instruction)
**Title:** Protected files during review/knowledge-base work
**Decision:** Do not modify `android/`, release keystore/signing material, `.github/workflows/*`, `scripts/ci/*`, `firestore.rules`, `android-app/app/google-services.json`, `opencode.json`, env/API secret files, or identity entries in `public/.well-known/assetlinks.json` without explicit user authorization. Do not read or expose secrets.
**Reason:** Safety of release identity and production configuration.
**Affected Areas:** all agents.
**Evidence:** user task text.
**Status:** ACTIVE. Implementation tasks T01/T02/T05 require editing `firestore.rules`; that needs explicit user authorization per task and rules must never be published by an agent.

**Decision ID:** DEC-006
**Date:** 2026-10-07 (user instruction)
**Title:** Roles of Claude, DeepSeek and the user
**Decision:** Claude = architect/auditor/reviewer (no implementation). DeepSeek = implementation agent; implements only confirmed tasks. The user is the final decision-maker for product-policy questions. Knowledge-base updates are part of every task.
**Reason:** Separation of duties and continuity.
**Affected Areas:** workflow.
**Evidence:** user task text; `.ai/README.md`.
**Status:** ACTIVE

**Decision ID:** DEC-007
**Date:** (undated; documented at HEAD)
**Title:** Android is offline-first (Room + outbox); Firestore is the shared backend
**Decision:** Android uses Room as local store with an outbox synced by WorkManager; Web uses Firestore persistent cache + a localforage queue. Named Firestore database `ai-studio-c5fd0d2f-…`.
**Reason:** Offline operation for sales staff.
**Affected Areas:** sync, Room, Web offline.
**Evidence:** root `README.md`, `docs/android-native-architecture.md`, `AppConfig.kt`, `lib/firebase.ts`.
**Status:** ACTIVE

**Decision ID:** DEC-008
**Date:** (undated; documented at HEAD)
**Title:** Soft delete only
**Decision:** Documents are retired with `isDeleted = true`; rules provide no hard delete; `customerPhones` explicitly forbids delete.
**Reason:** Audit trail / sync tombstones.
**Affected Areas:** services, rules, Android DELETE op.
**Evidence:** `firestore.rules` (no `allow delete` except `customerPhones: if false`); `SyncEngine.applyOperation` DELETE; rules comment in `customerPhones`.
**Status:** ACTIVE

**Decision ID:** DEC-009
**Date:** 2026-10-05 (document written in commit `95e1066`)
**Title:** Staged plan for public data / join codes (planned, not executed)
**Decision:** Do not remove `allow read: if true` on `companies`/`products` yet; proceed in phases A (additive `publicCatalogs`, `joinCodes`), B (switch reads), C (shrink reads + rotate codes).
**Reason:** Join-by-code queries and catalogs currently depend on public reads.
**Affected Areas:** rules, Web onboarding, Android onboarding/catalog.
**Evidence:** `docs/public-data-migration-plan.md`; `docs/android-completion-report.md` §2.
**Status:** PLANNED / NOT EXECUTED. The Claude audit proposes a variant (T05: `joinCodes` + `companyPrivate`); that variant is a PROPOSAL, not a decision.

**Decision ID:** DEC-010
**Date:** 2026-10-07
**Title:** Knowledge-base location and conventions
**Decision:** `.ai/` is the only AI knowledge base; status vocabulary and source-of-truth hierarchy are defined in `.ai/README.md`.
**Reason:** Prevent rediscovery and drift.
**Affected Areas:** all agents.
**Evidence:** user task text.
**Status:** ACTIVE

## Part 2 — OPEN QUESTIONS (not decided; only the user decides)

Do not implement an answer to any of these. Implementation tasks that depend on them are blocked.

- **OPEN-001** Should clients ever be members of a company (have `profile.companyId`)? Audit recommends no (matches Web). Blocks: how Android client-join/company selection works; T03/T06 final shape.
- **OPEN-002** Should Android have a public landing page like Web, or Splash → Login?
- **OPEN-003** What happens to existing Android-created profiles where `role=client|pending_employee` and `companyId` is set, and to Android-registered `client` profiles wanting to become owner/employee? (needs V5 data count.)
- **OPEN-004** May staff read client profiles globally by phone (Web `findClientByPhone` for linking a client to a customer)? Current rules deny it.
- **OPEN-005** May clients read `orderStages` and `locations`? (Web client order uses the first stage name; current rules deny it to non-members.)
- **OPEN-006** Client-supplied prices/totals/status/`customerId`/`clientUid` in client orders: accept as-is (current design) or validate server-side (Cloud Functions)?
- **OPEN-007** Canonical bonus tier rule for overlapping tiers: Web's first-match (audit proposal) or Android's highest-`minQty`?
- **OPEN-008** What role/company should a removed employee get (Web currently writes `null`/`null`, rejected by rules)? Precedent: join-request rejection uses `companyId ''`, `role 'client'`.
