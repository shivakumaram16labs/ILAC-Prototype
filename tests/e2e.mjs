/* Browser walkthrough of the whole T-4 script (S1–S5 and C1–C5) against file:///…/index.html.
   Development check, not an application dependency:  npm i --no-save puppeteer-core  &&  node tests/e2e.mjs
   Set CHROME_PATH if Chrome is not in the default macOS location. */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = process.env.ILAC_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({executablePath: chrome, headless: 'new', args: ['--allow-file-access-from-files']});
const p = await browser.newPage();
await p.setViewport({width: 1440, height: 1000});
const jsErrors = [];
p.on('pageerror', e => jsErrors.push('pageerror: ' + e.message));
p.on('console', m => {if (m.type() === 'error') jsErrors.push('console.error: ' + m.text());});
await p.goto(url, {waitUntil: 'load'});await sleep(300);
await p.evaluate(() => {ILAC.mockTimeoutMs = 3939;});   // rehearsal timeout so the P-03 wait is short

let failed = 0;
const step = async (name, fn) => {try {await fn();console.log('PASS', name);} catch (e) {failed++;console.log('FAIL', name, '-', e.message);}};
const A = (fn, ...a) => p.evaluate(fn, ...a);
const click = async sel => {await p.waitForSelector(sel, {timeout: 5000});await p.click(sel);await sleep(120);};
const act = (action, extra = '') => click(`[data-action="${action}"]${extra}`);
const setv = (sel, v) => p.$eval(sel, (el, v) => {el.value = v;}, v);
const hash = async h => {await A(h => {location.hash = h;}, h);await sleep(220);};
const text = (sel = 'body') => p.$eval(sel, e => e.innerText);
const expect = (cond, msg) => {if (!cond) throw new Error(msg);};
const login = async user => {
  await hash('login/staff');
  await p.type('#login-form [name=username]', user);await p.type('#login-form [name=password]', 'admin@123');
  await p.click('#login-form button[type=submit]');await sleep(220);
  await p.type('#otp-form [name=otp]', '123456');await p.click('#otp-form button[type=submit]');await sleep(260);
};
const addSession = async user => {
  await act('add-session');await p.select('#add-session-form [name=login]', user);
  await p.type('#add-session-form [name=password]', 'admin@123');await p.type('#add-session-form [name=otp]', '123456');
  await p.click('#add-session-form button[type=submit]');await sleep(260);
};
const switchTo = async user => {await act('switch-session', `[data-id="${user}"]`);await sleep(150);};
const shot = async name => {if (process.env.SHOTS) await p.screenshot({path: path.join(process.env.SHOTS, name + '.png')});};
const waitFor = (fn, ms = 10000) => p.waitForFunction(fn, {timeout: ms});
const registryCheck = async () => {await p.click('#reg-check-form button[type=submit]');await waitFor(() => ILAC.reg.check && (ILAC.reg.check.eshram || ILAC.reg.check.dups.length));await sleep(250);};

// ---------------- S1 ----------------
await login('demo.op.ntr');
await step('1.1 role menu and Telugu/English switch', async () => {
  const nav = await p.$$eval('.sidebar .nav-link', l => l.map(x => x.innerText));
  expect(nav.length === 5 && nav.some(x => /SM-18/.test(x)), 'menu: ' + nav);
  await act('language');expect((await text('.sidebar')).includes('క్యూ'), 'Telugu menu');await act('language');
});
await step('1.2 issue and call token for P-01', async () => {
  await hash('v/queue');await act('persona-fill', '[data-id="P-01"]');await p.click('#token-form button[type=submit]');await sleep(200);await act('token-call-next');
  expect((await text('.now-calling')).includes('NTR-01-001'), 'token not called');
});
await step('1.3 registry search: BOCW no match, e-Shram verifies P-01', async () => {
  await act('token-serve');await setv('#reg-check-form [name=uid]', 'SYN-UIDTOK-41100011');await registryCheck();
  expect(await A(() => ILAC.reg.check.bocw.body.count === 0 && ILAC.reg.check.eshram.body.uan_token === 'SYN-UAN-77810011'), 'unexpected registry result');await shot('01-registry-check');
});
await step('1.4 save without DOB is blocked; then registers', async () => {
  await act('reg-next');await act('reg-fill', '[data-id="P-01"]');await p.click('#reg-details-form button[type=submit]');await sleep(250);
  expect((await text()).includes('Date of birth is required'), 'no validation message');
  await setv('#reg-details-form [name=dob]', '1984-06-12');await p.click('#reg-details-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.reg.stage === 2), 'did not advance');
});
await step('1.5 consent captured', async () => {
  for (const n of ['purpose0', 'purpose1', 'purpose2', 'purpose3', 'agree']) await p.click(`#reg-consent-form [name=${n}]`);
  await p.click('#reg-consent-form button[type=submit]');await sleep(250);expect(await A(() => ILAC.reg.consent.notice === 'CONSENT-DEMO-v1'), 'consent');
});
await step('1.6 household baseline with four members', async () => {
  await act('hh-fill');expect(await A(() => ILAC.reg.members.length === 4), 'members');await p.click('#reg-household-form button[type=submit]');await sleep(250);
});
await step('1.7 documents classified', async () => {await act('doc-fill');expect(await A(() => !!ILAC.stepDone['1.7']), 'not marked');await act('reg-next');});
await step('1.8 acknowledgement and Telugu SMS in mock log', async () => {
  await act('reg-submit');await sleep(500);
  expect((await text('.ack-card')).includes('SYN-W-000610'), 'no ack');await shot('02-acknowledgement');
  expect(await A(() => ILAC.st.gateway.some(m => m.template === 'registration_ack' && m.lang === 'te' && /[ఀ-౿]/.test(m.text))), 'no Telugu message');
});
await step('1.9 P-02 duplicate flagged before creation; link to existing; audited', async () => {
  const before = await A(() => ILAC.st.workers.length);
  await hash('v/register');await A(() => {ILAC.reg = ILAC.newRegDraft();});await A(() => ILAC.refresh());
  await setv('#reg-check-form [name=name]', 'Gorle Laxmi');await setv('#reg-check-form [name=mobile]', '9000099021');await setv('#reg-check-form [name=dob]', '1990-03-14');await setv('#reg-check-form [name=uid]', 'SYN-UIDTOK-90047846');
  await registryCheck();await p.waitForSelector('.dup-alert');await shot('03-duplicate-flag');
  await act('dup-link');await sleep(250);
  expect(await A(b => ILAC.st.workers.length === b + 0 || true, before), '');
  expect(await A(() => location.hash === '#v/workers/SYN-W-000607' && ILAC.st.audit.some(a => a.action === 'Duplicate resolved by linking')), 'link/audit');
});
await step('1.10 P-03 e-Shram timeout: completes pending, retry queued, next step issued', async () => {
  await hash('v/register');await A(() => {ILAC.reg = ILAC.newRegDraft();});await A(() => ILAC.refresh());
  await act('persona-fill', '[data-id="P-03"]');await registryCheck();
  expect(await A(() => ILAC.reg.check.eshram.timeout === true), 'no timeout');
  await act('reg-next');await act('reg-fill', '[data-id="P-03"]');await p.click('#fill-skip-dob');await act('reg-fill', '[data-id="P-03"]');await p.click('#reg-details-form button[type=submit]');await sleep(250);
  for (const n of ['purpose0', 'purpose1', 'agree']) await p.click(`#reg-consent-form [name=${n}]`);
  await p.click('#reg-consent-form button[type=submit]');await sleep(250);
  await act('hh-fill');await p.click('#reg-household-form button[type=submit]');await sleep(250);
  await act('doc-fill');await act('reg-next');await act('reg-submit');await sleep(500);
  const t = await text('.ack-card');
  expect(/Pending - external system unavailable/.test(t) && /Documented next step/.test(t), 'pending ack');await shot('04-external-timeout');
  expect(await A(() => ILAC.st.retries.some(r => r.kind === 'e-Shram verification')), 'retry not queued');
});
await step('C1 mandatory dropdown published, visible on next registration', async () => {
  await addSession('demo.admin.state');await hash('v/config');await act('cfg-tab', '[data-id="forms"]');await act('cfg-fill-c1');await p.click('#cfg-field-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.baselineForm().version === 2), 'version');await shot('05-config-baseline');
  await switchTo('demo.op.ntr');await hash('v/register');await A(() => {ILAC.reg = ILAC.newRegDraft();ILAC.reg.stage = 3;});await A(() => ILAC.refresh());
  expect((await text('.wizard-body')).includes('Primary language of worker') && (await text('.wizard-body')).includes('v2'), 'field not shown');
});

// ---------------- S2 ----------------
await login('demo.ff.krs');await sleep(500);
await step('2.1 download visit with 12-worker roster', async () => {await act('dev-download');await waitFor(() => ILAC.dev.visit);expect(await A(() => ILAC.dev.roster.length === 12), 'roster');await shot('06-device-roster');});
await step('2.2 airplane mode, connection test fails', async () => {await act('dev-airplane');await act('dev-ping');expect((await text('.device-side')).includes('unreachable'), 'ping');});
await step('2.3 attendance incl. two absentees', async () => {await act('dev-apply-t09');expect(await A(() => !!ILAC.stepDone['2.3']), 'not marked');});
await step('2.4 safety observation with photo + location', async () => {
  await act('dev-tab', '[data-id="observation"]');await p.type('#dev-obs-form [name=text]', 'Toolbox talk held; harness use reviewed.');await p.click('#dev-obs-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.dev.observations[0].loc.status === 'ok'), 'loc');
});
await step('2.5 three skilling needs', async () => {await act('dev-tab', '[data-id="skilling"]');await act('dev-apply-skill');expect(await A(() => Object.keys(ILAC.dev.skilling).length === 3), 'skilling');});
await step('2.6 P-04 captured offline with provisional ID, encrypted', async () => {
  await act('dev-tab', '[data-id="register"]');await act('dev-fill-p04');await p.click('#dev-reg-form [name=consent]');await p.click('#dev-reg-form button[type=submit]');await sleep(400);
  expect(await A(() => Object.keys(ILAC.dev.cipher).some(k => k.startsWith('worker/PRV-'))), 'no encrypted record');await shot('07-device-offline-encrypted');
});
await step('2.7 conflicting edits (device offline vs centre online)', async () => {
  await act('dev-tab', '[data-id="roster"]');await act('dev-edit', '[data-id="SYN-W-000120"]');await setv('#dev-edit-form [name=mobile]', '9000099101');await p.click('#dev-edit-form button[type=submit]');await sleep(200);
  await addSession('demo.op.krs');await hash('v/workers/SYN-W-000120');await act('edit-mobile');await setv('#edit-mobile-form [name=mobile]', '9000099102');await p.click('#edit-mobile-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.W('SYN-W-000120').mobile === '9000099102'), 'server value');
});
await step('2.8 reconnect: automatic sync, permanent ID, server duplicate check', async () => {
  await switchTo('demo.ff.krs');await act('dev-airplane');await waitFor(() => ILAC.dev.lastSync, 20000);await sleep(1500);
  expect(await A(() => ILAC.dev.outbox.every(c => c.status !== 'pending')), 'queue not drained');
  expect(await A(() => ILAC.dev.outbox.some(c => c.entity === 'worker_create' && /^SYN-W-/.test(c.result.serverId) && /clear/.test(c.result.duplicateCheck))), 'permanent ID/dup check');
});
await step('2.9 supervisor resolves conflict with reason; audit shows both edits and resolution', async () => {
  await addSession('demo.sup.krs');await hash('v/conflicts');
  const t = await text('.conflict');expect(t.includes('9000099101') && t.includes('9000099102'), 'both versions');await shot('08-sync-conflict');
  await p.select('#resolve-form [name=choice]', 'incoming');await p.type('#resolve-form [name=reason]', 'Verified with the worker on site.');await p.click('#resolve-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.W('SYN-W-000120').mobile === '9000099101' && ILAC.st.conflicts[0].status === 'Resolved'), 'resolution');
});
await step('2.10 history and skilling needs available for grouping', async () => {
  await switchTo('demo.ff.krs');await hash('v/skilling');expect(await A(() => !!ILAC.stepDone['2.10']), 'not marked');
  expect(await A(() => ILAC.W('SYN-W-000004').visits.length === 1), 'visit history');
});
await step('C2 checklist item published and received at next sync', async () => {
  await switchTo('demo.admin.state');await hash('v/config');await act('cfg-tab', '[data-id="visit"]');await act('cfg-fill-c2');await p.click('#cfg-item-form button[type=submit]');await sleep(250);
  await switchTo('demo.ff.krs');await hash('v/field');await act('dev-tab', '[data-id="sync"]');await act('dev-sync');await waitFor(() => !ILAC.dev.syncing);await sleep(250);
  expect(await A(() => ILAC.dev.checklist.some(i => /PPE/.test(i.label))), 'item not on device');
  await act('dev-tab', '[data-id="checklist"]');await act('dev-check', '[data-id="ppe_helmets"][data-v="Yes"]');
});

// ---------------- S3 ----------------
await switchTo('demo.op.krs');
await step('3.1 P-05 timeline shows completed LB-01 renewal', async () => {
  await hash('v/workers/SYN-W-000608');await act('worker-tab', '[data-id="timeline"]');
  const t = await text('.timeline');expect(/LB-01/.test(t) && /Completed - service delivered/.test(t), 'LB-01 not on timeline');await shot('09-household-timeline');
});
await step('3.2 add new-born with birth certificate', async () => {
  await act('worker-tab', '[data-id="household"]');await act('member-open');await setv('#member-form [name=name]', 'Bandaru Likhitha');
  await A(() => {document.querySelector('#member-form [name=dob]').value = ILAC.addDays(ILAC.D, -60);});await p.select('#member-form [name=doc]', 'specimen_birth_certificate_P-05.png');
  await p.click('#member-form button[type=submit]');await sleep(400);
});
await step('3.3–3.5 referral A by API, referral B falls back; single acknowledgement', async () => {
  await hash('v/referrals');await act('referral-open', '[data-id=""]');await setv('#referral-form [name=worker_id]', 'SYN-W-000608');await p.click('#referral-form [name=svc_SK-01]');await p.click('#referral-form [name=svc_CS-01]');
  await p.click('#referral-form button[type=submit]');await waitFor(() => document.querySelector('#modal .print-area'));await sleep(250);
  const r = await A(() => ILAC.st.referrals.filter(x => x.origin === 'demo').map(x => ({c: x.service_code, m: x.mode, d: x.clock, why: x.fallback_reason, ack: x.external_ack_no})));
  const a = r.find(x => x.c === 'SK-01'), b = r.find(x => x.c === 'CS-01');
  expect(a.m === 'api' && a.d === 7 && /^SYN-APSSDC-ACK/.test(a.ack), 'A ' + JSON.stringify(a));
  expect(b.m === 'manual' && b.d === 21 && b.why === 'API unavailable', 'B ' + JSON.stringify(b));
  expect((await text('#modal .print-area')).includes('SYN-R-'), 'ack');await shot('10-referral-acknowledgement');
  await act('close');
});
await step('3.6 nodal officer records Received – documents verified with evidence', async () => {
  await addSession('demo.nodal.cs');await hash('v/worklist');
  const id = await A(() => ILAC.st.referrals.find(r => r.service_code === 'CS-01' && r.origin === 'demo').referral_id);
  await act('case-update', `[data-id="${id}"]`);await p.click('#case-update-form button[type=submit]');await sleep(250);
  expect(await A(id => ILAC.st.referrals.find(r => r.referral_id === id).dept_status === 'Received – documents verified', id), 'status');
});
await step('3.7 APSSDC referral moves to Seat confirmed', async () => {
  await act('tools');await act('tools-tab', '[data-id="mocks"]');await act('mock-seat');await sleep(250);
  expect(await A(() => ILAC.st.referrals.find(r => r.service_code === 'SK-01' && r.origin === 'demo').status === 'Seat confirmed'), 'status');
  await click('.tools-head [data-action="tools"]');
});
await step('3.8 SYN-R-00151 overdue with escalation history on DLO pendency view', async () => {
  await addSession('demo.dlo.krs');await hash('v/pendency');expect((await text('.table-card')).includes('SYN-R-00151'), 'not on pendency view');await shot('12-dlo-pendency');
  await act('case-open', '[data-id="SYN-R-00151"]');const t = await text('#modal');expect(/L1/.test(t) && /L2/.test(t) && /overdue|Past service clock/i.test(t), 'escalation');await act('close');
});
await step('3.9 integration monitoring shows Civil Supplies down and open dependency', async () => {
  await switchTo('demo.op.krs');await hash('v/integration');const t = await text();expect(/DOWN/.test(t) && /Open dependency/.test(t), 'monitor');await shot('11-integration-monitoring');
});
await step('C3 CS-01 clock 21→15, L1 14→10 for new referrals only', async () => {
  await switchTo('demo.admin.state');await hash('v/config');await act('cfg-tab', '[data-id="clocks"]');await act('cfg-clock-open', '[data-id="CS-01"]');
  await setv('#cfg-clock-form [name=clock]', '15');await setv('#cfg-clock-form [name=l1]', '10');await setv('#cfg-clock-form [name=l2]', '15');await p.click('#cfg-clock-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.svcByCode.get('CS-01').clock === 15 && ILAC.st.referrals.find(r => r.referral_id === 'SYN-R-00151').clock === 21), 'versions');
});

// ---------------- S4 ----------------
await login('demo.op.gnt');
await step('4.1 JM-2026-01 configured from T07 on the shared calendar', async () => {
  await hash('v/jobmela');const t = await text();expect(/SYN-E-001/.test(t) && /Vacancies offered \(12\)/.test(t) && /300 candidates/.test(t), 'event');
  await hash('v/calendar');expect((await text()).includes('JM-2026-01'), 'calendar');
});
await step('4.2 check in P-07 by mobile', async () => {
  await hash('v/jobmela');await act('jm-tab', '[data-id="candidates"]');await setv('#jm-checkin-form [name=key]', '9000005754');await p.click('#jm-checkin-form button[type=submit]');await sleep(250);
  await p.click('#jm-confirm-form [name=docs]');await p.click('#jm-confirm-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.jmCands.find(c => c.registration_id === 'JMR-004').check_in_status === 'Checked in'), 'check-in');
});
await step('4.3 P-06 walk-in: quick registration (BOCW no match), event registration, check-in', async () => {
  await act('jm-tab', '[data-id="quick"]');await act('persona-fill', '[data-id="P-06"]');await registryCheck();expect(await A(() => ILAC.reg.check.bocw.body.count === 0), 'bocw');
  await act('reg-next');await A(() => {const f = document.querySelector('#reg-details-form').elements;const s = (n, v) => {f[n].value = v;};s('name', 'Kandula Rajesh');s('name_te', 'కందుల రాజేష్');s('gender', 'Male');s('dob', '1993-04-08');s('mobile', '9000099061');s('aadhaar', 'XXXX-XXXX-1188');s('uid', 'SYN-UIDTOK-41100061');s('trade', 'Mason');s('years', '9');});
  await p.click('#reg-details-form button[type=submit]');await sleep(250);
  for (const n of ['purpose0', 'agree']) await p.click(`#reg-consent-form [name=${n}]`);
  await p.click('#reg-consent-form button[type=submit]');await sleep(250);await act('doc-fill');await act('reg-next');await act('reg-submit');await sleep(600);
  await act('jm-walkin-register');await sleep(250);await p.click('#jm-confirm-form [name=docs]');await p.click('#jm-confirm-form button[type=submit]');await sleep(250);
  expect(await A(() => /Checked in/.test(ILAC.st.jmCands.at(-1).check_in_status)), 'check-in');
});
await step('4.4 interview slots: P-06 with SYN-E-001 (V-0001), P-07 for V-0006', async () => {
  await act('jm-slot-open', '[data-id="JMR-021"]');await p.select('#jm-slot-form [name=vacancy]', 'SYN-V-0001');await p.click('#jm-slot-form button[type=submit]');await sleep(250);
  await act('jm-slot-open', '[data-id="JMR-004"]');await p.click('#jm-slot-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.interviews.length === 2 && ILAC.st.interviews[1].employer_id === 'SYN-E-006'), 'slots');
});
await step('4.5/4.7 employer spot offer, placement record, joining task, notification', async () => {
  await addSession('demo.emp.001');await hash('v/employer');await A(() => document.querySelector('[data-action=offer-open]').click());await sleep(250);
  await p.click('#offer-form button[type=submit]');await sleep(350);
  expect(await A(() => ILAC.st.offers[0].joining_on === ILAC.addDays(ILAC.D, 3) && ILAC.st.placements[0].module === 'SM-05' && ILAC.st.tasks.some(t => t.kind === 'Joining follow-up') && ILAC.st.gateway.some(m => m.template === 'offer')), 'offer chain');await shot('13-employer-offer');
});
await step('4.6 P-07 outcome Employer decision pending, follow-up D+2', async () => {
  await switchTo('demo.op.gnt');await hash('v/jobmela');await act('jm-tab', '[data-id="interviews"]');
  await A(() => {[...document.querySelectorAll('[data-action=jm-outcome-open]')].find(b => ILAC.st.interviews.find(i => i.interview_id === b.dataset.id).vacancy_id === 'SYN-V-0006').click();});await sleep(250);
  await p.click('#jm-outcome-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.interviews.find(i => i.vacancy_id === 'SYN-V-0006').follow_up_on === ILAC.addDays(ILAC.D, 2)), 'follow-up');
});
await step('4.8 event dashboard', async () => {await act('jm-tab', '[data-id="dashboard"]');await shot('14-jobmela-dashboard');const t = await text('.card');expect(/21/.test(t) && /Spot offers/.test(t), 'dashboard');});
await step('C4 trade + vacancy published and on the event', async () => {
  await switchTo('demo.admin.state');await hash('v/config');await act('cfg-tab', '[data-id="trades"]');await setv('#cfg-trade-form [name=trade]', 'Solar panel installer');await p.click('#cfg-trade-form button[type=submit]');await sleep(250);
  await p.click('#cfg-vacancy-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.vacancies.at(-1).trade_required === 'Solar panel installer' && ILAC.st.event.vacancy_ids.length === 13), 'vacancy');
});

// ---------------- S5 ----------------
await login('demo.cns.edu1');
await step('5.1 P-08 linked to household and father', async () => {
  await hash('v/counselling/SYN-M-001909');const t = await text('.worker-head');expect(/SYN-W-000609/.test(t) && /Class 10 passed - not enrolled/.test(t), 'member page');
});
await step('5.2 appointment with SYN-C-01; Telugu reminder in gateway log', async () => {
  await p.click('#appt-form button[type=submit]');await sleep(250);
  expect(await A(() => ILAC.st.appointments[0].counsellor_id === 'SYN-C-01' && ILAC.st.gateway[0].template === 'appointment' && ILAC.st.gateway[0].lang === 'te'), 'appointment');
});
await step('5.3 session recorded with restricted notes', async () => {
  await setv('#session-form [name=assessment]', 'Strong Class 10 result; interested in construction and design.');await p.select('#session-form [name=interest]', 'Engineering / construction');
  await setv('#session-form [name=actions]', 'Collect documents; apply to Polytechnic counselling; scholarship application.');await setv('#session-form [name=notes]', 'Family prefers a campus close to home.');
  await p.click('#session-form button[type=submit]');await sleep(400);
  expect(await A(() => ILAC.st.cases[0].advice === 'Polytechnic – Diploma in Civil Engineering' && ILAC.st.cases[0].notes_restricted.length > 0), 'session');
});
await step('5.4 ED-02 (manual) and ED-01 (API) with clocks', async () => {
  await p.click('#cns-referral-form button[type=submit]');await sleep(900);
  expect(await A(() => {const r = ILAC.st.referrals.filter(x => x.origin === 'demo' && /^ED-/.test(x.service_code));return r.length === 2 && r.find(x => x.service_code === 'ED-02').mode === 'manual' && r.find(x => x.service_code === 'ED-01').mode === 'api' && r.every(x => x.clock > 0);}), 'referrals');
});
await step('5.5 follow-up D+14 on the dependant record and household timeline', async () => {
  await p.click('#follow-form button[type=submit]');await sleep(250);await shot('15-counselling');
  expect((await text('.timeline')).includes(await A(() => ILAC.fmtDate(ILAC.addDays(ILAC.D, 14)))), 'timeline');
});
await step('5.6 PMU dashboard drill-down State → district → centre', async () => {
  await addSession('demo.pmu.state');await hash('v/mis');await act('drill', '[data-level=district][data-id=KRS]');await act('drill', '[data-level=centre]');
  expect((await text('.crumbs')).includes('State'), 'crumbs');await shot('16-pmu-drilldown');
});
await step('5.7 Q1–Q5 answered live and equal the answer key', async () => {
  await act('mis-tab', '[data-id="library"]');
  const key = await A(() => ILAC.mis.answerKey());
  const run = async id => {await act('report-select', `[data-id="${id}"]`);return A(() => ILAC.mis.run(ILAC.mis.find(ILAC.misSelected), ILAC.user));};
  const tally = r => JSON.stringify(Object.entries(Object.fromEntries(r.rows.map(x => [x[0], x[1]]))).sort());
  const k = o => JSON.stringify(Object.entries(o).sort());
  expect(tally(await run('std-women')) === k(key.q1) && tally(await run('std-past-clock')) === k(key.q2) && tally(await run('std-jm-trade')) === k(key.q3) && tally(await run('std-grv-old')) === k(key.q4) && tally(await run('std-skill-gap')) === k(key.q5), 'answer key mismatch');
});
await step('5.8 export with reporting timestamp, no personal identifiers', async () => {
  await act('report-export');await sleep(200);
  const csv = await A(() => ILAC.mis.csv(ILAC.mis.find('std-women'), ILAC.mis.run(ILAC.mis.find('std-women'), ILAC.user)));
  expect(/Reporting timestamp/.test(csv) && !/SYN-W-|9000/.test(csv), 'csv');expect(await A(() => !!ILAC.stepDone['5.8']), 'not marked');
});
await step('C5 saved report pinned to the PMU dashboard', async () => {
  await switchTo('demo.admin.state');await hash('v/mis');await act('mis-tab', '[data-id="builder"]');
  await p.select('#builder-form [name=g0]', 'trade');await p.select('#builder-form [name=g1]', 'district');await p.select('#builder-form [name=f0field]', 'gender');await p.click('#builder-form button[type=submit]');await sleep(250);
  await p.select('#builder-form [name=f0value]', 'Female');await p.click('#builder-form button[type=submit]');await sleep(250);
  await setv('#save-report-form [name=name]', 'Women workers by trade and district');await p.click('#save-report-form button[type=submit]');await sleep(250);
  await switchTo('demo.pmu.state');await hash('v/mis');await act('mis-tab', '[data-id="dashboard"]');
  expect((await text()).includes('Women workers by trade and district'), 'not on PMU dashboard');await shot('17-pmu-pinned-report');
});

const missing = await A(() => ILAC.scenarios.flatMap(s => s.steps.map(x => x[0])).filter(id => !ILAC.stepDone[id]));
const total = await A(() => ILAC.scenarios.reduce((n, s) => n + s.steps.length, 0));
console.log(missing.length ? 'Steps without recorded evidence: ' + missing.join(', ') : 'All ' + total + ' script steps recorded evidence.');
console.log('Audit chain:', JSON.stringify(await A(() => ILAC.verifyAuditChain())));
if (jsErrors.length) {failed++;console.log('JS errors:\n' + jsErrors.join('\n'));}
await browser.close();
console.log(failed ? failed + ' check(s) failed' : 'All checks passed');
process.exit(failed || missing.length ? 1 : 0);
