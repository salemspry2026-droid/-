// T01 Firestore Rules regression suite.
//
// Exercises the `userProfiles` boundary hardened by T01 (KI-001/KI-002):
//   - self role escalation (client/pending/… -> owner/admin/sales) is blocked
//   - self `companyId` escalation for staff roles is blocked
//   - combined role+company attacks are blocked
//   - protected identity/security fields (role, permissions, createdBy, updatedBy, userId)
//     cannot be spoofed
//   - cross-user profile modification is limited to same-company admin/owner (non-owner
//     members only, approval/rejection flows preserved)
//   - hard delete is denied
//   - legitimate flows (client join, employee join, company+owner creation, client edits,
//     admin approval/rejection, role/permission changes, system admin) still pass
//
// The rules are loaded from the repository's `firestore.rules` (read-only) and executed
// entirely against the local Firestore Emulator; no production connection is used.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = process.env.RULES_PATH || path.join(__dirname, '..', 'firestore.rules');
const RULES = fs.readFileSync(rulesPath, 'utf8');

let env;

const ts = () => serverTimestamp();
const base = (uid, o = {}) => ({
  email: `${uid}@example.com`,
  displayName: uid,
  companyId: '',
  role: 'client',
  createdAt: ts(),
  updatedAt: ts(),
  createdBy: uid,
  updatedBy: uid,
  isDeleted: false,
  ...o,
});
const company = (id, ownerId) => ({
  name: id,
  ownerId,
  joinCode: `J${id}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: ownerId,
  updatedBy: ownerId,
  isDeleted: false,
});

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const p = (uid, o) =>
      setDoc(doc(db, 'userProfiles', uid), {
        ...base(uid, o),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    await setDoc(doc(db, 'companies', 'A'), company('A', 'ownerA'));
    await setDoc(doc(db, 'companies', 'B'), company('B', 'ownerB'));
    await p('ownerA', { role: 'owner', companyId: 'A' });
    await p('adminA', { role: 'admin', companyId: 'A' });
    await p('salesA', { role: 'sales', companyId: 'A' });
    await p('ownerB', { role: 'owner', companyId: 'B' });
    await p('adminB', { role: 'admin', companyId: 'B' });
    await p('salesB', { role: 'sales', companyId: 'B' });
    await p('clientWeb', { role: 'client', companyId: '' });
    await p('clientAndroid', { role: 'client', companyId: 'A' });
    await p('pendWeb', { role: 'pending_employee', companyId: '', pendingCompanyId: 'A' });
    await p('pendAndroid', { role: 'pending_employee', companyId: 'A' });
    await setDoc(doc(db, 'products', 'p1'), {
      companyId: 'A',
      name: 'x',
      price: 1,
      currency: 'SAR',
      isActive: true,
      isDeleted: false,
    });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-flowexa-t01',
    firestore: { rules: RULES },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(seed);

const as = (uid, claims) => env.authenticatedContext(uid, claims).firestore();
const upd = (uid, target, fields) =>
  updateDoc(doc(as(uid), 'userProfiles', target), { updatedAt: ts(), updatedBy: uid, ...fields });
const create = (uid, o, id = uid) => setDoc(doc(as(uid), 'userProfiles', id), base(uid, o));

describe('CREATE', () => {
  it('+ new user creates client profile (Web joinAsClient shape)', () =>
    assertSucceeds(
      create('newU', { role: 'client', companyId: '', phone: '1', storeName: 's' }),
    ));

  it('+ new user creates pending_employee (Web joinAsEmployee shape)', () =>
    assertSucceeds(
      create('newU', { role: 'pending_employee', companyId: '', pendingCompanyId: 'A', companyName: 'A' }),
    ));

  it('+ new user creates pending_employee Android-style (companyId set)', () =>
    assertSucceeds(create('newU', { role: 'pending_employee', companyId: 'A' })));

  it('+ new user creates own company then owner profile (Web createCompany)', async () => {
    await assertSucceeds(
      setDoc(doc(as('newU'), 'companies', 'C'), { ...company('C', 'newU'), createdAt: ts(), updatedAt: ts() }),
    );
    await assertSucceeds(create('newU', { role: 'owner', companyId: 'C' }));
  });

  it("- owner profile for someone else's company (KI-001 attack)", () =>
    assertFails(create('attacker', { role: 'owner', companyId: 'A' })));

  it('- owner profile for non-existent company', () =>
    assertFails(create('attacker', { role: 'owner', companyId: 'ghost' })));

  it('- owner profile with null companyId', () =>
    assertFails(create('attacker', { role: 'owner', companyId: null })));

  it('- admin profile of company A', () =>
    assertFails(create('attacker', { role: 'admin', companyId: 'A' })));

  it('- sales profile of company A', () =>
    assertFails(create('attacker', { role: 'sales', companyId: 'A' })));

  it('- admin profile with empty company', () =>
    assertFails(create('attacker', { role: 'admin', companyId: '' })));

  it('- invalid role value', () =>
    assertFails(create('attacker', { role: 'superuser', companyId: '' })));

  it("- create a profile for ANOTHER uid", () =>
    assertFails(setDoc(doc(as('attacker'), 'userProfiles', 'victim'), base('attacker', { role: 'client' }))));

  it('- spoofed createdBy', () =>
    assertFails(setDoc(doc(as('attacker'), 'userProfiles', 'attacker'), base('someoneElse', { role: 'client' }))));

  it('- unauthenticated create', () =>
    assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'userProfiles', 'x'), base('x'))));

  it('- owner of own company created, then profile claims A (combined)', async () => {
    await assertSucceeds(
      setDoc(doc(as('attacker'), 'companies', 'ATT'), { ...company('ATT', 'attacker'), createdAt: ts(), updatedAt: ts() }),
    );
    await assertFails(create('attacker', { role: 'owner', companyId: 'A' }));
  });
});

describe('SELF UPDATE', () => {
  it('+ client edits storeName/phone', () =>
    assertSucceeds(upd('clientWeb', 'clientWeb', { storeName: 'new', phone: '123' })));

  it('+ client toggles favoriteProductIds', () =>
    assertSucceeds(upd('clientWeb', 'clientWeb', { favoriteProductIds: ['p1'] })));

  it("+ owner edits own displayName", () =>
    assertSucceeds(upd('ownerA', 'ownerA', { displayName: 'N' })));

  it('+ sales edits own phone', () =>
    assertSucceeds(upd('salesA', 'salesA', { phone: '1' })));

  it('+ pending (Web) changes pendingCompanyId (re-apply elsewhere)', () =>
    assertSucceeds(upd('pendWeb', 'pendWeb', { pendingCompanyId: 'B' })));

  it('+ [documented limitation] client may change own companyId (Android joinAsClient)', () =>
    assertSucceeds(upd('clientWeb', 'clientWeb', { companyId: 'A' })));

  for (const r of ['owner', 'admin', 'sales', 'pending_employee']) {
    it(`- client self role -> ${r}`, () =>
      assertFails(upd('clientWeb', 'clientWeb', { role: r })));
  }

  it('- pending self role -> sales / admin / owner', async () => {
    for (const r of ['sales', 'admin', 'owner']) await assertFails(upd('pendWeb', 'pendWeb', { role: r }));
  });

  it("- sales self role -> admin", () =>
    assertFails(upd('salesA', 'salesA', { role: 'admin' })));

  it("- sales self role -> owner", () =>
    assertFails(upd('salesA', 'salesA', { role: 'owner' })));

  it("- admin self role -> owner", () =>
    assertFails(upd('adminA', 'adminA', { role: 'owner' })));

  it("- owner self role -> admin", () =>
    assertFails(upd('ownerA', 'ownerA', { role: 'admin' })));

  it('- admin self companyId A -> B (KI-002 attack)', () =>
    assertFails(upd('adminA', 'adminA', { companyId: 'B' })));

  it('- owner self companyId A -> B', () =>
    assertFails(upd('ownerA', 'ownerA', { companyId: 'B' })));

  it('- sales self companyId A -> B', () =>
    assertFails(upd('salesA', 'salesA', { companyId: 'B' })));

  it('- sales self companyId -> empty string', () =>
    assertFails(upd('salesA', 'salesA', { companyId: '' })));

  it('- COMBINED self role+companyId (client -> owner of B)', () =>
    assertFails(upd('clientWeb', 'clientWeb', { role: 'owner', companyId: 'B' })));

  it('- COMBINED self role+companyId (sales A -> admin B)', () =>
    assertFails(upd('salesA', 'salesA', { role: 'admin', companyId: 'B' })));

  it('- COMBINED self role+companyId (admin A -> owner B)', () =>
    assertFails(upd('adminA', 'adminA', { role: 'owner', companyId: 'B' })));

  it('- COMBINED pending Android (A) -> sales + company B', () =>
    assertFails(upd('pendAndroid', 'pendAndroid', { role: 'sales', companyId: 'B' })));

  it("- sales sets own permissions", () =>
    assertFails(
      upd('salesA', 'salesA', { permissions: { orders: { view: true, create: true, edit: true, delete: true } } }),
    ));

  it("- client sets own permissions", () =>
    assertFails(upd('clientWeb', 'clientWeb', { permissions: { orders: { delete: true } } })));

  it('- spoofed updatedBy', () =>
    assertFails(
      updateDoc(doc(as('clientWeb'), 'userProfiles', 'clientWeb'), {
        updatedAt: ts(),
        updatedBy: 'someoneElse',
        storeName: 'x',
      }),
    ));

  it('- self createdBy rewrite', () =>
    assertFails(upd('clientWeb', 'clientWeb', { createdBy: 'someoneElse' })));

  it('- invalid role value on self update', () =>
    assertFails(upd('clientWeb', 'clientWeb', { role: 'god' })));
});

describe('ADMIN/OWNER ON OTHERS (legitimate)', () => {
  it('+ admin A changes sales A -> admin', () =>
    assertSucceeds(upd('adminA', 'salesA', { role: 'admin' })));

  it('+ admin A changes admin A2 (sales) jobTitle', () =>
    assertSucceeds(upd('adminA', 'salesA', { jobTitle: 'rep' })));

  it('+ admin A sets sales A permissions (EmployeePermissionsDialog)', () =>
    assertSucceeds(
      upd('adminA', 'salesA', { permissions: { orders: { view: true, create: true, edit: true, delete: false } } }),
    ));

  it('+ owner A demotes adminA -> sales', () =>
    assertSucceeds(upd('ownerA', 'adminA', { role: 'sales' })));

  it('+ owner A promotes sales -> admin', () =>
    assertSucceeds(upd('ownerA', 'salesA', { role: 'admin' })));

  it('+ admin A approves Web pending (companyId A, pendingCompanyId null, role sales)', () =>
    assertSucceeds(upd('adminA', 'pendWeb', { companyId: 'A', pendingCompanyId: null, role: 'sales' })));

  it('+ admin A rejects Web pending (companyId empty, client)', () =>
    assertSucceeds(upd('adminA', 'pendWeb', { companyId: '', pendingCompanyId: null, role: 'client' })));

  it('+ owner A approves Web pending', () =>
    assertSucceeds(upd('ownerA', 'pendWeb', { companyId: 'A', pendingCompanyId: null, role: 'sales' })));

  it('+ admin A approves Android pending (companyId A unchanged)', () =>
    assertSucceeds(upd('adminA', 'pendAndroid', { role: 'sales' })));

  it('+ admin A soft-deletes Android pending (isDeleted)', () =>
    assertSucceeds(upd('adminA', 'pendAndroid', { isDeleted: true })));

  it('+ system admin (verified email) updates any profile', () =>
    assertSucceeds(
      updateDoc(
        doc(
          env
            .authenticatedContext('sysadmin', { email: 'salemspry2026@gmail.com', email_verified: true })
            .firestore(),
          'userProfiles',
          'salesB',
        ),
        { updatedAt: ts(), updatedBy: 'sysadmin', role: 'admin' },
      ),
    ));

  it('- system-admin email but NOT verified', () =>
    assertFails(
      updateDoc(
        doc(
          env
            .authenticatedContext('sysadmin', { email: 'salemspry2026@gmail.com', email_verified: false })
            .firestore(),
          'userProfiles',
          'salesB',
        ),
        { updatedAt: ts(), updatedBy: 'sysadmin', role: 'admin' },
      ),
    ));
});

describe('UNAUTHORIZED ON OTHERS (attacks)', () => {
  it('- admin A sets sales A -> owner', () =>
    assertFails(upd('adminA', 'salesA', { role: 'owner' })));

  it('- owner A sets sales A -> owner', () =>
    assertFails(upd('ownerA', 'salesA', { role: 'owner' })));

  it('- admin A edits owner A (displayName)', () =>
    assertFails(upd('adminA', 'ownerA', { displayName: 'pwn' })));

  it('- admin A demotes owner A', () =>
    assertFails(upd('adminA', 'ownerA', { role: 'client' })));

  it('- admin A moves sales A to company B', () =>
    assertFails(upd('adminA', 'salesA', { companyId: 'B' })));

  it('- admin A moves sales A to empty company (removal; OPEN-008)', () =>
    assertFails(upd('adminA', 'salesA', { companyId: '', role: 'client' })));

  it('- admin A web removal payload null/null (KI-019)', () =>
    assertFails(upd('adminA', 'salesA', { companyId: null, role: null })));

  it('- admin B edits sales A (cross-company)', () =>
    assertFails(upd('adminB', 'salesA', { role: 'admin' })));

  it('- owner B edits admin A (cross-company)', () =>
    assertFails(upd('ownerB', 'adminA', { displayName: 'x' })));

  it('- admin A edits owner B', () =>
    assertFails(upd('adminA', 'ownerB', { displayName: 'x' })));

  it('- admin B approves pending that asked for A', () =>
    assertFails(upd('adminB', 'pendWeb', { companyId: 'B', pendingCompanyId: null, role: 'sales' })));

  it('- admin A approves pending but sets company B', () =>
    assertFails(upd('adminA', 'pendWeb', { companyId: 'B', pendingCompanyId: null, role: 'sales' })));

  it('- admin A approves pending as owner', () =>
    assertFails(upd('adminA', 'pendWeb', { companyId: 'A', pendingCompanyId: null, role: 'owner' })));

  it('- admin A edits Web client with no relation', () =>
    assertFails(upd('adminA', 'clientWeb', { storeName: 'x' })));

  it('- sales A edits another sales/other profile', () =>
    assertFails(upd('salesA', 'adminA', { displayName: 'x' })));

  it('- sales A edits Android pending', () =>
    assertFails(upd('salesA', 'pendAndroid', { role: 'sales' })));

  it('- client edits another client', () =>
    assertFails(upd('clientWeb', 'clientAndroid', { storeName: 'x' })));

  it("- client edits an admin", () =>
    assertFails(upd('clientWeb', 'adminA', { role: 'client' })));

  it("- pending edits an admin", () =>
    assertFails(upd('pendWeb', 'adminA', { role: 'client' })));

  it('- unauthenticated update', () =>
    assertFails(updateDoc(doc(env.unauthenticatedContext().firestore(), 'userProfiles', 'clientWeb'), { storeName: 'x' })));

  it('- hard delete own profile', () =>
    assertFails(deleteDoc(doc(as('clientWeb'), 'userProfiles', 'clientWeb'))));

  it('- hard delete as admin', () =>
    assertFails(deleteDoc(doc(as('adminA'), 'userProfiles', 'salesA'))));
});

describe('REGRESSION: reads unchanged', () => {
  it("+ user reads own profile", () =>
    assertSucceeds(getDoc(doc(as('clientWeb'), 'userProfiles', 'clientWeb'))));

  it('+ admin A reads sales A', () =>
    assertSucceeds(getDoc(doc(as('adminA'), 'userProfiles', 'salesA'))));

  it('- client reads another profile', () =>
    assertFails(getDoc(doc(as('clientWeb'), 'userProfiles', 'adminA'))));

  it('- admin A reads admin B', () =>
    assertFails(getDoc(doc(as('adminA'), 'userProfiles', 'adminB'))));

  it('+ public company read (visitor)', () =>
    assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'companies', 'A'))));

  it('+ public product read (visitor)', () =>
    assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'products', 'p1'))));
});