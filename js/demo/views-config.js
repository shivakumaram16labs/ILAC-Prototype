/* SM-19 configuration console: the five scripted configuration tasks (C1–C5) done through the UI, versioned, without code. */
(function () {
  const A = window.ILAC, e = A.esc;
  A.cfgTab = 'forms';
  const isAuthority = () => A.user.login_id === 'demo.admin.state';

  A.views.config = {title: 'Configuration console', module: 'SM-19', icon: 'settings', blurb: 'Versioned forms, service clocks, master data and reports.', render() {
    const tab = A.cfgTab, ro = !isAuthority();
    const tabs = [['forms', 'Baseline form (C1)'], ['visit', 'Site-visit form (C2)'], ['clocks', 'Service clocks (C3)'], ['trades', 'Trades & vacancies (C4)'], ['reports', 'Reports (C5)'], ['history', 'Change log']];
    const body = {forms: formsTab, visit: visitTab, clocks: clocksTab, trades: tradesTab, reports: reportsTab, history: historyTab}[tab]();
    return A.heading('Configuration console', 'Authority role required to publish' + (ro ? ' · you have view-only access (limited SM-19)' : ''), '') + (ro ? A.notice('Read-only: sign in as <strong>demo.admin.state</strong> (State configuration administrator) to publish changes.', 'warn') : '') + '<div class="card">' + A.tabs(tabs, tab, 'cfg-tab') + body + '</div>';
  }};
  A.actions['cfg-tab'] = node => {A.cfgTab = node.dataset.id;A.refresh();};
  const guard = () => {if (!isAuthority()) throw new Error('Publishing configuration needs an Authority role (demo.admin.state).');};
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

  // ---------- C1: household baseline form ----------
  function formsTab() {
    const f = A.baselineForm();
    return '<div class="card-head"><div><h3>Household baseline form · version v' + f.version + '</h3><p>Used by registration step “Household baseline”. A published version is immutable; changes publish a new version.</p></div></div>' +
      A.table(f.fields, [['label', 'Field'], ['type', 'Type', x => e(x.type || 'Dropdown')], ['options', 'Options', x => e(x.options.join(' / '))], ['required', 'Mandatory', x => A.badge(x.required ? 'Yes' : 'No', x.required ? 'green' : 'blue')]]) +
      (isAuthority() ? '<h4 class="space-top">Add a field</h4><form id="cfg-field-form" class="stack"><div class="row wrap"><small class="muted">Demo helper:</small>' + A.button('Fill C1 values', 'cfg-fill-c1', '', 'btn btn-sm') + '</div><div class="form-grid">' + A.field('Field label', 'label', '', 'text', 'required') + A.select('Type', 'type', ['Dropdown']) + A.field('Options (comma separated)', 'options', '', 'text', 'required') + '</div><label class="check"><input type="checkbox" name="required" checked> Mandatory</label><div class="form-error"></div><button class="btn btn-primary" type="submit">Publish new version</button></form>' : '');
  }
  A.actions['cfg-fill-c1'] = () => {const f = document.querySelector('#cfg-field-form').elements;f.label.value = 'Primary language of worker';f.options.value = 'Telugu, Urdu, Odia, Hindi, Other';};
  A.forms['cfg-field-form'] = (form, data) => {
    guard();
    const opts = data.options.split(',').map(s => s.trim()).filter(Boolean);
    if (opts.length < 2) throw new Error('Provide at least two options.');
    const cur = A.baselineForm();
    if (cur.fields.some(x => x.label.toLowerCase() === data.label.trim().toLowerCase())) throw new Error('A field with this label already exists.');
    const key = slug(data.label) === 'primary_language_of_worker' ? 'worker_language' : slug(data.label);
    const next = [...cur.fields, {key, label: data.label.trim(), options: opts, required: !!data.required, type: 'Dropdown', config: true}];
    const item = A.config.publish('form', 'household_baseline', {fields: next}, 'Added ' + (data.required ? 'mandatory ' : '') + 'dropdown “' + data.label.trim() + '” (' + opts.join(' / ') + ') to household baseline form');
    if (key === 'worker_language') A.mark('C1');
    A.refresh();A.toast('Published household baseline form v' + item.version + ' — live on the next registration screen.');
  };

  // ---------- C2: site-visit checklist ----------
  function visitTab() {
    const f = A.siteChecklist();
    return '<div class="card-head"><div><h3>Site-visit form · version v' + f.version + '</h3><p>Pulled by field devices at the next synchronisation — no new app build.</p></div></div>' + A.table(f.items, [['label', 'Checklist item'], ['type', 'Answer', x => e(x.type === 'yesno' ? 'Yes / No' : x.type)]]) +
      '<p class="small muted space-top">Device ' + e(A.dev.id) + ' holds form v' + e(A.dev.formVersion ?? 'n/a (visit not downloaded)') + '.</p>' +
      (isAuthority() ? '<h4 class="space-top">Add a checklist item</h4><form id="cfg-item-form" class="stack"><div class="row wrap"><small class="muted">Demo helper:</small>' + A.button('Fill C2 values', 'cfg-fill-c2', '', 'btn btn-sm') + '</div><div class="form-grid">' + A.field('Item label', 'label', '', 'text', 'required') + A.select('Answer type', 'type', [{value: 'yesno', label: 'Yes / No'}]) + '</div><div class="form-error"></div><button class="btn btn-primary" type="submit">Publish new version</button></form>' : '');
  }
  A.actions['cfg-fill-c2'] = () => {document.querySelector('#cfg-item-form').elements.label.value = 'PPE – safety helmets available on site (Yes/No)';};
  A.forms['cfg-item-form'] = (form, data) => {
    guard();
    const cur = A.siteChecklist();
    if (cur.items.some(x => x.label.toLowerCase() === data.label.trim().toLowerCase())) throw new Error('This item already exists.');
    const key = /helmet/i.test(data.label) ? 'ppe_helmets' : slug(data.label);
    const item = A.config.publish('form', 'site_visit', {items: [...cur.items, {key, label: data.label.trim(), type: data.type}]}, 'Added checklist item “' + data.label.trim() + '” to the site-visit form');
    A.mark('C2');A.refresh();A.toast('Site-visit form v' + item.version + ' published. It reaches the device at its next sync.');
  };

  // ---------- C3: service clocks ----------
  function clocksTab() {
    const rows = A.st.services;
    return '<div class="card-head"><div><h3>Service clocks &amp; escalation matrix</h3><p>Effective for new referrals only; existing cases keep the clock they were created with.</p></div></div>' +
      A.table(rows, [['service_code', 'Code'], ['service_name', 'Service'], ['department', 'Department'], ['mode', 'Mode', s => e(s.mode === 'api' ? 'API' : 'Manual')], ['clock', 'Clock (days)'], ['l1', 'L1 after'], ['l2', 'L2 after'], ['version', 'Version', s => A.badge('v' + s.version, s.version > 1 ? 'gold' : 'blue')], ['effective_from', 'Effective', s => e(A.fmtDate(s.effective_from))]], s => isAuthority() ? A.button('Edit', 'cfg-clock-open', 'data-id="' + e(s.service_code) + '"', 'btn btn-sm') : '');
  }
  A.actions['cfg-clock-open'] = node => {
    guard();
    const s = A.st.svcByCode.get(node.dataset.id), open = A.st.referrals.filter(r => r.service_code === s.service_code && A.isOpen(r));
    A.modal('Edit service clock · ' + s.service_code, '<p class="small">' + e(s.service_name) + ' · ' + e(s.department) + ' · currently ' + s.clock + ' days, L1 ' + s.l1 + ', L2 ' + s.l2 + ' (v' + s.version + '). ' + open.length + ' open case(s) will keep their original clock.</p><form id="cfg-clock-form" data-id="' + e(s.service_code) + '" class="stack"><div class="form-grid">' + A.field('Service clock (days)', 'clock', s.clock, 'number', 'required min="1"') + A.field('L1 escalation after (days)', 'l1', s.l1, 'number', 'required min="1"') + A.field('L2 escalation after (days)', 'l2', s.l2, 'number', 'required min="1"') + A.select('Applies to', 'applies', ['New referrals only'], 'New referrals only', 'disabled') + '</div><div class="form-error"></div><button class="btn btn-primary" type="submit">Publish new version</button></form>');
  };
  A.forms['cfg-clock-form'] = (form, data) => {
    guard();
    const s = A.st.svcByCode.get(form.dataset.id), clock = Number(data.clock), l1 = Number(data.l1), l2 = Number(data.l2);
    if (!(l1 < l2 && l2 <= clock)) throw new Error('Escalation levels must satisfy L1 < L2 ≤ clock.');
    const before = {clock: s.clock, l1: s.l1, l2: s.l2};
    const item = A.config.publish('service_clock', s.service_code, {clock, l1, l2, applies: 'new referrals only', previous: before}, s.service_code + ' clock ' + before.clock + '→' + clock + ' days, L1 ' + before.l1 + '→' + l1 + ', L2 ' + before.l2 + '→' + l2 + ' (new referrals only)');
    Object.assign(s, {clock, l1, l2, version: item.version, effective_from: A.D});
    if (s.service_code === 'CS-01') A.mark('C3');
    A.closeModal();A.refresh();A.toast(s.service_code + ' service definition v' + item.version + ' published for new referrals.');
  };

  // ---------- C4: trade categories and vacancies ----------
  function tradesTab() {
    const trades = A.tradeList(), ev = A.st.event;
    return '<div class="grid grid-2"><div><div class="card-head"><div><h3>Trade categories</h3><p>' + trades.length + ' categories · master data version v' + A.config.version('master', 'trades') + '</p></div></div><div class="chips-wrap">' + trades.map(t => '<span class="badge ' + (A.st.trades.some(x => x.trade_name === t) ? 'blue' : 'green') + '">' + e(t) + '</span>').join('') + '</div>' +
      (isAuthority() ? '<form id="cfg-trade-form" class="row wrap space-top">' + A.field('New trade category', 'trade', '', 'text', 'required placeholder="Solar panel installer"') + '<button class="btn btn-primary" type="submit">Publish</button></form><div class="form-error"></div>' : '') + '</div>' +
      '<div><div class="card-head"><div><h3>Publish a vacancy</h3><p>For ' + e(ev.event_id) + '</p></div></div>' + (isAuthority() ? '<form id="cfg-vacancy-form" class="stack"><div class="form-grid">' + A.select('Employer', 'employer', ev.employer_ids.map(id => ({value: id, label: id + ' · ' + A.st.eById.get(id).employer_name})), 'SYN-E-002') + A.select('Trade', 'trade', trades, trades[trades.length - 1]) + A.field('Positions', 'positions', 5, 'number', 'required min="1"') + A.field('Daily wage (₹)', 'wage', 950, 'number', 'required min="1"') + A.field('Min experience (years)', 'exp', 1, 'number', 'min="0"') + A.select('Engagement', 'engagement', ['Daily wage', 'Short-term contract (1-3 months)', 'Long-term contract (6+ months)'], 'Short-term contract (1-3 months)') + '</div><div class="form-error"></div><button class="btn btn-primary" type="submit">Publish vacancy to ' + e(ev.event_id) + '</button></form>' : '<p class="small muted">Authority role required.</p>') + '</div></div>' +
      '<h4 class="space-top">Vacancies on the event (' + A.st.vacancies.filter(v => v.linked_job_mela === ev.event_id).length + ')</h4>' + A.table(A.st.vacancies.filter(v => v.linked_job_mela === ev.event_id), [['vacancy_id', 'Vacancy'], ['employer_id', 'Employer'], ['trade_required', 'Trade'], ['positions', 'Positions'], ['daily_wage_offered_inr', '₹/day'], ['match', 'Matching candidates', v => e(String(A.st.jmCands.filter(c => c.primary_trade === v.trade_required).length) + ' on event · ' + A.st.workers.filter(w => w.primary_trade === v.trade_required).length + ' in registry')]]);
  }
  A.forms['cfg-trade-form'] = (form, data) => {
    guard();
    const name = data.trade.trim(), list = A.tradeList();
    if (list.some(t => t.toLowerCase() === name.toLowerCase())) throw new Error('This trade already exists.');
    const item = A.config.publish('master', 'trades', {trades: [...list, name]}, 'Added trade category “' + name + '”');
    A.refresh();A.toast('Trade master v' + item.version + ' published — available in registration, matching and vacancies.');
  };
  A.forms['cfg-vacancy-form'] = (form, data) => {
    guard();
    const ev = A.st.event, id = A.nextId('SYN-V-', 4, () => A.st.vacancies.map(v => v.vacancy_id));
    const emp = A.st.eById.get(data.employer);
    const v = {vacancy_id: id, employer_id: data.employer, trade_required: data.trade, district_code: emp.district_code, site_id: A.st.sites.find(s => s.employer_id === data.employer)?.site_id || '', positions: String(data.positions), min_experience_years: String(data.exp || 0), daily_wage_offered_inr: String(data.wage), engagement_type: data.engagement, duration_days: '30', gender_preference: 'Any', accommodation_provided: 'No', published_on: A.D, status: 'Open', linked_job_mela: ev.event_id, filled: 0};
    A.st.vacancies.push(v);A.indexes();ev.vacancy_ids.push(id);ev.vacancies_offered += ', ' + id;
    A.config.publish('vacancy', id, v, 'Published vacancy ' + id + ' (' + v.trade_required + ') for ' + data.employer + ' at ' + ev.event_id);
    if (/solar/i.test(data.trade)) A.mark('C4');
    A.refresh();A.toast('Vacancy ' + id + ' published and visible on the event.');
  };

  // ---------- C5: reports ----------
  function reportsTab() {
    const mine = A.st.reports;
    return '<div class="card-head"><div><h3>Saved reports</h3><p>Created with the report builder in MIS &amp; reports; pinned reports appear on the PMU dashboard.</p></div>' + A.link('Open report builder', 'v/mis', 'btn btn-primary') + '</div>' + A.table(mine, [['id', 'Id'], ['name', 'Name'], ['dataset', 'Dataset'], ['groupBy', 'Group by', r => e(r.groupBy.map(g => A.mis.datasets[r.dataset].fields[g].label).join(' × '))], ['owner', 'Owner'], ['pin', 'On PMU dashboard', r => A.badge(A.st.dashboardReports.includes(r.id) ? 'Yes' : 'No', A.st.dashboardReports.includes(r.id) ? 'green' : 'blue')]], null, 'No custom reports saved yet') +
      '<p class="small muted space-top">The builder opens the same MIS engine as the standard reports — no code, no database access.</p>';
  }

  // ---------- change log + rollback ----------
  function historyTab() {
    return '<div class="card-head"><div><h3>Configuration change history</h3><p>Every published version is immutable; rollback publishes the previous content as a new version.</p></div></div>' + A.table(A.st.config.log, [['id', 'Change'], ['type', 'Type'], ['key', 'Item'], ['version', 'Version', c => A.badge('v' + c.version, 'blue')], ['summary', 'What changed'], ['published_by', 'By'], ['published_at', 'At', c => e(A.clockTime(c.published_at))], ['effective_from', 'Effective', c => e(A.fmtDate(c.effective_from))], ['checksum', 'Checksum', c => '<span class="mono small">' + e(c.checksum) + '</span>']], c => isAuthority() && ['form', 'service_clock'].includes(c.type) && c.version > 2 ? A.button('Roll back', 'cfg-rollback', 'data-id="' + e(c.id) + '"', 'btn btn-sm') : '', 'No changes published yet');
  }
  A.actions['cfg-rollback'] = node => {
    guard();
    const c = A.st.config.log.find(x => x.id === node.dataset.id), list = A.st.config.items.filter(i => i.type === c.type && i.key === c.key), prev = list[list.length - 2];
    if (!prev) throw new Error('No earlier version to restore.');
    const item = A.config.publish(c.type, c.key, prev.value, 'Rollback: content of v' + prev.version + ' republished as a new version');
    if (c.type === 'service_clock') Object.assign(A.st.svcByCode.get(c.key), {clock: prev.value.clock, l1: prev.value.l1, l2: prev.value.l2, version: item.version});
    A.refresh();A.toast('Rolled back by publishing v' + item.version + '.');
  };
}());
