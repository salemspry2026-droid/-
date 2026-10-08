# CHANGELOG

Chronological record of meaningful changes to: source code, architecture, business policy, security model, and this knowledge base. Newest entries at the bottom of each date block; never delete entries. If a change is later corrected, add a new entry that references the old one.

Entry format: `[date] [area] [agent] — description (refs)`.

---

## 2026-10-07

### Knowledge base initialization (Claude)

- `[2026-10-07] [knowledge base] [Claude]` Created `.ai/` as the single permanent AI engineering knowledge base. Repository HEAD at creation: `94fe721`; working tree was clean before `.ai/` was added. Evidence basis: static reading only (no code executed; no Firebase/Google/GitHub/Vercel consoles accessed).
- Files created: `README.md`, `PROJECT_STATE.md`, `FLOWEXA_BUSINESS_POLICY.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`, `ROLE_PERMISSION_MATRIX.md`, `WEB_ANDROID_PARITY.md`, `DECISIONS.md`, `IMPLEMENTATION_HISTORY.md`, `FAILED_ATTEMPTS.md`, `TESTING_STATUS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md`, `claude/AUDIT_REPORT.md`, `claude/REVIEW_REPORT.md`, `claude/VERIFICATION_REPORT.md`, `deepseek/IMPLEMENTATION_REPORT.md`, `deepseek/CODE_CHANGES.md`, `deepseek/TEST_RESULTS.md`, `deepseek/FAILED_IMPLEMENTATIONS.md`.
- Imported the Claude audit of 2026-10-06/07 as `claude/AUDIT_REPORT.md` (historical, condensed; level 5 in the source-of-truth hierarchy).

**What did NOT change (explicit):**
- No application source code was modified (Web or `android-app/`).
- No Firebase configuration was modified or accessed.
- `firestore.rules` was not modified and nothing was published.
- No Android signing material, keystore, CI workflow, `scripts/ci/*`, `google-services.json`, `opencode.json`, env file or `assetlinks.json` entry was modified.
- Legacy `android/` was not modified.
- Nothing was committed or pushed.

### Contradictions recorded (details in `PROJECT_STATE.md` → Contradictions)

- C-01 client-read leak remediation scope (completion report vs Web/Android code)
- C-02 repo rules vs Web client flows (deployed rules unknown)
- C-03 order `source` value: Web `'customer'` vs Android `'client'`
- C-04 order status vocabulary: Web order-stage names vs Android fixed `pending`
- C-05 early audit statement about client baseline exposure corrected (conditional on profile `companyId`)
- C-06 `PermissionManager` "implemented" vs not used by any screen
- C-07 stale root artifacts (`onsnapshot_usages.txt`, `test.js`, `res.txt`) vs current source
- C-08 Web "remove employee" payload (`role: null`) vs rules validation
- C-09 Android register pre-creating a `client` profile vs routing and the self-role-change rule

### Known issues recorded (details in `KNOWN_ISSUES.md`)

KI-001 … KI-026. Severity summary (static, deployment not verified): Critical — KI-001, KI-002; High — KI-003, KI-005, KI-006, KI-007; Medium — KI-012 (and KI-020 as a policy-blocked integrity item); Low/Medium — KI-013; Low — KI-018, KI-025, KI-026, KI-023. Functional/parity — KI-004, KI-008 … KI-011, KI-014 … KI-017, KI-019, KI-021, KI-022, KI-024.

### Tasks proposed (details in `claude/AUDIT_REPORT.md`; NONE implemented)

T01 … T14 from the audit, plus T15 added during KB initialization (Web employee removal payload; blocked on OPEN-008). T01 carries an amendment pending OPEN-008. Tasks T02, T05, T06, T11, T13, T15 are gated on decisions or on reading screens not yet read.

### Open product questions recorded (details in `DECISIONS.md` Part 2; user decides)

OPEN-001 (clients as company members), OPEN-002 (Android landing page), OPEN-003 (existing Android-created profiles), OPEN-004 (staff global client lookup by phone), OPEN-005 (client visibility of order stages/locations), OPEN-006 (server validation of client-supplied order values), OPEN-007 (canonical bonus tier rule), OPEN-008 (what a removed employee becomes).

### Decisions recorded (details in `DECISIONS.md` Part 1)

DEC-001 … DEC-010 (canonical Android path, Web as reference, public catalog visibility, privacy boundary, protected files, agent roles, offline-first Android, soft delete, staged public-data plan [planned, not executed], KB conventions).

### Verification requirements recorded

V1 … V8 (deployed rules, Google Sign-In/OAuth, app links, CI run, production profile data shape, join-code rotation, Android runtime matrix, Storage rules) — all EXTERNAL VERIFICATION REQUIRED or NOT RUN; see `TESTING_STATUS.md`.

---

## Template for future entries

```
## YYYY-MM-DD
- [area: source|architecture|policy|security|knowledge base|tests|ci] [agent] — what changed, why
  Refs: Task ID(s), KI-/DEC-/OPEN-/C- IDs, commit hash (or NO COMMIT RECORDED)
  Files: ...
  Tests: command + result (or NOT RUN)
  KB files updated: ...
```

## 2026-10-07 (later) — T01 review

- `[2026-10-07] [security/tests/knowledge base] [Claude]` Reviewed the uncommitted T01 working-tree change (`firestore.rules`, `package.json`). Rules logic verified correct by independent Emulator tests (83/83 PASS; 24 attack cases fail against HEAD rules). Release gate: **FAIL** because the required repo test suite is missing, `test:rules` is unusable, and `package.json` breaks `npm ci`/`npm install` (ERESOLVE, lockfile unchanged); DeepSeek filed no `.ai` records. No commit, push or deploy performed. T02 not started.
  Refs: T01, KI-001, KI-002, VER-001, REV-001, FA-010, DFI-001. Commit: NO COMMIT RECORDED.
  Files: `.ai/claude/VERIFICATION_REPORT.md`, `.ai/claude/REVIEW_REPORT.md`, `.ai/claude/evidence/T01-review-rules-test.js` (new), `.ai/TESTING_STATUS.md`, `.ai/IMPLEMENTATION_HISTORY.md`, `.ai/FAILED_ATTEMPTS.md`, `.ai/KNOWN_ISSUES.md`, `.ai/PROJECT_STATE.md`, `.ai/CHANGELOG.md`, `.ai/claude/AUDIT_REPORT.md`, `.ai/deepseek/IMPLEMENTATION_REPORT.md`, `.ai/deepseek/FAILED_IMPLEMENTATIONS.md`.
  Tests: see `TESTING_STATUS.md`.
