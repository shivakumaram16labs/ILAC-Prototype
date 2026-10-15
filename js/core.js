/* UI helpers, shell and event registry. Views register handlers in A.actions / A.forms. */
(function () {
  const A = window.ILAC;
  A.esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const e = A.esc;
  A.actions = {};   // data-action handlers: (node, event) => void | Promise
  A.forms = {};     // form id handlers: (form, data) => void | Promise
  A.views = {};     // route id -> {title, module, icon, render, roles}

  A.button = (label, action, extra = '', cls = 'btn') => '<button type="button" class="' + cls + '" data-action="' + e(action) + '" ' + extra + '>' + e(A.t(label)) + '</button>';
  A.link = (label, route, cls = 'btn btn-light') => '<a class="' + cls + '" href="#' + e(route) + '">' + e(A.t(label)) + '</a>';
  A.field = (label, name, value = '', type = 'text', extra = '') => '<label class="field"><span>' + e(A.t(label)) + '</span><input name="' + e(name) + '" type="' + type + '" value="' + e(value) + '" ' + extra + '></label>';
  A.select = (label, name, options, value = '', extra = '') => '<label class="field"><span>' + e(A.t(label)) + '</span><select name="' + e(name) + '" ' + extra + '>' + options.map(o => {
    const val = typeof o === 'object' ? o.value : o, text = typeof o === 'object' ? o.label : o;
    return '<option value="' + e(val) + '" ' + (String(val) === String(value) ? 'selected' : '') + '>' + e(text) + '</option>';
  }).join('') + '</select></label>';
  A.textarea = (label, name, value = '', extra = '') => '<label class="field full"><span>' + e(A.t(label)) + '</span><textarea name="' + e(name) + '" ' + extra + '>' + e(value) + '</textarea></label>';
  A.badge = (value, tone) => {
    const t = tone || (/Approved|Active|Completed|Resolved|Verified|Seat confirmed|Published|Delivered|Accepted|ACCEPTED|UP\b|Checked in|Present/i.test(value) ? 'green' : /Fail|Conflict|DOWN|Reject|Overdue|overdue|Absent|Escalated|L2|503/i.test(value) ? 'red' : /Pending|Open|Query|under review|Submitted|Provisional|Wait/i.test(value) ? 'gold' : 'blue');
    return '<span class="badge ' + t + '">' + e(value) + '</span>';
  };
  A.table = (rows, cols, action, empty = 'No records to display') =>
    '<div class="table-wrap"><table><thead><tr>' + cols.map(c => '<th>' + e(c[1]) + '</th>').join('') + (action ? '<th></th>' : '') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + cols.map(c => '<td>' + (c[2] ? c[2](r) : e(r[c[0]])) + '</td>').join('') + (action ? '<td class="nowrap">' + action(r) + '</td>' : '') + '</tr>').join('') +
    '</tbody></table>' + (!rows.length ? '<div class="empty-state"><h3>' + e(empty) + '</h3></div>' : '') + '</div>';
  A.kv = (obj, cols = 3) => '<div class="detail-grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => '<div class="detail-item"><small>' + e(k) + '</small><span>' + (typeof v === 'object' && v.html ? v.html : e(v)) + '</span></div>').join('') + '</div>';
  A.metric = (label, value, icon = 'chart', note = '') => '<div class="card stat-card"><div class="stat-top">' + e(A.t(label)) + '<span class="icon-box">' + A.icon(icon) + '</span></div><div class="stat-value">' + e(value) + '</div>' + (note ? '<div class="stat-note">' + e(note) + '</div>' : '') + '</div>';
  A.heading = (title, description, actions = '') => '<div class="page-heading"><div><div class="breadcrumb">Digital ILAC · ' + e(A.user ? A.centreOf(A.user) : 'Worker services') + '</div><h1>' + e(A.t(title)) + '</h1><p>' + e(description) + '</p></div><div class="row wrap">' + actions + '</div></div>';
  A.tabs = (items, active, action) => '<div class="tabs">' + items.map(([id, label]) => '<button type="button" class="tab ' + (id === active ? 'active' : '') + '" data-action="' + e(action) + '" data-id="' + e(id) + '">' + e(A.t(label)) + '</button>').join('') + '</div>';
  A.empty = text => '<div class="empty-state"><h3>' + e(text) + '</h3></div>';
  A.notice = (html, tone = 'info') => '<div class="notice notice-' + tone + '">' + html + '</div>';
  A.prettyJson = o => e(JSON.stringify(o, null, 2));

  A.toast = message => {
    const node = document.querySelector('#toast');
    node.textContent = message;node.classList.add('show');
    clearTimeout(A.toastTimer);A.toastTimer = setTimeout(() => node.classList.remove('show'), 4500);
  };
  A.modal = (title, body, actions = '', wide = false) => {
    const node = document.querySelector('#modal');
    node.className = wide ? 'wide' : '';
    node.innerHTML = '<div class="modal-header"><h2 id="modal-title">' + e(title) + '</h2>' + A.button('Close', 'close', '', 'btn btn-sm') + '</div><div class="modal-body">' + body + '</div><div class="modal-actions">' + actions + A.button('Close', 'close') + '</div>';
    if (!node.open) node.showModal();
    A.translateDom(node);
    if (A.restoreFormDrafts) A.restoreFormDrafts(node);
  };
  A.closeModal = () => {const n = document.querySelector('#modal');if (n.open) n.close();};

  A.download = (filename, text, mime = 'text/csv;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([text], {type: mime}));
    const a = document.createElement('a');a.href = url;a.download = filename;a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  A.centreOf = user => {
    const j = user.jurisdiction;
    return A.st.cById.get(j) ? A.centreName(j) : /^State/i.test(j) ? 'State level' : j;
  };

  // ---------- chrome ----------
  A.govHeader = () => '<div class="gov-utility"><span>ఆంధ్రప్రదేశ్ ప్రభుత్వం &nbsp; | &nbsp; GOVERNMENT OF ANDHRA PRADESH</span><span>Labour Department · APBOCWWB</span></div><header class="gov-header"><a class="brand" href="#home"><img src="assets/images/ap-emblem.png" alt="Andhra Pradesh emblem"><div><div class="brand-title">Digital ILAC</div><div class="brand-sub">Integrated Labour Amenities Complex<br>AP Building & Other Construction Workers Welfare Board</div></div></a><div class="leaders">' +
    [['chandrababu-naidu.jpg', 'Sri N. Chandrababu Naidu', 'Hon’ble Chief Minister'], ['pawan-kalyan.jpg', 'Sri K. Pawan Kalyan', 'Hon’ble Deputy Chief Minister'], ['vasamsetti-subhash.png', 'Sri Vasamsetti Subhash', 'Hon’ble Labour Minister']].map(([img, name, role]) => '<div class="leader"><img src="assets/images/' + img + '" alt="' + name + '"><div><strong>' + name + '</strong><span>' + role + '</span></div></div>').join('') + '</div></header>';
  A.demoStrip = () => '';
  A.footer = () => '<footer class="footer"><div>Digital ILAC · Worker services<br>APBOCWWB · Government of Andhra Pradesh' + (A.route === 'home' ? '<div class="footer-config">' + A.button('Configure demo', 'configure', '', 'config-button') + '</div>' : '') + '</div><div>Enrollment · Entitlement · Empowerment · Employment<br>' + A.link('Home', 'home', 'text-button') + '</div></footer>';

  A.shell = body => {
    const nav = A.navFor(A.user);
    const chips = A.sessions.length > 1 ? '<div class="session-chips" aria-label="Active sessions">' + A.sessions.map(s => '<button type="button" class="chip ' + (s.login_id === A.user.login_id ? 'active' : '') + '" data-action="switch-session" data-id="' + e(s.login_id) + '">' + e(s.login_id) + '</button>').join('') + '</div>' : '';
    return A.govHeader() + A.demoStrip() + '<div class="workspace"><aside class="sidebar" id="sidebar" aria-label="Role navigation"><div class="sidebar-brand"><strong>' + e(A.user.login_id) + '</strong><p class="small muted">' + e(A.user.role) + '<br>' + e(A.centreOf(A.user)) + '</p></div>' +
      nav.map(id => {const v = A.views[id];return v ? '<a class="nav-link ' + (A.route === 'v/' + id ? 'active' : '') + '" href="#v/' + id + '">' + A.icon(v.icon || 'file') + '<span>' + e(A.t(v.title)) + '</span><span class="nav-number">' + e(v.module || '') + '</span></a>' : '';}).join('') +
      '<div class="sidebar-note">Modules enabled for this role: ' + e(A.user.modules_enabled) + '</div></aside><div class="workspace-main"><div class="app-topbar"><div class="row">' + A.button('☰', 'menu', 'aria-label="Open navigation"', 'btn btn-icon mobile-menu') + '<span class="context-chip">' + e(A.user.role) + ' · ' + e(A.user.jurisdiction) + '</span>' + chips + '</div><div class="row">' +
      A.button('Add session', 'add-session', '', 'btn btn-sm') + A.button(A.lang === 'en' ? 'తెలుగు' : 'English', 'language', '', 'btn btn-sm') + A.button('Demo tools', 'tools', '', 'btn btn-sm btn-gold') + A.button('Sign out', 'logout', '', 'btn btn-sm') +
      '</div></div><main id="main-content" tabindex="-1" class="content">' + body + '</main>' + A.footer() + '</div></div>' + A.toolsPanel();
  };

  // ---------- event dispatch ----------
  document.addEventListener('click', async event => {
    const node = event.target.closest('[data-action]');
    if (!node) return;
    const handler = A.actions[node.dataset.action];
    if (!handler) return;
    try {await handler(node, event);} catch (error) {console.debug(error);A.toast(error.message || String(error));}
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.id || !A.forms[form.id]) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {await A.forms[form.id](form, data);} catch (error) {
      console.debug(error);
      const node = form.querySelector('.form-error');
      if (node) node.textContent = error.message;else A.toast(error.message || String(error));
    }
  });

  /** Re-render the active route, keeping scroll position. */
  A.refresh = () => {const y = window.scrollY;A.render();window.scrollTo(0, y);};
  A.actions.close = () => A.closeModal();
  A.actions.menu = () => document.querySelector('#sidebar')?.classList.toggle('open');
  A.actions.language = () => {A.lang = A.lang === 'en' ? 'te' : 'en';A.refresh();};
}());
