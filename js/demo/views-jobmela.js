/* S4: job mela JM-2026-01 (SM-15), employer spot offers and placements (SM-05), shared calendar (SM-06). */
(function () {
  const A = window.ILAC, e = A.esc;
  const EV = () => A.st.event;
  const SLOT_TIMES = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30'];
  A.jmTab = 'overview';

  const vac = id => A.st.vById.get(id);
  const empName = id => A.st.eById.get(id)?.employer_name || id;
  const cand = id => A.st.jmCands.find(c => c.registration_id === id);
  const eventVacancies = () => A.st.vacancies.filter(v => v.linked_job_mela === EV().event_id);
  const workerOf = c => A.W(c.worker_id);

  A.views.jobmela = {title: 'Job mela', module: 'SM-15', icon: 'briefcase', blurb: 'Pre-registration, check-in, interview slots, offers and closure for JM-2026-01.', render() {
    const ev = EV(), tab = A.jmTab;
    const isDesk = /^demo\.op\./.test(A.user.login_id);
    const tabs = [['overview', 'Event'], ['candidates', 'Candidates & check-in'], ['interviews', 'Interviews'], ['dashboard', 'Live dashboard'], ...(isDesk ? [['quick', 'Walk-in registration']] : [])];
    let body = '';
    if (tab === 'overview') body = overview();
    else if (tab === 'candidates') body = candidates();
    else if (tab === 'interviews') body = interviews();
    else if (tab === 'dashboard') body = dashboard();
    else body = '<p class="small muted">Quick worker registration for a walk-in. The BOCW registry is searched first; the worker is then registered for the event.</p>' + A.regWizard();
    return A.heading('Job mela', ev.event_id + ' · ' + ev.event_name, A.link('Shared calendar', 'v/calendar', 'btn')) + '<div class="card">' + A.tabs(tabs, tab, 'jm-tab') + body + '</div>';
  }};
  A.actions['jm-tab'] = node => {A.jmTab = node.dataset.id;if (A.jmTab === 'quick' && A.reg.mode !== 'quick') A.reg = A.newRegDraft('quick');A.refresh();};

  function overview() {
    const ev = EV(), vs = eventVacancies();
    A.mark('4.1');
    return A.kv({'Event': ev.event_id, 'Name': ev.event_name, 'Organiser': ev.organiser, 'Venue': A.centreName(ev.venue_centre_id), 'Date': A.fmtDate(ev.event_date) + ' (D)', 'Time': ev.start_time + '–' + ev.end_time, 'Capacity': ev.capacity + ' candidates', 'Status': ev.status, 'Point of contact': ev.point_of_contact, 'Pre-registered': A.st.jmCands.filter(c => !/Walk-in/.test(c.registration_channel)).length, 'Registered now': A.st.jmCands.length, 'On shared calendar': {html: A.badge('Yes — SM-06', 'green')}}) +
      '<h4 class="space-top">Participating employers</h4>' + A.table(ev.employer_ids.map(id => A.st.eById.get(id)), [['employer_id', 'Employer'], ['employer_name', 'Name'], ['employer_type', 'Type'], ['contact_person', 'Contact'], ['status', 'Status', r => A.badge(r.status)]]) +
      '<h4 class="space-top">Vacancies offered (' + vs.length + ')</h4>' + A.table(vs, [['vacancy_id', 'Vacancy'], ['employer_id', 'Employer', v => e(empName(v.employer_id))], ['trade_required', 'Trade'], ['positions', 'Positions'], ['min_experience_years', 'Min exp (y)'], ['daily_wage_offered_inr', 'Wage ₹/day'], ['engagement_type', 'Engagement'], ['status', 'Status', v => A.badge(v.status)]]);
  }

  // ---------- candidates and check-in ----------
  function candidates() {
    const rows = A.st.jmCands;
    return '<form id="jm-checkin-form" class="row wrap space-bottom">' + A.select('Check in by', 'method', [{value: 'token', label: 'Token (JMT-nnn)'}, {value: 'qr', label: 'QR code payload'}, {value: 'mobile', label: 'Mobile number'}], 'mobile') + A.field('Token / QR / mobile', 'key', '', 'text', 'required placeholder="e.g. 9000005754 or JMT-004"') + '<button class="btn btn-primary" type="submit">Find candidate</button><small class="muted">QR scanning is simulated by entering the code payload (e.g. JM-2026-01|JMR-004).</small></form>' +
      (A.jmFound ? checkinPanel(A.jmFound) : '') +
      '<div class="table-wrap">' + A.table(rows, [['registration_id', 'Reg.'], ['token', 'Token'], ['full_name', 'Candidate'], ['primary_trade', 'Trade'], ['district_code', 'District'], ['registration_channel', 'Channel'], ['preferred_vacancy_id', 'Preferred'], ['check_in_status', 'Check-in', c => A.badge(c.check_in_status, /Checked in/.test(c.check_in_status) ? 'green' : 'gold')], ['slot', 'Interview', c => e(c.slot || '—')]], c => /Checked in/.test(c.check_in_status) ? (c.slot ? '' : A.button('Allocate slot', 'jm-slot-open', 'data-id="' + e(c.registration_id) + '"', 'btn btn-sm')) : A.button('Check in', 'jm-found', 'data-id="' + e(c.registration_id) + '"', 'btn btn-sm')) + '</div>';
  }
  A.forms['jm-checkin-form'] = (form, data) => {
    const k = data.key.trim();
    const c = A.st.jmCands.find(x => data.method === 'token' ? x.token.toLowerCase() === k.toLowerCase() : data.method === 'qr' ? x.qr === k : (workerOf(x)?.mobile === k));
    if (!c) throw new Error('No pre-registered candidate matches that ' + (data.method === 'qr' ? 'QR payload' : data.method) + '.');
    A.jmFound = c.registration_id;A.jmMethod = data.method;A.refresh();
  };
  A.actions['jm-found'] = node => {A.jmFound = node.dataset.id;A.jmMethod = 'list';A.refresh();};
  function checkinPanel(id) {
    const c = cand(id), w = workerOf(c), v = vac(c.preferred_vacancy_id);
    const checks = [
      ['Registered worker found in registry', !!w], ['Registration active', w?.registration_status === 'Active'], ['Age 18 or above', w && A.ageOn(w.date_of_birth) >= 18],
      ['Trade matches preferred vacancy (' + (v ? v.trade_required : '—') + ')', !!v && v.trade_required === c.primary_trade], ['Not already checked in', !/Checked in/.test(c.check_in_status)]
    ];
    const pass = checks.every(x => x[1]);
    return '<div class="card inset space-bottom"><h4>Check-in · ' + e(c.full_name) + ' (' + e(c.registration_id) + ')</h4>' + A.kv({'Worker': c.worker_id, 'Mobile': w?.mobile, 'Token': c.token, 'Preferred vacancy': c.preferred_vacancy_id + ' · ' + (v ? v.trade_required + ' · ' + empName(v.employer_id) : '')}) +
      '<ul class="checks">' + checks.map(([t, ok]) => '<li class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '✗') + ' ' + e(t) + '</li>').join('') + '</ul>' +
      '<form id="jm-confirm-form" data-id="' + e(id) + '" class="stack"><label class="check"><input type="checkbox" name="docs" required> Identity / registration document sighted (document check)</label><div class="form-error"></div><div class="row"><button class="btn btn-primary" type="submit" ' + (pass ? '' : 'disabled') + '>Confirm check-in</button>' + A.button('Cancel', 'jm-clear', '', 'btn') + '</div></form></div>';
  }
  A.actions['jm-clear'] = () => {A.jmFound = null;A.refresh();};
  A.forms['jm-confirm-form'] = (form, data) => {
    const c = cand(form.dataset.id);
    c.check_in_status = 'Checked in';c.checked_in_at = A.now();c.checked_in_by = A.user.login_id;
    A.audit('Job mela check-in', c.registration_id, c.full_name + ' via ' + (A.jmMethod || 'list') + ' · eligibility & document check passed');
    if (c.worker_id === 'SYN-W-000302') A.mark('4.2');
    if (/Walk-in/.test(c.registration_channel)) A.mark('4.3');
    A.jmFound = null;A.refresh();A.toast(c.full_name + ' checked in.');
  };

  // ---------- walk-in event registration (after quick worker registration) ----------
  A.regToEvent = async worker => {
    const trade = worker.primary_trade, v = eventVacancies().find(x => x.trade_required === trade && x.status === 'Open') || eventVacancies()[0];
    const n = A.st.jmCands.length + 1;
    const c = {registration_id: 'JMR-' + String(n).padStart(3, '0'), event_id: EV().event_id, worker_id: worker.worker_id, full_name: worker.full_name, primary_trade: trade, district_code: worker.district_code, registered_on: A.D, registration_channel: 'Walk-in (on the day)', preferred_vacancy_id: v.vacancy_id, check_in_status: 'Not checked in', token: 'JMT-' + String(n).padStart(3, '0'), qr: EV().event_id + '|JMR-' + String(n).padStart(3, '0'), slot: '', interview_status: '', checked_in_at: ''};
    A.st.jmCands.push(c);A.audit('Job mela registration', c.registration_id, worker.worker_id + ' walk-in for ' + c.preferred_vacancy_id);
    return c;
  };
  A.actions['jm-walkin-register'] = async node => {
    const w = A.W(node.dataset.id), c = await A.regToEvent(w);
    A.reg = A.newRegDraft('quick');A.jmTab = 'candidates';A.jmFound = c.registration_id;A.jmMethod = 'walk-in';A.refresh();A.toast(w.full_name + ' registered for the event as ' + c.registration_id + '. Complete the check-in.');
  };

  // ---------- interview slots ----------
  A.actions['jm-slot-open'] = node => {
    const c = cand(node.dataset.id), v = vac(c.preferred_vacancy_id);
    const mel = eventVacancies();
    A.modal('Allocate interview slot', '<form id="jm-slot-form" data-id="' + e(c.registration_id) + '" class="stack"><p class="small">' + e(c.full_name) + ' · ' + e(c.primary_trade) + ' · preferred ' + e(c.preferred_vacancy_id) + '</p>' + A.select('Vacancy / employer', 'vacancy', mel.map(x => ({value: x.vacancy_id, label: x.vacancy_id + ' · ' + x.trade_required + ' · ' + empName(x.employer_id)})), c.preferred_vacancy_id) + A.select('Slot', 'slot', SLOT_TIMES, firstFreeSlot(v ? v.employer_id : '')) + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Allocate</button></form>');
  };
  const taken = (employerId, slot) => A.st.interviews.some(i => i.employer_id === employerId && i.slot === slot && i.status !== 'Cancelled');
  const firstFreeSlot = emp => SLOT_TIMES.find(s => !taken(emp, s)) || SLOT_TIMES[0];
  A.forms['jm-slot-form'] = (form, data) => {
    const c = cand(form.dataset.id), v = vac(data.vacancy);
    if (taken(v.employer_id, data.slot)) throw new Error(empName(v.employer_id) + ' already has an interview at ' + data.slot + '. Choose another slot.');
    const iv = {interview_id: 'INT-' + String(A.st.interviews.length + 1).padStart(3, '0'), registration_id: c.registration_id, worker_id: c.worker_id, candidate: c.full_name, vacancy_id: v.vacancy_id, employer_id: v.employer_id, slot: data.slot, date: A.D, status: 'Scheduled', outcome: ''};
    A.st.interviews.push(iv);c.slot = data.slot + ' · ' + empName(v.employer_id);c.interview_vacancy = v.vacancy_id;
    const w = workerOf(c);A.sendMessage(w.mobile, 'interview', {employer: empName(v.employer_id), time: data.slot, vacancy: v.vacancy_id + ' ' + v.trade_required}, 'te');
    A.audit('Interview slot allocated', iv.interview_id, c.full_name + ' with ' + v.employer_id + ' at ' + data.slot);
    if (c.worker_id && (v.vacancy_id === 'SYN-V-0001' || v.vacancy_id === 'SYN-V-0006')) A.mark('4.4');
    A.closeModal();A.refresh();A.toast('Slot ' + data.slot + ' allocated; candidate notified (mock gateway).');
  };

  function interviews() {
    return A.table(A.st.interviews, [['interview_id', 'Interview'], ['candidate', 'Candidate'], ['vacancy_id', 'Vacancy', i => e(i.vacancy_id + ' · ' + vac(i.vacancy_id).trade_required)], ['employer_id', 'Employer', i => e(empName(i.employer_id))], ['slot', 'Slot'], ['status', 'Status', i => A.badge(i.outcome || i.status)]], i => !i.outcome ? A.button('Record outcome', 'jm-outcome-open', 'data-id="' + e(i.interview_id) + '"', 'btn btn-sm') : '', 'No interview slots allocated yet');
  }
  A.actions['jm-outcome-open'] = node => {
    const i = A.st.interviews.find(x => x.interview_id === node.dataset.id);
    A.modal('Record interview outcome', '<form id="jm-outcome-form" data-id="' + e(i.interview_id) + '" class="stack"><p class="small">' + e(i.candidate) + ' · ' + e(empName(i.employer_id)) + ' · ' + e(i.vacancy_id) + '</p>' + A.select('Outcome', 'outcome', ['Employer decision pending', 'Not selected', 'Selected – offer to follow'], 'Employer decision pending') + A.field('Follow-up date', 'follow', A.addDays(A.D, 2), 'date', 'required') + A.textarea('Remarks', 'remarks', '') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Save outcome</button></form>');
  };
  A.forms['jm-outcome-form'] = (form, data) => {
    const i = A.st.interviews.find(x => x.interview_id === form.dataset.id), c = cand(i.registration_id);
    i.outcome = data.outcome;i.follow_up_on = data.follow;i.remarks = data.remarks;c.interview_status = data.outcome;
    if (data.outcome === 'Employer decision pending') A.st.tasks.push({task_id: 'TSK-' + String(A.st.tasks.length + 1).padStart(3, '0'), text: 'Follow up employer decision for ' + i.candidate + ' (' + empName(i.employer_id) + ', ' + i.vacancy_id + ')', due_on: data.follow, assigned: A.user.login_id, module: 'SM-05', worker_id: i.worker_id, kind: 'Interview follow-up'});
    A.audit('Interview outcome', i.interview_id, data.outcome + ' · follow-up ' + data.follow);
    if (i.vacancy_id === 'SYN-V-0006' && data.outcome === 'Employer decision pending') A.mark('4.6');
    A.closeModal();A.refresh();
  };

  // ---------- live dashboard / closure report ----------
  function dashboard() {
    const ev = EV(), c = A.st.jmCands, ivs = A.st.interviews, offers = A.st.offers;
    A.mark('4.8');
    const rows = ev.employer_ids.map(id => ({employer: id, name: empName(id), vacancies: eventVacancies().filter(v => v.employer_id === id).length, positions: eventVacancies().filter(v => v.employer_id === id).reduce((s, v) => s + Number(v.positions), 0), interviews: ivs.filter(i => i.employer_id === id).length, offers: offers.filter(o => o.employer_id === id).length}));
    return '<div class="grid grid-4 space-bottom">' + A.metric('Registrations', c.length, 'users', c.filter(x => !/Walk-in/.test(x.registration_channel)).length + ' pre-registered, ' + c.filter(x => /Walk-in/.test(x.registration_channel)).length + ' walk-in') + A.metric('Checked in', c.filter(x => /Checked in/.test(x.check_in_status)).length, 'check') + A.metric('Interviews', ivs.length, 'calendar') + A.metric('Offers', offers.length, 'briefcase') + '</div>' +
      '<div class="row between wrap"><h4>By employer</h4>' + A.button('Export closure report (CSV)', 'jm-export', '', 'btn btn-sm') + '</div>' + A.table(rows, [['employer', 'Employer'], ['name', 'Name'], ['vacancies', 'Vacancies'], ['positions', 'Positions'], ['interviews', 'Interviews'], ['offers', 'Spot offers']]) +
      '<h4 class="space-top">Capacity</h4><div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, c.length / Number(ev.capacity) * 100) + '%"></div></div><small class="muted">' + c.length + ' of ' + ev.capacity + ' places used</small>';
  }
  A.actions['jm-export'] = () => {
    const ev = EV(), rows = ev.employer_ids.map(id => [id, empName(id), eventVacancies().filter(v => v.employer_id === id).length, A.st.interviews.filter(i => i.employer_id === id).length, A.st.offers.filter(o => o.employer_id === id).length]);
    const cell = v => '"' + String(v).replaceAll('"', '""') + '"';
    const text = '﻿' + [['# Job mela closure report ' + ev.event_id], ['# Reporting timestamp (IST): ' + new Date().toLocaleString('en-GB', {timeZone: 'Asia/Kolkata'})], ['# Registrations', A.st.jmCands.length], ['# Checked in', A.st.jmCands.filter(c => /Checked in/.test(c.check_in_status)).length], [], ['Employer', 'Name', 'Vacancies', 'Interviews', 'Offers'], ...rows].map(r => r.map(cell).join(',')).join('\r\n');
    A.download('JM-2026-01-closure-report.csv', text);
  };

  // ---------- employer workspace (demo.emp.001) ----------
  A.views.employer = {title: 'Employer workspace', module: 'SM-22', icon: 'briefcase', blurb: 'Review job-mela candidates and record spot offers.', render() {
    const emp = A.st.eById.get(A.user.jurisdiction), ivs = A.st.interviews.filter(i => i.employer_id === emp.employer_id);
    const vs = A.st.vacancies.filter(v => v.employer_id === emp.employer_id && v.linked_job_mela === EV().event_id);
    return A.heading('Employer workspace', emp.employer_name + ' · ' + emp.employer_id + ' · verified ' + emp.status) +
      '<div class="grid grid-2"><div class="card table-card"><div class="card-head"><h3>My vacancies at ' + EV().event_id + '</h3></div>' + A.table(vs, [['vacancy_id', 'Vacancy'], ['trade_required', 'Trade'], ['positions', 'Positions'], ['daily_wage_offered_inr', 'Wage ₹/day'], ['engagement_type', 'Engagement']]) + '</div>' +
      '<div class="card table-card"><div class="card-head"><h3>Candidates scheduled</h3></div>' + A.table(ivs, [['slot', 'Slot'], ['candidate', 'Candidate'], ['vacancy_id', 'Vacancy'], ['status', 'Status', i => A.badge(i.outcome || i.status)]], i => i.status === 'Offered' ? A.badge('Offer recorded', 'green') : A.button('Review & offer', 'offer-open', 'data-id="' + e(i.interview_id) + '"', 'btn btn-sm btn-primary'), 'No candidates scheduled with you yet') + '</div></div>' +
      '<div class="card table-card space-top"><div class="card-head"><h3>Spot offers</h3></div>' + A.table(A.st.offers.filter(o => o.employer_id === emp.employer_id), [['offer_id', 'Offer'], ['candidate', 'Candidate'], ['vacancy_id', 'Vacancy'], ['wage', 'Wage ₹/day'], ['engagement', 'Engagement'], ['joining_on', 'Joining', o => e(A.fmtDate(o.joining_on) + ' (' + A.dOffset(o.joining_on) + ')')]], null, 'No offers yet') + '</div>';
  }};
  A.actions['offer-open'] = node => {
    const i = A.st.interviews.find(x => x.interview_id === node.dataset.id), w = A.W(i.worker_id), v = vac(i.vacancy_id);
    A.modal('Review candidate & spot offer', A.kv({'Candidate': w.full_name + ' (' + w.worker_id + ')', 'Trade': w.primary_trade + ' · ' + w.years_experience + ' yrs', 'Gender / age': w.gender + ', ' + A.ageOn(w.date_of_birth), 'Registration': w.registration_status + ' · ' + w.verification, 'Vacancy': v.vacancy_id + ' ' + v.trade_required + ' (min ' + v.min_experience_years + ' yrs)', 'Experience check': {html: A.badge(Number(w.years_experience) >= Number(v.min_experience_years) ? 'Meets minimum' : 'Below minimum', Number(w.years_experience) >= Number(v.min_experience_years) ? 'green' : 'red')}}, 2) +
      '<form id="offer-form" data-id="' + e(i.interview_id) + '" class="stack space-top"><div class="form-grid">' + A.field('Daily wage offered (₹)', 'wage', v.daily_wage_offered_inr, 'number', 'required min="1"') + A.select('Engagement type', 'engagement', ['Daily wage', 'Short-term contract (1-3 months)', 'Long-term contract (6+ months)', 'Piece-rate'], v.engagement_type) + A.field('Joining date', 'joining', A.addDays(A.D, 3), 'date', 'required') + A.field('Duration (days)', 'duration', v.duration_days, 'number') + '</div><div class="form-error"></div><button class="btn btn-primary" type="submit">Record spot offer</button></form>');
  };
  A.forms['offer-form'] = (form, data) => {
    const i = A.st.interviews.find(x => x.interview_id === form.dataset.id), w = A.W(i.worker_id), v = vac(i.vacancy_id);
    if (data.joining < A.D) throw new Error('Joining date cannot be in the past.');
    const offer = {offer_id: 'OFR-' + String(A.st.offers.length + 1).padStart(3, '0'), interview_id: i.interview_id, worker_id: w.worker_id, candidate: w.full_name, vacancy_id: v.vacancy_id, employer_id: v.employer_id, wage: Number(data.wage), engagement: data.engagement, joining_on: data.joining, duration: data.duration, at: A.now(), by: A.user.login_id};
    A.st.offers.push(offer);i.status = 'Offered';i.outcome = 'Spot offer made';cand(i.registration_id).interview_status = 'Spot offer';
    const pl = {placement_id: 'PLC-' + String(A.st.placements.length + 1).padStart(4, '0'), worker_id: w.worker_id, worker_name: w.full_name, vacancy_id: v.vacancy_id, employer_id: v.employer_id, employer_name: empName(v.employer_id), wage: offer.wage, engagement: offer.engagement, joining_on: offer.joining_on, status: 'Offered – joining pending', source: EV().event_id, module: 'SM-05', offer_id: offer.offer_id, at: A.now()};
    A.st.placements.push(pl);
    const task = {task_id: 'TSK-' + String(A.st.tasks.length + 1).padStart(3, '0'), text: 'Joining follow-up: confirm ' + w.full_name + ' joined ' + empName(v.employer_id) + ' on ' + A.fmtDate(offer.joining_on), due_on: offer.joining_on, assigned: 'demo.op.gnt', module: 'SM-05', worker_id: w.worker_id, kind: 'Joining follow-up', placement_id: pl.placement_id};
    A.st.tasks.push(task);pl.task_id = task.task_id;
    v.filled = (v.filled || 0) + 1;
    A.sendMessage(w.mobile, 'offer', {employer: empName(v.employer_id), trade: v.trade_required, wage: offer.wage, date: A.fmtDate(offer.joining_on)}, 'te');
    A.audit('Spot offer recorded', offer.offer_id, w.full_name + ' · ' + v.vacancy_id + ' · ₹' + offer.wage + ' · joining ' + offer.joining_on);
    A.mark('4.5');A.mark('4.7');A.closeModal();A.refresh();A.toast('Offer recorded; placement ' + pl.placement_id + ' created and worker notified (mock gateway).');
  };

  // ---------- placements (SM-05) ----------
  A.views.placements = {title: 'Placements & follow-up', module: 'SM-05', icon: 'check', blurb: 'Placement records linked to offers, with joining follow-up tasks.', render() {
    return A.heading('Placements & follow-up', A.st.placements.length + ' placement(s) · ' + A.st.tasks.length + ' task(s)') +
      '<div class="card table-card"><div class="card-head"><h3>Placement records</h3></div>' + A.table(A.st.placements, [['placement_id', 'Placement'], ['worker_name', 'Worker'], ['employer_name', 'Employer'], ['vacancy_id', 'Vacancy'], ['wage', '₹/day'], ['engagement', 'Engagement'], ['joining_on', 'Joining', p => e(A.fmtDate(p.joining_on) + ' (' + A.dOffset(p.joining_on) + ')')], ['status', 'Status', p => A.badge(p.status, 'gold')], ['module', 'Linked to']], null, 'No placements yet — they are created when an employer records a spot offer.') + '</div>' +
      '<div class="card table-card space-top"><div class="card-head"><h3>Follow-up tasks</h3></div>' + A.table(A.st.tasks.filter(t => t.module === 'SM-05'), [['task_id', 'Task'], ['kind', 'Type'], ['text', 'What'], ['due_on', 'Due', t => e(A.fmtDate(t.due_on) + ' (' + A.dOffset(t.due_on) + ')')], ['assigned', 'Assigned to']], null, 'No tasks') + '</div>';
  }};

  // ---------- shared calendar (SM-06) ----------
  A.views.calendar = {title: 'Shared calendar', module: 'SM-06', icon: 'calendar', blurb: 'Events, melas, batches, appointments and follow-ups in one calendar.', render() {
    const items = [];
    const ev = EV();
    items.push({date: ev.event_date, time: ev.start_time + '–' + ev.end_time, kind: 'Job mela', title: ev.event_id + ' · ' + ev.event_name, where: A.centreName(ev.venue_centre_id)});
    for (const b of A.st.batches) items.push({date: b.start_on, time: 'Batch start', kind: b.programme_type, title: b.batch_id + ' · ' + b.trade + ' (' + A.districtName(b.district_code) + ')', where: b.training_partner});
    for (const a of A.st.appointments) items.push({date: a.date, time: a.time, kind: 'Counselling', title: a.beneficiary + ' with ' + a.counsellor_name, where: A.centreName(a.centre)});
    for (const t of A.st.tasks) items.push({date: t.due_on, time: 'Due', kind: t.kind || 'Follow-up', title: t.text, where: t.assigned});
    const from = A.addDays(A.D, -3), to = A.addDays(A.D, 30);
    const list = items.filter(i => i.date >= from && i.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const days = [...new Set(list.map(i => i.date))];
    return A.heading('Shared calendar', 'Agenda from ' + A.fmtDate(from) + ' to ' + A.fmtDate(to)) + '<div class="card">' + (days.map(d => '<div class="cal-day ' + (d === A.D ? 'today' : '') + '"><div class="cal-date"><strong>' + e(A.dayName(d)) + ' ' + e(A.fmtDate(d)) + '</strong><small>' + e(A.dOffset(d)) + '</small></div><div>' + list.filter(i => i.date === d).map(i => '<div class="cal-item"><span class="badge blue">' + e(i.kind) + '</span> <strong>' + e(i.time) + '</strong> ' + e(i.title) + '<small class="muted"> — ' + e(i.where) + '</small></div>').join('') + '</div></div>').join('') || A.empty('Nothing scheduled')) + '</div>' +
      '<div class="card space-top"><h3>Counsellor availability</h3>' + A.table(A.st.counsellors, [['counsellor_id', 'Counsellor'], ['name', 'Name'], ['base_centre', 'Centre'], ['languages', 'Languages'], ['availability', 'Availability']]) + '</div>';
  }};
}());
