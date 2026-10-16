/* Demo tools drawer: script guide, persona cards, and the logs the Committee may ask to see
   (mock gateway, mock API request/response, audit, sync queue, configuration history, mock controls, readiness). */
(function () {
  const A = window.ILAC, e = A.esc;
  A.toolsOpen = false;A.toolsTab = 'guide';A.toolsScenario = 'S1';A.toolsGuideStep = null;
  A.toolsDataset = null;

  const TABS = [['guide', 'Script'], ['personas', 'Personas'], ['gateway', 'Gateway'], ['api', 'API log'], ['audit', 'Audit'], ['sync', 'Sync'], ['config', 'Config'], ['mocks', 'Mocks'], ['ready', 'Readiness']];
  const time = iso => A.clockTime(iso);

  function datasetDetails(name) {
    const rows = A.sheets[name], columns = window.ILAC_SYN.sheets[name].cols;
    // Show original sheet values, including every column and row, without UI name translations.
    return '<p class="small muted dataset-count">' + rows.length.toLocaleString('en-IN') + ' ' + e(A.t('Records')) + ' · ' + columns.length + ' ' + e(A.t('Columns')) + '</p>' +
      '<div class="dataset-scroll" role="region" tabindex="0" aria-label="' + e(name) + '"><table class="dataset-records" data-no-translate><caption class="sr-only">' + e(name) + '</caption><thead><tr><th scope="col">#</th>' + columns.map(c => '<th scope="col">' + e(c) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((row, i) => '<tr><th scope="row">' + (i + 1) + '</th>' + columns.map(c => '<td>' + e(row[c]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  function readinessSheets(counts) {
    return '<table class="readiness-sheets"><thead><tr>' + ['Sheet', 'Pack', 'Loaded', 'Match', 'Content hash'].map(label => '<th scope="col">' + e(A.t(label)) + '</th>').join('') + '</tr></thead><tbody>' + counts.map(row => {
      const expanded = A.toolsDataset === row.name, id = 'dataset-' + row.name;
      return '<tr><td><button type="button" class="dataset-toggle" data-action="dataset-toggle" data-id="' + e(row.name) + '" id="' + id + '-toggle" aria-expanded="' + expanded + '" aria-controls="' + id + '"><span class="dataset-chevron" aria-hidden="true">›</span><span data-no-translate>' + e(row.name) + '</span></button></td><td>' + row.expected + '</td><td>' + row.loaded + '</td><td>' + A.badge(row.expected === row.loaded ? '✓' : '✗', row.expected === row.loaded ? 'green' : 'red') + '</td><td class="mono">' + e(row.hash) + '</td></tr>' +
        '<tr class="dataset-detail" id="' + id + '" data-dataset="' + e(row.name) + '"' + (expanded ? '' : ' hidden') + '><td colspan="5"><div role="region" aria-labelledby="' + id + '-toggle">' + (expanded ? datasetDetails(row.name) : '') + '</div></td></tr>';
    }).join('') + '</tbody></table>';
  }

  function guideStep(id, text) {
    const help = A.stepGuides[id], expanded = A.toolsGuideStep === id;
    const helpId = 'guide-help-' + id.replace('.', '-');
    return '<li class="' + (A.stepDone[id] ? 'done' : '') + '"><button type="button" class="tick" data-action="guide-toggle" data-id="' + id + '" aria-label="Toggle step ' + id + '" aria-pressed="' + !!A.stepDone[id] + '">' + (A.stepDone[id] ? '✓' : '') + '</button><div class="guide-step-content"><div><strong>' + id + '</strong> ' + e(text) + '</div>' +
      A.button(expanded ? 'Hide instructions' : 'How to complete', 'guide-help', 'data-id="' + id + '" aria-expanded="' + expanded + '" aria-controls="' + helpId + '" aria-label="' + (expanded ? 'Hide instructions for' : 'How to complete') + ' step ' + id + '"', 'btn btn-sm guide-help-toggle') +
      '<div class="guide-help" id="' + helpId + '" data-guide-help="' + id + '"' + (expanded ? '' : ' hidden') + '><dl><dt>Account</dt><dd class="mono">' + e(help.login) + '</dd><dt>Where to go</dt><dd>' + e(help.where) + '</dd></dl>' +
      '<ol class="guide-instructions">' + help.steps.map(step => '<li>' + e(step) + '</li>').join('') + '</ol><div class="guide-evidence"><strong>What to check</strong><p>' + e(help.evidence) + '</p></div></div></div></li>';
  }

  const panes = {
    guide() {
      const sc = A.scenarios.find(s => s.id === A.toolsScenario);
      const done = sc.steps.filter(s => A.stepDone[s[0]]).length;
      return '<div class="chips-row">' + A.scenarios.map(s => '<button type="button" class="chip ' + (s.id === sc.id ? 'active' : '') + '" data-action="guide-scn" data-id="' + s.id + '">' + s.id + '</button>').join('') + '</div>' +
        '<h3>' + e(sc.id + ' · ' + sc.title) + '</h3><p class="small muted">' + e(sc.time + ' · ' + sc.setting) + '<br>RFP basis: ' + e(sc.basis) + '</p>' +
        '<div class="row wrap space-top">' + A.button('Quick-switch to ' + sc.login + ' (skips password/OTP)', 'guide-login', 'data-login="' + sc.login + '" data-route="' + sc.start + '"', 'btn btn-sm btn-primary') + '<span class="small muted">' + done + ' of ' + sc.steps.length + ' steps evidenced</span></div>' +
        '<p class="small muted space-top">Work through the steps in order. Select “How to complete” for instructions and example values. To change accounts, use Add session (password: admin@123; OTP: 123456).</p>' +
        '<ol class="guide-steps">' + sc.steps.map(([id, text]) => guideStep(id, text)).join('') + '</ol>' +
        '<p class="small muted">Steps tick automatically when the matching action is performed; tick manually for anything shown by other means.</p>';
    },
    personas() {
      return '<p class="small muted">Exact values to key live (sheet S_Personas). Telugu names are shown for Telugu text input.</p>' + A.st.personas.map(p => '<details class="persona"><summary><strong>' + e(p.persona_id) + '</strong> · ' + e(p.scenario) + ' · ' + e(p.full_name_en) + '</summary>' + A.kv({'Role in script': p.role_in_script, 'Name (Telugu)': p.full_name_te, 'Gender': p.gender, 'Date of birth': p.date_of_birth, 'Mobile': p.mobile, 'Aadhaar (masked)': p.aadhaar_masked, 'UID token (mock)': p.uid_token_mock, 'Trade': p.trade, 'Experience (yrs)': p.years_experience, 'District / centre': p['district / centre'], 'Bank account': p.bank_account_held, 'Smartphone': p.smartphone, 'Household': p.household, 'Baseline': p.household_baseline, 'Documents': p.documents_to_upload, 'Mock API': p.mock_api_expectation, 'Expected outcome': p.expected_outcome}, 1) + '</details>').join('');
    },
    gateway() {
      const rows = A.st.gateway;
      return '<p class="small muted">Mock SMS / WhatsApp / IVR gateway. Nothing is dispatched to any number.</p>' + (rows.length ? rows.map(m => '<div class="log-item"><div class="log-head"><span>' + e(time(m.at)) + ' · ' + e(m.channel) + ' → <span class="mono">' + e(m.to) + '</span></span>' + A.badge(m.lang.toUpperCase(), 'blue') + '</div><p class="msg-text">' + e(m.text) + '</p><small class="muted">' + e(m.template) + ' · ' + e(m.status) + (m.text_en && m.lang === 'te' ? '<br>EN: ' + e(m.text_en) : '') + '</small></div>').join('') : A.empty('No messages yet'));
    },
    api() {
      const rows = A.st.apiLog;
      return '<p class="small muted">Request / response log of every mock Government API call.</p>' + (rows.length ? rows.map(l => '<details class="log-item"><summary><span class="mono">' + e(time(l.at)) + '</span> ' + A.badge(String(l.status || 'timeout'), l.status >= 200 && l.status < 300 ? 'green' : 'red') + ' ' + e(l.method) + ' <span class="mono">' + e(l.path) + '</span>' + (l.caseId ? ' · <strong>' + e(l.caseId) + '</strong>' : '') + ' <small class="muted">' + l.ms + ' ms</small></summary><div class="grid-2-sm"><div><small>Request</small><pre>' + A.prettyJson(l.request) + '</pre></div><div><small>Response</small><pre>' + A.prettyJson(l.response) + '</pre></div></div></details>').join('') : A.empty('No API calls yet'));
    },
    audit() {
      const v = A.verifyAuditChain();
      return '<div class="row between wrap"><span class="small muted">Hash-chained audit ledger (each entry carries the previous entry’s SHA-256).</span>' + A.button('Verify chain', 'audit-verify', '', 'btn btn-sm') + '</div>' +
        (A.auditVerified ? A.notice(A.auditVerified, v.ok ? 'ok' : 'warn') : '') + (A.st.audit.length ? [...A.st.audit].reverse().slice(0, 120).map(a => '<div class="log-item"><div class="log-head"><span class="mono">#' + a.seq + ' ' + e(time(a.at)) + '</span><span>' + e(a.user) + '</span></div><strong>' + e(a.action) + '</strong> · ' + e(a.entity) + '<br><small class="muted">' + e(a.detail) + '</small><br><small class="mono muted">' + e(a.hash.slice(0, 16)) + ' ← ' + e(a.prev) + '</small></div>').join('') : A.empty('No audit entries yet'));
    },
    sync() {
      const d = A.dev;
      const queue = d.outbox.length ? A.table(d.outbox, [['clientId', 'Change'], ['entity', 'Entity'], ['op', 'Op'], ['status', 'Status', r => A.badge(r.status)], ['result', 'Result', r => e(r.result ? r.result.status + (r.result.serverId ? ' → ' + r.result.serverId : '') : '—')]]) : A.empty('Outbox empty');
      const cipher = Object.values(d.cipher).slice(-8);
      return '<div class="row wrap"><strong>Device ' + e(d.id) + '</strong>' + A.badge(d.airplane ? 'Airplane mode' : 'Online', d.airplane ? 'red' : 'green') + A.badge(d.syncing ? 'Syncing…' : d.lastSync ? 'Last sync ' + time(d.lastSync) : 'Never synced', 'blue') + '</div>' +
        '<h4 class="space-top">Outbox</h4>' + queue + '<h4 class="space-top">Sync history</h4>' + (A.st.syncLog.length ? A.table(A.st.syncLog, [['id', 'Sync'], ['at', 'Time', r => e(time(r.at))], ['batch', 'Changes'], ['results', 'Results']]) : A.empty('No sync cycle yet')) +
        '<h4 class="space-top">Encrypted local store</h4>' + (cipher.length ? '<p class="small muted">' + e(d.cryptoMode) + '</p>' + cipher.map(c => '<div class="log-item"><span class="mono">' + e(c.name) + '</span> · ' + c.bytes + ' bytes<br><span class="mono cipher">' + e(c.ct.slice(0, 64)) + '…</span></div>').join('') : A.empty('Nothing stored on the device yet'));
    },
    config() {
      const log = A.st.config.log;
      return '<p class="small muted">Configuration change history (versioned, effective-dated, immutable once published).</p>' + (log.length ? log.map(c => '<div class="log-item"><div class="log-head"><strong>' + e(c.type + ' / ' + c.key) + '</strong>' + A.badge('v' + c.version, 'blue') + '</div>' + e(c.summary) + '<br><small class="muted">' + e(c.published_by) + ' · ' + e(A.clockTime(c.published_at)) + ' · effective ' + e(A.fmtDate(c.effective_from)) + ' · <span class="mono">' + e(c.checksum) + '</span></small></div>').join('') : A.empty('No configuration changes published yet'));
    },
    mocks() {
      const ms = A.st.mockState, health = A.mock.health();
      const acks = A.st.referrals.filter(r => r.mode === 'api' && r.service_code === 'SK-01' && r.external_ack_no && A.isOpen(r) && r.status !== 'Seat confirmed');
      return '<h4>Interface health</h4>' + A.table(A.mock.interfaces, [['id', 'Id'], ['name', 'Interface'], ['status', 'Status', r => A.badge(health[r.id])]]) +
        '<h4 class="space-top">Behaviour controls</h4><label class="check"><input type="checkbox" data-action="mock-toggle" data-id="civil" ' + (ms.civilSuppliesDown ? 'checked' : '') + '> Civil Supplies returns 503 (required throughout S3; untick after the Committee says “restore”)</label>' +
        '<label class="check"><input type="checkbox" data-action="mock-toggle" data-id="eshram" ' + (ms.eshramTimeoutForP03 ? 'checked' : '') + '> e-Shram gives no response for P-03 (token SYN-UIDTOK-41100031)</label>' +
        '<label class="field space-top"><span>Client timeout for e-Shram</span><select data-action="mock-timeout"><option value="10000" ' + (A.mockTimeoutMs === 10000 ? 'selected' : '') + '>10 s (as scripted)</option><option value="3939" ' + (A.mockTimeoutMs === 3939 ? 'selected' : '') + '>3 s (rehearsal)</option></select></label>' +
        '<h4 class="space-top">APSSDC status callback</h4>' + (acks.length ? acks.map(r => '<div class="row between"><span class="mono">' + e(r.external_ack_no) + '<br><small>' + e(r.referral_id) + '</small></span>' + A.button('Send “Seat confirmed”', 'mock-seat', 'data-id="' + e(r.referral_id) + '"', 'btn btn-sm') + '</div>').join('') : '<p class="small muted">No open APSSDC enrolment awaiting a seat.</p>');
    },
    ready() {
      const counts = Object.entries(A.expectedCounts).map(([n, c]) => ({name: n, expected: c, loaded: A.sheets[n].length, hash: A.sheetHashes[n]}));
      const ok = counts.every(c => c.expected === c.loaded);
      const total = counts.reduce((s, c) => s + c.loaded, 0);
      return '<p class="small">Opening checklist: dataset v1.0 loaded unaltered, mocks running, field device ready.</p>' + A.notice('<strong>' + (ok ? 'Dataset v1.0 loaded unaltered' : 'Count mismatch') + '</strong> — ' + total.toLocaleString('en-IN') + ' synthetic records in 22 sheets (pack: 3,684).', ok ? 'ok' : 'warn') +
        '<p class="small muted space-top space-bottom">' + e(A.t('Select a sheet to view all its original dataset records. Scroll inside the table to see every column and row.')) + '</p>' + readinessSheets(counts) +
        '<h4 class="space-top">Demo day</h4><p class="small">Offset-driven dates (referral due dates, grievance ages, batch starts, vacancy and pre-registration dates) are rebased so that today = D.</p><div class="row wrap"><label class="field"><span>Demo day D</span><input type="date" id="demo-day" value="' + e(A.D) + '"></label>' + A.button('Rebase & reload dataset', 'set-demo-day', '', 'btn btn-sm') + '</div>' +
        '<h4 class="space-top">Mocks</h4>' + A.notice('Mock APIs follow ILAC_Demo_Mock_API_v1.0.yaml (copy in docs/reference). All ' + A.mock.interfaces.length + ' interfaces are in-browser and make no network call.', 'ok') +
        '<h4 class="space-top">Field device</h4>' + A.notice(A.dev.cryptoMode ? 'Device storage key ready: ' + e(A.dev.cryptoMode) : 'Device not yet used. Open Field app (demo.ff.krs) to initialise.', A.dev.cryptoMode ? 'ok' : 'info') +
        '<div class="space-top">' + A.button('Reset all demo data', 'reset-all', '', 'btn btn-gold') + '</div>';
    }
  };

  A.toolsPanel = () => {
    const open = A.toolsOpen;
    return '<aside class="tools ' + (open ? 'open' : '') + '" id="tools" aria-label="Demo tools" ' + (open ? '' : 'hidden') + '><div class="tools-head"><strong>Demo tools</strong>' + A.button('✕', 'tools', 'aria-label="Close demo tools"', 'btn btn-sm') + '</div>' +
      A.tabs(TABS, A.toolsTab, 'tools-tab') + '<div class="tools-body">' + (open ? panes[A.toolsTab]() : '') + '</div></aside>';
  };

  A.actions.tools = () => {A.toolsOpen = !A.toolsOpen;A.refresh();};
  A.actions['tools-tab'] = node => {A.toolsTab = node.dataset.id;A.auditVerified = '';A.refresh();};
  A.actions['dataset-toggle'] = node => {
    const name = node.dataset.id;
    if (!Object.hasOwn(A.sheets, name)) return;
    A.toolsDataset = A.toolsDataset === name ? null : name;
    // Update only the accordion: keep unsaved workspace forms and drawer focus intact.
    document.querySelectorAll('[data-dataset]').forEach(row => {
      const expanded = row.dataset.dataset === A.toolsDataset;
      row.hidden = !expanded;
      row.querySelector('[role="region"]').innerHTML = expanded ? datasetDetails(row.dataset.dataset) : '';
    });
    document.querySelectorAll('[data-action="dataset-toggle"]').forEach(button => {
      button.setAttribute('aria-expanded', String(button.dataset.id === A.toolsDataset));
    });
  };
  A.actions['guide-scn'] = node => {A.toolsScenario = node.dataset.id;A.toolsGuideStep = null;A.refresh();};
  A.actions['guide-help'] = node => {
    A.toolsGuideStep = A.toolsGuideStep === node.dataset.id ? null : node.dataset.id;
    // Expand in place so consulting instructions keeps unsaved forms, focus and drawer scroll intact.
    document.querySelectorAll('[data-guide-help]').forEach(panel => {panel.hidden = panel.dataset.guideHelp !== A.toolsGuideStep;});
    document.querySelectorAll('[data-action="guide-help"]').forEach(button => {
      const expanded = button.dataset.id === A.toolsGuideStep;
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', (expanded ? 'Hide instructions for' : 'How to complete') + ' step ' + button.dataset.id);
      button.textContent = expanded ? 'Hide instructions' : 'How to complete';
    });
  };
  A.actions['guide-toggle'] = node => {const id = node.dataset.id;if (A.stepDone[id]) delete A.stepDone[id];else A.mark(id);A.refresh();};
  A.actions['guide-login'] = node => {A.loginAs(node.dataset.login);location.hash = node.dataset.route;A.refresh();};
  A.actions['audit-verify'] = () => {const v = A.verifyAuditChain();A.auditVerified = v.ok ? 'Chain intact — ' + v.length + ' entries verified.' : 'Chain broken at entry #' + v.brokenAt;A.refresh();};
  A.actions['mock-toggle'] = node => {
    const ms = A.st.mockState;
    if (node.dataset.id === 'civil') {ms.civilSuppliesDown = node.checked;A.audit('Mock control', 'Civil Supplies', node.checked ? '503 enabled' : 'restored (201)');}
    else {ms.eshramTimeoutForP03 = node.checked;A.audit('Mock control', 'e-Shram', node.checked ? 'P-03 timeout enabled' : 'P-03 timeout disabled');}
    A.refresh();
  };
  A.actions['mock-timeout'] = () => {};
  document.addEventListener('change', event => {
    const n = event.target;
    if (n.matches && n.matches('select[data-action="mock-timeout"]')) A.mockTimeoutMs = Number(n.value);
  });
  A.actions['mock-seat'] = node => {
    const r = A.st.referrals.find(x => x.referral_id === node.dataset.id);
    A.st.mockState.seatConfirmedTriggered[r.external_ack_no] = true;
    A.st.apiLog.unshift({id: 'API-' + String(A.st.apiLog.length + 1).padStart(4, '0'), at: A.now(), ms: 12, method: 'CALLBACK', path: '/mock/apssdc/v1/enrolments/' + r.external_ack_no + '/status', status: 200, request: {event: 'operator trigger'}, response: {ack: r.external_ack_no, status: 'Seat confirmed'}, caseId: r.referral_id, interface: 'APSSDC', by: 'mock'});
    const prior = r.status;
    r.status = 'Seat confirmed';
    r.history.push({at: A.now(), by: 'APSSDC (callback)', text: 'Status callback received: Seat confirmed'});
    A.audit('Mock callback applied', r.referral_id, prior + ' → Seat confirmed');
    A.mark('3.7');
    A.refresh();A.toast('APSSDC callback delivered: ' + r.referral_id + ' is now “Seat confirmed”.');
  };
  A.actions['set-demo-day'] = () => {
    const v = document.querySelector('#demo-day').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Choose a valid date');
    A.setDemoDay(v);A.resetAll();A.toast('Dataset reloaded with D = ' + A.fmtDate(v));
  };
  A.actions['reset-all'] = () => {A.resetAll();A.toast('Dataset v1.0 reloaded; all demonstration changes cleared.');};
}());
