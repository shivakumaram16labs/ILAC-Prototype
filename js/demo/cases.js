/* Convergence cases (SM-07): one case schema for API and manual routes, service clocks, escalation, documents, timelines. */
(function () {
  const A = window.ILAC;
  A.OPEN_STATUSES = ['Submitted', 'Acknowledged by department', 'Query raised - awaiting worker', 'Seat confirmed'];
  A.isOpen = r => A.OPEN_STATUSES.includes(r.status);

  // Which mock interface serves which service (others are manual in this demonstration).
  A.apiRoutes = {
    'SK-01': {iface: 'APSSDC', method: 'POST', path: '/mock/apssdc/v1/enrolments', body: (w, o) => ({worker_id: w.worker_id, service_code: 'SK-01', trade: w.primary_trade, district: w.district_code})},
    'CS-01': {iface: 'Civil Supplies', method: 'POST', path: '/mock/civilsupplies/v1/ricecard/member-additions', body: (w, o) => ({worker_id: w.worker_id, household_id: w.household_id, member_name: o.member_name || '', member_dob: o.member_dob || '', relationship: o.relationship || ''})},
    'CS-02': {iface: 'Civil Supplies', method: 'POST', path: '/mock/civilsupplies/v1/ricecard/member-additions', body: (w, o) => ({worker_id: w.worker_id, household_id: w.household_id})},
    'ED-01': {iface: 'Education', method: 'POST', path: '/mock/education/v1/scholarship-referrals', body: (w, o) => ({member_id: o.member_id, household_id: o.household_id, beneficiary: o.beneficiary})},
    'GS-01': {iface: 'GSWS', method: 'POST', path: '/mock/gsws/v1/service-requests', body: (w, o) => ({worker_id: w.worker_id, service: o.note || 'Secretariat service request'})},
    'NC-01': {iface: 'NCS', method: 'POST', path: '/mock/ncs/v1/jobseekers', body: (w, o) => ({name: w.full_name, mobile: w.mobile})},
    'ES-01': {iface: 'e-Shram', method: 'POST', path: '/mock/eshram/v1/verify', body: (w, o) => ({uid_token_mock: w.uid_token_mock, name: w.full_name})}
  };
  A.raisableServices = () => A.st.services.filter(s => s.mode === 'manual' || A.apiRoutes[s.service_code]);

  // Departmental nodal login per department, learned from the dataset's own referrals.
  A.nodalFor = department => {
    const hit = A.st.referrals.find(r => r.department === department && r.origin === 'dataset');
    return hit ? hit.responsible_officer : 'demo.nodal.' + department.slice(0, 2).toLowerCase();
  };

  A.refState = r => {
    const elapsed = Math.max(0, A.daysBetween(r.created_on, r.closed_on || A.D));
    const open = A.isOpen(r), overdue = open && A.daysBetween(r.due_on, A.D) > 0;
    let level = 0;
    if (open && r.l2 != null && elapsed >= r.l2) level = 2;
    else if (open && r.l1 != null && elapsed >= r.l1) level = 1;
    return {open, overdue, daysOver: overdue ? A.daysBetween(r.due_on, A.D) : 0, level, elapsed, daysLeft: open ? A.daysBetween(A.D, r.due_on) : null};
  };

  /** Escalation history: L1 to the District Labour Officer at day L1, L2 to State PMU at day L2 — each snapshot of the clock the case was created with. */
  A.escalationHistory = r => {
    const out = [];
    if (!A.isOpen(r) && r.origin === 'dataset') return out;
    const dlo = 'demo.dlo.' + r.district_code.toLowerCase();
    if (r.l1 != null && A.daysBetween(r.created_on, A.D) >= r.l1) out.push({level: 'L1', at: A.addDays(r.created_on, r.l1), day: r.l1, to: dlo, text: 'Escalated to District Labour Officer (' + dlo + ') — day ' + r.l1});
    if (r.l2 != null && A.daysBetween(r.created_on, A.D) >= r.l2) out.push({level: 'L2', at: A.addDays(r.created_on, r.l2), day: r.l2, to: 'demo.pmu.state', text: 'Escalated to State PMU (demo.pmu.state) — day ' + r.l2});
    return out;
  };

  A.referralBadge = r => {
    const s = A.refState(r);
    if (!s.open) return '<span class="badge green">' + A.esc(r.status) + '</span>';
    if (s.level === 2) return '<span class="badge red">' + A.esc(r.status) + ' · L2</span>';
    if (s.overdue || s.level === 1) return '<span class="badge gold">' + A.esc(r.status) + (s.overdue ? ' · overdue ' + s.daysOver + 'd' : ' · L1') + '</span>';
    return '<span class="badge blue">' + A.esc(r.status) + '</span>';
  };

  /**
   * Raise a referral. API services call the mock; any failure routes to the manual/assisted fallback
   * with the SAME case schema, a clock from the same service definition and the reason logged (RFP 3.4).
   */
  A.createReferral = async (worker, code, opts = {}) => {
    const svc = A.st.svcByCode.get(code);
    if (!svc) throw new Error('Unknown service ' + code);
    const id = A.newReferralId();
    const ref = {
      referral_id: id, worker_id: worker.worker_id, service_code: code, department: svc.department, district_code: worker.district_code, centre_id: opts.centre_id || worker.home_centre_id,
      created_offset_days: '0', created_on: A.D, service_clock_days: String(svc.clock), clock: svc.clock, l1: svc.l1, l2: svc.l2,
      due_on: A.addDays(A.D, svc.clock), due_offset_days: String(svc.clock), channel: '', external_ack_no: '', status: 'Submitted', closed_on: '',
      responsible_officer: A.nodalFor(svc.department), mode: 'manual', fallback_reason: '', history: [], origin: 'demo', household_id: opts.household_id || worker.household_id,
      member_id: opts.member_id || '', note: opts.note || '', clock_version: svc.version, evidence: [], created_by: A.user?.login_id || 'system'
    };
    ref.history.push({at: A.now(), by: ref.created_by, text: 'Case ' + id + ' created for ' + svc.service_name + ' — clock ' + svc.clock + ' days, due ' + A.fmtDate(ref.due_on) + ' (service definition v' + svc.version + ')'});
    const route = A.apiRoutes[code];
    if (svc.mode === 'api' && route) {
      try {
        const res = await A.mock.call(route.iface, route.method, route.path, route.body(worker, opts), {caseId: id});
        if (res.status >= 200 && res.status < 300) {
          ref.mode = 'api';ref.channel = 'API (mock)';ref.external_ack_no = res.body.ack || res.body.reference || '';
          ref.history.push({at: A.now(), by: route.iface, text: 'External acknowledgement ' + ref.external_ack_no + ' (HTTP ' + res.status + ')'});
        } else fallback(ref, route.iface + ' returned HTTP ' + res.status);
      } catch (err) {fallback(ref, route.iface + ' did not respond');}
    } else if (svc.mode === 'api') {
      fallback(ref, 'Adapter not enabled in this demonstration');
    } else {
      ref.channel = 'Manual / assisted';
      ref.history.push({at: A.now(), by: ref.created_by, text: 'Registered as manual/assisted case (service is manual by design)'});
    }
    A.st.referrals.unshift(ref);
    A.audit('Referral created', id, code + ' for ' + worker.worker_id + ' via ' + ref.channel);
    return ref;
  };

  function fallback(ref, why) {
    ref.mode = 'manual';ref.channel = 'Manual / assisted (fallback - API unavailable)';ref.fallback_reason = 'API unavailable';ref.fallback_class = 'F4';
    ref.history.push({at: A.now(), by: 'system', text: 'Automatic fallback to manual/assisted route — reason "API unavailable" (' + why + '). Same case ID and lifecycle; clock keeps running.'});
    ref.history.push({at: A.now(), by: 'system', text: 'Referral slip generated and entry added to ' + ref.responsible_officer + ' worklist'});
    A.st.retries.push({id: 'RET-' + (A.st.retries.length + 1), kind: 'Reconcile manual case', case_id: ref.referral_id, interface: ref.department, attempts: 1, next_attempt: 'On interface restore', last_error: why, status: 'Open dependency'});
  }

  A.updateReferral = (id, status, text, evidenceName, deptStatus) => {
    const r = A.st.referrals.find(x => x.referral_id === id);
    if (!r) throw new Error('Case not found');
    const prior = r.status;
    r.status = status;if (deptStatus) r.dept_status = deptStatus;
    if (!A.isOpen(r)) r.closed_on = A.D;
    if (evidenceName) {(r.evidence = r.evidence || []).push({name: evidenceName, at: A.now(), by: A.user.login_id});}
    r.history.push({at: A.now(), by: A.user.login_id, text: (deptStatus || status) + (text ? ' — ' + text : '') + (evidenceName ? ' [evidence: ' + evidenceName + ']' : '')});
    A.audit('Case status updated', id, prior + ' -> ' + (deptStatus || status));
    return r;
  };

  // ---------- documents (controlled access, hashed at capture) ----------
  A.addDocument = async ({entityId, householdId, type, name, file, src, access}) => {
    let digest;
    if (file) digest = A.sha256(new Uint8Array(await file.arrayBuffer()));
    else digest = A.sha256('specimen:' + name);
    const doc = {
      doc_id: 'DOC-' + String(A.st.documents.length + 1).padStart(4, '0'), entity_id: entityId, household_id: householdId || '', type, name, src: src || (file ? URL.createObjectURL(file) : ''),
      access: access || 'Restricted — ILAC staff of the home centre', classified_as: type, sha256: digest.slice(0, 16) + '…', uploaded_by: A.user?.login_id, at: A.now()
    };
    A.st.documents.unshift(doc);
    A.audit('Document stored', doc.doc_id, type + ' · ' + name + ' · ' + doc.access);
    return doc;
  };
  A.documentTypes = ['Photograph', 'Work certificate (90 days)', 'Birth certificate', 'Class 10 memo', 'Identity proof (masked)', 'Bank passbook', 'Other'];

  // ---------- timelines ----------
  A.workerEvents = workerId => {
    const w = A.W(workerId), ev = [];
    if (!w) return ev;
    ev.push({at: w.registration_date, kind: 'Registration', text: 'Registered at ' + A.centreName(w.home_centre_id) + ' (' + (w.bocw_registration_no || 'BOCW no. pending') + ')', who: w.worker_id});
    for (const r of A.st.referrals.filter(r => r.worker_id === workerId)) {
      ev.push({at: r.created_on, kind: 'Referral', text: r.referral_id + ' · ' + r.service_code + ' ' + (A.st.svcByCode.get(r.service_code)?.service_name || '') + ' — ' + r.channel, who: w.worker_id, ref: r.referral_id + ':c'});
      if (r.closed_on) ev.push({at: r.closed_on, kind: 'Referral', text: r.referral_id + ' closed — ' + r.status, who: w.worker_id, ref: r.referral_id + ':x'});
    }
    for (const g of A.st.grievances.filter(g => g.worker_id === workerId)) ev.push({at: g.created_on, kind: 'Grievance', text: g.grievance_id + ' · ' + g.category + ' — ' + g.status, who: w.worker_id});
    for (const v of w.visits) ev.push({at: v.date, kind: 'Site visit', text: v.visit_id + ' at ' + v.site_id + ' — ' + v.attendance + (v.skilling ? ' · skilling need recorded' : ''), who: w.worker_id});
    for (const c of A.st.jmCands.filter(c => c.worker_id === workerId)) ev.push({at: c.registered_on, kind: 'Job mela', text: c.registration_id + ' registered for ' + c.event_id + (c.slot ? ' · interview ' + c.slot : '') + (c.interview_status ? ' · ' + c.interview_status : ''), who: w.worker_id});
    for (const p of A.st.placements.filter(p => p.worker_id === workerId)) ev.push({at: p.at.slice(0, 10), kind: 'Placement', text: p.placement_id + ' · ' + p.employer_name + ' · joining ' + A.fmtDate(p.joining_on), who: w.worker_id});
    for (const d of A.st.documents.filter(d => d.entity_id === workerId)) ev.push({at: d.at.slice(0, 10), kind: 'Document', text: d.type + ' · ' + d.name, who: w.worker_id});
    return ev;
  };
  A.householdEvents = hid => {
    const ev = [];
    const ws = A.st.workers.filter(w => w.household_id === hid);
    for (const w of ws) ev.push(...A.workerEvents(w.worker_id).map(e => ({...e, who: w.full_name})));
    for (const m of A.householdMembers(hid)) {
      for (const c of A.st.cases.filter(c => c.member_id === m.member_id)) ev.push({at: c.session_on, kind: 'Counselling', text: c.case_id + ' · ' + m.full_name + ' · ' + c.session_type + ' session — ' + c.agreed_action + ' (' + c.case_status + ')', who: m.full_name});
      for (const r of A.st.referrals.filter(r => r.member_id === m.member_id)) ev.push({at: r.created_on, kind: 'Referral', text: r.referral_id + ' · ' + r.service_code + ' for ' + m.full_name + ' — ' + r.channel, who: m.full_name, ref: r.referral_id + ':c'});
      if (m.added_on) ev.push({at: m.added_on, kind: 'Household', text: m.full_name + ' added as ' + m.relationship_to_head, who: m.full_name});
    }
    for (const a of A.st.appointments.filter(a => A.st.mById.get(a.member_id)?.household_id === hid)) ev.push({at: a.date, kind: 'Appointment', text: 'Counselling appointment ' + a.time + ' with ' + a.counsellor_name + ' for ' + a.beneficiary, who: a.beneficiary});
    for (const t of A.st.tasks.filter(t => t.household_id === hid)) ev.push({at: t.due_on, kind: 'Follow-up', text: t.text + ' (due ' + A.fmtDate(t.due_on) + ')', who: ''});
    // a member-specific referral is also in the head's own list: keep the more specific (member) entry
    const seen = new Set();
    const unique = [...ev.filter(x => x.ref && x.text.includes(' for ')), ...ev.filter(x => !(x.ref && x.text.includes(' for ')))].filter(x => {if (!x.ref) return true;if (seen.has(x.ref)) return false;seen.add(x.ref);return true;});
    return unique.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  };
}());
