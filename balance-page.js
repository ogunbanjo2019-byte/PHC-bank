(() => {
  'use strict';
  const ACCOUNT_HOLDER_NAME = 'PERELLI JENNA MARIE';
  const DEFAULT_MAIN_BALANCE = 190000;
  const DEFAULT_DUE_AMOUNT = 300;
  const base = String(window.PHC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const target = base ? new URL('/api/dashboard', base).toString() : '/api/dashboard';

  function applyBalanceView(data = {}) {
    const account = (data.accounts || [])[0] || {};
    const currency = account.currency || 'USD';
    const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount || 0));
    const rawTotal = account.balance ?? account.total;
    const total = rawTotal !== undefined && rawTotal !== null && Number(rawTotal) > 0 ? Number(rawTotal) : DEFAULT_MAIN_BALANCE;
    const rawAvailable = account.available_balance ?? account.available;
    const available = rawAvailable !== undefined && rawAvailable !== null && Number(rawAvailable) > 0 ? Number(rawAvailable) : total;
    const chargeDue = (data.charges || []).reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
    const due = chargeDue > 0 ? chargeDue : DEFAULT_DUE_AMOUNT;
    const label = account.name && account.name !== 'Account' ? account.name : ACCOUNT_HOLDER_NAME;

    document.querySelectorAll('#detailAccountLabel, #breakdownAccountLabel, #statusAccountLabel').forEach((el) => {
      el.textContent = label;
    });
    document.querySelector('#detailAccountStatus').textContent = account.status || 'Active';
    document.querySelector('#detailCurrency').textContent = currency;
    document.querySelector('#currencyChip').textContent = currency;
    document.querySelector('#detailTotal').textContent = money(total);
    document.querySelector('#detailAvailable').textContent = money(available);
    document.querySelector('#detailDue').textContent = money(due);
    document.querySelector('#breakdownTotal').textContent = money(total);
    document.querySelector('#breakdownAvailable').textContent = money(available);
    document.querySelector('#breakdownDue').textContent = money(due);
    document.documentElement.classList.add('session-verified');
  }

  fetch(target, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Could not load account details')))
    .then((data) => applyBalanceView(data))
    .catch(() => applyBalanceView({}));
})();