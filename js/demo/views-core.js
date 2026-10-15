/* Shared workspaces: dashboard, walk-in queue (SM-18), worker registry and record (SM-01), grievances (SM-04), worker portal. */
(function () {
  const A = window.ILAC, e = A.esc;


  const isOperator = u => /^demo\.op\./.test(u.login_id);
  const inScopeWorker = w => A.inScope(A.user, w.district_code);

  // ---------- dashboard ----------
  A.views.dashboard = {title: 'Dashboard', module: '', icon: 'home', render() {
    const u = A.user, dist = A.userDistrict(u), inD = c => dist === 'State' || c === dist;
    const workers = A.st.workers.filter(w => inD(w.district_code)), refs = A.st.referrals.filter(r => inD(r.district_code));
    const open = refs.filter(r => A.isOpen(r)), past = open.filter(r => A.refState(r).overdue);
    const mine = A.navFor(u).filter(id => id !== 'dashboard');
    const tiles = mine.map(id => {const v = A.views[id];return v ? '<a class="card service-card" href="#v/' + id + '"><span class="icon-box">' + A.icon(v.icon || 'file') + '</span><h3>' + e(A.t(v.title)) + '</h3><p>' + e(v.blurb || '') + '</p><span class="catalogue-more">' + e(v.module || '') + ' ' + A.icon('arrow') + '</span></a>' : '';}).join('');
    return A.heading('Dashboard', u.role + ' · ' + u.jurisdiction + ' · used in ' + u.used_in) +
      '<section class="card welcome"><h2>Welcome, ' + e(u.login_id) + '</h2><p>' + e(u.role) + ' — jurisdiction ' + e(u.jurisdiction) + '. Modules enabled for this role: ' + e(u.modules_enabled) + '. Authentication: ' + e(u.mfa) + '.</p></section>' +
      '<div class="grid grid-4 space-top space-bottom">' + A.metric('Workers in scope', workers.length.toLocaleString('en-IN'), 'users') + A.metric('Open referrals', open.length, 'file') + A.metric('Past service clock', past.length, 'flag', 'open referrals due before D') + A.metric('Open grievances', A.st.grievances.filter(g => inD(g.district_code) && /^(Open|Reopened)/.test(g.status)).length, 'message') + '</div>' +
      '<div class="grid module-cards">' + tiles + '</div>';
  }};

  // ---------- queue / token desk (SM-18) ----------
  A.views.queue = {title: 'Queue & tokens', module: 'SM-18', icon: 'users', blurb: 'Issue and call walk-in tokens at the assisted desk.', render() {
    const centre = A.user.jurisdiction.startsWith('ILAC-') ? A.user.jurisdiction : 'ILAC-NTR-01';
    const list = A.st.tokens.filter(t => t.centre === centre);
    const calling = list.find(t => t.status === 'Called');
    return A.heading('Queue & tokens', 'Walk-in queue for ' + A.centreName(centre), '') +
      (calling ? '<div class="now-calling"><small>Now calling</small><strong>' + e(calling.token) + '</strong><span>' + e(calling.name) + ' · Counter 1</span></div>' : '') +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h3>Issue a walk-in token</h3>' + personaFillButtons(['P-01', 'P-02', 'P-03']) + '</div><form id="token-form" class="stack">' + A.field('Name', 'name', '', 'text', 'required') + A.field('Mobile number', 'mobile', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10"') +
      A.select('Purpose', 'purpose', ['New worker registration', 'Renewal', 'Scheme / service enquiry', 'Grievance', 'Job mela', 'Other'], 'New worker registration') + A.select('Message language', 'lang', [{value: 'te', label: 'Telugu'}, {value: 'en', label: 'English'}], 'te') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">' + e(A.t('Issue token')) + '</button></form></div>' +
      '<div class="card"><div class="card-head"><h3>Tokens today</h3>' + A.button('Call next', 'token-call-next', '', 'btn btn-sm btn-primary') + '</div>' +
      A.table(list, [['token', 'Token'], ['name', 'Name'], ['purpose', 'Purpose'], ['status', 'Status', t => A.badge(t.status)], ['issued', 'Issued', t => e(A.clockTime(t.issued))]], t => t.status === 'Waiting' ? A.button('Call', 'token-call', 'data-id="' + e(t.token) + '"', 'btn btn-sm') : t.status === 'Called' ? A.button('Start registration', 'token-serve', 'data-id="' + e(t.token) + '"', 'btn btn-sm btn-light') : '', 'No tokens issued yet') + '</div></div>';
  }};
  function personaFillButtons(ids) {
    return '<div class="row wrap"><small class="muted">Demo helper — fill from persona card:</small>' + ids.map(id => A.button(id, 'persona-fill', 'data-id="' + id + '"', 'btn btn-sm')).join('') + '</div>';
  }
  A.personaFillButtons = personaFillButtons;
  A.actions['persona-fill'] = node => {
    const p = A.st.personas.find(x => x.persona_id === node.dataset.id), form = node.closest('.card').querySelector('form');
    const set = (name, v) => {const i = form.elements[name];if (i) i.value = v;};
    set('name', p.full_name_en.replace(/ \(.*\)/, ''));set('mobile', p.mobile.split(' ')[0]);
    if (form.id === 'reg-check-form') {A.reg.persona = p.persona_id;set('uid', p.uid_token_mock);if (p.persona_id !== 'P-01') set('dob', p.date_of_birth);}
  };
  A.forms['token-form'] = (form, data) => {
    const centre = A.user.jurisdiction.startsWith('ILAC-') ? A.user.jurisdiction : 'ILAC-NTR-01';
    const n = A.st.tokens.filter(t => t.centre === centre).length + 1;
    const token = centre.replace('ILAC-', '') + '-' + String(n).padStart(3, '0');
    A.st.tokens.push({token, centre, name: data.name.trim(), mobile: data.mobile, purpose: data.purpose, lang: data.lang, status: 'Waiting', issued: A.now(), issued_by: A.user.login_id});
    A.sendMessage(data.mobile, 'token', {centre: A.centreName(centre), token}, data.lang);
    A.audit('Token issued', token, data.purpose);
    A.refresh();A.toast('Token ' + token + ' issued; SMS written to the mock gateway log.');
  };
  const callToken = t => {
    for (const x of A.st.tokens) if (x.status === 'Called') x.status = 'Served';
    t.status = 'Called';t.called = A.now();
    A.audit('Token called', t.token, t.name);A.mark('1.2');
  };
  A.actions['token-call'] = node => {callToken(A.st.tokens.find(t => t.token === node.dataset.id));A.refresh();};
  A.actions['token-call-next'] = () => {
    const t = A.st.tokens.find(x => x.status === 'Waiting');
    if (!t) throw new Error('No one is waiting.');
    callToken(t);A.refresh();
  };
  A.actions['token-serve'] = node => {
    const t = A.st.tokens.find(x => x.token === node.dataset.id);
    A.reg = A.newRegDraft();const persona = A.st.personas.find(x => x.mobile.split(' ')[0] === t.mobile);if (persona) A.reg.persona = persona.persona_id;A.reg.token = t.token;A.reg.f.name = t.name;A.reg.f.mobile = t.mobile;A.reg.search = {name: t.name, mobile: t.mobile};
    location.hash = 'v/register';
  };

  // ---------- worker registry (SM-01) ----------
  A.views.workers = {title: 'Workers', module: 'SM-01', icon: 'user', blurb: 'Search the worker registry and open a worker, household and timeline.', render(param) {
    if (param) return workerPage(param);
    const q = (A.workerQuery || '').trim().toLowerCase();
    let rows = A.st.workers.filter(inScopeWorker);
    if (q) rows = rows.filter(w => (w.full_name + ' ' + w.worker_id + ' ' + w.mobile + ' ' + (w.full_name_te || '') + ' ' + w.household_id).toLowerCase().includes(q));
    const shown = rows.slice(0, 40);
    return A.heading('Workers', 'Registry in your jurisdiction (' + rows.length.toLocaleString('en-IN') + ' record' + (rows.length === 1 ? '' : 's') + ')', isOperator(A.user) ? A.link('Register worker', 'v/register', 'btn btn-primary') : '') +
      '<form id="worker-search" class="row wrap space-bottom"><label class="field grow"><span class="sr-only">Search</span><input name="q" value="' + e(A.workerQuery || '') + '" placeholder="Name, worker ID, mobile or household ID" autocomplete="off"></label><button class="btn btn-primary" type="submit">' + e(A.t('Search')) + '</button></form>' +
      '<div class="card table-card">' + A.table(shown, [['worker_id', 'Worker ID'], ['full_name', 'Name'], ['gender', 'Gender'], ['primary_trade', 'Trade'], ['mobile', 'Mobile'], ['district_name', 'District'], ['registration_status', 'Status', w => A.badge(w.registration_status)]], w => '<a class="btn btn-sm" href="#v/workers/' + e(w.worker_id) + '">' + e(A.t('View')) + '</a>') + '</div>' + (rows.length > shown.length ? '<p class="small muted space-top">Showing the first ' + shown.length + '. Refine the search to narrow down.</p>' : '');
  }};
  A.forms['worker-search'] = (form, data) => {A.workerQuery = data.q;A.refresh();};

  function workerPage(id) {
    const w = A.W(id);
    if (!w) return A.heading('Worker not found', id, A.link('Workers', 'v/workers'));
    if (!inScopeWorker(w) && !A.isStateUser()) return A.heading('Outside your jurisdiction', 'This record belongs to ' + w.district_name + '. Access is limited to your allocated centre scope.', A.link('Workers', 'v/workers'));
    const tab = A.workerTab || 'profile', hh = A.H(w.household_id);
    const review = Object.keys(w.under_review || {});
    const header = '<div class="card worker-head"><div class="row between wrap"><div><div class="eyebrow">' + e(w.worker_id) + '</div><h2>' + e(w.full_name) + (w.full_name_te ? ' · <span lang="te">' + e(w.full_name_te) + '</span>' : '') + '</h2><p class="small muted">' + e(w.bocw_registration_no) + ' · ' + e(A.centreName(w.home_centre_id)) + ' · ' + e(w.primary_trade) + '</p></div><div class="row wrap">' + A.badge(w.registration_status) + A.badge(w.verification, /Pending/.test(w.verification) ? 'gold' : 'green') + (review.length ? A.badge('Field under review: ' + review.join(', '), 'red') : '') + '</div></div></div>';
    const tabs = A.tabs([['profile', 'Profile'], ['household', 'Household'], ['timeline', 'Timeline'], ['referrals', 'Referrals'], ['documents', 'Documents'], ['visits', 'Site visits']], tab, 'worker-tab');
    let body = '';
    if (tab === 'profile') {
      body = A.kv({'Gender': w.gender, 'Date of birth': A.fmtDate(w.date_of_birth) + ' (age ' + A.ageOn(w.date_of_birth) + ')', 'Mobile': {html: e(w.mobile) + (w.under_review?.mobile ? ' ' + A.badge('under review', 'red') : '')}, 'Aadhaar (masked)': w.aadhaar_masked, 'UID token (mock)': w.uid_token_mock, 'e-Shram UAN token': w.eshram_uan_token_mock || '—', 'Trade': w.primary_trade, 'Experience': w.years_experience + ' years', 'Bank account': w.bank_account_held, 'Smartphone': w.smartphone, 'Registered on': A.fmtDate(w.registration_date), 'Consent': w.consent_version ? w.consent_version + ' · ' + A.fmtDate(w.consent_captured_on) : '—', 'Skilling need': w.skilling_need_flag === 'Yes' ? 'Yes — ' + (w.skilling_trade || w.primary_trade) : 'No', 'Batch': w.enrolled_batch_id || 'Not enrolled', 'Record version': 'v' + w.version, 'Origin': w.record_origin}) +
        (isOperator(A.user) ? '<div class="row wrap space-top">' + A.button('Edit mobile number', 'edit-mobile', 'data-id="' + e(w.worker_id) + '"', 'btn btn-light') + A.button('Raise referral', 'referral-open', 'data-id="' + e(w.worker_id) + '"', 'btn btn-light') + '</div>' : '');
    } else if (tab === 'household') {
      const members = A.householdMembers(w.household_id);
      body = (hh ? A.kv({'Household': hh.household_id, 'Head': hh.household_head_name, 'Area': hh.area_type, 'House': hh.house_type, 'Rice card': hh.rice_card_held, 'Water': hh.drinking_water_source, 'LPG': hh.lpg_connection, 'Migration': hh.seasonal_migration, 'Language': hh.primary_language, 'Habitation': hh.habitation, 'Baseline surveyed': A.fmtDate(hh.baseline_survey_date), 'Primary language of worker': hh.worker_language || ''}) : '<p>No household linked.</p>') +
        '<div class="card-head space-top"><h3>' + e(A.t('Household members')) + '</h3>' + (isOperator(A.user) && hh ? A.button('Add member', 'member-open', 'data-id="' + e(w.household_id) + '"', 'btn btn-sm btn-primary') : '') + '</div>' +
        A.table(members, [['member_id', 'Member'], ['full_name', 'Name'], ['relationship_to_head', 'Relationship'], ['gender', 'Gender'], ['date_of_birth', 'DOB', m => e(A.fmtDate(m.date_of_birth))], ['education_stage', 'Education stage'], ['occupation', 'Occupation']]);
    } else if (tab === 'timeline') {
      if (w.worker_id === 'SYN-W-000608') A.mark('3.1');
      body = '<p class="small muted">Household timeline — services, visits and cases across everyone in ' + e(w.household_id) + '.</p>' + timeline(A.householdEvents(w.household_id));
    } else if (tab === 'referrals') {
      const refs = A.st.referrals.filter(r => r.worker_id === w.worker_id);
      body = A.table(refs, [['referral_id', 'Case'], ['service_code', 'Service', r => e(r.service_code + ' · ' + (A.st.svcByCode.get(r.service_code)?.service_name || ''))], ['channel', 'Route'], ['due_on', 'Due', r => e(A.fmtDate(r.due_on))], ['status', 'Status', r => A.referralBadge(r)]], r => A.button('Open', 'case-open', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm'));
    } else if (tab === 'documents') {
      const docs = A.st.documents.filter(d => d.entity_id === w.worker_id || (d.household_id && d.household_id === w.household_id));
      body = docs.length ? docs.map(docCard).join('') : A.empty('No documents stored for this worker in this session');
    } else {
      body = w.visits.length ? A.table(w.visits, [['visit_id', 'Visit'], ['site_id', 'Site'], ['date', 'Date', v => e(A.fmtDate(v.date))], ['attendance', 'Attendance', v => A.badge(v.attendance)], ['skilling', 'Skilling need', v => e(v.skilling ? 'Recorded' : '—')]]) : A.empty('No site visits recorded');
    }
    return A.heading('Worker record', w.worker_id, A.link('Workers', 'v/workers', 'btn')) + header + '<div class="card space-top">' + tabs + body + '</div>';
  }
  A.isStateUser = () => A.userDistrict(A.user) === 'State';
  A.actions['worker-tab'] = node => {A.workerTab = node.dataset.id;A.refresh();};

  function timeline(events) {
    if (!events.length) return A.empty('No events yet');
    return '<div class="timeline">' + events.map(ev => '<div class="timeline-item"><span class="timeline-date">' + e(A.fmtDate(ev.at)) + '<small>' + e(A.dOffset(ev.at)) + '</small></span><div><span class="badge blue">' + e(ev.kind) + '</span> ' + e(ev.text) + (ev.who ? '<small class="muted"> — ' + e(ev.who) + '</small>' : '') + '</div></div>').join('') + '</div>';
  }
  A.timelineHtml = timeline;

  function docCard(d) {
    return '<div class="doc-card">' + (d.src ? '<img src="' + e(d.src) + '" alt="' + e(d.type) + '" class="doc-thumb">' : '<div class="doc-thumb placeholder">no preview</div>') + '<div><strong>' + e(d.type) + '</strong><br><small class="muted">' + e(d.name) + '<br>' + e(d.doc_id) + ' · sha256 ' + e(d.sha256) + '<br>' + A.badge(d.access, 'gold') + '</small></div></div>';
  }
  A.docCard = docCard;

  // ---------- worker field edits ----------
  A.actions['edit-mobile'] = node => {
    const w = A.W(node.dataset.id);
    A.modal('Edit mobile number', '<p class="small">' + e(w.full_name) + ' · current <strong>' + e(w.mobile) + '</strong> · record v' + w.version + '</p><form id="edit-mobile-form" data-id="' + e(w.worker_id) + '" class="stack">' + A.field('New mobile number', 'mobile', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Save change</button></form>');
  };
  A.forms['edit-mobile-form'] = (form, data) => {
    const w = A.W(form.dataset.id);
    A.editWorkerField(w.worker_id, 'mobile', data.mobile, {by: A.user.login_id});
    if (w.worker_id === 'SYN-W-000120') A.mark('2.7');
    A.closeModal();A.refresh();A.toast('Mobile updated (record v' + w.version + ').');
  };

  // ---------- grievances (SM-04) ----------
  A.views.grievances = {title: 'Grievances', module: 'SM-04', icon: 'message', blurb: 'Grievance register for the centre’s district.', render() {
    const rows = A.st.grievances.filter(g => A.inScope(A.user, g.district_code)).sort((a, b) => b.created_on.localeCompare(a.created_on));
    return A.heading('Grievances', rows.length + ' grievances in ' + (A.userDistrict(A.user) === 'State' ? 'the State' : A.districtName(A.userDistrict(A.user)))) +
      '<div class="card table-card">' + A.table(rows.slice(0, 60), [['grievance_id', 'Grievance'], ['worker_id', 'Worker'], ['category', 'Category'], ['urgency', 'Urgency'], ['channel', 'Channel'], ['created_on', 'Created', g => e(A.fmtDate(g.created_on) + ' (' + A.dOffset(g.created_on) + ')')], ['status', 'Status', g => A.badge(g.status, /^Resolved|^Closed/.test(g.status) ? 'green' : /escalated/.test(g.status) ? 'red' : 'gold')], ['assigned_to', 'Assigned']]) + '</div>';
  }};

  // ---------- worker portal ----------
  A.views.me = {title: 'My record', module: 'SM-22', icon: 'user', blurb: '', render() {
    const w = A.W(A.user.worker_id);
    const refs = A.st.referrals.filter(r => r.worker_id === w.worker_id);
    return A.heading('My record', w.full_name + ' · ' + w.worker_id) + '<div class="card">' + A.kv({'Worker ID': w.worker_id, 'BOCW number': w.bocw_registration_no, 'Trade': w.primary_trade, 'Centre': A.centreName(w.home_centre_id), 'Status': w.registration_status, 'Verification': w.verification}) + '</div>' +
      '<div class="card space-top"><h3>My service requests</h3>' + A.table(refs, [['referral_id', 'Case'], ['service_code', 'Service', r => e(r.service_code + ' ' + (A.st.svcByCode.get(r.service_code)?.service_name || ''))], ['due_on', 'Due', r => e(A.fmtDate(r.due_on))], ['status', 'Status', r => A.badge(r.status)]]) + '</div>';
  }};
}());
