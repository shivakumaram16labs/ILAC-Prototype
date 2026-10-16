/* Assisted worker registration (SM-01): registry check, details, consent, household baseline, documents, acknowledgement.
   The proposal's 15-step wizard (3.9) is grouped into six assisted-desk stages so the S1 script order is followed. */
(function () {
  const A = window.ILAC, e = A.esc;
  const STAGES = ['Registry check', 'Personal & work details', 'Consent', 'Household baseline', 'Documents', 'Review & submit'];
  const QUICK_STAGES = ['Registry check', 'Personal & work details', 'Consent', 'Documents', 'Review & submit'];
  const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father'];
  const PURPOSES = ['Worker registration & BOCW services', 'Household baseline survey', 'Convergence service referrals', 'SMS / WhatsApp notifications'];
  const EDU = ['No formal schooling', 'Not yet in school', 'Anganwadi', 'Primary (Class 1-5)', 'Primary (Class 1-5) completed', 'Upper primary (Class 6-8)', 'Class 8 completed', 'Secondary (Class 9-10)', 'Class 10 completed', 'Class 10 passed - not enrolled', 'Intermediate (Class 11-12)', 'Intermediate passed', 'ITI / Polytechnic (studying)', 'Degree (studying)', 'Dropped out', 'Working'];
  const SPECIMENS = ['specimen_photo_P-01.png', 'specimen_work_certificate_P-01.png', 'specimen_photo_P-03.png', 'specimen_photo_P-04.png', 'specimen_photo_P-06.png', 'specimen_birth_certificate_P-05.png', 'specimen_class10_memo_P-08.png'];
  A.specimenFiles = SPECIMENS;

  // Values keyed from S_Personas (P-01 and P-03 household baselines, verbatim).
  const PREFILL = {
    'P-01': {baseline: {house_type: 'Semi-pucca - own', rice_card_held: 'Yes', drinking_water_source: 'Public tap', lpg_connection: 'Yes', seasonal_migration: 'None', primary_language: 'Telugu', area_type: 'Urban'},
      members: [['Kona Padma', 'Spouse', 'Female', '1988-09-02', 'Class 10 completed', 'Home-maker'], ['Kona Sai Kiran', 'Son', 'Male', '2009-01-15', 'Intermediate (Class 11-12)', 'Student'], ['Kona Harika', 'Daughter', 'Female', '2011-12-03', 'Secondary (Class 9-10)', 'Student'], ['Kona Sathyavathi', 'Mother', 'Female', '1958-05-20', 'No formal schooling', 'Home-maker']], docs: [['specimen_photo_P-01.png', 'Photograph'], ['specimen_work_certificate_P-01.png', 'Work certificate (90 days)']]},
    'P-03': {baseline: {house_type: 'Rented', rice_card_held: 'No', drinking_water_source: 'Public tap', lpg_connection: 'No', seasonal_migration: 'Inter-district', primary_language: 'Telugu', area_type: 'Urban'}, members: [], docs: [['specimen_photo_P-03.png', 'Photograph']]},
    'P-06': {baseline: {}, members: [], docs: [['specimen_photo_P-06.png', 'Photograph']]}
  };

  A.newRegDraft = (mode = 'full') => ({mode, stage: 0, token: '', persona: '', search: {name: '', mobile: '', dob: '', uid: ''}, check: null, busy: '', f: {gender: 'Male', bank: 'Yes', smartphone: 'Yes', years: '0'}, consent: null, hh: {}, members: [], docs: [], errors: {}, dupChoice: null, dups: null, result: null});
  A.reg = A.newRegDraft();
  const stages = () => A.reg.mode === 'quick' ? QUICK_STAGES : STAGES;
  const stageName = () => stages()[A.reg.stage];
  const centreId = () => A.user.jurisdiction.startsWith('ILAC-') ? A.user.jurisdiction : 'ILAC-NTR-01';

  A.views.register = {title: 'Register worker', module: 'SM-01', icon: 'user', blurb: 'Assisted worker registration with household baseline.', render: () => A.heading('Register worker', 'Assisted desk · ' + A.centreName(centreId()), '') + A.regWizard()};

  A.regWizard = () => {
    const r = A.reg, names = stages();
    if (r.result) return ackView(r.result);
    const steps = '<ol class="stepper">' + names.map((n, i) => '<li class="' + (i === r.stage ? 'active' : i < r.stage ? 'done' : '') + '"><span>' + (i < r.stage ? '✓' : i + 1) + '</span>' + e(A.t(n)) + '</li>').join('') + '</ol>';
    const body = {
      'Registry check': stageRegistry, 'Personal & work details': stageDetails, 'Consent': stageConsent, 'Household baseline': stageHousehold, 'Documents': stageDocuments, 'Review & submit': stageReview
    }[stageName()]();
    return '<div class="card wizard-card">' + (r.mode === 'quick' ? A.notice('<strong>Job-mela quick registration</strong> — minimum fields; household details are completed later at the centre.', 'info') : '') + steps + '<div class="wizard-body">' + body + '</div></div>';
  };

  // ---------- stage 0: registry check (BOCW search, e-Shram verify) ----------
  function stageRegistry() {
    const r = A.reg, s = r.search, c = r.check;
    let out = '<div class="card-head"><div><h3>' + e(A.t('Registry check')) + '</h3><p>Search the BOCW registry before creating a record; verify the worker with e-Shram (mock).</p></div>' + A.personaFillButtons(r.mode === 'quick' ? ['P-06'] : ['P-01', 'P-02', 'P-03']) + '</div>';
    out += '<form id="reg-check-form" class="form-grid">' + A.field('Full name', 'name', s.name, 'text', 'required') + A.field('Mobile number', 'mobile', s.mobile, 'tel', 'required pattern="[0-9]{10}" maxlength="10"') + A.field('Date of birth (if known)', 'dob', s.dob, 'date') +
      A.field('UID token (mock) or masked Aadhaar', 'uid', s.uid, 'text', 'placeholder="SYN-UIDTOK-41100011" required') + '<div class="form-error full"></div><div class="full row wrap"><button class="btn btn-primary" type="submit" ' + (r.busy ? 'disabled' : '') + '>Search BOCW registry &amp; verify e-Shram</button>' + (r.token ? '<span class="small muted">Serving token ' + e(r.token) + '</span>' : '') + '</div></form>';
    if (r.busy) out += '<div class="busy-panel" id="reg-busy" role="status"><span class="spinner"></span> <span id="reg-busy-text">' + e(r.busy) + '</span></div>';
    if (c) {
      out += '<div class="grid grid-2 space-top"><div class="card inset"><h4>APBOCWWB registry search ' + A.badge(c.bocw.status + '', c.bocw.status === 200 ? 'green' : 'red') + '</h4>' + (c.bocw.body.matches.length ? A.table(c.bocw.body.matches, [['worker_id', 'Worker'], ['name', 'Name'], ['date_of_birth', 'DOB'], ['mobile', 'Mobile'], ['score', 'Score']]) : '<p class="match-none">No match — safe to create a new worker record.</p>') + '</div>' +
        '<div class="card inset"><h4>e-Shram verification ' + (c.eshram ? (c.eshram.timeout ? A.badge('No response in ' + A.mockTimeoutMs / 1000 + ' s', 'red') : A.badge(c.eshram.status + '', c.eshram.status === 200 ? 'green' : 'red')) : A.badge('Not run yet', 'gold')) + '</h4>' +
        (c.eshram ? (c.eshram.timeout ? '<p>The external system did not answer. Registration can still proceed: status will be <strong>verification pending – external system unavailable</strong> and a retry will be queued.</p>' : c.eshram.status === 200 ? '<p>Verified. UAN token: <span class="mono">' + e(c.eshram.body.uan_token) + '</span></p>' : '<p>' + e(JSON.stringify(c.eshram.body)) + '</p>') : '<p class="muted">Waiting for the duplicate decision before verifying.</p>') + '</div></div>';
      if (c.dups.length && r.dupChoice !== 'new') out += dupPanel(c.dups);
      else out += '<div class="row space-top">' + A.button('Continue to details', 'reg-next', 'data-from="0"', 'btn btn-primary') + '</div>';
    }
    return out;
  }
  function dupPanel(dups) {
    const d = dups[0], w = d.worker, s = A.reg.search;
    return '<div class="dup-alert" role="alert"><h4>⚠ Potential duplicate found — ' + e(d.priority) + ' priority (score ' + d.score.toFixed(2) + ')</h4><p>' + e(d.rule) + '. No new record has been created. Compare and decide.</p><div class="grid grid-2"><div class="card inset"><small>As typed now</small><br><strong>' + e(s.name) + '</strong><br>DOB ' + e(s.dob || '—') + ' · ' + e(s.mobile) + '</div><div class="card inset"><small>Existing record</small><br><strong>' + e(w.full_name) + '</strong> (' + e(w.worker_id) + ')<br>DOB ' + e(A.fmtDate(w.date_of_birth)) + ' · ' + e(w.mobile) + ' · ' + e(w.district_name) + '<br>' + e(w.primary_trade) + ' · ' + e(w.registration_status) + '</div></div>' +
      '<div class="row wrap space-top">' + A.button('Same person — link to existing record', 'dup-link', 'data-id="' + e(w.worker_id) + '"', 'btn btn-primary') + A.button('Different person — continue as new', 'dup-new', '', 'btn') + '</div></div>';
  }

  A.forms['reg-check-form'] = async (form, data) => {
    const r = A.reg;
    r.search = {name: data.name.trim(), mobile: data.mobile, dob: data.dob, uid: data.uid.trim()};
    if (/^\d{12}$/.test(data.uid.replace(/[\s-]/g, ''))) {
      // The UIDAI mock rejects 12-digit Aadhaar-like values; show its real response in the log.
      const res = await A.mock.call('UIDAI (mock)', 'POST', '/mock/uidai/v1/auth', {aadhaar_number: data.uid, otp: ''});
      A.st.apiLog[0].request = {aadhaar_number: 'XXXX-XXXX-' + data.uid.replace(/\D/g, '').slice(-4) + ' (full value never stored)'};
      throw new Error('Real Aadhaar numbers are not accepted: ' + res.body.message);
    }
    if (!/^SYN-UIDTOK-\d+$/.test(data.uid.trim()) && !/^XXXX-XXXX-\d{4}$/.test(data.uid.trim())) throw new Error('Enter the UID token (SYN-UIDTOK-…) or a masked Aadhaar (XXXX-XXXX-nnnn).');
    r.check = null;r.dupChoice = null;
    r.busy = 'Searching the APBOCWWB registry (mock)…';A.refresh();
    const dobArg = data.dob || '';
    const bocw = await A.mock.call('APBOCWWB registry', 'POST', '/mock/bocw/v1/workers/search', {name: r.search.name, date_of_birth: dobArg, mobile: r.search.mobile});
    A.mark('1.3');
    const dups = A.findDuplicates({name: r.search.name, dob: dobArg, mobile: r.search.mobile, uid_token_mock: r.search.uid});
    r.check = {bocw, dups, eshram: null};
    if (dups.length) {
      r.busy = '';
      A.audit('Potential duplicate flagged', dups[0].worker.worker_id, 'before record creation · score ' + dups[0].score.toFixed(2) + ' · ' + dups[0].rule);
      A.mark('1.9');A.refresh();return;
    }
    await runEshram();
  };
  async function runEshram() {
    const r = A.reg, uid = /^SYN-UIDTOK/.test(r.search.uid) ? r.search.uid : '';
    r.busy = 'Verifying with e-Shram (mock)…';A.refresh();
    const t0 = Date.now(), timer = setInterval(() => {
      const el = document.querySelector('#reg-busy-text');
      if (el) el.textContent = 'Verifying with e-Shram (mock)… waiting ' + Math.floor((Date.now() - t0) / 1000) + ' s of ' + A.mockTimeoutMs / 1000 + ' s';
    }, 500);
    try {
      const res = await A.mock.callT('e-Shram', 'POST', '/mock/eshram/v1/verify', {uid_token_mock: uid, name: r.search.name}, {}, A.mockTimeoutMs);
      r.check.eshram = res;
    } catch (err) {
      r.check.eshram = {timeout: true, status: 0};
      A.audit('External verification unavailable', 'e-Shram', 'No response within ' + A.mockTimeoutMs / 1000 + ' s for ' + r.search.name + ' — worker will not be turned away');
    } finally {clearInterval(timer);}
    r.busy = '';A.refresh();
  }
  A.actions['dup-link'] = node => {
    const id = node.dataset.id;
    A.audit('Duplicate resolved by linking', id, 'Operator linked to existing worker; no second worker master created (' + A.reg.search.name + ')');
    A.st.identityMerges.push({at: A.now(), by: A.user.login_id, existing: id, typed_as: A.reg.search.name, outcome: 'linked'});
    A.reg = A.newRegDraft(A.reg.mode);A.workerTab = 'profile';
    A.mark('1.9');
    location.hash = 'v/workers/' + id;A.toast('Linked to existing record ' + id + ' — action audit-logged.');
  };
  A.actions['dup-new'] = async () => {
    A.reg.dupChoice = 'new';A.audit('Duplicate dismissed', A.reg.check.dups[0].worker.worker_id, 'Operator confirmed different person');
    await runEshram();
  };
  A.actions['reg-next'] = () => {A.reg.stage += 1;A.refresh();};
  A.actions['reg-back'] = () => {A.reg.stage = Math.max(0, A.reg.stage - 1);A.refresh();};
  A.actions['reg-restart'] = () => {A.reg = A.newRegDraft(A.reg.mode);A.refresh();};

  // ---------- stage 1: personal & work ----------
  function stageDetails() {
    const r = A.reg, f = r.f, err = r.errors;
    f.name = f.name || r.search.name;f.mobile = f.mobile || r.search.mobile;f.dob = f.dob ?? r.search.dob;f.uid = f.uid || (/^SYN-UIDTOK/.test(r.search.uid) ? r.search.uid : '');f.aadhaar = f.aadhaar || (/^XXXX/.test(r.search.uid) ? r.search.uid : '');
    const fe = k => err[k] ? '<span class="field-error" role="alert">' + e(err[k]) + '</span>' : '';
    const fld = (label, name, value, type = 'text', extra = '') => '<label class="field ' + (err[name] ? 'invalid' : '') + '"><span>' + e(A.t(label)) + ' <b class="req">*</b></span><input name="' + name + '" type="' + type + '" value="' + e(value ?? '') + '" ' + extra + ' aria-invalid="' + (err[name] ? 'true' : 'false') + '">' + fe(name) + '</label>';
    return '<div class="card-head"><div><h3>' + e(A.t('Personal & work details')) + '</h3><p>Fields marked <b class="req">*</b> are mandatory. Telugu text input is supported.</p></div>' + (r.mode === 'quick' ? '' : personaFillStage()) + '</div>' +
      (Object.keys(err).length ? '<div class="notice notice-warn" role="alert"><strong>' + e(A.t('Mandatory fields are missing')) + '</strong> — ' + (err.dob ? e(A.t('Date of birth is required')) + ' · ' : '') + 'cannot save yet.</div>' : '') +
      '<form id="reg-details-form" class="form-grid">' + fld('Full name', 'name', f.name, 'text', 'required') +
      '<label class="field"><span>' + e(A.t('Full name (Telugu)')) + '</span><input name="name_te" lang="te" type="text" value="' + e(f.name_te || '') + '" placeholder="కోన వెంకట రమణ"></label>' +
      '<label class="field ' + (err.gender ? 'invalid' : '') + '"><span>' + e(A.t('Gender')) + ' <b class="req">*</b></span><select name="gender">' + ['Male', 'Female', 'Other'].map(g => '<option value="' + g + '" ' + (f.gender === g ? 'selected' : '') + '>' + e(A.t(g)) + '</option>').join('') + '</select></label>' +
      fld('Date of birth', 'dob', f.dob, 'date', 'max="' + A.D + '"') + fld('Mobile number', 'mobile', f.mobile, 'tel', 'pattern="[0-9]{10}" maxlength="10"') +
      '<label class="field ' + (err.aadhaar ? 'invalid' : '') + '"><span>Aadhaar (masked only)</span><input name="aadhaar" value="' + e(f.aadhaar || '') + '" placeholder="XXXX-XXXX-4821" maxlength="14">' + fe('aadhaar') + '</label>' +
      '<label class="field"><span>UID token (mock)</span><input name="uid" value="' + e(f.uid || '') + '" placeholder="SYN-UIDTOK-41100011"></label>' +
      '<label class="field ' + (err.trade ? 'invalid' : '') + '"><span>' + e(A.t('Primary trade')) + ' <b class="req">*</b></span><select name="trade">' + A.tradeList().map(t => '<option ' + (f.trade === t ? 'selected' : '') + '>' + e(t) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>' + e(A.t('Years of experience')) + '</span><input name="years" type="number" min="0" max="60" value="' + e(f.years || '0') + '"></label>' +
      '<label class="field"><span>Bank account held</span><select name="bank">' + ['Yes', 'No'].map(v => '<option ' + (f.bank === v ? 'selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Smartphone</span><select name="smartphone">' + ['Yes', 'No'].map(v => '<option ' + (f.smartphone === v ? 'selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
      '<div class="form-error full"></div><div class="full row">' + A.button('Back', 'reg-back') + '<button class="btn btn-primary" type="submit">Save &amp; continue</button></div></form>';
  }
  function personaFillStage() {
    return '<div class="row wrap"><small class="muted">Demo helper:</small>' + ['P-01', 'P-02', 'P-03'].map(id => A.button(id, 'reg-fill', 'data-id="' + id + '"', 'btn btn-sm')).join('') + '<label class="check"><input type="checkbox" id="fill-skip-dob" checked> leave DOB blank</label></div>';
  }
  A.actions['reg-fill'] = node => {
    const p = A.st.personas.find(x => x.persona_id === node.dataset.id), form = document.querySelector('#reg-details-form');
    const set = (n, v) => {if (form.elements[n]) form.elements[n].value = v;};
    set('name', p.full_name_en.replace(/ \(.*\)/, ''));set('name_te', p.full_name_te);set('gender', p.gender);set('mobile', p.mobile.split(' ')[0]);set('aadhaar', p.aadhaar_masked);set('uid', p.uid_token_mock);
    set('trade', p.trade);set('years', p.years_experience);set('bank', p.bank_account_held);set('smartphone', p.smartphone);
    set('dob', document.querySelector('#fill-skip-dob').checked ? '' : p.date_of_birth);
    A.reg.persona = p.persona_id;
    if (!document.querySelector('#fill-skip-dob').checked) return;
    A.toast('Fields filled — date of birth left blank. Press Save to see the mandatory-field validation, then enter ' + p.date_of_birth + '.');
  };
  A.forms['reg-details-form'] = (form, data) => {
    const r = A.reg, errs = {};
    const f = r.f = {...r.f, name: data.name.trim(), name_te: (data.name_te || '').trim(), gender: data.gender, dob: data.dob, mobile: data.mobile.trim(), aadhaar: (data.aadhaar || '').trim(), uid: (data.uid || '').trim(), trade: data.trade, years: data.years, bank: data.bank, smartphone: data.smartphone};
    if (!f.name) errs.name = A.t('This field is required');
    if (!f.dob) errs.dob = A.t('Date of birth is required');
    else if (A.ageOn(f.dob) < 18) errs.dob = 'Worker must be at least 18 years old';
    if (!/^\d{10}$/.test(f.mobile)) errs.mobile = 'Enter a 10-digit mobile number';
    if (f.aadhaar && !/^XXXX-XXXX-\d{4}$/.test(f.aadhaar)) errs.aadhaar = 'Only a masked reference (XXXX-XXXX-nnnn) is accepted';
    if (!f.trade) errs.trade = A.t('This field is required');
    r.errors = errs;
    if (Object.keys(errs).length) {A.refresh();throw new Error('Mandatory fields are missing — ' + Object.values(errs)[0]);}
    // a Telugu spelling must resolve to the same identity key as the English one
    r.stage += 1;A.refresh();
  };

  // ---------- stage 2: consent ----------
  function stageConsent() {
    const c = A.reg.consent || {};
    return '<div class="card-head"><div><h3>' + e(A.t('Consent')) + '</h3><p>Read the notice aloud in the worker’s language. Registration cannot proceed without consent.</p></div></div>' +
      '<form id="reg-consent-form" class="stack"><div class="notice notice-info"><strong>Notice version CONSENT-DEMO-v1</strong> — ILAC will use your details for registration, household baseline, service referrals and notifications, as selected below. You may withdraw consent at the centre.</div>' +
      '<fieldset class="fieldset"><legend>Purposes agreed</legend>' + PURPOSES.map((p, i) => '<label class="check"><input type="checkbox" name="purpose' + i + '" ' + ((c.purposes || []).includes(p) ? 'checked' : '') + '> ' + e(p) + '</label>').join('') + '</fieldset>' +
      '<div class="form-grid">' + A.select('Notice version', 'notice', ['CONSENT-DEMO-v1'], 'CONSENT-DEMO-v1', 'disabled') + A.select('Channel', 'channel', ['Assisted desk — read aloud (Telugu)', 'Assisted desk — read aloud (English)', 'Self-service (worker app)'], c.channel || 'Assisted desk — read aloud (Telugu)') + '</div>' +
      '<label class="check"><input type="checkbox" name="agree" ' + (c.agreed ? 'checked' : '') + ' required> The notice was read aloud and the worker agrees (affirmative action).</label>' +
      '<div class="form-error"></div><div class="row">' + A.button('Back', 'reg-back') + '<button class="btn btn-primary" type="submit">Record consent &amp; continue</button></div></form>';
  }
  A.forms['reg-consent-form'] = (form, data) => {
    const purposes = PURPOSES.filter((p, i) => data['purpose' + i]);
    if (!data.agree) throw new Error('Registration cannot proceed without consent.');
    if (!purposes.length) throw new Error('Select at least one purpose.');
    A.reg.consent = {purposes, notice: 'CONSENT-DEMO-v1', channel: data.channel, at: A.now(), by: A.user.login_id, agreed: true};
    A.audit('Consent captured', 'CONSENT-DEMO-v1', purposes.length + ' purpose(s) via ' + data.channel);
    A.mark('1.5');
    A.reg.stage += 1;A.refresh();
  };

  // ---------- stage 3: household baseline + members ----------
  function stageHousehold() {
    const r = A.reg, form = A.baselineForm(), h = r.hh;
    const fields = form.fields.map(f => '<label class="field ' + (r.errors['hh_' + f.key] ? 'invalid' : '') + '"><span>' + e(A.t(f.label)) + (f.required ? ' <b class="req">*</b>' : '') + '</span><select name="hh_' + e(f.key) + '" ' + (f.required ? 'required' : '') + '>' + (f.required && !h[f.key] ? '<option value="">Select…</option>' : '') + f.options.map(o => '<option ' + (h[f.key] === o ? 'selected' : '') + '>' + e(o) + '</option>').join('') + '</select></label>').join('');
    const rows = r.members.map((m, i) => '<tr><td>' + e(m[0]) + '</td><td>' + e(m[1]) + '</td><td>' + e(m[2]) + '</td><td>' + e(A.fmtDate(m[3])) + '</td><td>' + e(m[4]) + '</td><td>' + e(m[5]) + '</td><td>' + A.button('Remove', 'member-remove', 'data-id="' + i + '"', 'btn btn-sm') + '</td></tr>').join('');
    return '<div class="card-head"><div><h3>' + e(A.t('Household baseline')) + '</h3><p>Form version v' + form.version + ' (' + form.fields.length + ' fields)' + (form.version > 1 ? ' — updated by configuration, no code change' : '') + '</p></div>' + (r.persona && PREFILL[r.persona] ? A.button('Fill ' + r.persona + ' household', 'hh-fill', '', 'btn btn-sm') : '') + '</div>' +
      '<form id="reg-household-form" class="stack"><div class="form-grid">' + fields + '</div>' +
      '<h4>' + e(A.t('Household members')) + ' <span class="muted small">(' + r.members.length + ' added; head is the registering worker)</span></h4><div class="table-wrap"><table><thead><tr><th>Name</th><th>' + e(A.t('Relationship')) + '</th><th>Gender</th><th>DOB</th><th>' + e(A.t('Education stage')) + '</th><th>Occupation</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' + (!r.members.length ? '<p class="small muted pad">No members added — a single-member household is allowed.</p>' : '') + '</div>' +
      '<div class="card inset"><h5>Add a member</h5><div class="form-grid member-grid">' + A.field('Name', 'm_name', '', 'text') + A.select('Relationship', 'm_rel', RELATIONS) + A.select('Gender', 'm_gender', ['Female', 'Male']) + A.field('Date of birth', 'm_dob', '', 'date', 'max="' + A.D + '"') + A.select('Education stage', 'm_edu', EDU, 'Primary (Class 1-5)') + A.select('Occupation', 'm_occ', ['Student', 'Home-maker', 'Self-employed (petty trade)', 'Registered construction worker', 'Child', 'Working', 'Other']) + '</div><div class="row space-top">' + A.button('Add member', 'member-add', '', 'btn btn-light') + '</div></div>' +
      '<div class="form-error"></div><div class="row">' + A.button('Back', 'reg-back') + '<button class="btn btn-primary" type="submit">Save baseline &amp; continue</button></div></form>';
  }
  A.actions['hh-fill'] = () => {
    const p = PREFILL[A.reg.persona];
    captureHouseholdForm();
    Object.assign(A.reg.hh, p.baseline);A.reg.members = p.members.map(m => [...m]);
    // Replace saved baseline values so draft restoration cannot undo the fill.
    // Keep custom fields and any member being entered in the same form.
    A.formDrafts = A.formDrafts || {};
    const draft = A.formDrafts['reg-household-form'] = A.formDrafts['reg-household-form'] || {};
    for (const [key, value] of Object.entries(p.baseline)) {
      draft['hh_' + key] = value;
      delete A.reg.errors['hh_' + key];
    }
    A.refresh();
  };
  const captureHouseholdForm = () => {
    const form = document.querySelector('#reg-household-form');
    if (!form) return;
    for (const el of form.querySelectorAll('select[name^="hh_"]')) A.reg.hh[el.name.slice(3)] = el.value;
  };
  A.actions['member-add'] = () => {
    captureHouseholdForm();
    const q = n => document.querySelector('#reg-household-form [name="' + n + '"]').value.trim();
    if (!q('m_name') || !q('m_dob')) throw new Error('Member name and date of birth are required.');
    A.reg.members.push([q('m_name'), q('m_rel'), q('m_gender'), q('m_dob'), q('m_edu'), q('m_occ')]);A.refresh();
  };
  A.actions['member-remove'] = node => {captureHouseholdForm();A.reg.members.splice(Number(node.dataset.id), 1);A.refresh();};
  A.forms['reg-household-form'] = (form, data) => {
    captureHouseholdForm();
    const missing = A.baselineForm().fields.filter(f => f.required && !A.reg.hh[f.key]);
    A.reg.errors = Object.fromEntries(missing.map(f => ['hh_' + f.key, 'required']));
    if (missing.length) {A.refresh();throw new Error('Complete the mandatory baseline field: ' + missing.map(f => f.label).join(', '));}
    A.reg.errors = {};
    A.mark('1.6');
    A.reg.stage += 1;A.refresh();
  };

  // ---------- stage 4: documents (controlled access) ----------
  function stageDocuments() {
    const r = A.reg;
    return '<div class="card-head"><div><h3>' + e(A.t('Documents')) + '</h3><p>Uploads are classified and stored under controlled access; a hash is taken at capture.</p></div>' + (r.persona && PREFILL[r.persona] ? A.button('Attach ' + r.persona + ' specimens', 'doc-fill', '', 'btn btn-sm') : '') + '</div>' +
      '<form id="reg-doc-form" class="stack"><div class="form-grid">' + '<label class="field"><span>Upload a file</span><input type="file" name="file" accept="image/*,application/pdf"></label>' + A.select('…or pick a specimen', 'specimen', [{value: '', label: '— none —'}, ...SPECIMENS.map(s => ({value: s, label: s}))], '') + A.select('Classify as', 'doc_type', A.documentTypes, 'Photograph') + '</div><div class="form-error"></div><div class="row">' + '<button class="btn btn-light" type="submit">Add document</button></div></form>' +
      '<div class="doc-list">' + (r.docs.length ? r.docs.map((d, i) => '<div class="doc-card"><img class="doc-thumb" src="' + e(d.src) + '" alt="' + e(d.type) + '"><div><strong>' + e(d.type) + '</strong><br><small class="muted">' + e(d.name) + '</small><br>' + A.badge('Restricted — ILAC staff of the home centre', 'gold') + '<br>' + A.button('Remove', 'doc-remove', 'data-id="' + i + '"', 'btn btn-sm') + '</div></div>').join('') : '<p class="small muted">No documents added yet.</p>') + '</div>' +
      '<div class="row space-top">' + A.button('Back', 'reg-back') + A.button('Continue to review', 'reg-next', '', 'btn btn-primary') + '</div>';
  }
  A.actions['doc-fill'] = () => {
    for (const [file, type] of PREFILL[A.reg.persona].docs) if (!A.reg.docs.some(d => d.name === file)) A.reg.docs.push({name: file, type, src: 'assets/specimens/' + file, file: null});
    checkDocMarks();A.refresh();
  };
  const checkDocMarks = () => {const t = A.reg.docs.map(d => d.type);if (t.includes('Photograph') && t.includes('Work certificate (90 days)')) A.mark('1.7');};
  A.actions['doc-remove'] = node => {A.reg.docs.splice(Number(node.dataset.id), 1);A.refresh();};
  A.forms['reg-doc-form'] = (form, data) => {
    const file = form.elements.file.files[0];
    if (!file && !data.specimen) throw new Error('Choose a file to upload or pick a specimen.');
    A.reg.docs.push(file ? {name: file.name, type: data.doc_type, src: URL.createObjectURL(file), file} : {name: data.specimen, type: data.doc_type, src: 'assets/specimens/' + data.specimen, file: null});
    checkDocMarks();A.refresh();
  };

  // ---------- stage 5: review & submit ----------
  function stageReview() {
    const r = A.reg, f = r.f, ev = r.check?.eshram;
    const status = ev && ev.status === 200 ? 'Verified with e-Shram' : 'Verification pending – external system unavailable';
    return '<div class="card-head"><div><h3>' + e(A.t('Review & submit')) + '</h3><p>Read back the details to the worker, then submit.</p></div></div>' +
      A.kv({'Name': f.name, 'Name (Telugu)': f.name_te, 'Gender': f.gender, 'Date of birth': A.fmtDate(f.dob), 'Mobile': f.mobile, 'Aadhaar': f.aadhaar || '(token only)', 'UID token': f.uid, 'Trade': f.trade + ' · ' + f.years + ' yrs', 'Centre': A.centreName(centreId()), 'e-Shram': {html: A.badge(status, ev && ev.status === 200 ? 'green' : 'gold')}, 'Consent': r.consent ? r.consent.notice + ' · ' + A.clockTime(r.consent.at) : 'missing', 'Household': r.mode === 'quick' ? 'Minimum record' : Object.keys(r.hh).length + ' baseline fields · ' + r.members.length + ' member(s)', 'Documents': r.docs.length + ' file(s) under controlled access'}) +
      (ev && ev.timeout ? '<div class="notice notice-warn space-top">e-Shram did not respond. The worker is <strong>not turned away</strong>: the record will be created with “verification pending – external system unavailable”, a retry will be queued and a documented next step will be printed.</div>' : '') +
      '<div class="form-error space-top"></div><div class="row space-top">' + A.button('Back', 'reg-back') + A.button('Submit registration', 'reg-submit', '', 'btn btn-primary') + '</div>';
  }

  A.actions['reg-submit'] = async () => {
    const r = A.reg, f = r.f;
    if (!r.consent) throw new Error('Consent is missing.');
    if (r.mode === 'full') {
      const missing = A.baselineForm().fields.filter(x => x.required && !r.hh[x.key]);
      if (missing.length) throw new Error('Household baseline incomplete: ' + missing.map(m => m.label).join(', '));
    }
    const dups = A.findDuplicates({name: f.name, dob: f.dob, mobile: f.mobile, uid_token_mock: f.uid});
    if (dups.length && r.dupChoice !== 'new') throw new Error('Possible duplicate of ' + dups[0].worker.worker_id + ' — resolve at the registry check step.');
    const wid = A.newWorkerId(), hid = A.newHouseholdId(), eshram = r.check?.eshram, ok = eshram && eshram.status === 200;
    const centre = centreId(), district = A.st.cById.get(centre).district_code;
    const w = A.buildWorker({worker_id: wid, full_name: f.name, full_name_te: f.name_te, gender: f.gender, date_of_birth: f.dob, mobile: f.mobile, aadhaar_masked: f.aadhaar, uid_token_mock: f.uid, centre_id: centre, district_code: district, household_id: hid, primary_trade: f.trade, years_experience: f.years, bank_account_held: f.bank, smartphone: f.smartphone, consent_version: r.consent.notice, origin: 'Assisted registration ' + centre, verification: ok ? 'Verified (e-Shram)' : 'Pending - external system unavailable', eshram_uan_token_mock: ok ? eshram.body.uan_token : ''});
    w.age_band = A.ageOn(f.dob) < 36 ? '18-35' : A.ageOn(f.dob) < 51 ? '36-50' : '51+';
    A.st.workers.push(w);
    const base = A.copy(r.hh), language = base.worker_language;
    A.st.households.push({household_id: hid, district_code: district, district_name: A.districtName(district), mandal: 'Synthetic Mandal 00', habitation: 'Synthetic Habitation 000', area_type: base.area_type || '', house_type: base.house_type || '', rice_card_held: base.rice_card_held || '', drinking_water_source: base.drinking_water_source || '', lpg_connection: base.lpg_connection || '', seasonal_migration: base.seasonal_migration || '', primary_language: base.primary_language || '', baseline_survey_date: A.D, household_head_name: f.name, member_count: String(r.members.length + 1), worker_language: language || '', baseline_form_version: A.baselineForm().version, extra: Object.fromEntries(Object.entries(base).filter(([k]) => !A.baselineBase.some(b => b.key === k)))});
    A.st.members.push({member_id: A.newMemberId(), household_id: hid, full_name: f.name, relationship_to_head: 'Self (head)', gender: f.gender, date_of_birth: f.dob, age_on_2026_10_01: String(A.ageOn(f.dob, '2026-10-01')), education_stage: 'No formal schooling', occupation: 'Registered construction worker', linked_worker_id: wid, disability_reported: 'Not recorded in synthetic set'});
    for (const m of r.members) A.st.members.push({member_id: A.newMemberId(), household_id: hid, full_name: m[0], relationship_to_head: m[1], gender: m[2], date_of_birth: m[3], age_on_2026_10_01: String(A.ageOn(m[3], '2026-10-01')), education_stage: m[4], occupation: m[5], linked_worker_id: '', disability_reported: 'Not recorded in synthetic set', added_on: A.D});
    A.indexes();
    A.st.consents.push({consent_id: 'CON-' + wid.slice(-6), worker_id: wid, ...r.consent, purposes: r.consent.purposes});
    for (const d of r.docs) await A.addDocument({entityId: wid, householdId: hid, type: d.type, name: d.name, file: d.file, src: d.src});
    const ack = 'ACK-' + A.randDigits(8, wid + A.now());
    const next = ok ? null : {what: 'Complete e-Shram verification of the worker’s UAN', why: 'The e-Shram service did not respond within ' + A.mockTimeoutMs / 1000 + ' seconds', who: 'System auto-retry; ' + A.centreName(centre) + ' operator follows up', by: A.addDays(A.D, 3), how: 'SMS to ' + f.mobile + ' once verified; worker may also visit the centre with the acknowledgement'};
    if (!ok) A.st.retries.push({id: 'RET-' + (A.st.retries.length + 1), kind: 'e-Shram verification', case_id: wid, interface: 'e-Shram', attempts: 1, next_attempt: 'in 5 minutes (backoff 5 s, 15 s, 45 s, 2 min, 5 min)', last_error: 'Timeout after ' + A.mockTimeoutMs / 1000 + ' s', status: 'Queued', uid: f.uid, name: f.name});
    A.audit('Worker registered', wid, f.name + ' · household ' + hid + ' · ' + (ok ? 'verified' : 'verification pending') + ' · ack ' + ack);
    A.sendMessage(f.mobile, ok ? 'registration_ack' : 'registration_pending', {worker_id: wid, ack, centre: A.centreName(centre), next: next ? next.what + ' by ' + A.fmtDate(next.by) : ''}, 'te', 'SMS + WhatsApp');
    A.st.gateway[0].channel = 'SMS + WhatsApp';
    const tok = A.st.tokens.find(t => t.token === r.token);if (tok) tok.status = 'Served';
    if (r.mode === 'quick') {
      const ncs = await A.mock.call('NCS', 'POST', '/mock/ncs/v1/jobseekers', {name: f.name, mobile: f.mobile}, {caseId: wid});
      w.ncs_reference = ncs.body.reference;
    }
    r.result = {worker: w, ack, next, ok, hid, ncs: w.ncs_reference};
    A.mark('1.8');if (r.persona === 'P-03' || (eshram && eshram.timeout)) A.mark('1.10');if (r.mode === 'full') A.mark('1.4');
    A.refresh();
  };

  function ackView(res) {
    const w = res.worker;
    return '<div class="card ack-card"><div class="ack-head"><span class="ack-tick">✓</span><div><h2>Registration acknowledged</h2><p>' + e(A.t('Acknowledgement')) + ' <strong class="mono">' + e(res.ack) + '</strong> · ' + e(A.fmtDate(A.D)) + '</p></div></div>' +
      A.kv({'Worker ID': w.worker_id, 'Household ID': res.hid, 'BOCW registration no.': w.bocw_registration_no, 'Name': A.personName(w), 'Centre': A.centreName(w.home_centre_id), 'Verification': {html: A.badge(w.verification, res.ok ? 'green' : 'gold')}, 'Consent': w.consent_version, 'NCS reference': res.ncs || ''}) +
      (res.next ? '<div class="notice notice-warn space-top"><strong>Documented next step</strong> (the worker is not turned away)' + A.kv({'What is needed': res.next.what, 'Why not done now': res.next.why, 'Who will do it': res.next.who, 'By when': A.fmtDate(res.next.by), 'How the worker is told': res.next.how}, 1) + '</div>' : '') +
      '<p class="small muted space-top">A Telugu SMS / WhatsApp acknowledgement has been written to the mock gateway log (Demo tools → Gateway). Nothing was sent to the number.</p>' +
      '<div class="row wrap space-top no-print">' + A.button('Print acknowledgement', 'print', '', 'btn') + A.button('Show gateway log', 'show-gateway', '', 'btn btn-light') + (A.reg.mode === 'quick' ? A.button('Register for ' + A.st.event.event_id + ' & check in', 'jm-walkin-register', 'data-id="' + e(w.worker_id) + '"', 'btn btn-primary') : '') + A.link('Open worker record', 'v/workers/' + w.worker_id, A.reg.mode === 'quick' ? 'btn' : 'btn btn-primary') + A.button('Register another worker', 'reg-restart', '', 'btn') + '</div></div>';
  }
  A.actions.print = () => window.print();
  A.actions['show-gateway'] = () => {A.toolsOpen = true;A.toolsTab = 'gateway';A.refresh();};
}());
