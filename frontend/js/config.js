const API_BASE = 'https://events-dashboard-backend.onrender.com';

(async function checkLogin() {
  const path = window.location.pathname;
  const isLoginPage =
    path.endsWith('index.html') || path === '/' || path === '' || window.location.href.endsWith('/');

  if (isLoginPage) return; // 🛑 Prevent infinite redirect loop

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/verify-token`, {
      headers: {
        Authorization: token
      }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('fullName');
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error('Auth check failed', err);
    window.location.href = 'index.html';
  }
})();
