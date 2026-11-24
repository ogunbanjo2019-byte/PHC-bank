(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const search = $('#transactionSearch');
  const filter = $('#statusFilter');
  const body = $('#transactionHistory');
  const empty = $('#noTransactions');
  const modal = $('#transactionModal');
  const apiBase = String(window.PHC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const endpoint = apiBase ? new URL('/api/dashboard', apiBase).toString() : '/api/dashboard';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Math.abs(Number(value || 0)));

  const FALLBACK_TRANSACTIONS = [
    { description: 'Opening Account Balance — PERELLI JENNA MARIE', date: '2026-11-18', category: 'Deposit', amount: 190300.00, currency: 'USD', status: 'completed' },
    { description: 'Fee & Transaction Notice — Please kindly pay the amount currently due to proceed.', date: '2026-11-20', category: 'Fees', amount: -300.00, currency: 'USD', status: 'pending' },
    { description: 'Withdrawal Request — Amount Due: $300', date: '2026-11-22', category: 'Withdrawal', amount: -300.00, currency: 'USD', status: 'failed' },
    { description: 'Account Settlement Credit', date: '2026-11-23', category: 'Transfer', amount: 300.00, currency: 'USD', status: 'completed' }
  ];

  let rows = [];

  function updateRows() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      const matches = (filter.value === 'all' || row.dataset.status === filter.value) && row.dataset.search.includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    empty.hidden = visible > 0;
  }

  function close() { modal.hidden = true; }

  function open(row) {
    $('#transactionTitle').textContent = row.cells[0].textContent;
    $('#transactionDetailText').textContent = row.dataset.detail;
    $('#transactionAmount').textContent = row.dataset.amount;
    modal.hidden = false;
    $('#closeTransaction').focus();
  }

  function render(items) {
    const list = Array.isArray(items) && items.length ? items : FALLBACK_TRANSACTIONS;
    empty.textContent = list.length ? 'No transactions match these filters.' : 'No transaction history is available for this account.';
    const counts = { completed: 0, pending: 0, failed: 0 };
    body.innerHTML = '';

    list.forEach((item) => {
      const statusRaw = String(item.status || 'pending').toLowerCase();
      const status = ['completed', 'pending', 'failed'].includes(statusRaw) ? statusRaw : 'pending';
      counts[status] += 1;
      const amount = Number(item.amount || 0);
      const currency = item.currency || 'USD';
      const date = item.date || item.created_at;
      const dateLabel = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
      const description = item.description || 'Account activity';
      const category = item.category || 'Account';
      const detail = `${description} · ${category} · ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      const amountLabel = `${amount >= 0 ? '+' : '−'}${money(amount, currency)}`;

      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.dataset.status = status;
      tr.dataset.search = `${description} ${category}`.toLowerCase();
      tr.dataset.detail = detail;
      tr.dataset.amount = amountLabel;
      tr.innerHTML = `<td>${esc(description)}</td><td>${esc(dateLabel)}</td><td>${esc(category)}</td><td class="${amount >= 0 ? 'amount-positive' : ''}">${esc(amountLabel)}</td><td><span class="status-pill ${status}">${esc(status.charAt(0).toUpperCase() + status.slice(1))}</span></td>`;
      tr.addEventListener('click', () => open(tr));
      tr.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(tr); } });
      body.appendChild(tr);
    });

    rows = [...body.querySelectorAll('tr')];
    $('#countAll').textContent = String(rows.length);
    $('#countCompleted').textContent = String(counts.completed);
    $('#countPending').textContent = String(counts.pending);
    $('#countFailed').textContent = String(counts.failed);
    updateRows();
    document.documentElement.classList.add('session-verified');
  }

  search.addEventListener('input', updateRows);
  filter.addEventListener('change', updateRows);
  $('#closeTransaction').addEventListener('click', close);
  $('#doneTransaction').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });

  fetch(endpoint, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Sign-in required')))
    .then((data) => render(data.transactions))
    .catch(() => render(FALLBACK_TRANSACTIONS));
})();