(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const loginView = $('#loginView');
  const appView = $('#appView');
  const loginForm = $('#loginForm');
  const loginError = $('#loginError');
  const dialogBackdrop = $('#dialogBackdrop');
  const toast = $('#toast');
  const apiBaseUrl = String(window.PHC_API_BASE_URL || '').trim().replace(/\/$/, '');
  let toastTimer;
  let signedInUser = null;


  const money = (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount || 0));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  async function api(path, options = {}) {
    const target = apiBaseUrl ? new URL(path, apiBaseUrl).toString() : path;
    const response = await fetch(target, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
    return payload;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function showLogin(message = '') {
    loginView.hidden = false;
    appView.hidden = true;
    signedInUser = null;
    loginError.textContent = message;
  }

  function renderAccount(account, due) {
    const name = account?.name || 'Primary Account';
    const currency = account?.currency || 'USD';
    const total = Number(account?.balance ?? account?.total ?? 0);
    const available = Number(account?.available_balance ?? account?.available ?? total);
    const outstanding = Number(due ?? 0);
    $('#accountLabel').textContent = name;
    $('#totalBalance').textContent = money(total, currency);
    $('#availableBalance').textContent = money(available, currency);
    $('#accountBalance').textContent = money(total, currency);
    $('#outstandingAmount').textContent = money(outstanding, currency);
    $('#summaryTotal').textContent = money(total, currency);
    $('#summaryAvailable').textContent = money(available, currency);
    $('#summaryDue').textContent = money(outstanding, currency);
    $('#accountList').innerHTML = `<div class="account-tile"><div class="account-tile-top"><span class="tile-symbol">▣</span><span class="account-status"><i></i> ${escapeHTML(account?.status || 'Active')}</span></div><p>${escapeHTML(name)}</p><strong>${money(total, currency)}</strong><small>${escapeHTML(account?.type || 'Account')} <span>${escapeHTML(account?.masked || '')}</span></small></div>`;
  }

  function renderTransactions(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const icons = ['↙', '▦', '↗'];
    const html = list.slice(0, 5).map((row, index) => {
      const status = String(row.status || 'Pending').toLowerCase();
      const statusClass = ['completed', 'pending', 'failed'].includes(status) ? status : 'pending';
      const amount = Number(row.amount || 0);
      const date = row.date || row.created_at;
      const dateLabel = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
      return `<tr><td><span class="transaction-icon ${index === 1 ? 'purple' : index === 2 ? 'green' : ''}">${icons[index % icons.length]}</span><span class="transaction-title">${escapeHTML(row.description || 'Account activity')}</span></td><td>${escapeHTML(dateLabel)}</td><td>${escapeHTML(row.category || 'Account')}</td><td class="${amount >= 0 ? 'amount-positive' : ''}">${amount >= 0 ? '+' : '−'}${money(Math.abs(amount), row.currency || 'USD')}</td><td><span class="status-pill ${statusClass}">${escapeHTML(statusClass.charAt(0).toUpperCase() + statusClass.slice(1))}</span></td></tr>`;
    }).join('');
    $('#transactionRows').innerHTML = html || '<tr><td colspan="5">No account activity is available.</td></tr>';
  }

  function openDashboard({ user, account, due, transactions } = {}) {
    signedInUser = user;
    loginView.hidden = true;
    appView.hidden = false;
    $('#profileName').textContent = user?.email || 'Account holder';
    renderAccount(account, due);
    renderTransactions(transactions);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadRealDashboard(user) {
    const data = await api('/api/dashboard');
    const accounts = data.accounts || [];
    const account = accounts[0] || { name: 'Primary Account', type: 'Account', status: 'Active', currency: 'USD', balance: 0, available_balance: 0 };
    const due = (data.charges || []).filter((charge) => ['due', 'pending', 'outstanding'].includes(String(charge.status).toLowerCase())).reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
    openDashboard({ user, account, due, transactions: data.transactions || [] });
  }

  function openInfo(kind) {
    const details = {
      withdraw: { eyebrow: 'WITHDRAWAL INFORMATION', title: 'AMOUNT DUE', body: 'Review the amount currently shown for this account. This notice does not initiate a withdrawal.', amount: $('#outstandingAmount').textContent, icon: '↗' },
      fees: { eyebrow: 'FEES & TRANSACTION HISTORY', title: 'View Fees & Transaction History', body: 'Please kindly pay the amount currently due to proceed.', amount: '', icon: '▤' },
      amount: { eyebrow: 'ACCOUNT INFORMATION', title: 'OUTSTANDING AMOUNT', body: 'This amount is shown for account information. Please verify any actual charge directly with an authorized account representative.', amount: $('#outstandingAmount').textContent, icon: '$' }
    };
    const item = details[kind];
    if (!item) return;
    $('#dialogEyebrow').textContent = item.eyebrow;
    $('#dialogTitle').textContent = item.title;
    $('#dialogBody').textContent = item.body;
    $('#dialogBody').classList.toggle('dialog-body-emphasis', kind === 'fees');
    $('#dialogIcon').textContent = item.icon;
    const amount = $('#dialogAmount');
    amount.textContent = item.amount;
    amount.hidden = !item.amount;
    dialogBackdrop.hidden = false;
    $('#dialogClose').focus();
  }

  function closeDialog() { dialogBackdrop.hidden = true; }

  function onAction(action) {
    if (['withdraw', 'fees', 'amount'].includes(action)) return openInfo(action);
    if (action === 'settings') return showToast('Account settings are available through your account administrator.');
  }

  function setActiveSection(section) {
    document.querySelectorAll('[data-section]').forEach((button) => button.classList.toggle('active', button.dataset.section === section));
    if (section === 'transactions') { window.location.assign('/transactions.html'); return; }
    const target = section === 'accounts' ? '#accountsSection' : section === 'transactions' ? '#transactionsSection' : section === 'settings' ? null : '.welcome-row';
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (section === 'settings') showToast('Account settings are available through your account administrator.');
    $('#sidebar').classList.remove('open');
  }

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    const sectionButton = event.target.closest('[data-section]');
    if (actionButton) onAction(actionButton.dataset.action);
    else if (sectionButton) setActiveSection(sectionButton.dataset.section);
  });

  const signupForm = $('#signupForm');
  const authTitle = $('#authTitle');
  const authSubtitle = $('#authSubtitle');
  const authEyebrow = $('#authEyebrow');
  function showSignupForm() {
    loginForm.hidden = true;
    signupForm.hidden = false;
    $('#loginSwitch').hidden = true;
    $('#signupSwitch').hidden = false;
    authEyebrow.textContent = 'CREATE ACCOUNT';
    authTitle.textContent = 'Create your account';
    authSubtitle.textContent = 'Register with your email and a secure password.';
    $('#signupEmail').value = $('#email').value.trim();
    $('#signupEmail').focus();
  }
  function showLoginForm() {
    signupForm.hidden = true;
    loginForm.hidden = false;
    $('#signupSwitch').hidden = true;
    $('#loginSwitch').hidden = false;
    authEyebrow.textContent = 'WELCOME BACK';
    authTitle.textContent = 'Sign in to your account';
    authSubtitle.textContent = 'Enter the credentials provided for your account.';
    $('#email').focus();
  }
  $('#showSignup').addEventListener('click', showSignupForm);
  $('#showLogin').addEventListener('click', showLoginForm);
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = $('#signupMessage');
    message.classList.remove('success');
    message.textContent = '';
    const password = $('#signupPassword').value;
    if (password !== $('#confirmPassword').value) {
      message.textContent = 'The passwords do not match.';
      return;
    }
    const submit = signupForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Creating account…';
    try {
      const result = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: $('#signupEmail').value.trim(), password }) });
      if (result.authenticated && result.user) {
        await loadRealDashboard(result.user);
      } else {
        message.classList.add('success');
        message.textContent = result.message || 'Account request received. Check your email to confirm, then sign in.';
        $('#signupPassword').value = '';
        $('#confirmPassword').value = '';
      }
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Create account <span aria-hidden="true">→</span>';
    }
  });

  $('#togglePassword').addEventListener('click', () => {
    const input = $('#password');
    const shown = input.type === 'password';
    input.type = shown ? 'text' : 'password';
    $('#togglePassword').textContent = shown ? 'Hide' : 'Show';
    $('#togglePassword').setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
  });
  $('#forgotPassword').addEventListener('click', async () => {
    const email = $('#email').value.trim();
    if (!email) { loginError.textContent = 'Enter your email address first to request password-reset instructions.'; $('#email').focus(); return; }
    try { await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }
    catch (_) { /* Keep account existence and provider configuration private. */ }
    loginError.textContent = 'If password recovery is enabled for this account, instructions will be sent to the address provided.';
  });
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value, remember: $('#remember').checked }) });
      await loadRealDashboard(result.user);
    } catch (error) {
      loginError.textContent = error.message === 'Invalid login credentials' ? 'The email address or password is incorrect.' : error.message;
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
    }
  });
  $('#logoutButton').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch (_) {}
    showLogin('You have signed out.');
  });
  $('#dialogClose').addEventListener('click', closeDialog);
  $('#dialogDone').addEventListener('click', closeDialog);
  dialogBackdrop.addEventListener('click', (event) => { if (event.target === dialogBackdrop) closeDialog(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDialog(); $('#sidebar').classList.remove('open'); } });
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#notificationButton').addEventListener('click', () => showToast('You are viewing the latest available account information.'));
  $('#profileButton').addEventListener('click', () => showToast(signedInUser?.email || 'Account profile'));
  document.querySelectorAll('[data-tip]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.tip)));
  $('#currentDate').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  if (new URLSearchParams(location.search).has('authRequired')) loginError.textContent = 'Please sign in to access your account.';

  (async () => {
    try {
      const status = await api('/api/config');
      if (!status.supabaseConfigured) {
        $('#setupNote').hidden = false;
        $('#setupNote').textContent = 'Sign-in is not configured yet. Connect Supabase in the backend environment to enable authorized account access.';
      }
      const session = await api('/api/auth/me');
      if (session.user) await loadRealDashboard(session.user);
    } catch (_) { /* Keep the sign-in view visible when authentication cannot be verified. */ }
  })();
})();
