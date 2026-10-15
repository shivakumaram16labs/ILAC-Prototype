/* Field device simulation (SM-11/SM-20) and the server-side synchronisation service (proposal 10.5, 10.10). */
(function () {
  const A = window.ILAC;
  const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  A.devReset = () => {
    A.dev = {
      id: 'DEV-00417', airplane: false, loggedIn: false, unlocked: false, screen: 'home', visit: null, roster: [], outbox: [], seq: 0, cipher: {}, key: null,
      lastSync: null, syncing: false, autoSyncTimer: null, formVersion: null, checklist: [], observations: [], attendance: {}, skilling: {}, checks: {}, pulled: [], banner: '', provisional: 0, cryptoMode: ''
    };
  };
  A.devReset();

  // ---------- encrypted local store ----------
  async function ensureKey() {
    const dev = A.dev;
    if (dev.key) return dev.key;
    if (window.crypto?.subtle) {
      dev.key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
      dev.cryptoMode = 'AES-256-GCM (WebCrypto, per-installation key)';
    } else {
      dev.key = {fallback: A.sha256('dev' + Date.now() + Math.random())};
      dev.cryptoMode = 'SIMULATED stream cipher (WebCrypto unavailable in this context)';
    }
    return dev.key;
  }
  A.devPersist = async (name, obj) => {
    const dev = A.dev, key = await ensureKey(), plain = new TextEncoder().encode(JSON.stringify(obj));
    let iv, ct;
    if (key.fallback) {
      iv = new Uint8Array(12).map(() => Math.random() * 256);
      ct = plain.map((c, i) => c ^ parseInt(A.sha256(key.fallback + i).slice(0, 2), 16));
    } else {
      iv = crypto.getRandomValues(new Uint8Array(12));
      ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, plain));
    }
    dev.cipher[name] = {name, alg: dev.cryptoMode, iv: b64(iv), ct: b64(ct), bytes: ct.length, at: A.now(), plainLength: plain.length};
  };
  A.devReveal = async name => {
    const dev = A.dev, rec = dev.cipher[name];
    if (!dev.unlocked) throw new Error('Device storage is locked. Authenticate again to unwrap the key.');
    if (!rec) throw new Error('No such record');
    if (dev.key.fallback) return '(simulated cipher — plaintext not reconstructed)';
    const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: Uint8Array.from(atob(rec.iv), c => c.charCodeAt(0))}, dev.key, Uint8Array.from(atob(rec.ct), c => c.charCodeAt(0)));
    return new TextDecoder().decode(pt);
  };

  // ---------- device lifecycle ----------
  A.devLogin = async () => {
    const dev = A.dev;
    await ensureKey();dev.loggedIn = true;dev.unlocked = true;dev.screen = 'home';
    A.audit('Field device login', dev.id, 'demo.ff.krs on ' + dev.id);
  };
  A.devLogout = () => {const dev = A.dev;dev.loggedIn = false;dev.unlocked = false;A.audit('Field device logout', dev.id, 'Local data locked (wrapping key destroyed)');};
  A.devOnline = () => !A.dev.airplane;
  A.devSetAirplane = on => {
    const dev = A.dev;
    dev.airplane = on;
    A.audit(on ? 'Device airplane mode ON' : 'Device airplane mode OFF', dev.id, on ? 'Network unreachable' : 'Connectivity restored');
    clearTimeout(dev.autoSyncTimer);
    if (!on && dev.outbox.some(c => c.status === 'pending')) {
      dev.banner = 'Connectivity restored — automatic synchronisation starting…';
      dev.autoSyncTimer = setTimeout(() => A.devSync(true).then(() => A.render()).catch(() => A.render()), 1800);
    }
  };

  A.devDownload = async visitId => {
    const dev = A.dev;
    if (!A.devOnline()) throw new Error('No network. Downloading a visit needs a connection.');
    await sleep(500);
    const visit = A.st.visits.find(v => v.visit_id === visitId);
    if (!visit) throw new Error('Visit not assigned to this device');
    const site = A.st.sById.get(visit.site_id);
    dev.visit = {visit_id: visit.visit_id, site_id: visit.site_id, site_name: site?.site_name, lat: Number(site?.lat), lon: Number(site?.lon), scheduled_on: visit.scheduled_on};
    dev.roster = A.st.visitRoster.filter(r => r.visit_id === visitId).map(r => {
      const w = A.W(r.worker_id);
      return {worker_id: w.worker_id, name: w.full_name, trade: w.primary_trade, mobile: w.mobile, version: w.version, fv: Object.fromEntries(Object.entries(w.fm).map(([k, v]) => [k, v.version])), provisional: false, skilling_need: w.skilling_need_flag === 'Yes'};
    });
    dev.formVersion = A.siteChecklist().version;dev.checklist = A.copy(A.siteChecklist().items);
    dev.attendance = {};dev.skilling = {};dev.checks = {};dev.observations = [];dev.outbox = [];dev.seq = 0;
    await A.devPersist('visit/' + visitId, {visit: dev.visit, roster: dev.roster});
    A.audit('Visit downloaded', visitId, '12-worker roster to ' + dev.id + ' (form v' + dev.formVersion + ')');
    dev.banner = '';
  };

  function queue(entity, op, fields, baseVersion, extra = {}) {
    const dev = A.dev, seq = ++dev.seq, capturedAt = A.now();
    const change = {clientId: 'c-' + dev.id.slice(-5) + '-' + String(seq).padStart(3, '0'), seq, entity, op, fields, baseVersion: baseVersion ?? null, idempotencyKey: A.sha256(dev.id + seq + entity + JSON.stringify(fields)).slice(0, 16),
      hash: 'sha256:' + A.sha256(JSON.stringify(fields)).slice(0, 16), capturedAt, deviceTimeRaw: capturedAt, locationStatus: extra.loc ? 'ok' : 'n/a', loc: extra.loc || null, status: 'pending', result: ''};
    dev.outbox.push(change);
    A.devPersist('outbox/' + change.clientId, change);
    return change;
  }
  const simLoc = () => {const v = A.dev.visit || {lat: 16.5, lon: 80.6};return {lat: +(v.lat + (Math.random() - .5) * .0004).toFixed(5), lon: +(v.lon + (Math.random() - .5) * .0004).toFixed(5), accuracy_m: 8, status: 'ok'};};
  A.devLoc = simLoc;

  A.devAttendance = (workerId, status) => {
    const dev = A.dev;
    dev.attendance[workerId] = status;
    const existing = dev.outbox.find(c => c.entity === 'attendance' && c.fields.worker_id === workerId && c.status === 'pending');
    if (existing) {existing.fields.status = status;existing.hash = 'sha256:' + A.sha256(JSON.stringify(existing.fields)).slice(0, 16);return existing;}
    return queue('attendance', 'UPSERT', {visit_id: dev.visit.visit_id, worker_id: workerId, status});
  };
  A.devObservation = async ({text, photoName, photoSrc}) => {
    const dev = A.dev, loc = simLoc();
    const obs = {text, photoName, photoSrc, loc};
    dev.observations.push(obs);
    queue('observation', 'CREATE', {visit_id: dev.visit.visit_id, text, photo: photoName, photo_hash: A.sha256('photo:' + photoName).slice(0, 16)}, null, {loc});
    await A.devPersist('media/' + photoName, {photo: photoName, hash: A.sha256('photo:' + photoName).slice(0, 16), loc});
  };
  A.devSkilling = (workerId, trade, on) => {
    const dev = A.dev;
    if (!on) {delete dev.skilling[workerId];dev.outbox = dev.outbox.filter(c => !(c.entity === 'skilling_need' && c.fields.worker_id === workerId && c.status === 'pending'));return;}
    dev.skilling[workerId] = trade;
    if (!dev.outbox.some(c => c.entity === 'skilling_need' && c.fields.worker_id === workerId && c.status === 'pending')) queue('skilling_need', 'UPSERT', {visit_id: dev.visit.visit_id, worker_id: workerId, trade});
  };
  A.devRegister = async data => {
    const dev = A.dev;
    dev.provisional += 1;
    const pid = 'PRV-' + dev.id.slice(-5) + '-' + String(dev.provisional).padStart(4, '0');
    const loc = simLoc();
    const rec = {...data, provisional_id: pid, loc};
    dev.roster.push({worker_id: pid, name: data.full_name, trade: data.primary_trade, mobile: data.mobile, version: 0, fv: {}, provisional: true, skilling_need: false});
    queue('worker_create', 'CREATE', rec, null, {loc});
    await A.devPersist('worker/' + pid, rec);   // encrypted at rest on the device
    A.audit('Worker captured offline', pid, 'Provisional ID, stored encrypted on ' + dev.id + (A.devOnline() ? '' : ' (airplane mode)'));
    return pid;
  };
  A.devEditWorker = (workerId, field, value) => {
    const dev = A.dev, row = dev.roster.find(r => r.worker_id === workerId);
    if (!row) throw new Error('Worker not on this roster');
    row[field] = value;
    const prior = dev.outbox.find(c => c.entity === 'worker_update' && c.fields.worker_id === workerId && c.fields.field === field && c.status === 'pending');
    if (prior) {prior.fields.value = value;return prior;}
    return queue('worker_update', 'UPDATE', {worker_id: workerId, field, value}, row.fv[field] ?? row.version);
  };
  A.devChecklist = (key, value) => {
    const dev = A.dev;
    dev.checks[key] = value;
    const prior = dev.outbox.find(c => c.entity === 'checklist' && c.fields.key === key && c.status === 'pending');
    if (prior) {prior.fields.value = value;return;}
    queue('checklist', 'UPSERT', {visit_id: dev.visit.visit_id, key, value});
  };

  // ---------- synchronisation: push then pull ----------
  A.devSync = async (auto = false) => {
    const dev = A.dev;
    if (!A.devOnline()) throw new Error('No network — sync not possible. Changes remain queued.');
    if (dev.syncing) return;
    dev.syncing = true;dev.banner = (auto ? 'Automatic ' : 'Manual ') + 'synchronisation running…';
    const started = A.now();
    try {
      await sleep(700);
      const pending = dev.outbox.filter(c => c.status === 'pending').sort((a, b) => a.seq - b.seq);
      const results = [];
      for (const ch of pending) {
        await sleep(160);
        const res = await A.serverApply(ch, dev);
        ch.status = res.status === 'ACCEPTED' || res.status === 'DUPLICATE' || res.status === 'DEFERRED' ? 'synced' : res.status === 'CONFLICT' ? 'under review' : 'rejected';
        ch.result = res;ch.syncedAt = A.now();
        if (res.status === 'ACCEPTED' && ch.entity === 'worker_create') {
          const row = dev.roster.find(r => r.worker_id === ch.fields.provisional_id);
          if (row) {row.worker_id = res.serverId;row.version = 1;row.provisional = false;row.permanent = true;}
        }
        results.push({clientId: ch.clientId, ...res});
      }
      A.st.syncLog.unshift({id: 'SYNC-' + String(A.st.syncLog.length + 1).padStart(3, '0'), device: dev.id, at: started, batch: pending.length, results: results.map(r => r.clientId + ':' + r.status).join(', '), by: 'demo.ff.krs', auto});
      // Pull: forms/config in scope, plus refreshed worker rows (conflicted fields stay "under review")
      await sleep(350);
      const forms = A.siteChecklist();
      dev.pulled = [];
      if (forms.version !== dev.formVersion) {dev.pulled.push('Site-visit form v' + dev.formVersion + ' → v' + forms.version + ' (' + (forms.items.length - dev.checklist.length) + ' new item)');dev.formVersion = forms.version;dev.checklist = A.copy(forms.items);}
      for (const row of dev.roster) {
        if (row.provisional) continue;
        const w = A.W(row.worker_id);
        if (!w) continue;
        for (const f of ['mobile']) {
          const ucd = A.st.conflicts.find(c => c.record_id === w.worker_id && c.field === f && c.status.startsWith('Open'));
          if (!ucd && row[f] !== w[f]) {row[f] = w[f];dev.pulled.push(w.worker_id + ' ' + f + ' refreshed');}
        }
        row.version = w.version;
        row.fv = Object.fromEntries(Object.entries(w.fm).map(([k, v]) => [k, v.version]));
      }
      dev.lastSync = A.now();
      const cnf = results.filter(r => r.status === 'CONFLICT').length;
      dev.banner = 'Sync complete — ' + results.filter(r => r.status === 'ACCEPTED').length + ' accepted' + (cnf ? ', ' + cnf + ' conflict sent for review' : '') + '.';
      await A.devPersist('sync/last', {at: dev.lastSync, results});
      return results;
    } finally {dev.syncing = false;}
  };

  // ---------- server side of sync ----------
  A.editWorkerField = (workerId, field, value, meta = {}) => {
    const w = A.W(workerId);
    const before = w[field];
    w[field] = value;w.version += 1;
    w.fm[field] = {version: w.version, by: meta.by || A.user?.login_id, at: A.now(), device: meta.device || '', from: before};
    A.audit('Worker field edited', workerId, field + ': ' + before + ' → ' + value + (meta.device ? ' [' + meta.device + ']' : ' [centre console]'));
    return w;
  };

  A.serverApply = async (ch, dev) => {
    const idem = A.st.idem || (A.st.idem = new Set());
    if (idem.has(ch.idempotencyKey)) return {status: 'DUPLICATE', detail: 'Idempotency key already processed'};
    const f = ch.fields, by = 'demo.ff.krs';
    const meta = {by, device: dev.id};
    let res;
    switch (ch.entity) {
      case 'attendance': {
        const visit = A.st.visits.find(v => v.visit_id === f.visit_id);
        const entry = visit.attendance.find(a => a.worker_id === f.worker_id);
        if (entry) entry.status = f.status;
        else visit.attendance.push({worker_id: f.worker_id, status: f.status, by, device: dev.id, at: ch.capturedAt});
        const w = A.W(f.worker_id);
        if (w) {
          const existing = w.visits.find(v => v.visit_id === f.visit_id);
          if (existing) existing.attendance = f.status;
          else w.visits.push({visit_id: f.visit_id, site_id: visit.site_id, date: A.D, attendance: f.status});
        }
        res = {status: 'ACCEPTED', serverId: f.visit_id + '/' + f.worker_id, version: 1};
        break;
      }
      case 'observation': {
        const visit = A.st.visits.find(v => v.visit_id === f.visit_id);
        visit.observations.push({text: f.text, photo: f.photo, photo_hash: f.photo_hash, loc: ch.loc, by, device: dev.id, at: ch.capturedAt});
        res = {status: 'ACCEPTED', serverId: 'OBS-' + String(visit.observations.length).padStart(3, '0'), version: 1, photoHashVerified: true};
        break;
      }
      case 'skilling_need': {
        const w = A.W(f.worker_id);
        w.skilling_need_flag = 'Yes';w.skilling_trade = f.trade;w.version += 1;w.fm.skilling_need_flag = {version: w.version, by, at: A.now(), device: dev.id, from: 'No'};
        const v = w.visits.find(v => v.visit_id === f.visit_id);
        if (v) v.skilling = true;
        res = {status: 'ACCEPTED', serverId: 'SKN-' + f.worker_id, version: w.version};
        break;
      }
      case 'checklist': {
        const visit = A.st.visits.find(v => v.visit_id === f.visit_id);
        visit.checklist[f.key] = f.value;
        res = {status: 'ACCEPTED', serverId: f.visit_id + '#' + f.key, version: 1};
        break;
      }
      case 'worker_update': {
        const w = A.W(f.worker_id), meta2 = w.fm[f.field];
        // Stale base version on the SAME field => both variants preserved, field "under review".
        if (meta2 && meta2.version > (ch.baseVersion ?? 0) && w[f.field] !== f.value) {
          const cnf = {
            id: 'CNF-' + String(A.st.conflicts.length + 1).padStart(3, '0'), entity: 'worker', record_id: f.worker_id, record_name: w.full_name, field: f.field, base_version: ch.baseVersion,
            server: {value: w[f.field], by: meta2.by, at: meta2.at, version: meta2.version, device: meta2.device || 'centre console'},
            incoming: {value: f.value, by, device: dev.id, at: ch.capturedAt, loc: ch.loc, hash: ch.hash}, status: 'Open — awaiting supervisor', assigned: 'demo.sup.krs', created_at: A.now(), resolution: null
          };
          A.st.conflicts.unshift(cnf);
          w.under_review = {...(w.under_review || {}), [f.field]: cnf.id};
          A.audit('Sync conflict recorded', cnf.id, f.worker_id + '.' + f.field + ': centre "' + cnf.server.value + '" vs device "' + f.value + '" — both preserved');
          res = {status: 'CONFLICT', serverId: cnf.id, detail: 'Base version ' + ch.baseVersion + ' is stale (server at ' + meta2.version + '); both versions stored'};
        } else {
          A.editWorkerField(f.worker_id, f.field, f.value, meta);
          res = {status: 'ACCEPTED', serverId: f.worker_id, version: w.version};
        }
        break;
      }
      case 'worker_create': {
        const cand = {name: f.full_name, dob: f.date_of_birth, mobile: f.mobile, gender: f.gender, uid_token_mock: f.uid_token_mock};
        const dups = A.findDuplicates(cand);
        const id = A.newWorkerId();
        const w = A.buildWorker({...f, worker_id: id, origin: 'field device ' + dev.id, centre_id: f.centre_id || 'ILAC-KRS-01'});
        A.st.workers.push(w);A.indexes();
        A.audit('Worker created from sync', id, 'Provisional ' + f.provisional_id + ' → ' + id + '; duplicate check ' + (dups.length ? dups.length + ' candidate(s)' : 'clear'));
        const visit = A.st.visits.find(v => v.visit_id === 'SYN-VIS-001');
        if (visit && f.site_id) w.visits.push({visit_id: visit.visit_id, site_id: visit.site_id, date: A.D, attendance: 'Registered on site'});
        // Deferred step: e-Shram verification now that the platform is reachable.
        let verification = 'Pending';
        try {
          const v = await A.mock.call('e-Shram', 'POST', '/mock/eshram/v1/verify', {uid_token_mock: f.uid_token_mock, name: f.full_name}, {caseId: id});
          if (v.status === 200) {w.verification = 'Verified (e-Shram) — after sync';w.eshram_uan_token_mock = v.body.uan_token;verification = 'Verified';}
        } catch (err) {w.verification = 'Pending — external system unavailable';}
        const rosterRow = A.st.visitRoster.find(r => r.worker_id === id);
        if (!rosterRow) A.st.visitRoster.push({visit_id: 'SYN-VIS-001', site_id: 'SYN-S-0006', roster_seq: String(A.st.visitRoster.length + 1), worker_id: id, full_name: f.full_name, primary_trade: f.primary_trade, attendance_to_record: '', skilling_need_to_record: '', offline_edit_to_record: '', online_edit_at_centre: ''});
        res = {status: 'ACCEPTED', serverId: id, version: 1, duplicateCheck: dups.length ? dups.map(d => d.worker.worker_id + ' (' + d.score.toFixed(2) + ')').join(', ') : 'clear (server-side check ran)', eshram: verification};
        break;
      }
      default: res = {status: 'REJECTED_VALIDATION', detail: 'Unknown entity ' + ch.entity};
    }
    idem.add(ch.idempotencyKey);
    return res;
  };

  // ---------- supervisor resolution ----------
  A.resolveConflict = (id, choice, custom, reason) => {
    const c = A.st.conflicts.find(x => x.id === id);
    if (!c || !c.status.startsWith('Open')) throw new Error('Conflict is not open');
    if (!reason || reason.trim().length < 5) throw new Error('A reason is required to resolve a conflict.');
    const value = choice === 'server' ? c.server.value : choice === 'incoming' ? c.incoming.value : custom;
    if (!value) throw new Error('Enter the corrected value.');
    A.editWorkerField(c.record_id, c.field, value, {by: A.user.login_id});
    const w = A.W(c.record_id);
    if (w.under_review) {delete w.under_review[c.field];}
    c.status = 'Resolved';
    c.resolution = {choice, value, reason: reason.trim(), by: A.user.login_id, at: A.now(), new_version: w.version};
    A.audit('Conflict resolved', id, c.record_id + '.' + c.field + ' = ' + value + ' (' + choice + ') — ' + reason.trim());
    for (const author of [c.server.by, c.incoming.by]) A.st.gateway.unshift({id: 'MSG-' + String(A.st.gateway.length + 1).padStart(4, '0'), at: A.now(), channel: 'In-app', to: author, template: 'conflict_resolved', lang: 'en', text: 'Conflict ' + id + ' on ' + c.record_name + ' (' + c.field + ') resolved by ' + A.user.login_id + ': ' + value + '. Reason: ' + reason.trim(), text_en: '', status: 'Delivered in-app (logged)', by: A.user.login_id});
    return c;
  };

  // Builds a full worker master row from registration/capture data.
  A.buildWorker = d => {
    const district = d.district_code || A.st.cById.get(d.centre_id)?.district_code || '';
    const yr = A.D.slice(0, 4);
    const no = d.worker_id.slice(-5);
    return {
      worker_id: d.worker_id, bocw_registration_no: 'SYN/BOCW/' + district + '/' + yr + '/' + no, surname: '', given_name: '', full_name: d.full_name, full_name_te: d.full_name_te || '',
      gender: d.gender, date_of_birth: d.date_of_birth, age_on_2026_10_01: String(A.ageOn(d.date_of_birth, '2026-10-01')), age_band: '', mobile: d.mobile, aadhaar_masked: d.aadhaar_masked || '', uid_token_mock: d.uid_token_mock || '',
      eshram_uan_token_mock: d.eshram_uan_token_mock || '', district_code: district, district_name: A.districtName(district), home_centre_id: d.centre_id, household_id: d.household_id || '',
      primary_trade: d.primary_trade, trade_code: (A.st.trades.find(t => t.trade_name === d.primary_trade) || {}).trade_code || '', years_experience: String(d.years_experience ?? ''), registration_date: A.D,
      registration_status: 'Active', bank_account_held: d.bank_account_held || '', smartphone: d.smartphone || '', consent_version: d.consent_version || '', consent_captured_on: d.consent_version ? A.D : '',
      skilling_need_flag: 'No', enrolled_batch_id: '', record_origin: d.origin, version: 1, fm: {}, visits: [], notes_restricted: [], skilling_trade: '', verification: d.verification || 'Pending', origin: 'demo'
    };
  };
}());
