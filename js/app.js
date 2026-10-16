/* Router, boot and state persistence.
   All working state, form drafts, tokens and registrations are preserved across page reloads.
   Clicking "Reset all demo data" in demo tools clears all saved work and restores pristine dataset v1.0. */
(function () {
  const A = window.ILAC, e = A.esc;
  A.db = A.copy(window.ILAC_DATA);          // public information content (modules, schemes, CSC services)
  A.module = id => A.db.modules.find(m => m.id === id);
  A.loginStep = 'credentials';

  const STORAGE_KEY = 'ilac_demo_saved_state_v1';
  let saveTimer = null;

  // ---------- persistence helpers ----------
  A.captureActiveForms = function () {
    if (!A.formDrafts) A.formDrafts = {};
    if (typeof document === 'undefined') return;
    for (const form of document.querySelectorAll('form[id]')) {
      if (!form.id) continue;
      const draft = A.formDrafts[form.id] || {};
      for (const el of form.elements) {
        if (!el.name || el.type === 'submit' || el.type === 'button') continue;
        if (form.id === 'login-form' && el.name === 'password' && !A.loginPassword) continue;
        if (el.type === 'checkbox') {
          draft[el.name] = el.checked;
        } else if (el.type === 'radio') {
          if (el.checked) draft[el.name] = el.value;
        } else {
          draft[el.name] = el.value;
        }
      }
      A.formDrafts[form.id] = draft;
    }
  };

  A.saveState = function () {
    if (A.isResetting) return;
    if (typeof localStorage === 'undefined') return;
    try {
      A.captureActiveForms();
      // Prepare serializable copy of A.st (omitting Map instances like wById, etc.)
      const stCopy = {};
      if (A.st) {
        for (const [k, v] of Object.entries(A.st)) {
          if (k.endsWith('ById') || k === 'svcByCode') continue;
          stCopy[k] = v;
        }
      }
      const payload = {
        st: stCopy,
        reg: A.reg,
        user: A.user,
        sessions: A.sessions || [],
        pendingLogin: A.pendingLogin,
        loginStep: A.loginStep,
        loginUsername: A.loginUsername || '',
        loginPassword: A.loginPassword || '',
        stepDone: A.stepDone || {},
        route: location.hash,
        workerTab: A.workerTab,
        workerQuery: A.workerQuery,
        jmTab: A.jmTab,
        jmFound: A.jmFound,
        cnsQuery: A.cnsQuery,
        misTab: A.misTab,
        drill: A.drill,
        reportsRun: Array.from(A.reportsRun || []),
        builder: A.builder,
        misSelected: A.misSelected,
        lastAddedMember: A.lastAddedMember,
        cfgTab: A.cfgTab,
        refFilter: A.refFilter,
        auditVerified: A.auditVerified,
        lang: A.lang,
        D: A.D,
        shift: A.shift,
        formDrafts: A.formDrafts || {}
      };
      if (A.dev) {
        payload.dev = {
          screen: A.dev.screen,
          airplane: A.dev.airplane,
          loggedIn: A.dev.loggedIn,
          unlocked: A.dev.unlocked,
          outbox: A.dev.outbox,
          seq: A.dev.seq,
          attendance: A.dev.attendance,
          checklist: A.dev.checklist,
          observations: A.dev.observations,
          skilling: A.dev.skilling,
          provisional: A.dev.provisional,
          lastSync: A.dev.lastSync,
          cipher: A.dev.cipher
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.debug('State save failed:', err);
    }
  };

  A.scheduleSave = function () {
    if (A.isResetting) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => A.saveState(), 120);
  };

  A.loadState = function () {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.st) return false;

      // Restore working state
      A.st = data.st;
      A.indexes();

      // Restore wizard draft
      if (data.reg) A.reg = data.reg;

      // Restore user & sessions
      if (data.user !== undefined) A.user = data.user;
      if (data.sessions) A.sessions = data.sessions;
      if (data.pendingLogin !== undefined) A.pendingLogin = data.pendingLogin;
      if (data.loginStep) A.loginStep = data.loginStep;
      if (data.loginUsername !== undefined) A.loginUsername = data.loginUsername;
      if (data.loginPassword !== undefined) A.loginPassword = data.loginPassword;

      // Restore demonstration script progress
      if (data.stepDone) A.stepDone = data.stepDone;

      // Restore UI views and tabs
      if (data.workerTab) A.workerTab = data.workerTab;
      if (data.workerQuery !== undefined) A.workerQuery = data.workerQuery;
      if (data.jmTab) A.jmTab = data.jmTab;
      if (data.jmFound !== undefined) A.jmFound = data.jmFound;
      if (data.cnsQuery !== undefined) A.cnsQuery = data.cnsQuery;
      if (data.misTab) A.misTab = data.misTab;
      if (data.drill) A.drill = data.drill;
      if (data.reportsRun) A.reportsRun = new Set(data.reportsRun);
      if (data.builder) A.builder = data.builder;
      if (data.misSelected !== undefined) A.misSelected = data.misSelected;
      if (data.lastAddedMember !== undefined) A.lastAddedMember = data.lastAddedMember;
      if (data.cfgTab) A.cfgTab = data.cfgTab;
      if (data.refFilter) A.refFilter = data.refFilter;
      if (data.auditVerified !== undefined) A.auditVerified = data.auditVerified;
      if (data.lang) A.lang = data.lang;
      if (data.D) A.D = data.D;
      if (data.shift !== undefined) A.shift = data.shift;
      if (data.formDrafts) A.formDrafts = data.formDrafts;

      if (data.dev && A.dev) {
        Object.assign(A.dev, data.dev);
      }

      // Restore route if current hash is empty or home
      if (data.route && (!location.hash || location.hash === '#home' || location.hash === '')) {
        location.hash = data.route;
      }

      return true;
    } catch (err) {
      console.debug('Failed to load saved state:', err);
      return false;
    }
  };

  A.clearSavedState = function () {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      A.formDrafts = {};
    } catch (err) {
      console.debug('Failed to clear saved state:', err);
    }
  };

  A.restoreFormDrafts = function (container = document) {
    if (!A.formDrafts) return;
    for (const [formId, fields] of Object.entries(A.formDrafts)) {
      const form = container.querySelector('#' + formId);
      if (!form) continue;
      for (const [name, val] of Object.entries(fields)) {
        const el = form.elements[name];
        if (!el) continue;
        if (typeof RadioNodeList !== 'undefined' && el instanceof RadioNodeList) {
          el.value = val;
        } else if (el.type === 'checkbox') {
          el.checked = Boolean(val);
        } else if (el.type === 'radio') {
          if (el.value === val) el.checked = true;
        } else if (val !== undefined && val !== null) {
          el.value = val;
        }
      }
    }
  };

  A.render = () => {
    const hash = location.hash.slice(1) || 'home';
    const [type, id, param] = hash.split('/');
    if (hash !== A.lastHash) A.filter = '';
    A.lastHash = hash;
    A.route = type === 'v' ? 'v/' + id : hash;
    let body;
    if (type === 'home') body = A.home();
    else if (type === 'service') body = A.publicModule(id);
    else if (type === 'login') body = A.loginPage(id === 'worker' ? 'worker' : 'staff', A.loginStep) + (A.user ? '' : A.toolsPanel());
    else if (type === 'v' && !A.user) {A.afterLogin = hash;location.hash = 'login/staff';return;}
    else if (type === 'v') {
      const view = A.views[id];
      if (!view) body = A.shell(A.heading('Not found', 'No such workspace.', A.link('Home', 'home')));
      else if (!A.canOpen(A.user, id)) body = A.shell(A.heading('Access restricted', 'Your role (' + A.user.role + ') does not include this module.', A.link('My workspace', 'v/' + A.navFor(A.user)[0])));
      else body = A.shell(view.render(param));
    } else body = A.publicWrap('<section class="section"><h1>Page not found</h1>' + A.link('Home', 'home') + '</section>');
    document.querySelector('#app').innerHTML = body;
    document.documentElement.lang = A.lang;
    A.translateDom(document.querySelector('#app'));
    A.restoreFormDrafts(document.querySelector('#app'));
    document.title = A.t('Digital ILAC') + ' | ' + (A.user ? A.user.login_id : A.t('Government of Andhra Pradesh'));
    if (A.user && A.user.login_id === 'demo.ff.krs' && !A.dev.loggedIn && !A.devLoggingIn) {
      A.devLoggingIn = true;
      A.devLogin().then(() => {A.devLoggingIn = false;A.refresh();});
    }
    if (!A.isResetting) A.scheduleSave();
  };

  A.resetAll = () => {
    A.isResetting = true;
    clearTimeout(saveTimer);
    A.clearSavedState();
    A.reset();
    A.devReset();
    A.sessions = [];
    A.user = null;
    A.pendingLogin = null;
    A.loginStep = 'credentials';
    A.loginUsername = '';
    A.loginPassword = '';
    A.stepDone = {};
    A.reg = A.newRegDraft();
    A.workerQuery = '';
    A.workerTab = 'profile';
    A.jmFound = null;
    A.jmTab = 'overview';
    A.cnsQuery = '';
    A.misTab = 'dashboard';
    A.drill = {level: 'state'};
    A.reportsRun = new Set();
    A.builder = {dataset: 'workers', filters: [], groupBy: ['district']};
    A.misSelected = null;
    A.lastAddedMember = null;
    A.cfgTab = 'forms';
    A.refFilter = 'all';
    A.auditVerified = '';
    A.closeModal();
    location.hash = 'home';
    A.render();
    setTimeout(() => { A.isResetting = false; }, 150);
  };

  // Form input and change events to auto-save drafts
  const onFormInput = target => {
    if (!target || !target.form) return;
    const form = target.form;
    if (!form.id) return;
    if (form.id === 'login-form' && target.name === 'password' && !A.loginPassword) return;
    if (!A.formDrafts) A.formDrafts = {};
    if (!A.formDrafts[form.id]) A.formDrafts[form.id] = {};
    if (target.type === 'checkbox') A.formDrafts[form.id][target.name] = target.checked;
    else if (target.type === 'radio') { if (target.checked) A.formDrafts[form.id][target.name] = target.value; }
    else A.formDrafts[form.id][target.name] = target.value;

    // Keep active wizard models in sync
    if (form.id === 'reg-details-form' && A.reg) {
      A.reg.f = A.reg.f || {};
      A.reg.f[target.name] = target.value;
    } else if (form.id === 'reg-check-form' && A.reg) {
      A.reg.search = A.reg.search || {};
      A.reg.search[target.name] = target.value;
    } else if (form.id === 'reg-household-form' && A.reg && target.name.startsWith('hh_')) {
      A.reg.hh = A.reg.hh || {};
      A.reg.hh[target.name.slice(3)] = target.value;
    }
    A.scheduleSave();
  };

  document.addEventListener('input', event => onFormInput(event.target));
  document.addEventListener('change', event => onFormInput(event.target));

  // Clear draft on successful form submit
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form && form.id && A.formDrafts) {
      delete A.formDrafts[form.id];
      A.scheduleSave();
    }
  }, true);

  // A dataset change in the report builder re-renders its field lists immediately.
  document.addEventListener('change', event => {
    const n = event.target;
    if (n.matches && n.matches('#builder-form select[name="dataset"]')) n.form.requestSubmit();
  });
  document.querySelector('.skip-link').addEventListener('click', event => {event.preventDefault();document.querySelector('#main-content')?.focus();});
  window.addEventListener('hashchange', A.render);

  window.addEventListener('beforeunload', () => {
    if (!A.isResetting) A.saveState();
  });
  window.addEventListener('pagehide', () => {
    if (!A.isResetting) A.saveState();
  });

  // Retire any earlier service worker/caches from previous builds.
  if (location.protocol !== 'file:' && navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.filter(r => r.scope === new URL('./', location.href).href).map(r => r.unregister()))).catch(() => {});
    if (window.caches) caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ilac-t4-')).map(k => caches.delete(k)))).catch(() => {});
  }

  // Initialize session defaults
  A.sessions = [];A.user = null;A.pendingLogin = null;A.loginStep = 'credentials';A.stepDone = {};
  A.reg = A.newRegDraft();A.workerQuery = '';A.workerTab = 'profile';A.jmFound = null;A.jmTab = 'overview';A.cnsQuery = '';A.misTab = 'dashboard';A.drill = {level: 'state'};A.reportsRun = new Set();A.builder = {dataset: 'workers', filters: [], groupBy: ['district']};A.misSelected = null;A.lastAddedMember = null;A.cfgTab = 'forms';A.refFilter = 'all';A.auditVerified = '';

  // Attempt to load saved demo work on boot
  A.loadState();

  A.render();
}());
