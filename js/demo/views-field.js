/* S2: Android field-device simulation (offline capture, encrypted store, sync queue), supervisor conflict resolution, skilling grouping. */
(function () {
  const A = window.ILAC, e = A.esc;
  A.deviceTab = 'roster';

  A.views.field = {title: 'Field app (Android)', module: 'SM-11', icon: 'tools', blurb: 'Offline-capable field application: visits, attendance, evidence, sync.', render() {
    const d = A.dev;
    return A.heading('Field app (Android)', 'Simulated device ' + d.id + ' · offline-capable · site visit capture', '') +
      '<div class="device-layout"><div class="phone-wrap">' + phone() + '</div><div class="device-side">' + sidePanel() + '</div></div>';
  }};

  const statusBar = () => {
    const d = A.dev;
    return '<div class="phone-status"><span>' + A.clockTime(A.now()).slice(0, 5) + '</span><button type="button" class="airplane ' + (d.airplane ? 'on' : '') + '" data-action="dev-airplane" aria-pressed="' + d.airplane + '" title="Toggle airplane mode">✈ ' + (d.airplane ? 'Airplane mode ON' : 'Airplane') + '</button><span>' + (d.airplane ? '⌀ no network' : '▂▄▆█ 4G') + ' 🔋86%</span></div>';
  };

  function phone() {
    const d = A.dev;
    let screen;
    if (!d.loggedIn) screen = '<div class="phone-pad center"><p>Unlocking secure storage…</p></div>';
    else if (!d.visit) screen = homeScreen();
    else screen = ({roster: rosterScreen, observation: obsScreen, skilling: skillScreen, register: registerScreen, checklist: checklistScreen, sync: syncScreen})[A.deviceTab]();
    const nav = d.visit ? '<nav class="phone-nav">' + [['roster', 'Roster'], ['observation', 'Safety'], ['skilling', 'Skilling'], ['register', 'Register'], ['checklist', 'Checklist'], ['sync', 'Sync' + (d.outbox.filter(c => c.status === 'pending').length ? ' (' + d.outbox.filter(c => c.status === 'pending').length + ')' : '')]].map(([id, l]) => '<button type="button" class="' + (A.deviceTab === id ? 'active' : '') + '" data-action="dev-tab" data-id="' + id + '">' + e(l) + '</button>').join('') + '</nav>' : '';
    return '<div class="phone" role="group" aria-label="Simulated Android field device">' + statusBar() + '<div class="phone-appbar"><strong>ILAC Field</strong><span>' + e(A.user.login_id) + '</span></div>' + (d.banner ? '<div class="phone-banner">' + e(d.banner) + '</div>' : '') + '<div class="phone-screen">' + screen + '</div>' + nav + '</div>';
  }

  function homeScreen() {
    const v = A.st.visits[0], site = A.st.sById.get(v.site_id);
    return '<div class="phone-pad"><h3>Today’s visits</h3><div class="phone-card"><strong>' + e(v.visit_id) + '</strong><br>' + e(site.site_name) + ' (' + e(v.site_id) + ')<br><small>' + e(site.address) + ' · stage: ' + e(site.work_stage) + '</small><div class="row space-top">' + A.badge('Not downloaded', 'gold') + '</div></div>' +
      '<button type="button" class="phone-btn primary" data-action="dev-download">Download visit &amp; 12-worker roster</button>' + (A.devOnline() ? '' : '<p class="phone-warn">You are offline. A visit can only be downloaded while online.</p>') + '</div>';
  }

  function rosterScreen() {
    const d = A.dev;
    return '<div class="phone-pad"><div class="row between"><h3>Roster · ' + e(d.visit.site_name) + '</h3></div><div class="row wrap"><button type="button" class="phone-btn small" data-action="dev-all-present">Mark all present</button><button type="button" class="phone-btn small" data-action="dev-apply-t09">Apply T09 attendance</button></div>' +
      '<ul class="phone-list">' + d.roster.map(r => {
        const a = d.attendance[r.worker_id];
        return '<li><div><strong>' + e(r.name) + '</strong>' + (r.provisional ? ' <span class="pill gold">provisional</span>' : '') + (r.permanent ? ' <span class="pill blue">permanent ID issued</span>' : '') + (r.skilling_need || d.skilling[r.worker_id] ? ' <span class="pill blue">skilling</span>' : '') + '<br><small>' + e(r.worker_id) + ' · ' + e(r.trade) + ' · ' + e(r.mobile) + '</small></div><div class="seg"><button type="button" class="' + (a === 'Present' ? 'on ok' : '') + '" data-action="dev-att" data-id="' + e(r.worker_id) + '" data-v="Present">P</button><button type="button" class="' + (a === 'Absent' ? 'on bad' : '') + '" data-action="dev-att" data-id="' + e(r.worker_id) + '" data-v="Absent">A</button></div>' +
          '<button type="button" class="link-btn" data-action="dev-edit" data-id="' + e(r.worker_id) + '">Edit mobile</button></li>';
      }).join('') + '</ul></div>';
  }

  function obsScreen() {
    const d = A.dev;
    return '<div class="phone-pad"><h3>Safety-session observation</h3><form id="dev-obs-form" class="phone-form"><label>Observation<textarea name="text" required placeholder="Toolbox talk held; harness use reviewed…"></textarea></label><label>Photograph<select name="photo"><option value="specimen_photo_P-04.png">Capture with camera (specimen photo)</option></select></label><div class="geo">📍 Location fix will be recorded (status ok / low-accuracy / unavailable)</div><div class="form-error"></div><button class="phone-btn primary" type="submit">Save observation</button></form>' +
      (d.observations.length ? '<h4>Saved on device</h4>' + d.observations.map(o => '<div class="phone-card"><img src="assets/specimens/' + e(o.photoName) + '" alt="" class="obs-img"><div><small>' + e(o.text) + '<br>📍 ' + o.loc.lat + ', ' + o.loc.lon + ' · ±' + o.loc.accuracy_m + ' m · ' + e(o.loc.status) + '</small></div></div>').join('') : '') + '</div>';
  }

  function skillScreen() {
    const d = A.dev;
    return '<div class="phone-pad"><h3>Skilling needs</h3><div class="row wrap"><button type="button" class="phone-btn small" data-action="dev-apply-skill">Apply T09 skilling needs</button></div><ul class="phone-list">' + d.roster.filter(r => !r.provisional).map(r => {
      const on = !!d.skilling[r.worker_id];
      return '<li><div><strong>' + e(r.name) + '</strong><br><small>' + e(r.trade) + '</small></div><label class="switch"><input type="checkbox" data-action="dev-skill" data-id="' + e(r.worker_id) + '" ' + (on ? 'checked' : '') + '><span>' + (on ? 'Needs ' + e(d.skilling[r.worker_id]) : 'No') + '</span></label></li>';
    }).join('') + '</ul></div>';
  }

  function registerScreen() {
    return '<div class="phone-pad"><h3>Register worker on site</h3><div class="row"><button type="button" class="phone-btn small" data-action="dev-fill-p04">Fill P-04</button></div><form id="dev-reg-form" class="phone-form"><label>Full name<input name="full_name" required></label><label>Date of birth<input name="dob" type="date" required></label><label>Gender<select name="gender"><option>Male</option><option>Female</option></select></label><label>Mobile<input name="mobile" required pattern="[0-9]{10}" maxlength="10"></label><label>Trade<select name="trade">' + A.tradeList().map(t => '<option>' + e(t) + '</option>').join('') + '</select></label><label>Years of experience<input name="years" type="number" min="0" value="0"></label><label>Aadhaar (masked)<input name="aadhaar" placeholder="XXXX-XXXX-6620"></label><label>UID token (mock)<input name="uid" placeholder="SYN-UIDTOK-41100041"></label><label>Bank account<select name="bank"><option>No</option><option>Yes</option></select></label><label class="chk"><input type="checkbox" name="consent" required> Consent CONSENT-DEMO-v1 read aloud and agreed</label><label>Photograph<select name="photo"><option value="specimen_photo_P-04.png">Capture with camera (specimen photo)</option></select></label><div class="geo">📍 Site location recorded</div><div class="form-error"></div><button class="phone-btn primary" type="submit">Save on device (encrypted)</button></form></div>';
  }

  function checklistScreen() {
    const d = A.dev;
    return '<div class="phone-pad"><h3>Site-visit checklist <small>(form v' + d.formVersion + ')</small></h3>' + (d.pulled.some(p => p.startsWith('Site-visit form')) ? '<div class="phone-banner ok">New form version received at last sync — no app update needed.</div>' : '') + d.checklist.map(it => '<div class="phone-card row between"><span>' + e(it.label) + '</span><div class="seg"><button type="button" class="' + (d.checks[it.key] === 'Yes' ? 'on ok' : '') + '" data-action="dev-check" data-id="' + e(it.key) + '" data-v="Yes">Yes</button><button type="button" class="' + (d.checks[it.key] === 'No' ? 'on bad' : '') + '" data-action="dev-check" data-id="' + e(it.key) + '" data-v="No">No</button></div></div>').join('') + '</div>';
  }

  function syncScreen() {
    const d = A.dev, pending = d.outbox.filter(c => c.status === 'pending').length;
    return '<div class="phone-pad"><h3>Synchronisation</h3><div class="phone-card"><strong>' + (d.airplane ? 'Offline' : 'Online') + '</strong> · ' + pending + ' change(s) queued<br><small>Last sync: ' + (d.lastSync ? A.clockTime(d.lastSync) : 'never') + '</small></div><button type="button" class="phone-btn primary" data-action="dev-sync" ' + (d.airplane || d.syncing ? 'disabled' : '') + '>' + (d.syncing ? 'Syncing…' : 'Sync now') + '</button>' +
      (d.airplane ? '<p class="phone-warn">No connection — changes stay safely queued and sync automatically when the network returns.</p>' : '') +
      '<ul class="phone-list compact">' + d.outbox.map(c => '<li><div><strong>' + e(c.entity) + '</strong> <small>' + e(c.op) + '</small><br><small class="mono">' + e(c.clientId) + ' · ' + e(c.hash) + '</small></div>' + A.badge(c.status === 'pending' ? 'queued' : c.status, c.status === 'synced' ? 'green' : c.status === 'pending' ? 'gold' : 'red') + (c.result ? '<br><small>' + e(c.result.status) + (c.result.serverId ? ' → ' + e(c.result.serverId) : '') + (c.result.duplicateCheck ? '<br>Server duplicate check: ' + e(c.result.duplicateCheck) : '') + (c.result.eshram ? '<br>e-Shram: ' + e(c.result.eshram) : '') + '</small>' : '') + '</li>').join('') + '</ul>' +
      (d.pulled.length ? '<h4>Pulled at last sync</h4><ul class="plain">' + d.pulled.map(p => '<li>' + e(p) + '</li>').join('') + '</ul>' : '') + '</div>';
  }

  function sidePanel() {
    const d = A.dev, cipher = Object.values(d.cipher).slice(-6).reverse();
    return '<div class="card"><h3>Committee verification</h3><div class="row wrap">' + A.badge(d.airplane ? 'Airplane mode ON — device offline' : 'Device online', d.airplane ? 'red' : 'green') + A.button('Test connection', 'dev-ping', '', 'btn btn-sm') + '</div><p class="small muted space-top">' + e(d.pingResult || 'Use “Test connection” to prove the device cannot reach the platform in airplane mode.') + '</p></div>' +
      '<div class="card space-top"><h3>Device storage (encrypted at rest)</h3><p class="small muted">' + e(d.cryptoMode || 'Initialises on first write') + '. Production uses an encrypted SQLite store with a keystore-wrapped key (proposal 10.4).</p>' +
      (cipher.length ? cipher.map(c => '<div class="log-item"><span class="mono">' + e(c.name) + '</span> <small class="muted">' + c.bytes + ' B · IV ' + e(c.iv) + '</small><br><span class="mono cipher">' + e(c.ct.slice(0, 72)) + '…</span><br><button type="button" class="link-btn" data-action="dev-reveal" data-id="' + e(c.name) + '">Decrypt with session key</button></div>').join('') : '<p class="small muted">Nothing written yet.</p>') + (d.reveal ? '<pre>' + e(d.reveal) + '</pre>' : '') + '</div>' +
      '<div class="card space-top"><h3>Sync queue</h3>' + (d.outbox.length ? A.table(d.outbox.slice(-12), [['clientId', 'Change'], ['entity', 'Entity'], ['status', 'Status', c => A.badge(c.status === 'pending' ? 'queued' : c.status)], ['capturedAt', 'Captured', c => e(A.clockTime(c.capturedAt))], ['res', 'Result', c => e(c.result ? c.result.status : '—')]]) : '<p class="small muted">Queue empty.</p>') + '</div>';
  }

  // ---------- device actions ----------
  const need = () => {if (!A.dev.visit) throw new Error('Download the visit first.');};
  A.actions['dev-airplane'] = () => {A.devSetAirplane(!A.dev.airplane);A.dev.pingResult = '';if (A.dev.airplane) A.mark('2.2');A.refresh();};
  A.actions['dev-ping'] = () => {A.dev.pingResult = A.devOnline() ? 'Reached platform (200 OK) at ' + A.clockTime(A.now()) : 'ERR_INTERNET_DISCONNECTED — platform unreachable at ' + A.clockTime(A.now());A.refresh();};
  A.actions['dev-tab'] = node => {A.deviceTab = node.dataset.id;A.refresh();};
  A.actions['dev-download'] = async () => {await A.devDownload('SYN-VIS-001');A.mark('2.1');A.deviceTab = 'roster';A.refresh();};
  A.actions['dev-att'] = node => {need();A.devAttendance(node.dataset.id, node.dataset.v);checkAttendanceMarks();A.refresh();};
  A.actions['dev-all-present'] = () => {need();for (const r of A.dev.roster) if (!r.provisional && !A.dev.attendance[r.worker_id]) A.devAttendance(r.worker_id, 'Present');checkAttendanceMarks();A.refresh();};
  A.actions['dev-apply-t09'] = () => {need();for (const r of A.st.visitRoster.filter(x => x.visit_id === 'SYN-VIS-001')) if (r.attendance_to_record) A.devAttendance(r.worker_id, r.attendance_to_record);checkAttendanceMarks();A.refresh();};
  const checkAttendanceMarks = () => {
    const d = A.dev, rows = d.roster.filter(r => !r.provisional);
    if (rows.length && rows.every(r => d.attendance[r.worker_id]) && d.attendance['SYN-W-000182'] === 'Absent' && d.attendance['SYN-W-000225'] === 'Absent') A.mark('2.3');
  };
  A.actions['dev-skill'] = node => {
    need();const on = node.checked, row = A.dev.roster.find(r => r.worker_id === node.dataset.id);
    A.devSkilling(row.worker_id, row.trade, on);
    const t09 = A.st.visitRoster.filter(x => x.skilling_need_to_record).map(x => x.worker_id);
    if (t09.every(id => A.dev.skilling[id]) && Object.keys(A.dev.skilling).length === t09.length) A.mark('2.5');
    A.refresh();
  };
  A.actions['dev-apply-skill'] = () => {
    need();
    for (const r of A.st.visitRoster.filter(x => x.visit_id === 'SYN-VIS-001' && x.skilling_need_to_record)) {const row = A.dev.roster.find(q => q.worker_id === r.worker_id);A.devSkilling(r.worker_id, row.trade, true);}
    A.mark('2.5');A.refresh();
  };
  A.actions['dev-edit'] = node => {
    const row = A.dev.roster.find(r => r.worker_id === node.dataset.id);
    A.modal('Edit mobile on device', '<form id="dev-edit-form" data-id="' + e(row.worker_id) + '" class="stack"><p class="small">' + e(row.name) + ' · current ' + e(row.mobile) + ' · base version v' + (row.fv.mobile ?? row.version) + (A.dev.airplane ? ' · <strong>offline</strong>' : '') + '</p>' + A.field('New mobile number', 'mobile', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Save on device</button></form>');
  };
  A.forms['dev-edit-form'] = (form, data) => {
    A.devEditWorker(form.dataset.id, 'mobile', data.mobile);
    A.closeModal();A.refresh();A.toast('Edit queued on the device.');
  };
  A.forms['dev-obs-form'] = async (form, data) => {
    need();await A.devObservation({text: data.text.trim(), photoName: data.photo, photoSrc: 'assets/specimens/' + data.photo});
    A.mark('2.4');A.refresh();
  };
  A.actions['dev-fill-p04'] = () => {
    const p = A.st.personas.find(x => x.persona_id === 'P-04'), f = document.querySelector('#dev-reg-form').elements;
    f.full_name.value = p.full_name_en;f.dob.value = p.date_of_birth;f.gender.value = p.gender;f.mobile.value = p.mobile;f.trade.value = p.trade;f.years.value = p.years_experience;f.aadhaar.value = p.aadhaar_masked;f.uid.value = p.uid_token_mock;f.bank.value = p.bank_account_held;
  };
  A.forms['dev-reg-form'] = async (form, data) => {
    need();
    if (data.aadhaar && !/^XXXX-XXXX-\d{4}$/.test(data.aadhaar)) throw new Error('Only a masked Aadhaar reference is accepted.');
    if (A.ageOn(data.dob) < 18) throw new Error('Worker must be at least 18.');
    const pid = await A.devRegister({full_name: data.full_name.trim(), date_of_birth: data.dob, gender: data.gender, mobile: data.mobile, primary_trade: data.trade, years_experience: data.years, aadhaar_masked: data.aadhaar, uid_token_mock: data.uid, bank_account_held: data.bank, smartphone: 'Yes', consent_version: 'CONSENT-DEMO-v1', centre_id: 'ILAC-KRS-01', district_code: 'KRS', site_id: A.dev.visit.site_id, photo: data.photo});
    A.mark('2.6');A.deviceTab = 'roster';A.refresh();A.toast('Saved offline as ' + pid + ' (encrypted on device).');
  };
  A.actions['dev-check'] = node => {need();A.devChecklist(node.dataset.id, node.dataset.v);if (node.dataset.id === 'ppe_helmets') A.mark('C2');A.refresh();};
  A.actions['dev-sync'] = async () => {
    const res = await A.devSync(false);
    afterSync(res);A.refresh();
  };
  const afterSync = res => {
    if (!res) return;
    if (res.some(r => r.status === 'ACCEPTED' && r.serverId && /^SYN-W-/.test(r.serverId))) A.mark('2.8');
    if (res.some(r => r.status === 'CONFLICT')) A.mark('2.8');
  };
  A.actions['dev-reveal'] = async node => {
    try {A.dev.reveal = await A.devReveal(node.dataset.id);} catch (err) {A.dev.reveal = err.message;}
    A.refresh();
  };
  // Auto-sync after reconnecting finishes asynchronously; keep the UI in step.
  const origSetAir = A.devSetAirplane;
  A.devSetAirplane = on => {
    origSetAir(on);
    if (!on && A.dev.autoSyncTimer) {
      const t = setInterval(() => {if (!A.dev.syncing && A.dev.lastSync && Date.now() - Date.parse(A.dev.lastSync) < 5000) {clearInterval(t);afterSync([...A.dev.outbox.map(c => c.result).filter(Boolean)]);A.refresh();}}, 600);
      setTimeout(() => clearInterval(t), 20000);
    }
  };

  // ---------- supervisor: conflicts + identity review ----------
  A.views.conflicts = {title: 'Conflicts & identity review', module: 'SM-01', icon: 'scale', blurb: 'Resolve offline/online edit conflicts and review possible duplicate workers.', render() {
    const tab = A.conflictTab || 'conflicts';
    const open = A.st.conflicts.filter(c => c.status.startsWith('Open'));
    const body = tab === 'conflicts' ? (A.st.conflicts.length ? A.st.conflicts.map(conflictCard).join('') : A.empty('No sync conflicts. They appear here when an offline edit meets a newer online edit.')) : identityQueue();
    return A.heading('Conflicts & identity review', open.length + ' open conflict(s) · ' + A.seededDuplicatePairs().length + ' seeded near-duplicate pairs') + '<div class="card">' + A.tabs([['conflicts', 'Sync conflicts (' + open.length + ')'], ['identity', 'Identity matching queue']], tab, 'conflict-tab') + body + '</div>';
  }};
  A.actions['conflict-tab'] = node => {A.conflictTab = node.dataset.id;A.refresh();};
  function conflictCard(c) {
    const trail = A.st.audit.filter(a => a.entity === c.id || a.entity === c.record_id).reverse();
    const isOpen = c.status.startsWith('Open');
    return '<div class="conflict ' + (isOpen ? 'open' : 'closed') + '"><div class="row between wrap"><div><strong>' + e(c.id) + '</strong> · ' + e(c.record_name) + ' (' + e(c.record_id) + ') · field <code>' + e(c.field) + '</code></div>' + A.badge(c.status, isOpen ? 'red' : 'green') + '</div>' +
      '<div class="grid grid-2 space-top"><div class="variant"><small>Centre console (current on server)</small><strong class="val">' + e(c.server.value) + '</strong><span>' + e(c.server.by) + ' · ' + e(c.server.device) + '</span><span>v' + c.server.version + ' · ' + e(A.clockTime(c.server.at)) + '</span></div><div class="variant"><small>Field device (queued offline)</small><strong class="val">' + e(c.incoming.value) + '</strong><span>' + e(c.incoming.by) + ' · ' + e(c.incoming.device) + '</span><span>captured ' + e(A.clockTime(c.incoming.at)) + ' · base v' + e(c.base_version) + (c.incoming.loc ? ' · 📍 ' + c.incoming.loc.lat + ', ' + c.incoming.loc.lon : '') + '</span></div></div>' +
      (isOpen ? '<form class="resolve-form stack space-top" id="resolve-form" data-id="' + e(c.id) + '"><div class="form-grid">' + A.select('Resolution', 'choice', [{value: 'server', label: 'Keep centre value (' + c.server.value + ')'}, {value: 'incoming', label: 'Accept device value (' + c.incoming.value + ')'}, {value: 'custom', label: 'Enter a corrected value'}], 'incoming') + A.field('Corrected value (if chosen)', 'custom', '', 'tel') + '</div>' + A.textarea('Reason (required)', 'reason', '', 'required minlength="5"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Resolve with reason</button></form>' : '<p class="small space-top"><strong>Resolved</strong> by ' + e(c.resolution.by) + ': <code>' + e(c.resolution.value) + '</code> (' + e(c.resolution.choice) + ') — “' + e(c.resolution.reason) + '” · new record version v' + c.resolution.new_version + '</p>') +
      '<h5 class="space-top">Audit trail</h5>' + (trail.length ? '<ul class="plain">' + trail.map(a => '<li><span class="mono small">#' + a.seq + ' ' + e(A.clockTime(a.at)) + '</span> ' + e(a.user) + ' — <strong>' + e(a.action) + '</strong>: ' + e(a.detail) + '</li>').join('') + '</ul>' : '') + '</div>';
  }
  A.forms['resolve-form'] = (form, data) => {
    A.resolveConflict(form.dataset.id, data.choice, (data.custom || '').trim(), data.reason);
    A.mark('2.9');A.refresh();A.toast('Conflict resolved; both authors notified; audit trail updated.');
  };
  function identityQueue() {
    const pairs = A.seededDuplicatePairs();
    return '<p class="small muted">Deterministic-key matches merge as an update variant; probabilistic matches (0.80–0.91 normal, ≥0.92 high) wait here for a human decision. Nothing is merged automatically (proposal 7.13).</p>' + A.table(pairs, [['a', 'Record A', p => e(p.a.worker_id + ' · ' + p.a.full_name)], ['b', 'Record B', p => e(p.b.worker_id + ' · ' + p.b.full_name)], ['score', 'Score', p => e(p.score.toFixed(2))], ['priority', 'Priority', p => A.badge(p.priority, p.priority === 'High' ? 'red' : 'gold')], ['rule', 'Rule']], p => A.button('Keep separate', 'idm-keep', 'data-a="' + e(p.a.worker_id) + '" data-b="' + e(p.b.worker_id) + '"', 'btn btn-sm')) + (A.st.identityMerges.length ? '<h4 class="space-top">Decisions this session</h4>' + A.table(A.st.identityMerges, [['at', 'Time', m => e(A.clockTime(m.at))], ['by', 'By'], ['existing', 'Record'], ['typed_as', 'Typed as'], ['outcome', 'Outcome']]) : '');
  }
  A.actions['idm-keep'] = node => {A.st.identityMerges.push({at: A.now(), by: A.user.login_id, existing: node.dataset.a + ' / ' + node.dataset.b, typed_as: '', outcome: 'kept separate'});A.audit('Identity review', node.dataset.a, 'kept separate from ' + node.dataset.b);A.refresh();};

  // ---------- skilling grouping (SM-20) ----------
  A.views.skilling = {title: 'Skilling groups', module: 'SM-20', icon: 'layers', blurb: 'Group workers with a skilling need into batches or refer them to APSSDC.', render() {
    const dist = A.userDistrict(A.user);
    const rows = A.st.workers.filter(w => w.skilling_need_flag === 'Yes' && !w.enrolled_batch_id && w.registration_status === 'Active' && A.inScope(A.user, w.district_code));
    const batches = A.st.batches.filter(b => A.inScope(A.user, b.district_code));
    if (rows.filter(w => w.visits.some(v => v.visit_id === 'SYN-VIS-001') && w.skilling_trade).length >= 3) A.mark('2.10');
    return A.heading('Skilling groups', (dist === 'State' ? 'Statewide' : A.districtName(dist)) + ' · ' + rows.length + ' worker(s) with a skilling need and no batch') +
      '<div class="grid grid-2"><div class="card table-card"><div class="card-head"><h3>Skilling needs awaiting a batch</h3></div><form id="group-form">' + A.table(rows, [['sel', '', w => '<input type="checkbox" name="w_' + e(w.worker_id) + '" aria-label="Select ' + e(w.full_name) + '">'], ['worker_id', 'Worker'], ['full_name', 'Name'], ['primary_trade', 'Trade'], ['skilling_trade', 'Need', w => e(w.skilling_trade || w.primary_trade)], ['v', 'Last visit', w => e(w.visits.length ? w.visits[w.visits.length - 1].visit_id : '—')]]) +
      '<div class="pad stack"><div class="form-grid">' + A.select('Add selected to batch', 'batch', [{value: '', label: '— choose batch —'}, ...batches.map(b => ({value: b.batch_id, label: b.batch_id + ' · ' + b.programme_type + ' · ' + b.trade + ' (' + b.enrolled.length + '/' + b.capacity + ')'}))], '') + '</div><div class="form-error"></div><div class="row wrap"><button class="btn btn-primary" type="submit">Group into batch</button>' + A.button('Refer selected to APSSDC (SK-01)', 'group-refer', '', 'btn btn-light') + '</div></div></form></div>' +
      '<div class="card table-card"><div class="card-head"><h3>Batches</h3></div>' + A.table(batches, [['batch_id', 'Batch'], ['programme_type', 'Type'], ['trade', 'Trade'], ['start_on', 'Start', b => e(A.fmtDate(b.start_on))], ['duration_days', 'Days'], ['en', 'Enrolled', b => e(b.enrolled.length + ' / ' + b.capacity)]]) + '</div></div>';
  }};
  const selected = form => [...new FormData(form).keys()].filter(k => k.startsWith('w_')).map(k => k.slice(2));
  A.forms['group-form'] = (form, data) => {
    const ids = selected(form);
    if (!ids.length) throw new Error('Select at least one worker.');
    const batch = A.st.batches.find(b => b.batch_id === data.batch);
    if (!batch) throw new Error('Choose a batch.');
    for (const id of ids) {const w = A.W(id);if (w.primary_trade !== batch.trade && w.skilling_trade !== batch.trade) throw new Error(w.full_name + ' (' + w.primary_trade + ') does not match batch trade ' + batch.trade + '.');}
    if (batch.enrolled.length + ids.length > batch.capacity) throw new Error('Batch capacity exceeded.');
    for (const id of ids) {A.W(id).enrolled_batch_id = batch.batch_id;batch.enrolled.push(id);A.audit('Worker grouped into batch', id, batch.batch_id);}
    A.mark('2.10');A.refresh();A.toast(ids.length + ' worker(s) added to ' + batch.batch_id + '.');
  };
  A.actions['group-refer'] = async () => {
    const form = document.querySelector('#group-form'), ids = selected(form);
    if (!ids.length) throw new Error('Select at least one worker.');
    const out = [];for (const id of ids) out.push(await A.createReferral(A.W(id), 'SK-01', {note: 'Skilling need recorded at site visit'}));
    A.mark('2.10');A.refresh();A.toast(out.length + ' SK-01 referral(s) raised: ' + out.map(r => r.referral_id).join(', '));
  };
}());
