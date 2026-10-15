/* Dataset v1.0 -> in-memory working state. Reset() rebuilds everything from the pristine bundle. */
(function () {
  const A = window.ILAC;

  // Expand {cols, rows} sheets into arrays of plain objects (kept pristine, never mutated).
  A.sheets = {};
  const raw = window.ILAC_SYN;
  for (const [name, sh] of Object.entries(raw.sheets)) {
    A.sheets[name] = sh.rows.map(r => Object.fromEntries(sh.cols.map((c, i) => [c, r[i] ?? ''])));
  }
  // Counts published in the demonstration pack (Section 6) for the readiness check.
  A.expectedCounts = {M01_Districts:28,M02_ILAC_Centres:32,M03_Trades:18,M04_Services:23,M05_Users_Roles:13,T01_Workers:609,T02_Households:533,T03_Members:1910,T04_Employers:40,T05_Sites:60,T06_Vacancies:80,T07_JobMela_Event:1,T08_JobMela_Candidates:20,T09_Worksite_Visit_S2:12,T10_Referrals:152,T11_Grievances:70,T12_Training_Batches:10,T13_Counsellors:6,T14_Counselling_Cases:40,S_Personas:8,S_MIS_Queries:5,S_Mock_API_Behaviour:14};
  A.sheetHashes = Object.fromEntries(Object.entries(raw.sheets).map(([n, sh]) => [n, A.sha256(JSON.stringify(sh.rows)).slice(0, 12)]));

  const num = v => v === '' || v == null ? null : Number(v);
  const byId = (rows, key) => new Map(rows.map(r => [r[key], r]));

  A.reset = function () {
    const S = A.copy(A.sheets), st = A.st = {};
    st.districts = S.M01_Districts;
    st.centres = S.M02_ILAC_Centres;
    st.trades = S.M03_Trades;
    st.users = S.M05_Users_Roles;
    st.employers = S.T04_Employers;
    st.sites = S.T05_Sites;
    st.batches = S.T12_Training_Batches.map(b => ({...b, start_on: A.addDays(A.D, num(b.start_offset_days)), enrolled: []}));
    st.counsellors = S.T13_Counsellors;
    st.personas = S.S_Personas;

    // Service catalogue is configuration (versioned) rather than a fixed sheet.
    st.services = S.M04_Services.map(s => ({
      ...s, clock: num(s.service_clock_days), l1: num(s.escalation_L1_after_days), l2: num(s.escalation_L2_after_days),
      mode: /^Manual/.test(s.demo_integration_mode) ? 'manual' : 'api', version: 1, effective_from: A.D
    }));

    st.workers = S.T01_Workers.map(w => ({
      ...w, version: 1, fm: {}, visits: [], notes_restricted: [], skilling_trade: w.skilling_need_flag === 'Yes' ? w.primary_trade : '',
      verification: 'Verified (legacy registry)', origin: 'legacy'
    }));
    st.households = S.T02_Households;
    st.members = S.T03_Members;
    st.vacancies = S.T06_Vacancies.map(v => ({...v, published_on: A.rebase(v.published_on), filled: 0}));
    st.event = {...S.T07_JobMela_Event[0], event_date: A.D, vacancy_ids: S.T07_JobMela_Event[0].vacancies_offered.split(',').map(s => s.trim()), employer_ids: S.T07_JobMela_Event[0].participating_employers.split(',').map(s => s.trim())};
    st.jmCands = S.T08_JobMela_Candidates.map(c => ({...c, registered_on: A.rebase(c.registered_on), token: 'JMT-' + c.registration_id.slice(-3), qr: 'JM-2026-01|' + c.registration_id, slot: '', interview_status: '', checked_in_at: ''}));
    st.visitRoster = S.T09_Worksite_Visit_S2;
    st.referrals = S.T10_Referrals.map(r => buildReferral(r));
    st.grievances = S.T11_Grievances.map(g => ({...g, created_on: A.addDays(A.D, num(g.created_offset_days)), resolved_on: g.resolved_offset_days === '' ? '' : A.addDays(A.D, num(g.resolved_offset_days))}));
    st.cases = S.T14_Counselling_Cases.map(c => ({...c, session_on: A.addDays(A.D, num(c.session_offset_days))}));

    // Transaction logs and records created while demonstrating.
    st.tokens = [];st.consents = [];st.documents = [];st.appointments = [];st.interviews = [];st.offers = [];st.placements = [];st.tasks = [];
    st.gateway = [];st.apiLog = [];st.audit = [];st.retries = [];st.conflicts = [];st.syncLog = [];st.identityMerges = [];st.sessions = [];
    st.visits = [{visit_id: 'SYN-VIS-001', site_id: 'SYN-S-0006', status: 'Scheduled', scheduled_on: A.D, assigned_to: 'demo.ff.krs', attendance: [], observations: [], checklist: {}, form_version: 1}];
    st.reports = [];st.dashboardReports = ['std-registered', 'std-referrals-open'];
    st.config = {items: [], log: []};
    st.mockState = {civilSuppliesDown: true, eshramTimeoutForP03: true, seatConfirmedTriggered: {}};
    st.nextNo = {};
    A.indexes();
    // Baseline for "as loaded" questions (Q1, Q3, Q5): the dataset before any demonstration change.
    A.baseSt = {workers: A.copy(st.workers), referrals: A.copy(st.referrals), grievances: A.copy(st.grievances), jmCands: A.copy(st.jmCands), cases: A.copy(st.cases)};
  };

  // Derived referral fields: clocks, escalation history. Offsets in the dataset are relative to D.
  function buildReferral(r) {
    const created = A.addDays(A.D, num(r.created_offset_days));
    const svc = A.sheets.M04_Services.find(s => s.service_code === r.service_code) || {};
    const row = {
      ...r, created_on: created, due_on: A.addDays(A.D, num(r.due_offset_days)),
      closed_on: r.closed_offset_days === '' ? '' : A.addDays(A.D, num(r.closed_offset_days)),
      clock: num(r.service_clock_days), l1: num(svc.escalation_L1_after_days), l2: num(svc.escalation_L2_after_days),
      mode: /^API/.test(r.channel) ? 'api' : 'manual', history: [], origin: 'dataset'
    };
    row.history.push({at: created, by: 'system', text: 'Referral created (' + r.channel + ')'});
    return row;
  }

  A.indexes = function () {
    const st = A.st;
    st.wById = byId(st.workers, 'worker_id');
    st.hById = byId(st.households, 'household_id');
    st.eById = byId(st.employers, 'employer_id');
    st.sById = byId(st.sites, 'site_id');
    st.vById = byId(st.vacancies, 'vacancy_id');
    st.cById = byId(st.centres, 'centre_id');
    st.dById = byId(st.districts, 'district_code');
    st.svcByCode = byId(st.services, 'service_code');
    st.mById = byId(st.members, 'member_id');
  };

  A.W = id => A.st.wById.get(id);
  A.H = id => A.st.hById.get(id);
  A.householdMembers = hid => A.st.members.filter(m => m.household_id === hid);
  A.districtName = code => A.st.dById.get(code)?.district_name || code;
  A.centreName = id => A.st.cById.get(id)?.centre_name || id;
  A.userByLogin = login => A.st.users.find(u => u.login_id === login);

  // Identifier allocation continues the dataset's own numbering (SYN-W-000609 -> 000610 ...).
  A.nextId = (prefix, width, existing) => {
    const st = A.st;
    if (st.nextNo[prefix] == null) {
      let max = 0;
      for (const id of existing()) {const n = Number(String(id).replace(prefix, '')); if (n > max) max = n;}
      st.nextNo[prefix] = max;
    }
    st.nextNo[prefix] += 1;
    return prefix + String(st.nextNo[prefix]).padStart(width, '0');
  };
  A.newWorkerId = () => A.nextId('SYN-W-', 6, () => A.st.workers.map(w => w.worker_id));
  A.newHouseholdId = () => A.nextId('SYN-H-', 6, () => A.st.households.map(h => h.household_id));
  A.newMemberId = () => A.nextId('SYN-M-', 6, () => A.st.members.map(m => m.member_id));
  A.newReferralId = () => A.nextId('SYN-R-', 5, () => A.st.referrals.map(r => r.referral_id));
  A.randDigits = (n, seed) => {
    let h = 0;for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return String(h % 10 ** n).padStart(n, '0');
  };

  // ---------- jurisdiction ----------
  A.userDistrict = user => {
    const j = user?.jurisdiction || '';
    if (/^State/i.test(j)) return 'State';
    const centre = A.st.cById.get(j);
    if (centre) return centre.district_code;
    const m = j.match(/District:\s*(\w+)/);
    if (m) return m[1];
    const e = A.st.eById.get(j);
    return e ? e.district_code : 'State';
  };
  A.inScope = (user, districtCode) => {
    const d = A.userDistrict(user);
    return d === 'State' || d === districtCode;
  };

  A.reset();
}());
