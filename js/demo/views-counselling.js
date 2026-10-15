/* S5: education counselling (SM-08) and MIS (SM-13): drill-down dashboard, report library / builder, masked export. */
(function () {
  const A = window.ILAC, e = A.esc;
  const ADVICE = ['Polytechnic – Diploma in Civil Engineering', 'ITI course', 'Intermediate (MPC)', 'Intermediate (CEC)', 'Degree programme', 'Skill course (APSSDC)', 'Apprenticeship'];
  const INTERESTS = ['Engineering / construction', 'Computers / IT', 'Healthcare', 'Skilled trades', 'Teaching', 'Business'];
  const counsellorOf = u => A.st.counsellors.find(c => c.login === u.login_id);
  const canSeeNotes = () => /^demo\.cns\./.test(A.user.login_id);
  A.cnsTab = 'cases';

  // ---------- counselling workspace ----------
  A.views.counselling = {title: 'Education counselling', module: 'SM-08', icon: 'book', blurb: 'Student and dependant counselling, appointments, referrals and follow-up.', render(param) {
    if (param) return memberPage(param);
    const me = counsellorOf(A.user), q = (A.cnsQuery || '').trim().toLowerCase();
    const mine = A.st.cases.filter(c => c.counsellor_id === me.counsellor_id);
    let found = [];
    if (q) found = A.st.members.filter(m => (m.full_name + ' ' + m.member_id + ' ' + m.household_id).toLowerCase().includes(q) && A.inScope(A.user, A.H(m.household_id)?.district_code)).slice(0, 25);
    return A.heading('Education counselling', me.name + ' (' + me.counsellor_id + ') · ' + A.centreName(me.base_centre) + ' · ' + me.availability) +
      '<form id="cns-search" class="row wrap space-bottom"><label class="field grow"><span class="sr-only">Find a student</span><input name="q" value="' + e(A.cnsQuery || '') + '" placeholder="Find a student or dependant by name, member ID (e.g. SYN-M-001909) or household" autocomplete="off"></label><button class="btn btn-primary" type="submit">Search</button></form>' +
      (q ? '<div class="card table-card space-bottom"><div class="card-head"><h3>Household members matching “' + e(A.cnsQuery) + '”</h3></div>' + A.table(found, [['member_id', 'Member'], ['full_name', 'Name'], ['relationship_to_head', 'Relationship'], ['age_on_2026_10_01', 'Age'], ['education_stage', 'Education stage'], ['household_id', 'Household']], m => '<a class="btn btn-sm btn-primary" href="#v/counselling/' + e(m.member_id) + '">Open</a>') + '</div>' : '') +
      '<div class="card table-card"><div class="card-head"><h3>My counselling cases</h3><p>' + mine.length + ' case(s)</p></div>' + A.table(mine.slice(0, 60), [['case_id', 'Case'], ['beneficiary_name', 'Beneficiary'], ['education_stage', 'Education stage'], ['session_type', 'Type'], ['session_on', 'Session', c => e(A.fmtDate(c.session_on))], ['interest_area', 'Interest'], ['referral_service_code', 'Referral'], ['case_status', 'Status', c => A.badge(c.case_status)]], c => '<a class="btn btn-sm" href="#v/counselling/' + e(c.member_id) + '">Open</a>') + '</div>';
  }};
  A.forms['cns-search'] = (form, data) => {A.cnsQuery = data.q;A.refresh();};

  function memberPage(id) {
    const m = A.st.mById.get(id);
    if (!m) return A.heading('Member not found', id, A.link('Back', 'v/counselling', 'btn'));
    const hh = A.H(m.household_id), head = A.st.workers.find(w => w.household_id === m.household_id), me = counsellorOf(A.user);
    const cases = A.st.cases.filter(c => c.member_id === id), appts = A.st.appointments.filter(a => a.member_id === id), refs = A.st.referrals.filter(r => r.member_id === id);
    A.mark('5.1');
    const mobile = head ? head.mobile : '';
    const header = '<div class="card worker-head"><div class="row between wrap"><div><div class="eyebrow">' + e(m.member_id) + ' · dependant</div><h2>' + e(m.full_name) + '</h2><p class="small muted">' + e(m.relationship_to_head) + ' of ' + e(hh?.household_head_name || '') + ' · household ' + e(m.household_id) + '</p></div><div class="row wrap">' + A.badge(m.education_stage, 'blue') + A.badge('Age ' + A.ageOn(m.date_of_birth), 'gold') + '</div></div>' +
      A.kv({'Gender': m.gender, 'Date of birth': A.fmtDate(m.date_of_birth), 'Occupation': m.occupation, 'Linked head of household': head ? {html: '<a href="#v/workers/' + e(head.worker_id) + '">' + e(head.full_name) + ' (' + e(head.worker_id) + ')</a> · ' + e(head.primary_trade)} : '—', 'Parent mobile (for reminders)': mobile, 'Household': hh ? hh.house_type + ' · ' + hh.area_type + ' · ' + hh.habitation : '—'}) + '</div>';
    const slots = availableSlots(me);
    const book = '<div class="card"><div class="card-head"><div><h3>Book an appointment</h3><p>Shared calendar (SM-06) · ' + e(me.name) + ' · ' + e(me.availability) + '</p></div></div>' + (appts.length ? appts.map(a => '<div class="notice notice-ok">📅 ' + e(A.fmtDate(a.date)) + ' ' + e(a.time) + ' with ' + e(a.counsellor_name) + ' · ' + e(A.centreName(a.centre)) + ' ' + A.badge(a.status, 'green') + '</div>').join('') : '') +
      '<form id="appt-form" data-id="' + e(id) + '" class="row wrap">' + A.select('Slot', 'slot', slots.map(s => ({value: s.date + '|' + s.time, label: A.dayName(s.date) + ' ' + A.fmtDate(s.date) + ' · ' + s.time})), '') + '<button class="btn btn-primary" type="submit">Book &amp; send reminder</button></form></div>';
    const session = '<div class="card"><div class="card-head"><div><h3>Record counselling session</h3><p>Counselling notes are access-restricted to counsellors.</p></div></div><form id="session-form" data-id="' + e(id) + '" class="stack"><div class="form-grid">' + A.textarea('Assessment', 'assessment', '', 'required') + '<label class="field"><span>Interests</span><select name="interest" multiple size="3">' + INTERESTS.map(i => '<option>' + e(i) + '</option>').join('') + '</select></label>' + A.select('Advice', 'advice', ADVICE, ADVICE[0]) + A.textarea('Agreed actions', 'actions', '', 'required') + A.textarea('Counselling notes (restricted)', 'notes', '') + '<label class="field"><span>Upload document</span><select name="doc"><option value="">— none —</option><option value="specimen_class10_memo_P-08.png">specimen_class10_memo_P-08.png (Class 10 memo)</option></select></label></div><div class="form-error"></div><button class="btn btn-primary" type="submit">Save session</button></form></div>';
    const referral = '<div class="card"><div class="card-head"><div><h3>Referrals</h3><p>ED-02 admission (manual) · ED-01 scholarship (mock API)</p></div></div>' + A.table(refs, [['referral_id', 'Case'], ['service_code', 'Service', r => e(r.service_code + ' · ' + A.st.svcByCode.get(r.service_code).service_name)], ['channel', 'Route', r => e(r.mode === 'api' ? 'API · ' + r.external_ack_no : 'Manual / assisted')], ['clock', 'Clock', r => e(r.clock + ' d')], ['due_on', 'Due', r => e(A.fmtDate(r.due_on))], ['status', 'Status', r => A.referralBadge(r)]], null, 'No referrals raised yet') +
      '<form id="cns-referral-form" data-id="' + e(id) + '" class="row wrap space-top"><label class="check"><input type="checkbox" name="ED-02" checked> ED-02 Admission facilitation (manual)</label><label class="check"><input type="checkbox" name="ED-01" checked> ED-01 Scholarship facilitation (API)</label><button class="btn btn-primary" type="submit">Raise referral(s)</button></form></div>';
    const follow = '<div class="card"><div class="card-head"><h3>Follow-up</h3></div><form id="follow-form" data-id="' + e(id) + '" class="row wrap">' + A.field('Follow-up date', 'due', A.addDays(A.D, 14), 'date', 'required') + A.field('Follow-up note', 'text', 'Review admission and scholarship progress', 'text', 'required') + '<button class="btn btn-primary" type="submit">Set follow-up</button></form>' +
      (A.st.tasks.filter(t => t.member_id === id).map(t => '<p class="small space-top">📌 ' + e(t.text) + ' — due ' + e(A.fmtDate(t.due_on)) + ' (' + e(A.dOffset(t.due_on)) + ')</p>').join('')) + '</div>';
    const history = '<div class="card"><div class="card-head"><h3>Sessions &amp; cases</h3></div>' + (cases.length ? cases.map(c => '<div class="case-line"><strong>' + e(c.case_id) + '</strong> · ' + e(A.fmtDate(c.session_on)) + ' · ' + e(c.session_type) + ' · ' + A.badge(c.case_status) + '<br><small>' + e(c.interest_area) + ' → ' + e(c.agreed_action) + (c.advice ? ' · advice: ' + e(c.advice) : '') + '</small>' + (c.notes_restricted !== undefined ? '<br><small class="restricted">🔒 ' + (canSeeNotes() ? e(c.notes_restricted || '(no notes)') : 'Counselling notes — restricted to counsellors') + '</small>' : '') + '</div>').join('') : '<p class="small muted">No sessions yet.</p>') + '</div>';
    const tl = '<div class="card"><div class="card-head"><h3>Household timeline</h3></div>' + A.timelineHtml(A.householdEvents(m.household_id).filter(ev => ev.kind !== 'Registration').slice(0, 25)) + '</div>';
    return A.heading('Counselling · ' + m.full_name, m.member_id, A.link('Back to cases', 'v/counselling', 'btn')) + header + '<div class="grid grid-2 top space-top">' + book + session + referral + follow + '</div><div class="grid grid-2 top space-top">' + history + tl + '</div>';
  }

  /** Next available hourly slots from the counsellor's weekly availability, minus existing bookings. */
  function availableSlots(me) {
    const m = me.availability.match(/^(.*?)\s+(\d{2}):00-(\d{2}):00$/), days = m[1], from = Number(m[2]), to = Number(m[3]);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const ok = d => {
      const n = A.dayName(d);
      if (/Mon-Fri/.test(days)) return !['Sat', 'Sun'].includes(n);
      return days.split(',').map(s => s.trim()).includes(n);
    };
    const out = [];
    for (let i = 0; i < 21 && out.length < 18; i++) {
      const d = A.addDays(A.D, i);
      if (!ok(d)) continue;
      for (let h = from; h < to; h++) {
        const t = String(h).padStart(2, '0') + ':00';
        const nowH = Number(new Date().toLocaleString('en-GB', {timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false}));
        if (d === A.D && h <= nowH) continue;
        if (!A.st.appointments.some(a => a.counsellor_id === me.counsellor_id && a.date === d && a.time === t)) out.push({date: d, time: t});
      }
    }
    return out.slice(0, 18);
  }
  A.forms['appt-form'] = (form, data) => {
    const me = counsellorOf(A.user), m = A.st.mById.get(form.dataset.id), [date, time] = data.slot.split('|');
    if (A.st.appointments.some(a => a.counsellor_id === me.counsellor_id && a.date === date && a.time === time)) throw new Error('That slot was just taken.');
    const head = A.st.workers.find(w => w.household_id === m.household_id);
    A.st.appointments.push({appointment_id: 'APT-' + String(A.st.appointments.length + 1).padStart(3, '0'), member_id: m.member_id, beneficiary: m.full_name, counsellor_id: me.counsellor_id, counsellor_name: me.name, date, time, centre: me.base_centre, status: 'Booked'});
    A.sendMessage(head ? head.mobile : '9000099081', 'appointment', {date: A.fmtDate(date), time, counsellor: me.name, centre: A.centreName(me.base_centre), name: m.full_name}, 'te');
    A.audit('Counselling appointment booked', m.member_id, date + ' ' + time + ' with ' + me.counsellor_id);
    A.mark('5.2');A.refresh();A.toast('Appointment booked on the shared calendar; reminder written to the mock gateway log.');
  };
  A.forms['session-form'] = async (form, data) => {
    const me = counsellorOf(A.user), m = A.st.mById.get(form.dataset.id);
    const interests = [...form.elements.interest.selectedOptions].map(o => o.value);
    if (!interests.length) throw new Error('Select at least one interest area.');
    if (data.doc) await A.addDocument({entityId: m.member_id, householdId: m.household_id, type: 'Class 10 memo', name: data.doc, src: 'assets/specimens/' + data.doc, access: 'Restricted — counsellor and household head'});
    const row = {case_id: 'SYN-CC-' + String(A.st.cases.length + 1).padStart(4, '0'), member_id: m.member_id, household_id: m.household_id, beneficiary_name: m.full_name, education_stage: m.education_stage, counsellor_id: me.counsellor_id, session_type: 'Individual', session_offset_days: '0', session_on: A.D, session_on_nominal: A.D, interest_area: interests.join(', '), agreed_action: data.actions.trim(), referral_service_code: '', case_status: 'Open - action pending', advice: data.advice, assessment: data.assessment.trim(), notes_restricted: data.notes.trim()};
    A.st.cases.unshift(row);
    A.audit('Counselling session recorded', row.case_id, m.full_name + ' · advice: ' + data.advice + ' · notes restricted');
    A.mark('5.3');A.refresh();A.toast('Session saved as ' + row.case_id + '; notes are access-restricted.');
  };
  A.forms['cns-referral-form'] = async (form, data) => {
    const m = A.st.mById.get(form.dataset.id), head = A.st.workers.find(w => w.household_id === m.household_id);
    const codes = ['ED-02', 'ED-01'].filter(c => data[c]);
    if (!codes.length) throw new Error('Select at least one referral.');
    const submit = form.querySelector('button[type=submit]');submit.disabled = true;
    const out = [];
    try {for (const c of codes) out.push(await A.createReferral(head, c, {member_id: m.member_id, household_id: m.household_id, beneficiary: m.full_name, note: 'Counselling referral for ' + m.full_name}));} finally {submit.disabled = false;}
    const latest = A.st.cases.find(c => c.member_id === m.member_id);if (latest) latest.referral_service_code = codes.join(' + ');
    A.mark('5.4');A.refresh();A.toast(out.length + ' referral(s) raised: ' + out.map(r => r.referral_id + ' (' + r.mode + ')').join(', '));
  };
  A.forms['follow-form'] = (form, data) => {
    const m = A.st.mById.get(form.dataset.id);
    A.st.tasks.push({task_id: 'TSK-' + String(A.st.tasks.length + 1).padStart(3, '0'), text: data.text + ' — ' + m.full_name, due_on: data.due, assigned: A.user.login_id, module: 'SM-08', member_id: m.member_id, household_id: m.household_id, kind: 'Counselling follow-up'});
    A.audit('Follow-up set', m.member_id, data.due);A.mark('5.5');A.refresh();
  };

  // ---------- MIS ----------
  A.misTab = 'dashboard';A.drill = {level: 'state'};A.reportsRun = new Set();A.builder = {dataset: 'workers', filters: [], groupBy: ['district']};

  A.views.mis = {title: 'MIS & reports', module: 'SM-13', icon: 'chart', blurb: 'Role-scoped dashboards, standard reports and a report builder.', render() {
    const tab = A.misTab;
    const body = tab === 'dashboard' ? dashboard() : tab === 'library' ? library() : builder();
    return A.heading('MIS & reports', A.userDistrict(A.user) === 'State' ? 'Statewide view' : A.districtName(A.userDistrict(A.user)) + ' district view') + '<div class="card">' + A.tabs([['dashboard', 'Dashboard'], ['library', 'Standard reports'], ['builder', 'Report builder']], tab, 'mis-tab') + body + '</div>';
  }};
  A.actions['mis-tab'] = node => {A.misTab = node.dataset.id;A.refresh();};

  function dashboard() {
    const d = A.drill, userD = A.userDistrict(A.user);
    if (userD !== 'State' && d.level === 'state') {d.level = 'district';d.district = userD;}
    const crumbs = '<div class="crumbs">' + (userD === 'State' ? '<button type="button" class="link-btn" data-action="drill" data-level="state">State</button>' : '<span>' + e(A.districtName(userD)) + '</span>') + (d.district && userD === 'State' ? ' › <button type="button" class="link-btn" data-action="drill" data-level="district" data-id="' + e(d.district) + '">' + e(A.districtName(d.district)) + '</button>' : '') + (d.centre ? ' › <span>' + e(A.centreName(d.centre)) + '</span>' : '') + '</div>';
    let body;
    if (d.level === 'state') {
      const rows = A.st.districts.map(x => stats(w => w.district_code === x.district_code, r => r.district_code === x.district_code, {name: x.district_name, id: x.district_code})).filter(r => r.workers);
      body = A.table(rows, [['name', 'District'], ['workers', 'Workers'], ['women', 'Women'], ['active', 'Active'], ['open', 'Open referrals'], ['past', 'Past clock']], r => A.button('Drill down', 'drill', 'data-level="district" data-id="' + e(r.id) + '"', 'btn btn-sm'));
    } else if (d.level === 'district') {
      const centres = A.st.centres.filter(c => c.district_code === d.district);
      const rows = centres.map(c => stats(w => w.home_centre_id === c.centre_id, r => r.centre_id === c.centre_id, {name: c.centre_name, id: c.centre_id}));
      body = A.table(rows, [['name', 'Centre'], ['workers', 'Workers'], ['women', 'Women'], ['active', 'Active'], ['open', 'Open referrals'], ['past', 'Past clock']], r => A.button('Drill down', 'drill', 'data-level="centre" data-id="' + e(r.id) + '"', 'btn btn-sm'));
    } else {
      const ws = A.st.workers.filter(w => w.home_centre_id === d.centre), byTrade = {};
      for (const w of ws) byTrade[w.primary_trade] = (byTrade[w.primary_trade] || 0) + 1;
      body = '<p class="small muted">Centre level: aggregate counts only (no worker identifiers on the dashboard).</p>' + A.table(Object.entries(byTrade).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({t, n})), [['t', 'Primary trade'], ['n', 'Workers']]);
    }
    const kpis = '<div class="grid grid-4 space-bottom">' + (() => {
      const scope = A.st.workers.filter(w => A.inScope(A.user, w.district_code));
      return A.metric('Workers', scope.length.toLocaleString('en-IN'), 'users') + A.metric('Active', scope.filter(w => w.registration_status === 'Active').length.toLocaleString('en-IN'), 'check') + A.metric('Open referrals', A.st.referrals.filter(r => A.isOpen(r) && A.inScope(A.user, r.district_code)).length, 'file') + A.metric('Past service clock', A.st.referrals.filter(r => A.refState(r).overdue && A.inScope(A.user, r.district_code)).length, 'flag');
    })() + '</div>';
    const pinned = A.st.dashboardReports.map(id => A.mis.find(id)).filter(Boolean).map(def => {
      const res = A.mis.run(def, A.user);
      return '<div class="card"><div class="card-head"><div><h3>' + e(def.name) + '</h3><p>' + e(res.scope) + ' · ' + res.total + ' record(s)</p></div></div>' + A.table(res.rows.slice(0, 8).map(r => Object.fromEntries(r.map((v, i) => [i, v]))), res.columns.map((c, i) => [String(i), c])) + '</div>';
    }).join('');
    A.mark('5.6');
    return kpis + crumbs + '<div class="card inset">' + body + '</div>' + (pinned ? '<h3 class="space-top">Pinned reports</h3><div class="grid grid-2 space-top">' + pinned + '</div>' : '');
  }
  function stats(wf, rf, base) {
    const ws = A.st.workers.filter(wf).filter(w => A.inScope(A.user, w.district_code)), rs = A.st.referrals.filter(rf);
    return {...base, workers: ws.length, women: ws.filter(w => w.gender === 'Female').length, active: ws.filter(w => w.registration_status === 'Active').length, open: rs.filter(r => A.isOpen(r)).length, past: rs.filter(r => A.refState(r).overdue).length};
  }
  A.actions.drill = node => {
    const level = node.dataset.level, id = node.dataset.id;
    if (level === 'state') A.drill = {level: 'state'};
    else if (level === 'district') A.drill = {level: 'district', district: id};
    else A.drill = {level: 'centre', district: A.drill.district, centre: id};
    A.refresh();
  };

  function library() {
    const defs = A.mis.all(), sel = A.misSelected || defs[0].id, def = A.mis.find(sel) || defs[0];
    const res = A.mis.run(def, A.user, [], A.misAsOf || undefined);
    A.reportsRun.add(def.id);if (A.reportsRun.size >= 5) A.mark('5.7');
    return '<div class="grid" style="grid-template-columns:minmax(220px,300px) 1fr"><div class="report-list"><label class="field"><span>Data as of</span><select data-action="mis-asof"><option value="" ' + (!A.misAsOf ? 'selected' : '') + '>Report default</option><option value="live" ' + (A.misAsOf === 'live' ? 'selected' : '') + '>Live data</option><option value="loaded" ' + (A.misAsOf === 'loaded' ? 'selected' : '') + '>As loaded (dataset v1.0)</option></select></label>' + defs.map(d => '<button type="button" class="report-item ' + (d.id === def.id ? 'active' : '') + '" data-action="report-select" data-id="' + e(d.id) + '">' + e(d.name) + '</button>').join('') + '</div><div>' + reportResult(def, res) + '</div></div>';
  }
  A.actions['mis-asof'] = () => {};
  document.addEventListener('change', ev => {const n = ev.target;if (n.matches && n.matches('select[data-action="mis-asof"]')) {A.misAsOf = n.value;A.refresh();}});
  A.actions['report-select'] = node => {A.misSelected = node.dataset.id;A.refresh();};
  function reportResult(def, res) {
    return '<div class="card-head"><div><h3>' + e(def.name) + '</h3><p>' + e(res.dataset) + ' · ' + e(res.scope) + ' · ' + (res.asOf === 'loaded' ? 'as loaded (dataset v1.0)' : 'live data') + ' · generated ' + e(new Date(res.at).toLocaleString('en-GB', {timeZone: 'Asia/Kolkata'})) + ' IST</p></div>' + A.button('Export CSV', 'report-export', 'data-id="' + e(def.id) + '"', 'btn btn-sm btn-primary') + '</div>' +
      A.table(res.rows.map(r => Object.fromEntries(r.map((v, i) => [i, v]))), res.columns.map((c, i) => [String(i), c])) + '<p class="space-top"><strong>Total ' + res.total.toLocaleString('en-IN') + '</strong> <small class="muted">· aggregated counts, no personal identifiers</small></p>';
  }
  A.actions['report-export'] = node => {
    const def = A.mis.find(node.dataset.id) || A.builderDef(), res = A.mis.run(def, A.user, [], A.misAsOf || undefined);
    A.download('ILAC-' + def.id + '-' + A.D + '.csv', A.mis.csv(def, res));
    A.audit('Report exported', def.id, res.rows.length + ' rows · aggregated');A.mark('5.8');
  };

  A.builderDef = () => ({id: 'adhoc', name: A.builder.name || 'Ad-hoc report', dataset: A.builder.dataset, filters: A.builder.filters.filter(f => f.field && f.value), groupBy: A.builder.groupBy.filter(Boolean)});
  function distinct(ds, field) {
    const d = A.mis.datasets[ds], vals = new Set();
    for (const r of d.rows(A.st)) vals.add(String(d.fields[field].get(r) ?? ''));
    return [...vals].filter(Boolean).sort();
  }
  function builder() {
    const b = A.builder, ds = A.mis.datasets[b.dataset], keys = Object.keys(ds.fields);
    while (b.filters.length < 3) b.filters.push({field: '', op: '=', value: ''});
    const def = A.builderDef(), res = def.groupBy.length ? A.mis.run(def, A.user) : null;
    const isAuth = A.user.login_id === 'demo.admin.state';
    return '<form id="builder-form" class="stack"><div class="form-grid">' + A.select('Dataset', 'dataset', Object.entries(A.mis.datasets).map(([k, v]) => ({value: k, label: v.label})), b.dataset) +
      A.select('Group by (1)', 'g0', [{value: '', label: '—'}, ...keys.map(k => ({value: k, label: ds.fields[k].label}))], b.groupBy[0] || '') + A.select('Group by (2)', 'g1', [{value: '', label: '—'}, ...keys.map(k => ({value: k, label: ds.fields[k].label}))], b.groupBy[1] || '') + '</div>' +
      b.filters.map((f, i) => '<div class="filter-row"><label class="field"><span>Filter ' + (i + 1) + '</span><select name="f' + i + 'field"><option value="">—</option>' + keys.map(k => '<option value="' + k + '" ' + (f.field === k ? 'selected' : '') + '>' + e(ds.fields[k].label) + '</option>').join('') + '</select></label><label class="field"><span>is</span><select name="f' + i + 'value"><option value="">—</option>' + (f.field ? distinct(b.dataset, f.field).map(v => '<option ' + (f.value === v ? 'selected' : '') + '>' + e(v) + '</option>').join('') : '') + '</select></label></div>').join('') +
      '<div class="row wrap"><button class="btn btn-primary" type="submit">Run report</button>' + A.button('Export CSV', 'builder-export', '', 'btn') + '</div></form>' +
      (res ? '<div class="space-top card inset">' + reportResult(def, res) + '</div>' : '<p class="small muted space-top">Choose at least one “group by” field and run.</p>') +
      '<div class="card space-top"><h3>Save as report</h3>' + (isAuth ? '<form id="save-report-form" class="row wrap">' + A.field('Report name', 'name', b.name || '', 'text', 'required placeholder="Women workers by trade and district"') + '<label class="check"><input type="checkbox" name="pin" checked> Add to PMU dashboard</label><button class="btn btn-primary" type="submit">Save report</button></form>' : '<p class="small muted">Saving and pinning reports needs an Authority role (demo.admin.state). You can still run and export.</p>') + '</div>';
  }
  function readBuilder(data) {
    const b = A.builder;
    if (data.dataset !== b.dataset) {A.builder = {dataset: data.dataset, filters: [], groupBy: [], name: b.name};return;}
    b.groupBy = [data.g0, data.g1].filter(Boolean);
    b.filters = [0, 1, 2].map(i => ({field: data['f' + i + 'field'] || '', op: '=', value: data['f' + i + 'value'] || ''}));
    for (const f of b.filters) if (f.field && !distinct(b.dataset, f.field).includes(f.value)) f.value = '';
  }
  A.forms['builder-form'] = (form, data) => {readBuilder(data);A.refresh();};
  A.actions['builder-export'] = () => {
    const form = document.querySelector('#builder-form');readBuilder(Object.fromEntries(new FormData(form)));
    const def = A.builderDef();if (!def.groupBy.length) throw new Error('Choose a group-by field first.');
    A.download('ILAC-adhoc-' + A.D + '.csv', A.mis.csv(def, A.mis.run(def, A.user)));A.mark('5.8');
  };
  A.forms['save-report-form'] = (form, data) => {
    if (A.user.login_id !== 'demo.admin.state') throw new Error('Saving a report needs an Authority role.');
    const form0 = document.querySelector('#builder-form');readBuilder(Object.fromEntries(new FormData(form0)));
    const def = A.builderDef();if (!def.groupBy.length) throw new Error('Choose a group-by field first.');
    def.id = 'rpt-' + String(A.st.reports.length + 1).padStart(3, '0');def.name = data.name.trim();def.owner = A.user.login_id;
    A.st.reports.push(def);
    if (data.pin) A.st.dashboardReports.push(def.id);
    A.config.publish('report', def.id, def, 'Report “' + def.name + '” saved' + (data.pin ? ' and added to the PMU dashboard' : ''));
    A.mark('C5');A.misSelected = def.id;A.misTab = 'library';A.refresh();A.toast('Report saved' + (data.pin ? ' and added to the PMU dashboard' : '') + ' — no code or redeployment.');
  };
}());
