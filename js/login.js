// LOGIN
window.login = async function() {
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  const loginBtn = document.getElementById('loginButton');
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
  }

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('fullName', data.fullName);
    window.location.href = 'events.html';
  } else {
    alert(data.error || 'Login failed');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }
}

// ✅ Allow pressing Enter key to login
document.addEventListener('DOMContentLoaded', () => {
  const passwordField = document.getElementById('password');
  if (passwordField) {
    passwordField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        login();
      }
    });
  }
});
