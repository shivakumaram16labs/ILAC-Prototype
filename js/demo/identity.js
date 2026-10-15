/* Identity matching (proposal 7.13): normalisation, transliteration key, weighted score, blocking. */
(function () {
  const A = window.ILAC;

  // Telugu -> Latin key so a Telugu entry and its English spelling land on the same key.
  const V = {'అ':'a','ఆ':'a','ఇ':'i','ఈ':'i','ఉ':'u','ఊ':'u','ఋ':'ru','ఎ':'e','ఏ':'e','ఐ':'ai','ఒ':'o','ఓ':'o','ఔ':'au'};
  const M = {'ా':'a','ి':'i','ీ':'i','ు':'u','ూ':'u','ృ':'ru','ె':'e','ే':'e','ై':'ai','ొ':'o','ో':'o','ౌ':'au'};
  const C = {'క':'k','ఖ':'k','గ':'g','ఘ':'g','ఙ':'n','చ':'c','ఛ':'c','జ':'j','ఝ':'j','ఞ':'n','ట':'t','ఠ':'t','డ':'d','ఢ':'d','ణ':'n','త':'t','థ':'t','ద':'d','ధ':'d','న':'n','ప':'p','ఫ':'p','బ':'b','భ':'b','మ':'m','య':'y','ర':'r','ల':'l','వ':'v','శ':'s','ష':'s','స':'s','హ':'h','ళ':'l','ఱ':'r'};
  A.teluguToLatin = text => {
    let out = '';
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (V[ch]) out += V[ch];
      else if (C[ch]) {
        out += C[ch];
        const next = chars[i + 1];
        if (next === '్') i++;                       // virama: bare consonant
        else if (M[next]) {out += M[next];i++;}     // vowel sign replaces inherent a
        else out += 'a';
      } else if (ch === 'ం' || ch === 'ః') out += 'm';
      else out += ch;
    }
    return out;
  };

  const HONORIFICS = /\b(sri|smt|shri|mr|mrs|ms|dr|late)\b\.?/g;
  A.nameKey = text => {
    let s = /[ఀ-౿]/.test(text) ? A.teluguToLatin(text) : String(text || '');
    s = s.normalize('NFC').toLowerCase().replace(HONORIFICS, ' ').replace(/[^a-z\s]/g, ' ');
    s = s.replace(/ksh/g, 'x').replace(/ks/g, 'x').replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/bh/g, 'b').replace(/dh/g, 'd').replace(/th/g, 't').replace(/ph/g, 'f').replace(/sh/g, 's').replace(/ch/g, 'c').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a').replace(/w/g, 'v').replace(/z/g, 'j');
    s = s.replace(/(.)\1+/g, '$1');
    return s.split(/\s+/).filter(Boolean).map(t => t.replace(/[aeiou]+$/, '')).sort().join(' '); // token order does not matter (Surname Given == Given Surname)
  };

  function jaroWinkler(a, b) {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1), am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
        if (!bm[j] && a[i] === b[j]) {am[i] = bm[j] = true;matches++;break;}
      }
    }
    if (!matches) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < a.length; i++) {if (am[i]) {while (!bm[k]) k++;if (a[i] !== b[k]) t++;k++;}}
    const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
    let prefix = 0;
    while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
    return jaro + prefix * 0.1 * (1 - jaro);
  }
  const trigrams = s => {const p = '  ' + s + ' ', out = new Set();for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));return out;};
  function trigramSim(a, b) {
    const x = trigrams(a), y = trigrams(b);
    let inter = 0;for (const g of x) if (y.has(g)) inter++;
    return inter / (x.size + y.size - inter || 1);
  }
  A.nameSimilarity = (a, b) => {const ka = A.nameKey(a), kb = A.nameKey(b);return Math.max(jaroWinkler(ka, kb), trigramSim(ka, kb));};

  function dobAgreement(a, b) {
    if (!a || !b) return null;
    if (a === b) return 1;
    const [y1, m1, d1] = a.split('-'), [y2, m2, d2] = b.split('-');
    if (y1 === y2 && m1 === d2 && d1 === m2) return 0.6;     // day/month swap
    if (m1 === m2 && d1 === d2 && Math.abs(+y1 - +y2) === 1) return 0.6; // one-year difference
    return 0;
  }

  /** Weighted score over the signals available (name .35, DOB .25, mobile .20, gender .10). */
  A.identityScore = (q, w) => {
    const parts = [];
    const name = q.name && w.name ? A.nameSimilarity(q.name, w.name) : null;
    if (name != null) parts.push(['name', 0.35, name]);
    const dob = dobAgreement(q.dob, w.dob);
    if (dob != null) parts.push(['date of birth', 0.25, dob]);
    if (q.mobile && w.mobile) parts.push(['mobile', 0.20, q.mobile === w.mobile ? 1 : 0]);
    if (q.gender && w.gender) parts.push(['gender', 0.10, q.gender === w.gender ? 1 : 0]);
    const total = parts.reduce((s, p) => s + p[1], 0) || 1;
    const score = parts.reduce((s, p) => s + p[1] * p[2], 0) / total;
    // Without a name the score cannot reach a candidate threshold on gender/mobile alone.
    return {score: name == null ? 0 : score, signals: parts.map(p => ({signal: p[0], weight: p[1], agreement: Number(p[2].toFixed(2))}))};
  };

  /** Duplicate candidates for a new registration: deterministic rules first, then probabilistic (thresholds 0.80 / 0.92). */
  A.findDuplicates = (cand, excludeId) => {
    const out = [];
    for (const w of A.st.workers) {
      if (w.worker_id === excludeId) continue;
      const q = {name: cand.name, dob: cand.dob, mobile: cand.mobile, gender: cand.gender};
      const s = A.identityScore(q, {name: w.full_name, dob: w.date_of_birth, mobile: w.mobile, gender: w.gender});
      const aadhaarRef = cand.uid_token_mock && cand.uid_token_mock === w.uid_token_mock;
      const deterministic = aadhaarRef || (cand.mobile && cand.dob && w.mobile === cand.mobile && w.date_of_birth === cand.dob && A.nameKey(w.full_name).split(' ')[0] === A.nameKey(cand.name).split(' ')[0]) || (cand.mobile && cand.dob && w.mobile === cand.mobile && w.date_of_birth === cand.dob && A.nameSimilarity(w.full_name, cand.name) >= 0.85);
      if (deterministic || s.score >= 0.8) {
        out.push({worker: w, score: deterministic ? Math.max(s.score, 0.92) : s.score, signals: s.signals, rule: aadhaarRef ? 'Aadhaar reference (UID token) equal' : deterministic ? 'Mobile + date of birth + name equal' : 'Probabilistic score', priority: (deterministic || s.score >= 0.92) ? 'High' : 'Normal'});
      }
    }
    return out.sort((a, b) => b.score - a.score);
  };

  /** The six near-duplicate legacy pairs seeded in the dataset, for the matching review queue. */
  A.seededDuplicatePairs = () => {
    const out = [];
    for (const w of A.st.workers.filter(w => /near-duplicate/.test(w.record_origin))) {
      const peers = A.findDuplicates({name: w.full_name, dob: w.date_of_birth, mobile: w.mobile, gender: w.gender, uid_token_mock: w.uid_token_mock}, w.worker_id);
      if (peers[0]) out.push({a: w, b: peers[0].worker, score: peers[0].score, rule: peers[0].rule, priority: peers[0].priority});
    }
    return out;
  };
}());
