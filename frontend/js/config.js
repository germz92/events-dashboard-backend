// js/config.js
const API_BASE = 'https://events-dashboard-backend.onrender.com';

(async function checkLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'index.html'; // redirect to login if missing
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
        window.location.href = 'index.html'; // token invalid, redirect to login
      }
    } catch (err) {
      console.error('Auth check failed', err);
      window.location.href = 'index.html';
    }
  })();