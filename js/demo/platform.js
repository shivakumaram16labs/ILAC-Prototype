/* Platform services: audit ledger (hash-chained), messaging gateway (log only), versioned configuration, mock Government APIs. */
(function () {
  const A = window.ILAC;

  // ---------- audit ledger (proposal 8.21: each entry carries the hash of its predecessor) ----------
  A.audit = (action, entity, detail = '', extra = {}) => {
    const st = A.st, prev = st.audit.length ? st.audit[st.audit.length - 1].hash : 'GENESIS';
    const entry = {seq: st.audit.length + 1, at: A.now(), user: extra.user || A.user?.login_id || 'system', role: A.user?.role || '', action, entity, detail};
    entry.prev = prev.slice(0, 12);
    entry.hash = A.sha256(prev + '|' + entry.seq + '|' + entry.at + '|' + entry.user + '|' + action + '|' + entity + '|' + detail);
    st.audit.push(entry);
    return entry;
  };
  A.verifyAuditChain = () => {
    let prev = 'GENESIS';
    for (const e of A.st.audit) {
      const h = A.sha256(prev + '|' + e.seq + '|' + e.at + '|' + e.user + '|' + e.action + '|' + e.entity + '|' + e.detail);
      if (h !== e.hash) return {ok: false, brokenAt: e.seq};
      prev = e.hash;
    }
    return {ok: true, length: A.st.audit.length};
  };

  // ---------- messaging gateway (SM-14): written to the log, never dispatched ----------
  A.templates = {
    otp: {te: 'Digital ILAC లాగిన్ OTP {otp}. ఇతరులతో పంచుకోకండి.', en: 'Digital ILAC login OTP {otp}. Do not share it.'},
    token: {te: 'Digital ILAC — {centre}: మీ టోకెన్ నంబర్ {token}. దయచేసి మీ వంతు వచ్చే వరకు వేచి ఉండండి.', en: 'Digital ILAC — {centre}: your token number is {token}. Please wait for your turn.'},
    registration_ack: {te: 'Digital ILAC: మీ నమోదు స్వీకరించబడింది. కార్మిక ID {worker_id}, రసీదు {ack}. కేంద్రం: {centre}.', en: 'Digital ILAC: your registration is received. Worker ID {worker_id}, acknowledgement {ack}. Centre: {centre}.'},
    registration_pending: {te: 'Digital ILAC: మీ నమోదు పూర్తయింది (కార్మిక ID {worker_id}). e-Shram ధృవీకరణ ప్రస్తుతం అందుబాటులో లేదు; మేము మళ్లీ ప్రయత్నిస్తాము. తదుపరి దశ: {next}.', en: 'Digital ILAC: registration complete (Worker ID {worker_id}). e-Shram verification is unavailable; we will retry. Next step: {next}.'},
    referral_ack: {te: 'Digital ILAC: మీ సేవా అభ్యర్థనలు నమోదయ్యాయి — {list}. స్థితి కోసం ILAC కేంద్రాన్ని సంప్రదించండి.', en: 'Digital ILAC: your service requests are recorded — {list}. Contact the ILAC centre for status.'},
    appointment: {te: 'ILAC కౌన్సెలింగ్ అపాయింట్‌మెంట్: {date} {time}, {counsellor}, {centre}. {name} కోసం.', en: 'ILAC counselling appointment: {date} {time}, {counsellor}, {centre}. For {name}.'},
    offer: {te: 'ఉద్యోగ ఆఫర్: {employer}, {trade}, రోజు వేతనం ₹{wage}, చేరే తేదీ {date}.', en: 'Job offer: {employer}, {trade}, daily wage Rs {wage}, joining on {date}.'},
    interview: {te: 'జాబ్ మేళా ఇంటర్వ్యూ: {employer}, సమయం {time}, {vacancy}.', en: 'Job mela interview: {employer}, time {time}, {vacancy}.'},
    followup: {te: 'ILAC ఫాలో-అప్: {text}', en: 'ILAC follow-up: {text}'}
  };
  A.sendMessage = (to, template, vars = {}, lang = 'te', channel = 'SMS') => {
    const tpl = A.templates[template], fill = s => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    const msg = {
      id: 'MSG-' + String(A.st.gateway.length + 1).padStart(4, '0'), at: A.now(), channel, to, template, lang,
      text: fill(tpl[lang] || tpl.en), text_en: fill(tpl.en), status: '202 Accepted — logged only, not dispatched', by: A.user?.login_id || 'system'
    };
    A.st.gateway.unshift(msg);
    A.st.apiLog.unshift({id: 'API-' + String(A.st.apiLog.length + 1).padStart(4, '0'), at: msg.at, ms: 40, method: 'POST', path: '/mock/messaging/v1/messages', status: 202, request: {to, channel, template, lang}, response: {message_id: msg.id, status: 'ACCEPTED', dispatched: false}, caseId: vars.caseId || '', interface: 'Messaging gateway'});
    return msg;
  };

  // ---------- configuration store (SM-19): versioned, effective-dated, immutable once published ----------
  A.config = {
    publish(type, key, value, summary) {
      const cfg = A.st.config, prior = cfg.items.filter(i => i.type === type && i.key === key);
      const item = {type, key, version: prior.length + 2, value: A.copy(value), effective_from: A.D, published_by: A.user.login_id, published_at: A.now(), summary};
      // version 1 is the dataset baseline; the first published change is version 2
      cfg.items.push(item);
      cfg.log.unshift({...item, id: 'CFG-' + String(cfg.log.length + 1).padStart(3, '0'), checksum: 'sha256:' + A.sha256(JSON.stringify(value) + key + item.version).slice(0, 16)});
      A.audit('Configuration published', type + '/' + key + ' v' + item.version, summary);
      return item;
    },
    latest(type, key) {
      const list = A.st.config.items.filter(i => i.type === type && i.key === key);
      return list.length ? list[list.length - 1] : null;
    },
    version(type, key) {const l = this.latest(type, key);return l ? l.version : 1;}
  };

  // Household baseline form definition. Fields marked config:true can be added by an Authority user without code.
  A.baselineBase = [
    {key: 'area_type', label: 'Area type', options: ['Urban', 'Rural'], required: true},
    {key: 'house_type', label: 'House type', options: ['Pucca - own', 'Semi-pucca - own', 'Rented', 'Kutcha / temporary'], required: true},
    {key: 'rice_card_held', label: 'Rice card held', options: ['Yes', 'No'], required: true},
    {key: 'drinking_water_source', label: 'Drinking water source', options: ['Public tap', 'Borewell / handpump', 'Tanker', 'Piped (own)'], required: true},
    {key: 'lpg_connection', label: 'LPG connection', options: ['Yes', 'No'], required: true},
    {key: 'seasonal_migration', label: 'Seasonal migration', options: ['None', 'Intra-district', 'Inter-district', 'Inter-state'], required: true},
    {key: 'primary_language', label: 'Household language', options: ['Telugu', 'Urdu', 'Odia', 'Hindi', 'Other'], required: true}
  ];
  A.baselineForm = () => {
    const cfg = A.config.latest('form', 'household_baseline');
    return {version: cfg ? cfg.version : 1, fields: cfg ? cfg.value.fields : A.baselineBase};
  };
  A.siteChecklistBase = [
    {key: 'safety_session', label: 'Safety session held', type: 'yesno'},
    {key: 'drinking_water', label: 'Drinking water available at site', type: 'yesno'},
    {key: 'first_aid', label: 'First-aid kit available', type: 'yesno'}
  ];
  A.siteChecklist = () => {
    const cfg = A.config.latest('form', 'site_visit');
    return {version: cfg ? cfg.version : 1, items: cfg ? cfg.value.items : A.siteChecklistBase};
  };
  A.tradeList = () => {
    const cfg = A.config.latest('master', 'trades');
    return cfg ? cfg.value.trades : A.st.trades.map(t => t.trade_name);
  };

  // ---------- mock Government APIs (ILAC_Demo_Mock_API_v1.0.yaml) ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  A.mockTimeoutMs = 10000;
  A.mock = {
    interfaces: [
      {id: 'D01', name: 'APBOCWWB registry', path: '/mock/bocw/v1/workers/search'},
      {id: 'D02', name: 'e-Shram', path: '/mock/eshram/v1/verify'},
      {id: 'D04', name: 'UIDAI (mock)', path: '/mock/uidai/v1/auth'},
      {id: 'D05', name: 'DigiLocker', path: '/mock/digilocker/v1/documents'},
      {id: 'D06', name: 'NCS', path: '/mock/ncs/v1/jobseekers'},
      {id: 'D09', name: 'GSWS', path: '/mock/gsws/v1/service-requests'},
      {id: 'D12', name: 'APSSDC', path: '/mock/apssdc/v1/enrolments'},
      {id: 'D14', name: 'MeeSeva', path: '/mock/meeseva/v1/applications/{ack}'},
      {id: 'D15', name: 'Civil Supplies', path: '/mock/civilsupplies/v1/ricecard/member-additions'},
      {id: 'D16', name: 'Education', path: '/mock/education/v1/scholarship-referrals'},
      {id: 'SM-14', name: 'Messaging gateway', path: '/mock/messaging/v1/messages'}
    ],
    health() {
      const ms = A.st.mockState;
      return Object.fromEntries(this.interfaces.map(i => [i.id, i.id === 'D15' && ms.civilSuppliesDown ? 'DOWN (503)' : 'UP']));
    },
    /** One call = one log row, whatever the outcome (the Committee may ask for any call's request/response). */
    async call(iface, method, path, request, ctx = {}) {
      const started = performance.now(), ms = A.st.mockState;
      const log = {id: 'API-' + String(A.st.apiLog.length + 1).padStart(4, '0'), at: A.now(), method, path, request: A.copy(request || {}), status: 0, response: null, ms: 0, caseId: ctx.caseId || '', interface: iface, by: A.user?.login_id || 'system'};
      A.st.apiLog.unshift(log);
      let result;
      if (path.includes('/eshram/') && ms.eshramTimeoutForP03 && request.uid_token_mock === 'SYN-UIDTOK-41100031') {
        // The request is accepted but never answered: the client must time out and fall back.
        await Promise.race([sleep(A.mockTimeoutMs + 3000), new Promise(r => ctx.signal && ctx.signal.addEventListener('abort', r))]);
        log.status = 0;log.response = {error: 'CLIENT_TIMEOUT', note: 'No response within ' + A.mockTimeoutMs / 1000 + ' s; mock withheld its reply for this persona token.'};
        log.ms = Math.round(performance.now() - started);
        throw Object.assign(new Error('timeout'), {log});
      }
      await sleep(180 + Math.random() * 260);
      result = A.mock.handle(path, method, request, ms, ctx);
      log.status = result.status;log.response = result.body;log.ms = Math.round(performance.now() - started);
      return result;
    },
    handle(path, method, req, ms, ctx) {
      const ok = (status, body) => ({status, body});
      if (path.includes('/bocw/')) {
        const matches = A.fuzzyRegistryMatches(req);
        return ok(200, {matches, count: matches.length, searched: ['name', 'date_of_birth', 'mobile']});
      }
      if (path.includes('/eshram/')) return ok(200, {verified: true, uan_token: req.uan_override || ('SYN-UAN-' + (req.uid_token_mock === 'SYN-UIDTOK-41100011' ? '77810011' : A.randDigits(8, req.uid_token_mock || req.name)))});
      if (path.includes('/uidai/')) {
        if (/^\d{12}$/.test(String(req.aadhaar_number || '').replace(/[\s-]/g, ''))) return ok(400, {error: 'REAL_AADHAAR_REJECTED', message: 'The mock accepts SYN-UIDTOK tokens only; 12-digit Aadhaar-like values are rejected.'});
        if (!/^SYN-UIDTOK-\d+$/.test(req.uid_token_mock || '')) return ok(400, {error: 'INVALID_TOKEN', message: 'uid_token_mock must look like SYN-UIDTOK-nnnnnnnn'});
        if (req.otp !== '123456') return ok(401, {error: 'OTP_MISMATCH', message: 'OTP is 123456 in the mock console.'});
        return ok(200, {authenticated: true, ref_key: 'SYN-AVREF-' + A.randDigits(8, req.uid_token_mock)});
      }
      if (path.includes('/digilocker/')) return ok(200, {documents: A.digilockerDocs(req)});
      if (path.includes('/ncs/')) return ok(201, {reference: 'SYN-NCS-' + A.randDigits(6, req.name + req.mobile)});
      if (path.includes('/gsws/')) return ok(201, {reference: 'SYN-GSWS-' + A.randDigits(6, JSON.stringify(req)), status: 'ACKNOWLEDGED'});
      if (path.includes('/apssdc/')) {
        if (method === 'GET') return ok(200, {ack: ctx.ack, status: ms.seatConfirmedTriggered[ctx.ack] ? 'Seat confirmed' : 'Enrolment acknowledged'});
        return ok(201, {ack: 'SYN-APSSDC-ACK-' + A.randDigits(6, (req.worker_id || '') + (req.service_code || '') + A.st.apiLog.length), status: 'ACKNOWLEDGED'});
      }
      if (path.includes('/meeseva/')) return ok(200, {ack: ctx.ack, status: ['Received', 'Under verification', 'Approved', 'Certificate issued'][Number(A.randDigits(1, ctx.ack)) % 4]});
      if (path.includes('/civilsupplies/')) {
        if (ms.civilSuppliesDown) return ok(503, {error: 'SERVICE_UNAVAILABLE', message: 'Civil Supplies rice-card service is unavailable. Retry later.'});
        return ok(201, {ack: 'SYN-CS-ACK-' + A.randDigits(6, req.worker_id + req.member_name)});
      }
      if (path.includes('/education/')) return ok(201, {ack: 'SYN-EDU-ACK-' + A.randDigits(6, (req.member_id || '') + A.st.apiLog.length), status: 'ACKNOWLEDGED'});
      return ok(404, {error: 'NOT_FOUND'});
    }
  };

  /** Client-side deadline (10 s as scripted): the mock may withhold its reply; the caller must not wait forever. */
  A.mock.callT = async (iface, method, path, request, ctx = {}, ms = A.mockTimeoutMs) => {
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms);
    try {return await A.mock.call(iface, method, path, request, {...ctx, signal: ac.signal});} finally {clearTimeout(timer);}
  };

  A.digilockerDocs = req => ([
    {doc_type: 'Class 10 memo', issuer: 'SYN Board of Secondary Education', file: 'specimen_class10_memo_P-08.png', note: 'specimen metadata only'},
    {doc_type: 'Birth certificate', issuer: 'SYN Registrar of Births', file: 'specimen_birth_certificate_P-05.png', note: 'specimen metadata only'}
  ]);

  // BOCW registry fuzzy match (scores follow the proposal's identity weights; P-02 must return SYN-W-000607 at >= 0.85).
  A.fuzzyRegistryMatches = req => {
    const q = {name: req.name || '', dob: req.date_of_birth || '', mobile: req.mobile || '', gender: req.gender || ''};
    const out = [];
    for (const w of A.st.workers) {
      const s = A.identityScore(q, {name: w.full_name, dob: w.date_of_birth, mobile: w.mobile, gender: w.gender});
      if (s.score >= 0.8) out.push({worker_id: w.worker_id, name: w.full_name, date_of_birth: w.date_of_birth, mobile: w.mobile, bocw_registration_no: w.bocw_registration_no, score: Number(s.score.toFixed(2)), signals: s.signals});
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  };
}());
