const API_BASE = 'https://events-dashboard-backend.onrender.com';

(async function checkLogin() {
  const pathname = window.location.pathname.toLowerCase();
  const isLoginPage =
    pathname.endsWith('/index.html') ||
    pathname === '/' ||
    pathname === '' ||
    window.location.href.toLowerCase().endsWith('/');

  if (isLoginPage) {
    console.log('[config.js] Skipping login check on login page');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('[config.js] No token found, redirecting...');
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/verify-token`, {
      headers: { Authorization: token }
    });

    if (!res.ok) {
      console.warn('[config.js] Invalid token. Logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error('[config.js] Auth check failed:', err);
    window.location.href = 'index.html';
  }
})();
