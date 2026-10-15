/* Engine regression tests (no browser): dataset integrity, rebasing, MIS answer key, identity matching, mock APIs,
   referral clocks and fallback, offline sync + conflict handling, configuration versions, audit chain.
   Run: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({console, TextEncoder, TextDecoder, performance, setTimeout, clearTimeout, AbortController, atob, btoa, URL, Intl, crypto: globalThis.crypto});
ctx.window = ctx;
for (const f of ['data/synthetic-data.js', 'js/icons.js', 'js/config.js', 'js/demo/state.js', 'js/demo/platform.js', 'js/demo/identity.js', 'js/demo/cases.js', 'js/demo/device.js', 'js/demo/mis.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, {filename: f});
}
const A = ctx.ILAC;
const fresh = day => {if (day) A.setDemoDay(day);A.reset();A.devReset();A.user = A.userByLogin('demo.op.krs');A.mockTimeoutMs = 200;};
const tally = rows => Object.fromEntries(rows.map(r => [r[0], r[1]]));
const sorted = o => JSON.stringify(Object.entries(o).sort());

test('dataset v1.0 loads unaltered: 3,684 records in 22 sheets matching the pack', () => {
  fresh();
  const total = Object.values(A.sheets).reduce((s, r) => s + r.length, 0);
  assert.equal(Object.keys(A.sheets).length, 22);
  assert.equal(total, 3684);
  for (const [name, n] of Object.entries(A.expectedCounts)) assert.equal(A.sheets[name].length, n, name);
  assert.equal(A.sheets.T01_Workers.filter(w => /near-duplicate/.test(w.record_origin)).length, 6);
});

test('offset-driven dates rebase to the chosen demo day D', () => {
  fresh('2027-03-15');
  const r = A.st.referrals.find(x => x.referral_id === 'SYN-R-00151');
  assert.equal(r.created_on, '2027-02-18');            // D-25
  assert.equal(r.due_on, '2027-03-11');                // D-4
  assert.equal(A.st.event.event_date, '2027-03-15');
  const nominal = A.sheets.T08_JobMela_Candidates[0].registered_on;
  assert.equal(A.daysBetween(nominal, A.st.jmCands[0].registered_on), A.shift);
  fresh(A.istToday());
});

test('MIS queries Q1–Q5 equal the answer computed independently from the CSV values', () => {
  fresh();
  const key = A.mis.answerKey();
  assert.equal(Object.values(key.q1).reduce((a, b) => a + b, 0), 176);
  const top5 = Object.entries(key.q1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(x => x.join(':'));
  assert.equal(top5.join(','), 'Kakinada:15,Srikakulam:14,Kurnool:11,Palnadu:11,Krishna:10');
  assert.equal(Object.values(key.q2).reduce((a, b) => a + b, 0), 54);
  assert.equal(Object.values(key.q4).reduce((a, b) => a + b, 0), 26);
  assert.equal(sorted(key.q5), sorted({'Tile layer': 1, 'Plasterer': 1, 'Electrician': 1, 'Bar bender': 1}));
  const run = id => A.mis.run(A.mis.find(id), A.userByLogin('demo.pmu.state'));
  assert.equal(sorted(tally(run('std-women').rows)), sorted(key.q1));
  assert.equal(sorted(tally(run('std-past-clock').rows)), sorted(key.q2));
  assert.equal(sorted(tally(run('std-jm-trade').rows)), sorted(key.q3));
  assert.equal(sorted(tally(run('std-grv-old').rows)), sorted(key.q4));
  assert.equal(sorted(tally(run('std-skill-gap').rows)), sorted(key.q5));
});

test('identity matching: P-02 flags SYN-W-000607 before creation; P-01/P-03 are new; Telugu key equals English key', () => {
  fresh();
  const dup = A.findDuplicates({name: 'Gorle Laxmi', dob: '1990-03-14', mobile: '9000099021', uid_token_mock: 'SYN-UIDTOK-90047846'});
  assert.equal(dup[0].worker.worker_id, 'SYN-W-000607');
  assert.ok(dup[0].score >= 0.85);
  assert.equal(A.findDuplicates({name: 'Kona Venkata Ramana', dob: '1984-06-12', mobile: '9000099011', uid_token_mock: 'SYN-UIDTOK-41100011'}).length, 0);
  assert.equal(A.findDuplicates({name: 'Pydi Simhachalam', dob: '1996-10-30', mobile: '9000099031', uid_token_mock: 'SYN-UIDTOK-41100031'}).length, 0);
  assert.equal(A.nameKey('గొర్లె లక్ష్మి'), A.nameKey('Gorle Lakshmi'));
  assert.equal(A.seededDuplicatePairs().length, 6);
});

test('mock Government APIs follow S_Mock_API_Behaviour', async () => {
  fresh();
  const bocw = await A.mock.call('APBOCWWB registry', 'POST', '/mock/bocw/v1/workers/search', {name: 'Gorle Laxmi', date_of_birth: '1990-03-14', mobile: '9000099021'});
  assert.equal(bocw.body.matches[0].worker_id, 'SYN-W-000607');
  const none = await A.mock.call('APBOCWWB registry', 'POST', '/mock/bocw/v1/workers/search', {name: 'Kona Venkata Ramana', mobile: '9000099011'});
  assert.equal(none.body.count, 0);
  const esh = await A.mock.call('e-Shram', 'POST', '/mock/eshram/v1/verify', {uid_token_mock: 'SYN-UIDTOK-41100011'});
  assert.equal(esh.body.uan_token, 'SYN-UAN-77810011');
  await assert.rejects(A.mock.callT('e-Shram', 'POST', '/mock/eshram/v1/verify', {uid_token_mock: 'SYN-UIDTOK-41100031'}, {}, 200), /timeout/);
  assert.equal(A.st.apiLog[0].status, 0);
  assert.equal((await A.mock.call('UIDAI (mock)', 'POST', '/mock/uidai/v1/auth', {aadhaar_number: '123456789012'})).status, 400);
  assert.equal((await A.mock.call('UIDAI (mock)', 'POST', '/mock/uidai/v1/auth', {uid_token_mock: 'SYN-UIDTOK-41100011', otp: '000000'})).status, 401);
  assert.equal((await A.mock.call('UIDAI (mock)', 'POST', '/mock/uidai/v1/auth', {uid_token_mock: 'SYN-UIDTOK-41100011', otp: '123456'})).status, 200);
  assert.equal((await A.mock.call('Civil Supplies', 'POST', '/mock/civilsupplies/v1/ricecard/member-additions', {})).status, 503);
  A.st.mockState.civilSuppliesDown = false;
  assert.equal((await A.mock.call('Civil Supplies', 'POST', '/mock/civilsupplies/v1/ricecard/member-additions', {worker_id: 'x', member_name: 'y'})).status, 201);
  const msg = A.sendMessage('9000099011', 'registration_ack', {worker_id: 'SYN-W-000610', ack: 'ACK-1', centre: 'ILAC NTR Centre 1'}, 'te');
  assert.match(msg.text, /SYN-W-000610/);
  assert.match(msg.status, /not dispatched/);
  assert.equal(A.st.apiLog[0].status, 202);
});

test('referrals: API route with 7-day clock, automatic manual fallback with 21-day clock, same case ID pattern', async () => {
  fresh();
  const w = A.W('SYN-W-000608');
  const a = await A.createReferral(w, 'SK-01');
  const b = await A.createReferral(w, 'CS-01');
  assert.equal(a.mode, 'api');assert.match(a.external_ack_no, /^SYN-APSSDC-ACK-\d{6}$/);
  assert.equal(a.clock, 7);assert.equal(a.due_on, A.addDays(A.D, 7));
  assert.equal(b.mode, 'manual');assert.equal(b.fallback_reason, 'API unavailable');
  assert.equal(b.clock, 21);assert.equal(b.due_on, A.addDays(A.D, 21));
  assert.match(a.referral_id, /^SYN-R-\d{5}$/);assert.match(b.referral_id, /^SYN-R-\d{5}$/);
  assert.equal(b.responsible_officer, 'demo.nodal.cs');
  assert.ok(A.st.retries.some(r => r.case_id === b.referral_id));   // open dependency
  assert.equal(A.st.apiLog.find(l => l.path.includes('civilsupplies')).status, 503);
});

test('pre-existing SYN-R-00151 is overdue with L1 (day 14) and L2 (day 21) escalation history', () => {
  fresh();
  const r = A.st.referrals.find(x => x.referral_id === 'SYN-R-00151');
  const s = A.refState(r);
  assert.equal(s.overdue, true);assert.equal(s.daysOver, 4);assert.equal(s.level, 2);
  const h = A.escalationHistory(r);
  assert.equal(JSON.stringify(h.map(x => [x.level, x.day, x.to, x.at])), JSON.stringify([['L1', 14, 'demo.dlo.krs', A.addDays(A.D, -11)], ['L2', 21, 'demo.pmu.state', A.addDays(A.D, -4)]]));
});

test('C3: a changed service clock applies to new referrals only', async () => {
  fresh();
  A.user = A.userByLogin('demo.admin.state');
  const svc = A.st.svcByCode.get('CS-01');
  const item = A.config.publish('service_clock', 'CS-01', {clock: 15, l1: 10, l2: 15}, 'CS-01 21→15, L1 14→10');
  Object.assign(svc, {clock: 15, l1: 10, l2: 15, version: item.version});
  assert.equal(item.version, 2);
  const created = await A.createReferral(A.W('SYN-W-000608'), 'CS-01');
  assert.equal(created.clock, 15);assert.equal(created.l1, 10);
  const old = A.st.referrals.find(r => r.referral_id === 'SYN-R-00151');
  assert.equal(old.clock, 21);assert.equal(old.l1, 14);
});

test('C1/C2/C4: forms and master data publish new immutable versions without code', () => {
  fresh();
  A.user = A.userByLogin('demo.admin.state');
  assert.equal(A.baselineForm().version, 1);
  A.config.publish('form', 'household_baseline', {fields: [...A.baselineForm().fields, {key: 'worker_language', label: 'Primary language of worker', options: ['Telugu', 'Urdu', 'Odia', 'Hindi', 'Other'], required: true}]}, 'C1');
  assert.equal(A.baselineForm().version, 2);
  assert.ok(A.baselineForm().fields.find(f => f.key === 'worker_language').required);
  A.config.publish('form', 'site_visit', {items: [...A.siteChecklist().items, {key: 'ppe_helmets', label: 'PPE – safety helmets available on site (Yes/No)', type: 'yesno'}]}, 'C2');
  assert.equal(A.siteChecklist().items.at(-1).key, 'ppe_helmets');
  A.config.publish('master', 'trades', {trades: [...A.tradeList(), 'Solar panel installer']}, 'C4');
  assert.ok(A.tradeList().includes('Solar panel installer'));
  assert.equal(A.st.config.log.length, 3);
});

test('offline sync: provisional ID → permanent ID, idempotent replay, conflict keeps both versions until resolved', async () => {
  fresh();
  A.user = A.userByLogin('demo.ff.krs');
  await A.devLogin();
  await A.devDownload('SYN-VIS-001');
  assert.equal(A.dev.roster.length, 12);
  A.dev.airplane = true;
  for (const r of A.dev.roster) A.devAttendance(r.worker_id, ['SYN-W-000182', 'SYN-W-000225'].includes(r.worker_id) ? 'Absent' : 'Present');
  const pid = await A.devRegister({full_name: 'Gudla Eswar', date_of_birth: '2001-02-17', gender: 'Male', mobile: '9000099041', primary_trade: 'Helper / Unskilled worker', years_experience: '2', aadhaar_masked: 'XXXX-XXXX-6620', uid_token_mock: 'SYN-UIDTOK-41100041', bank_account_held: 'No', smartphone: 'Yes', consent_version: 'CONSENT-DEMO-v1', centre_id: 'ILAC-KRS-01', district_code: 'KRS', site_id: 'SYN-S-0006'});
  assert.match(pid, /^PRV-/);
  assert.ok(A.dev.cipher['worker/' + pid].ct.length > 20);        // stored encrypted on the device
  assert.ok(!A.dev.cipher['worker/' + pid].ct.includes('Gudla')); // ciphertext only
  A.devEditWorker('SYN-W-000120', 'mobile', '9000099101');
  A.user = A.userByLogin('demo.op.krs');
  A.editWorkerField('SYN-W-000120', 'mobile', '9000099102', {by: 'demo.op.krs'});
  A.dev.airplane = false;
  const results = await A.devSync(false);
  const byEntity = name => results.filter(r => A.dev.outbox.find(c => c.clientId === r.clientId).entity === name);
  assert.equal(byEntity('attendance').every(r => r.status === 'ACCEPTED'), true);
  const created = byEntity('worker_create')[0];
  assert.equal(created.status, 'ACCEPTED');assert.match(created.serverId, /^SYN-W-\d{6}$/);
  assert.equal(created.eshram, 'Verified');
  assert.match(created.duplicateCheck, /clear/);
  assert.equal(byEntity('worker_update')[0].status, 'CONFLICT');
  assert.equal(A.W('SYN-W-000120').mobile, '9000099102');          // centre value stays live, field under review
  assert.ok(A.W('SYN-W-000120').under_review.mobile);
  const c = A.st.conflicts[0];
  assert.equal(c.server.value, '9000099102');assert.equal(c.incoming.value, '9000099101');
  const replay = await A.serverApply(A.dev.outbox.find(x => x.entity === 'attendance'), A.dev);
  assert.equal(replay.status, 'DUPLICATE');
  A.user = A.userByLogin('demo.sup.krs');
  assert.throws(() => A.resolveConflict(c.id, 'incoming', '', ''), /reason/);
  A.resolveConflict(c.id, 'incoming', '', 'Verified with the worker on site');
  assert.equal(A.W('SYN-W-000120').mobile, '9000099101');
  assert.equal(A.W('SYN-W-000120').under_review.mobile, undefined);
  assert.equal(c.status, 'Resolved');
  assert.ok(c.server && c.incoming && c.resolution);               // both variants still stored
  assert.equal(A.W(created.serverId).visits.length, 1);
  assert.equal(A.st.visitRoster.some(r => r.worker_id === created.serverId), true);
  assert.equal(A.verifyAuditChain().ok, true);
});

test('audit ledger detects tampering', () => {
  fresh();
  A.audit('a', 'x', '1');A.audit('b', 'y', '2');A.audit('c', 'z', '3');
  assert.equal(A.verifyAuditChain().ok, true);
  A.st.audit[1].detail = 'changed';
  const v = A.verifyAuditChain();
  assert.equal(v.ok, false);assert.equal(v.brokenAt, 2);
});

test('SHA-256 matches the standard test vectors', () => {
  assert.equal(A.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(A.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
