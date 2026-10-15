/* Login (password + OTP from the mock gateway), concurrent sessions, role navigation. */
(function () {
  const A = window.ILAC, e = A.esc;
  A.DEMO_PASSWORD = 'admin@123';
  A.OTP = '123456';

  // Role -> workspace routes (M05_Users_Roles.modules_enabled decides what is offered).
  const NAV = {
    'demo.op.ntr': ['dashboard', 'queue', 'workers', 'register', 'grievances'],
    'demo.op.krs': ['dashboard', 'queue', 'workers', 'referrals', 'integration'],
    'demo.op.gnt': ['dashboard', 'jobmela', 'placements', 'calendar', 'queue', 'workers'],
    'demo.ff.krs': ['field', 'skilling'],
    'demo.sup.krs': ['dashboard', 'conflicts', 'workers', 'config'],
    'demo.dlo.krs': ['dashboard', 'pendency', 'referrals', 'mis'],
    'demo.dlo.gnt': ['dashboard', 'jobmela', 'calendar', 'mis'],
    'demo.nodal.cs': ['dashboard', 'worklist'],
    'demo.nodal.sk': ['dashboard', 'worklist'],
    'demo.emp.001': ['dashboard', 'employer'],
    'demo.cns.edu1': ['dashboard', 'counselling', 'calendar', 'workers'],
    'demo.pmu.state': ['dashboard', 'mis'],
    'demo.admin.state': ['dashboard', 'config', 'integration', 'mis']
  };
  A.navFor = user => user.role === 'Worker' ? ['me'] : NAV[user.login_id] || ['dashboard'];
  A.canOpen = (user, id) => A.navFor(user).includes(id);

  A.loginAs = login => {
    const user = A.userByLogin(login);
    if (!user) throw new Error('Unknown account');
    if (!A.sessions.find(s => s.login_id === login)) A.sessions.push(user);
    A.user = user;
    A.audit('Login', user.login_id, user.role + ' · MFA via mock gateway');
    return user;
  };

  A.loginPage = (mode, step = 'credentials') => {
    const pending = A.pendingLogin;
    const otpMsg = A.st.gateway.find(m => m.template === 'otp' && pending && m.to === pending.login_id);
    const body = mode === 'worker'
      ? '<h1>' + e(A.t('Worker login')) + '</h1><p class="small muted space-top">Workers sign in with their registered mobile number. Enter the OTP from the mock console (123456).</p><form id="worker-login-form" class="stack space-top">' + A.field('Registered mobile number', 'mobile', A.loginPrefill || '', 'tel', 'required pattern="[0-9]{10}" maxlength="10"') + A.field('OTP', 'otp', '', 'text', 'required inputmode="numeric" maxlength="6" placeholder="123456"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">' + e(A.t('Sign in')) + '</button></form>'
      : step === 'otp' && pending
        ? '<h1>' + e(A.t('Verify OTP')) + '</h1><p class="small muted space-top">A one-time password was sent to the registered mobile of <strong>' + e(pending.login_id) + '</strong> through the mock gateway. No real SMS is sent.</p>' + (otpMsg ? '<div class="otp-console"><small>Mock console</small><div>' + e(otpMsg.text) + '</div></div>' : '') + '<form id="otp-form" class="stack space-top">' + A.field('One-time password', 'otp', '', 'text', 'required inputmode="numeric" maxlength="6" autocomplete="one-time-code"') + '<div class="form-error"></div><div class="row"><button class="btn btn-primary" type="submit">' + e(A.t('Verify and sign in')) + '</button>' + A.button('Back', 'login-back') + '</div></form>'
        : '<h1>' + e(A.t('Staff login')) + '</h1><form id="login-form" class="stack space-top">' + A.field('Username', 'username', A.loginUsername || '', 'text', 'required autocomplete="username" placeholder="demo.op.ntr"') + A.field('Password', 'password', A.loginPassword || '', 'password', 'required autocomplete="current-password"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">' + e(A.t('Continue')) + '</button></form><div class="row wrap space-top">' + A.button('Show demo accounts', 'configure', '', 'btn btn-sm') + '<span class="small muted">OTP is delivered to the mock console.</span></div>';
    return A.publicWrap('<section class="login-layout"><div class="login-support"><span class="icon-box">' + A.icon(mode === 'worker' ? 'user' : 'shield') + '</span><h2 class="space-top">' + e(mode === 'worker' ? 'Worker access' : 'Officer & staff access') + '</h2><p class="small space-top">' + (mode === 'worker' ? 'View your registration, household record and referrals.' : 'Assisted-desk operators, field functionaries, supervisors, district officers, departments, employers, counsellors, PMU and State administrators sign in here.') + '</p><div class="space-top">' + A.link(mode === 'worker' ? 'Officer & staff login' : 'Worker login', 'login/' + (mode === 'worker' ? 'staff' : 'worker')) + '</div></div><div class="card">' + body + '</div></section>');
  };

  A.credentials = () => A.table(A.st.users, [['login_id', 'Username'], ['role', 'Role'], ['jurisdiction', 'Jurisdiction'], ['used_in', 'Used in']], u => A.button('Use login', 'use-login', 'data-user="' + e(u.login_id) + '"', 'btn btn-sm'));

  A.forms['login-form'] = (form, data) => {
    const u = A.userByLogin(data.username.trim());
    if (!u || data.password !== A.DEMO_PASSWORD) throw new Error('Check the username and password. Demo password: ' + A.DEMO_PASSWORD);
    A.pendingLogin = u;
    A.sendMessage('9000000000', 'otp', {otp: A.OTP}, 'en', 'SMS');
    A.st.gateway[0].to = u.login_id;
    A.loginStep = 'otp';
    A.render();
  };
  A.forms['otp-form'] = (form, data) => {
    if (data.otp.trim() !== A.OTP) throw new Error('Incorrect OTP. The mock console shows the code.');
    const u = A.loginAs(A.pendingLogin.login_id);
    A.pendingLogin = null;A.loginStep = 'credentials';A.loginUsername = '';A.loginPassword = '';
    A.mark('1.1');
    const route = A.afterLogin || 'v/' + A.navFor(u)[0];
    A.afterLogin = null;
    location.hash = route;
    A.render();
  };
  A.forms['worker-login-form'] = (form, data) => {
    const w = A.st.workers.find(x => x.mobile === data.mobile);
    if (!w || data.otp !== A.OTP) throw new Error('Mobile number not registered, or OTP incorrect (use 123456).');
    A.user = {login_id: 'worker.' + w.worker_id, role: 'Worker', jurisdiction: w.home_centre_id, modules_enabled: 'SM-22 (own record)', worker_id: w.worker_id};
    A.sessions = [A.user];
    A.audit('Worker login', w.worker_id, 'Mobile OTP via mock gateway');
    location.hash = 'v/me';A.render();
  };
  A.actions['login-back'] = () => {A.loginStep = 'credentials';A.pendingLogin = null;A.render();};
  A.actions['use-login'] = node => {
    A.loginUsername = node.dataset.user;
    A.loginPassword = A.DEMO_PASSWORD;
    // The selected account must also replace any credentials restored on render.
    A.formDrafts = A.formDrafts || {};
    A.formDrafts['login-form'] = {username: A.loginUsername, password: A.loginPassword};
    A.loginStep = 'credentials';
    A.pendingLogin = null;
    A.closeModal();
    location.hash = 'login/staff';
    A.render();
  };
  A.actions.configure = () => A.modal('Configure demo', '<p class="small">Demo accounts from <strong>M05_Users_Roles</strong>. Every account uses password <strong>' + A.DEMO_PASSWORD + '</strong>; the one-time password is <strong>' + A.OTP + '</strong> (shown in the mock console).</p><div class="space-top">' + A.credentials() + '</div>', A.button('Reset all demo data', 'reset-all', '', 'btn btn-gold'), true);

  A.actions.logout = () => {
    const out = A.user;
    A.audit('Logout', out.login_id, '');
    A.sessions = A.sessions.filter(s => s.login_id !== out.login_id);
    if (out.login_id === 'demo.ff.krs') A.devLogout();
    A.user = A.sessions[0] || null;
    location.hash = A.user ? 'v/' + A.navFor(A.user)[0] : 'home';
    A.render();
  };
  A.actions['switch-session'] = node => {
    A.user = A.sessions.find(s => s.login_id === node.dataset.id);
    const target = A.route.startsWith('v/') && A.canOpen(A.user, A.route.slice(2)) ? A.route : 'v/' + A.navFor(A.user)[0];
    location.hash = target;A.render();
  };
  A.actions['add-session'] = () => A.modal('Add a concurrent session', '<p class="small">S2 and S3 need two live sessions. Pick an account; its session stays signed in while you switch between them.</p><form id="add-session-form" class="stack">' + A.select('Account', 'login', A.st.users.filter(u => !A.sessions.find(s => s.login_id === u.login_id)).map(u => ({value: u.login_id, label: u.login_id + ' — ' + u.role})), '') + A.field('Password', 'password', '', 'password', 'required') + A.field('OTP (mock console)', 'otp', '', 'text', 'required inputmode="numeric" maxlength="6" placeholder="123456"') + '<div class="form-error"></div><button class="btn btn-primary" type="submit">Sign in as additional user</button></form>');
  A.forms['add-session-form'] = (form, data) => {
    if (data.password !== A.DEMO_PASSWORD || data.otp !== A.OTP) throw new Error('Password or OTP incorrect (password ' + A.DEMO_PASSWORD + ', OTP ' + A.OTP + ').');
    const u = A.loginAs(data.login);
    A.sendMessage('9000000000', 'otp', {otp: A.OTP}, 'en', 'SMS');A.st.gateway[0].to = u.login_id;
    A.closeModal();location.hash = 'v/' + A.navFor(u)[0];A.render();
  };
}());
