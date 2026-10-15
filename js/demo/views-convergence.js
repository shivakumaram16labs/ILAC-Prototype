/* Convergence (SM-07): referral raising with service clocks, API → manual fallback, departmental worklist, DLO pendency, integration monitoring (SM-12). */
(function () {
  const A = window.ILAC, e = A.esc;
  const canRaise = () => /^demo\.op\./.test(A.user.login_id);

  // ---------- referral list (operator / DLO) ----------
  A.views.referrals = {title: 'Convergence referrals', module: 'SM-07', icon: 'link', blurb: 'Raise and track referrals to departments, with service clocks.', render() {
    const dist = A.userDistrict(A.user);
    const rows = A.st.referrals.filter(r => A.inScope(A.user, r.district_code) && (!A.refFilter || (A.refFilter === 'open' ? A.isOpen(r) : A.refFilter === 'mine' ? r.origin === 'demo' : true)));
    rows.sort((a, b) => b.created_on.localeCompare(a.created_on) || b.referral_id.localeCompare(a.referral_id));
    const toolbar = A.tabs([['all', 'All'], ['open', 'Open'], ['mine', 'Raised in this session']], A.refFilter || 'all', 'ref-filter');
    return A.heading('Convergence referrals', (dist === 'State' ? 'Statewide' : A.districtName(dist)) + ' · ' + rows.length + ' cases', canRaise() ? A.button('Raise referral', 'referral-open', 'data-id=""', 'btn btn-primary') : '') +
      '<div class="card table-card">' + toolbar + A.table(rows.slice(0, 80), caseCols(), r => A.button('Open', 'case-open', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm')) + (rows.length > 80 ? '<p class="small muted pad">First 80 of ' + rows.length + ' shown.</p>' : '') + '</div>';
  }};
  const caseCols = () => [['referral_id', 'Case'], ['worker_id', 'Worker'], ['service_code', 'Service', r => e(r.service_code + ' · ' + (A.st.svcByCode.get(r.service_code)?.service_name || ''))], ['channel', 'Route', r => e(r.channel.replace('Manual / assisted (fallback - API unavailable)', 'Manual (fallback)'))], ['created_on', 'Created', r => e(A.fmtDate(r.created_on))], ['clock', 'Clock', r => e(r.clock + ' d')], ['due_on', 'Due', r => e(A.fmtDate(r.due_on))], ['status', 'Status', r => A.referralBadge(r)]];
  A.caseCols = caseCols;
  A.actions['ref-filter'] = node => {A.refFilter = node.dataset.id;A.refresh();};

  // ---------- raise referral ----------
  A.actions['referral-open'] = node => {
    const wid = node.dataset.id || A.pendingWorkerForReferral || '';
    const svcs = A.raisableServices();
    A.modal('Raise convergence referral', '<form id="referral-form" class="stack">' + A.field('Worker ID', 'worker_id', wid, 'text', 'required placeholder="SYN-W-000608"') +
      '<fieldset class="fieldset"><legend>Services (select one or more)</legend>' + svcs.map(s => '<label class="check"><input type="checkbox" name="svc_' + e(s.service_code) + '"> <strong>' + e(s.service_code) + '</strong> ' + e(s.service_name) + ' <small class="muted">· ' + e(s.department) + ' · ' + (s.mode === 'api' ? 'API' : 'manual') + ' · ' + s.clock + '-day clock (v' + s.version + ')</small></label>').join('') + '</fieldset>' +
      A.textarea('Note for the department', 'note', '') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Submit referral(s)</button></form>', '', true);
  };
  A.forms['referral-form'] = async (form, data) => {
    const w = A.W(data.worker_id.trim());
    if (!w) throw new Error('Worker not found.');
    if (!A.inScope(A.user, w.district_code)) throw new Error('Worker is outside your jurisdiction.');
    const codes = Object.keys(data).filter(k => k.startsWith('svc_')).map(k => k.slice(4));
    if (!codes.length) throw new Error('Select at least one service.');
    const submit = form.querySelector('button[type=submit]');submit.disabled = true;submit.textContent = 'Submitting…';
    const out = [];
    try {
      for (const code of codes) {
        const opts = {note: data.note};
        // the new-born added in this session is the member being added to the rice card
        if (code === 'CS-01' && A.lastAddedMember && A.lastAddedMember.household_id === w.household_id) Object.assign(opts, {member_name: A.lastAddedMember.full_name, member_dob: A.lastAddedMember.date_of_birth, relationship: A.lastAddedMember.relationship_to_head, member_id: A.lastAddedMember.member_id});
        out.push(await A.createReferral(w, code, opts));
      }
    } finally {submit.disabled = false;}
    A.closeModal();
    for (const r of out) {if (r.service_code === 'SK-01') A.mark('3.3');if (r.service_code === 'CS-01') A.mark('3.4');if (r.service_code === 'ED-01' || r.service_code === 'ED-02') A.mark('5.4');}
    A.lastReferralBatch = {worker: w, cases: out};
    ackModal(w, out);
  };

  function ackModal(w, cases) {
    const list = cases.map(c => c.referral_id + ' (' + c.service_code + ', due ' + A.fmtDate(c.due_on) + ')').join('; ');
    A.sendMessage(w.mobile, 'referral_ack', {list}, 'te');
    A.mark('3.5');
    A.modal('Acknowledgement for ' + w.full_name, '<div class="print-area"><p><strong>Worker</strong> ' + e(w.full_name) + ' (' + e(w.worker_id) + ') · ' + e(A.fmtDate(A.D)) + '</p>' +
      A.table(cases, [['referral_id', 'Case ID', r => '<strong>' + e(r.referral_id) + '</strong>'], ['service_code', 'Service', r => e(r.service_code + ' · ' + A.st.svcByCode.get(r.service_code).service_name)], ['channel', 'Route', r => r.mode === 'api' ? A.badge('API · ' + r.external_ack_no, 'green') : A.badge('Manual / assisted' + (r.fallback_reason ? ' — ' + r.fallback_reason : ''), 'gold')], ['clock', 'Service clock', r => e(r.clock + ' days')], ['due_on', 'Due date', r => e(A.fmtDate(r.due_on))], ['office', 'Responsible office', r => e(r.department)], ['next', 'Next step', r => e(r.mode === 'api' ? 'Department acknowledged; track status at the centre' : 'Take the referral slip and original documents to the departmental nodal officer; a worklist entry has been created')]]) + '</div>' +
      '<p class="small muted">A Telugu SMS listing both case IDs has been written to the mock gateway log.</p>', A.button('Print', 'print', '', 'btn') + (cases.some(c => c.mode === 'manual') ? A.button('Referral slip', 'slip-open', 'data-id="' + e(cases.find(c => c.mode === 'manual').referral_id) + '"', 'btn btn-light') : ''), true);
  }

  // ---------- case detail ----------
  A.actions['case-open'] = node => {
    const r = A.st.referrals.find(x => x.referral_id === node.dataset.id), s = A.refState(r), esc = A.escalationHistory(r), w = A.W(r.worker_id);
    A.modal('Case ' + r.referral_id, A.kv({'Worker': (w ? w.full_name + ' · ' : '') + r.worker_id, 'Service': r.service_code + ' · ' + A.st.svcByCode.get(r.service_code)?.service_name, 'Department': r.department, 'Route': r.channel, 'External ack': r.external_ack_no || '—', 'Reason (fallback)': r.fallback_reason || '—', 'Created': A.fmtDate(r.created_on) + ' (' + A.dOffset(r.created_on) + ')', 'Service clock': r.clock + ' days (L1 day ' + r.l1 + ', L2 day ' + r.l2 + ')', 'Due': A.fmtDate(r.due_on) + ' (' + A.dOffset(r.due_on) + ')', 'Status': {html: A.referralBadge(r)}, 'Department status': r.dept_status || '—', 'Responsible': r.responsible_officer}) +
      (s.overdue ? A.notice('<strong>Past service clock by ' + s.daysOver + ' day(s).</strong> Elapsed ' + s.elapsed + ' days.', 'warn') : '') +
      '<h4 class="space-top">Escalation history</h4>' + (esc.length ? '<ul class="plain">' + esc.map(x => '<li>' + A.badge(x.level, x.level === 'L2' ? 'red' : 'gold') + ' ' + e(A.fmtDate(x.at)) + ' (' + e(A.dOffset(x.at)) + ') — ' + e(x.text) + '</li>').join('') + '</ul>' : '<p class="small muted">No escalation yet.</p>') +
      '<h4 class="space-top">Case history</h4><ul class="plain">' + r.history.map(h => '<li><span class="mono small">' + e(h.at.length > 10 ? A.clockTime(h.at) : A.fmtDate(h.at)) + '</span> ' + e(h.by) + ' — ' + e(h.text) + '</li>').join('') + '</ul>' + (r.evidence?.length ? '<h4 class="space-top">Evidence</h4><ul class="plain">' + r.evidence.map(x => '<li>' + e(x.name) + ' · ' + e(x.by) + '</li>').join('') + '</ul>' : ''),
      (r.mode === 'manual' && r.origin === 'demo' ? A.button('Referral slip', 'slip-open', 'data-id="' + e(r.referral_id) + '"', 'btn btn-light') : '') + (r.mode === 'api' && r.service_code === 'SK-01' && A.isOpen(r) ? A.button('Poll APSSDC status', 'apssdc-poll', 'data-id="' + e(r.referral_id) + '"', 'btn btn-light') : ''), true);
    if (r.referral_id === 'SYN-R-00151') A.mark('3.8');
  };
  A.actions['apssdc-poll'] = async node => {
    const r = A.st.referrals.find(x => x.referral_id === node.dataset.id);
    const res = await A.mock.call('APSSDC', 'GET', '/mock/apssdc/v1/enrolments/' + r.external_ack_no + '/status', {}, {ack: r.external_ack_no, caseId: r.referral_id});
    if (res.body.status === 'Seat confirmed' && r.status !== 'Seat confirmed') {
      r.status = 'Seat confirmed';r.history.push({at: A.now(), by: 'APSSDC (status poll)', text: 'Seat confirmed'});A.audit('Status poll applied', r.referral_id, 'Seat confirmed');A.mark('3.7');
    }
    A.closeModal();A.refresh();A.toast('APSSDC status: ' + res.body.status);
  };

  A.actions['slip-open'] = node => {
    const r = A.st.referrals.find(x => x.referral_id === node.dataset.id), w = A.W(r.worker_id), svc = A.st.svcByCode.get(r.service_code);
    A.modal('Referral slip · ' + r.referral_id, '<div class="slip print-area"><div class="slip-head"><strong>Digital ILAC — Referral slip</strong><span>' + e(A.centreName(r.centre_id)) + '</span></div>' + A.kv({'Case ID': r.referral_id, 'Issued': A.fmtDate(A.D), 'Worker': w.full_name + ' (' + w.worker_id + ')', 'Mobile': w.mobile, 'Service': r.service_code + ' · ' + svc.service_name, 'To': r.department + ' — ' + r.responsible_officer, 'Route': 'Manual / assisted — reason: ' + (r.fallback_reason || 'by design'), 'Service clock': r.clock + ' days · due ' + A.fmtDate(r.due_on), 'Escalation': 'L1 day ' + r.l1 + ' → District Labour Officer; L2 day ' + r.l2 + ' → State PMU', 'Documents': svc.documents_required || '—', 'Note': r.note || '—'}, 2) + '<div class="slip-foot"><div class="qr-box" aria-label="Case code">' + qrBlocks(r.referral_id) + '</div><div class="small">Carry this slip with the documents above to the nodal officer. Case reference is the same ILAC ID whether the request travels by API or by hand.<br>Shareable text: <span class="mono">ILAC ' + e(r.referral_id) + ' · ' + e(r.service_code) + ' · due ' + e(r.due_on) + '</span></div></div></div>', A.button('Print slip', 'print', '', 'btn btn-primary'), true);
  };
  // decorative pattern derived from the case ID (not a scannable QR code)
  const qrBlocks = text => {
    const h = A.sha256(text);
    return Array.from({length: 49}, (_, i) => '<i class="' + (parseInt(h[i % 64], 16) % 2 ? 'on' : '') + '"></i>').join('');
  };

  // ---------- add household member (S3.2) ----------
  A.actions['member-open'] = node => {
    A.modal('Add household member', '<form id="member-form" data-hid="' + e(node.dataset.id) + '" class="stack"><div class="form-grid">' + A.field('Name', 'name', '', 'text', 'required') + A.select('Relationship', 'rel', ['Daughter', 'Son', 'Spouse', 'Mother', 'Father']) + A.select('Gender', 'gender', ['Female', 'Male']) + A.field('Date of birth', 'dob', '', 'date', 'required max="' + A.D + '"') + A.select('Education stage', 'edu', ['Not yet in school', 'Anganwadi', 'Primary (Class 1-5)', 'Secondary (Class 9-10)']) + A.select('Attach document', 'doc', [{value: '', label: '— none —'}, 'specimen_birth_certificate_P-05.png']) + '</div><div class="form-error"></div><button class="btn btn-primary" type="submit">Add to household</button></form>');
  };
  A.forms['member-form'] = async (form, data) => {
    const hid = form.dataset.hid, m = {member_id: A.newMemberId(), household_id: hid, full_name: data.name.trim(), relationship_to_head: data.rel, gender: data.gender, date_of_birth: data.dob, age_on_2026_10_01: String(Math.max(0, A.ageOn(data.dob, '2026-10-01') || 0)), education_stage: data.edu, occupation: 'Child', linked_worker_id: '', disability_reported: 'Not recorded in synthetic set', added_on: A.D, added_by: A.user.login_id};
    A.st.members.push(m);A.indexes();A.lastAddedMember = m;
    const hh = A.H(hid);if (hh) hh.member_count = String(Number(hh.member_count) + 1);
    const head = A.st.workers.find(w => w.household_id === hid);
    if (data.doc) await A.addDocument({entityId: head.worker_id, householdId: hid, type: 'Birth certificate', name: data.doc, src: 'assets/specimens/' + data.doc});
    A.audit('Household member added', m.member_id, m.full_name + ' to ' + hid + (data.doc ? ' with birth certificate' : ''));
    A.mark('3.2');A.closeModal();A.refresh();A.toast(m.full_name + ' added to household ' + hid + '.');
  };

  // ---------- departmental worklist (demo.nodal.*) ----------
  A.views.worklist = {title: 'Departmental worklist', module: 'SM-22', icon: 'checklist', blurb: 'Cases assigned to your department, with manual status updates.', render() {
    const rows = A.st.referrals.filter(r => r.responsible_officer === A.user.login_id && A.isOpen(r) && A.inScope(A.user, r.district_code)).sort((a, b) => (a.origin === 'demo' ? -1 : 1) - (b.origin === 'demo' ? -1 : 1) || a.due_on.localeCompare(b.due_on));
    return A.heading('Departmental worklist', A.user.role + ' · ' + rows.length + ' open case(s)') +
      '<div class="card table-card">' + A.table(rows, [...caseCols().slice(0, 3), ['mode', 'Route', r => r.mode === 'manual' ? A.badge('Manual — update here', 'gold') : A.badge('API', 'green')], ['due_on', 'Due', r => e(A.fmtDate(r.due_on))], ['status', 'Status', r => A.referralBadge(r)]], r => A.button('Update', 'case-update', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm btn-primary') + ' ' + A.button('Open', 'case-open', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm')) + '</div>';
  }};
  A.actions['case-update'] = node => {
    const r = A.st.referrals.find(x => x.referral_id === node.dataset.id);
    A.modal('Update case ' + r.referral_id, '<form id="case-update-form" data-id="' + e(r.referral_id) + '" class="stack">' + A.select('Department status', 'dept', ['Received – documents verified', 'Query raised – awaiting worker', 'Approved – action initiated', 'Completed – service delivered', 'Closed – not completed (reason recorded)']) + A.textarea('Remarks', 'text', '') +
      '<label class="field"><span>Evidence (file)</span><input type="file" name="evidence"></label><div class="form-error"></div><button class="btn btn-primary" type="submit">Record update</button></form>');
  };
  A.forms['case-update-form'] = async (form, data) => {
    const file = form.elements.evidence.files[0];
    if (data.dept.startsWith('Completed') && !file) throw new Error('Closing as completed needs evidence of the delivered service.');
    if (data.dept.startsWith('Closed') && (data.text || '').trim().length < 5) throw new Error('A reason is required to close without completion (documented next step).');
    const map = {'Received – documents verified': 'Acknowledged by department', 'Query raised – awaiting worker': 'Query raised - awaiting worker', 'Approved – action initiated': 'Acknowledged by department', 'Completed – service delivered': 'Completed - service delivered', 'Closed – not completed (reason recorded)': 'Closed - not completed (reasoned)'};
    const evName = file ? file.name : (data.dept.startsWith('Received') ? 'document-verification-record.pdf (manual entry)' : '');
    A.updateReferral(form.dataset.id, map[data.dept], data.text, evName, data.dept);
    if (data.dept.startsWith('Received')) A.mark('3.6');
    A.closeModal();A.refresh();A.toast('Case updated.');
  };

  // ---------- DLO pendency ----------
  A.views.pendency = {title: 'Pendency & escalations', module: 'SM-07', icon: 'flag', blurb: 'Open cases past their clock or escalated to you, by department.', render() {
    const mine = A.st.referrals.filter(r => A.inScope(A.user, r.district_code) && A.isOpen(r));
    const past = mine.filter(r => A.refState(r).overdue).sort((a, b) => a.due_on.localeCompare(b.due_on));
    const byDept = {};for (const r of past) byDept[r.department] = (byDept[r.department] || 0) + 1;
    return A.heading('Pendency & escalations', A.districtName(A.userDistrict(A.user)) + ' · escalations addressed to ' + A.user.login_id) +
      '<div class="grid grid-4 space-bottom">' + A.metric('Open cases', mine.length, 'file') + A.metric('Past service clock', past.length, 'flag') + A.metric('At L1 (to DLO)', mine.filter(r => A.refState(r).level === 1).length, 'bell') + A.metric('At L2 (State PMU)', mine.filter(r => A.refState(r).level === 2).length, 'bell') + '</div>' +
      '<div class="grid grid-2"><div class="card"><h3>Past clock by department</h3>' + A.table(Object.entries(byDept).map(([d, n]) => ({d, n})), [['d', 'Department'], ['n', 'Cases']]) + '</div><div class="card"><h3>Reading the clock</h3><p class="small">A case is past its clock when today (D) is after its due date. L1 goes to the District Labour Officer at the L1 day, L2 to the State PMU at the L2 day — each case keeps the clock it was created with.</p></div></div>' +
      '<div class="card table-card space-top"><div class="card-head"><h3>Cases needing action</h3></div>' + A.table(past.slice(0, 60), [...caseCols().slice(0, 3), ['due_on', 'Due', r => e(A.fmtDate(r.due_on) + ' (' + A.dOffset(r.due_on) + ')')], ['lvl', 'Escalation', r => A.badge('L' + A.refState(r).level, A.refState(r).level === 2 ? 'red' : 'gold')], ['status', 'Status', r => A.referralBadge(r)]], r => A.button('Open', 'case-open', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm')) + '</div>';
  }};

  // ---------- integration monitoring (SM-12) ----------
  A.views.integration = {title: 'Integration monitoring', module: 'SM-12', icon: 'compass', blurb: 'Interface health, error and retry log, open dependencies.', render() {
    const health = A.mock.health(), log = A.st.apiLog;
    const stats = A.mock.interfaces.map(i => {
      const calls = log.filter(l => l.interface === i.name || l.path.startsWith(i.path.split('{')[0]));
      return {...i, status: health[i.id], calls: calls.length, errors: calls.filter(c => !(c.status >= 200 && c.status < 300)).length, last: calls[0] ? A.clockTime(calls[0].at) : '—'};
    });
    const open = A.st.referrals.filter(r => r.mode === 'manual' && r.fallback_reason && A.isOpen(r));
    return A.heading('Integration monitoring', 'Integration Hub · adapters, circuit state, retries', A.button('Run retries now', 'retries-run', '', 'btn btn-primary')) +
      '<div class="grid grid-4 space-bottom">' + A.metric('Interfaces up', stats.filter(s => s.status === 'UP').length + ' / ' + stats.length, 'compass') + A.metric('Interfaces down', stats.filter(s => s.status !== 'UP').length, 'flag') + A.metric('Calls logged', log.length, 'chart') + A.metric('Open dependencies', open.length + A.st.retries.filter(r => r.status === 'Queued').length, 'link') + '</div>' +
      '<div class="card table-card"><div class="card-head"><h3>Adapters</h3></div>' + A.table(stats, [['id', 'Id'], ['name', 'Interface'], ['path', 'Mock endpoint', r => '<span class="mono small">' + e(r.path) + '</span>'], ['status', 'State', r => A.badge(r.status)], ['calls', 'Calls'], ['errors', 'Errors'], ['last', 'Last call']]) + '</div>' +
      '<div class="card table-card space-top"><div class="card-head"><div><h3>Retry and reconciliation queue</h3><p>Cases routed to the manual fallback keep an open dependency until the interface returns and the case is reconciled.</p></div></div>' +
      A.table(A.st.retries, [['id', 'Id'], ['kind', 'Kind'], ['case_id', 'Case / worker'], ['interface', 'Interface'], ['attempts', 'Attempts'], ['next_attempt', 'Next attempt'], ['last_error', 'Last error'], ['status', 'Status', r => A.badge(r.status)]], r => r.kind === 'Reconcile manual case' && r.status !== 'Reconciled' ? A.button('Reconcile', 'reconcile', 'data-id="' + e(r.id) + '"', 'btn btn-sm') : '', 'No retries queued') + '</div>' +
      '<div class="card table-card space-top"><div class="card-head"><h3>Recent errors</h3></div>' + A.table(log.filter(l => !(l.status >= 200 && l.status < 300)).slice(0, 12), [['at', 'Time', l => e(A.clockTime(l.at))], ['interface', 'Interface'], ['method', 'Method'], ['path', 'Endpoint', l => '<span class="mono small">' + e(l.path) + '</span>'], ['status', 'HTTP', l => A.badge(String(l.status || 'timeout'), 'red')], ['caseId', 'Case']], null, 'No errors logged yet') + '</div>';
  }};
  A.actions['retries-run'] = async () => {
    let done = 0;
    for (const r of A.st.retries.filter(x => x.status === 'Queued' && x.kind === 'e-Shram verification')) {
      r.attempts += 1;
      try {
        const res = await A.mock.callT('e-Shram', 'POST', '/mock/eshram/v1/verify', {uid_token_mock: r.uid, name: r.name}, {caseId: r.case_id}, A.mockTimeoutMs);
        const w = A.W(r.case_id);
        if (res.status === 200) {r.status = 'Completed';w.verification = 'Verified (e-Shram)';w.eshram_uan_token_mock = res.body.uan_token;A.audit('Retry succeeded', r.case_id, 'e-Shram verified');A.sendMessage(w.mobile, 'followup', {text: 'e-Shram verification completed for ' + w.worker_id}, 'en');done++;}
      } catch (err) {r.last_error = 'Timeout after ' + A.mockTimeoutMs / 1000 + ' s (attempt ' + r.attempts + ')';}
    }
    A.refresh();A.toast(done ? done + ' retried item(s) completed.' : 'Retries ran; the interface is still not answering.');
  };
  A.actions.reconcile = async node => {
    const ret = A.st.retries.find(r => r.id === node.dataset.id), c = A.st.referrals.find(r => r.referral_id === ret.case_id), w = A.W(c.worker_id);
    const res = await A.mock.call('Civil Supplies', 'POST', '/mock/civilsupplies/v1/ricecard/member-additions', {worker_id: w.worker_id, household_id: w.household_id}, {caseId: c.referral_id});
    if (res.status >= 200 && res.status < 300) {
      c.external_ack_no = res.body.ack;c.history.push({at: A.now(), by: 'reconciliation', text: 'Interface restored: API acknowledgement ' + res.body.ack + ' linked to manual case (same ID)'});
      ret.status = 'Reconciled';ret.last_error = '';A.audit('Manual case reconciled', c.referral_id, res.body.ack);
      A.toast('Reconciled: ' + c.referral_id + ' linked to ' + res.body.ack);
    } else {ret.attempts += 1;ret.last_error = 'HTTP ' + res.status;A.toast('Civil Supplies is still unavailable (HTTP ' + res.status + ').');}
    A.refresh();
  };
  // viewing the monitor with Civil Supplies down evidences step 3.9
  const base = A.views.integration.render;
  A.views.integration.render = function () {if (A.st.mockState.civilSuppliesDown && A.st.retries.some(r => r.kind === 'Reconcile manual case')) A.mark('3.9');return base.call(this);};
}());
