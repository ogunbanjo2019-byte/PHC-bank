(() => {
  'use strict';
  const base = String(window.PHC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const target = base ? new URL('/api/dashboard', base).toString() : '/api/dashboard';
  fetch(target, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Could not load account details')))
    .then((data) => {
      const account = (data.accounts || [])[0] || {};
      const currency = account.currency || 'USD';
      const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount || 0));
      const total = Number(account.balance || 0);
      const available = Number(account.available_balance ?? total);
      const due = (data.charges || []).reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
      document.querySelector('#detailAccountLabel').textContent = account.name || 'Account';
      document.querySelector('#breakdownAccountLabel').textContent = account.name || 'Account';
      document.querySelector('#detailAccountStatus').textContent = account.status || '—';
      document.querySelector('#detailCurrency').textContent = currency;
      document.querySelector('#currencyChip').textContent = currency;
      document.querySelector('#detailTotal').textContent = money(total);
      document.querySelector('#detailAvailable').textContent = money(available);
      document.querySelector('#detailDue').textContent = money(due);
      document.querySelector('#breakdownTotal').textContent = money(total);
      document.querySelector('#breakdownAvailable').textContent = money(available);
      document.querySelector('#breakdownDue').textContent = money(due);
      document.documentElement.classList.add('session-verified');
    })
    .catch(() => { window.location.replace('/?authRequired=1'); });
})();
