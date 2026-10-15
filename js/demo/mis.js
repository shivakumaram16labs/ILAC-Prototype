/* MIS (SM-13): query engine, standard report library, report builder output, masked export. */
(function () {
  const A = window.ILAC;
  const yn = b => b ? 'Yes' : 'No';
  const GRIEVANCE_OPEN = ['Open - under action', 'Open - escalated', 'Reopened'];

  A.mis = {
    datasets: {
      workers: {
        label: 'Workers (registry)', rows: st => st.workers, district: w => w.district_code,
        fields: {
          district: {label: 'District', get: w => w.district_name || A.districtName(w.district_code)}, gender: {label: 'Gender', get: w => w.gender},
          trade: {label: 'Primary trade', get: w => w.primary_trade}, status: {label: 'Registration status', get: w => w.registration_status},
          age_band: {label: 'Age band', get: w => w.age_band || (A.ageOn(w.date_of_birth) < 36 ? '18-35' : A.ageOn(w.date_of_birth) < 51 ? '36-50' : '51+')},
          skilling_need: {label: 'Skilling need flagged', get: w => w.skilling_need_flag}, in_batch: {label: 'Enrolled in a batch', get: w => yn(!!w.enrolled_batch_id)},
          centre: {label: 'Home centre', get: w => w.home_centre_id}, verification: {label: 'Verification', get: w => w.verification}
        }
      },
      referrals: {
        label: 'Convergence referrals', rows: st => st.referrals, district: r => r.district_code,
        fields: {
          department: {label: 'Department', get: r => r.department}, service: {label: 'Service', get: r => r.service_code}, status: {label: 'Status', get: r => r.status},
          state: {label: 'Open / closed', get: r => A.isOpen(r) ? 'Open' : 'Closed'}, past_clock: {label: 'Past service clock', get: r => yn(A.refState(r).overdue)},
          district: {label: 'District', get: r => A.districtName(r.district_code)}, route: {label: 'Route', get: r => r.mode === 'api' ? 'API' : 'Manual / assisted'}, escalation: {label: 'Escalation level', get: r => 'L' + A.refState(r).level}
        }
      },
      grievances: {
        label: 'Grievances', rows: st => st.grievances, district: g => g.district_code,
        fields: {
          category: {label: 'Category', get: g => g.category}, status: {label: 'Status', get: g => g.status}, state: {label: 'Open / closed', get: g => GRIEVANCE_OPEN.includes(g.status) ? 'Open' : 'Closed'},
          older_30: {label: 'Older than 30 days', get: g => yn(A.daysBetween(g.created_on, A.D) > 30)}, urgency: {label: 'Urgency', get: g => g.urgency}, district: {label: 'District', get: g => A.districtName(g.district_code)}
        }
      },
      jobmela: {
        label: 'Job mela candidates', rows: st => st.jmCands, district: c => c.district_code,
        fields: {
          trade: {label: 'Primary trade', get: c => c.primary_trade}, district: {label: 'District', get: c => A.districtName(c.district_code)}, channel: {label: 'Registration channel', get: c => c.registration_channel},
          pre_registered: {label: 'Pre-registered', get: c => yn(!/Walk-in/.test(c.registration_channel))}, check_in: {label: 'Check-in', get: c => c.check_in_status}
        }
      },
      counselling: {
        label: 'Education counselling cases', rows: st => st.cases, district: c => A.H(c.household_id)?.district_code || '',
        fields: {
          stage: {label: 'Education stage', get: c => c.education_stage}, status: {label: 'Case status', get: c => c.case_status}, counsellor: {label: 'Counsellor', get: c => c.counsellor_id},
          interest: {label: 'Interest area', get: c => c.interest_area}, referral: {label: 'Referral', get: c => c.referral_service_code || 'None'}
        }
      }
    },
    standard: [
      {id: 'std-registered', name: 'Registered workers by district', dataset: 'workers', filters: [], groupBy: ['district']},
      {id: 'std-referrals-open', name: 'Open referrals by department', dataset: 'referrals', filters: [{field: 'state', op: '=', value: 'Open'}], groupBy: ['department']},
      {id: 'std-women', name: 'Active women workers by district', asOf: 'loaded', dataset: 'workers', filters: [{field: 'gender', op: '=', value: 'Female'}, {field: 'status', op: '=', value: 'Active'}], groupBy: ['district']},
      {id: 'std-past-clock', name: 'Open referrals past service clock, by department', dataset: 'referrals', filters: [{field: 'state', op: '=', value: 'Open'}, {field: 'past_clock', op: '=', value: 'Yes'}], groupBy: ['department']},
      {id: 'std-jm-trade', name: 'Job mela pre-registrations by trade', asOf: 'loaded', dataset: 'jobmela', filters: [{field: 'pre_registered', op: '=', value: 'Yes'}], groupBy: ['trade']},
      {id: 'std-grv-old', name: 'Open grievances older than 30 days, by category', dataset: 'grievances', filters: [{field: 'state', op: '=', value: 'Open'}, {field: 'older_30', op: '=', value: 'Yes'}], groupBy: ['category']},
      {id: 'std-skill-gap', name: 'Krishna district: active workers with a skilling need, not in a batch, by trade', asOf: 'loaded', dataset: 'workers', filters: [{field: 'district', op: '=', value: 'Krishna'}, {field: 'status', op: '=', value: 'Active'}, {field: 'skilling_need', op: '=', value: 'Yes'}, {field: 'in_batch', op: '=', value: 'No'}], groupBy: ['trade']}
    ],
    all() {return [...this.standard, ...A.st.reports];},
    find(id) {return this.all().find(r => r.id === id);},
    /** Execute a definition in the caller's jurisdiction; returns grouped counts (no personal identifiers). */
    run(def, user = A.user, extraFilters = [], asOf) {
      const ds = this.datasets[def.dataset];
      if (!ds) throw new Error('Unknown dataset');
      const mode = asOf || def.asOf || 'live', src = mode === 'loaded' ? A.baseSt : A.st;
      const filters = [...def.filters, ...extraFilters];
      let rows = ds.rows(src).filter(r => !user || A.inScope(user, ds.district(r)));
      for (const f of filters) {
        const fd = ds.fields[f.field];
        if (!fd) continue;
        rows = rows.filter(r => {
          const v = String(fd.get(r) ?? '');
          return f.op === '=' ? v === f.value : f.op === '!=' ? v !== f.value : f.op === 'contains' ? v.toLowerCase().includes(String(f.value).toLowerCase()) : true;
        });
      }
      const groups = new Map();
      for (const r of rows) {
        const key = def.groupBy.map(g => ds.fields[g].get(r) || '(blank)');
        const k = key.join('\u0001');
        if (!groups.has(k)) groups.set(k, {key, count: 0});
        groups.get(k).count++;
      }
      const out = [...groups.values()].sort((a, b) => b.count - a.count || a.key.join().localeCompare(b.key.join()));
      return {columns: def.groupBy.map(g => ds.fields[g].label).concat('Count'), rows: out.map(g => [...g.key, g.count]), total: rows.length, asOf: mode, at: A.now(), scope: user ? (A.userDistrict(user) === 'State' ? 'Statewide' : A.districtName(A.userDistrict(user))) : 'Statewide', dataset: ds.label};
    },
    csv(def, result) {
      const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
      const lines = [
        ['# Digital ILAC — ' + def.name], ['# Reporting timestamp (IST): ' + new Date(result.at).toLocaleString('en-GB', {timeZone: 'Asia/Kolkata'})], ['# Demo day D: ' + A.D],
        ['# Scope: ' + result.scope], ['# Data as of: ' + (result.asOf === 'loaded' ? 'dataset v1.0 as loaded (before demonstration changes)' : 'live data at the reporting timestamp')], ['# Source: ' + result.dataset + ' — synthetic dataset v1.0'], ['# Personal identifiers: none (aggregated counts); small cells are not suppressed in this demonstration'], [], result.columns,
        ...result.rows, ['Total', ...Array(result.columns.length - 2).fill(''), result.total]
      ];
      return '﻿' + lines.map(r => r.map(cell).join(',')).join('\r\n');
    },
    maskName: n => String(n).split(/\s+/).map(p => p[0] + '.').join(' '),
    maskMobile: m => 'XXXXX' + String(m).slice(-4)
  };

  /** Answer key computed straight from the loaded sheets, independent of the report engine (used by the readiness check). */
  A.mis.answerKey = () => {
    const S = A.sheets, num = Number;
    const tally = (rows, keyFn) => rows.reduce((m, r) => (m[keyFn(r)] = (m[keyFn(r)] || 0) + 1, m), {});
    const q1 = tally(S.T01_Workers.filter(w => w.gender === 'Female' && w.registration_status === 'Active'), w => w.district_name);
    const q2 = tally(S.T10_Referrals.filter(r => ['Submitted', 'Acknowledged by department', 'Query raised - awaiting worker'].includes(r.status) && num(r.due_offset_days) < 0), r => r.department);
    const q3 = tally(S.T08_JobMela_Candidates, c => c.primary_trade);
    const q4 = tally(S.T11_Grievances.filter(g => ['Open - under action', 'Open - escalated', 'Reopened'].includes(g.status) && num(g.created_offset_days) < -30), g => g.category);
    const q5 = tally(S.T01_Workers.filter(w => w.district_code === 'KRS' && w.registration_status === 'Active' && w.skilling_need_flag === 'Yes' && !w.enrolled_batch_id), w => w.primary_trade);
    return {q1, q2, q3, q4, q5};
  };
}());
