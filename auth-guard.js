(() => {
  'use strict';
  const base = String(window.PHC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const target = base ? new URL('/api/auth/me', base).toString() : '/api/auth/me';
  fetch(target, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Sign-in required')))
    .then((session) => {
      if (!session.user) throw new Error('Sign-in required');
      document.documentElement.classList.add('session-verified');
    })
    .catch(() => { window.location.replace('/?authRequired=1'); });
})();
