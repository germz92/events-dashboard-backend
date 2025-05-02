  const token = localStorage.getItem('token');
  if (!token) {
    alert('Not logged in');
    window.location.href = 'index.html';
  }

  const fullName = localStorage.getItem('fullName') || 'User';
  document.getElementById('usernameDisplay').textContent = `Welcome, ${fullName}`;

  let currentTableId = null;

  function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  }

  function showCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
  }

  function hideCreateModal() {
    document.getElementById('createModal').style.display = 'none';
  }

  async function submitCreate() {
    const title = document.getElementById('newTitle').value;
    const client = document.getElementById('newClient').value;
    const startDate = document.getElementById('newStart').value;
    const endDate = document.getElementById('newEnd').value;

    if (!title || !startDate || !endDate) {
      alert("Please fill out all fields.");
      return;
    }

    const start = `${startDate}T12:00:00`;
    const end = `${endDate}T12:00:00`;

    const res = await fetch(`${API_BASE}/api/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({
        title,
        general: { client, start, end }
      })
    });

    await res.json();
    hideCreateModal();
    loadTables();
  }

  async function loadTables() {
    const res = await fetch(`${API_BASE}/api/tables`, {
      headers: { Authorization: token }
    });

    let tables = await res.json();
    const userId = getUserIdFromToken();

    // Sort logic
    const sortValue = document.getElementById('sortDropdown')?.value || 'newest';
    tables.sort((a, b) => {
      const dateA = new Date(a.general?.start || a.createdAt || 0);
      const dateB = new Date(b.general?.start || b.createdAt || 0);
      if (sortValue === 'newest') return dateB - dateA;
      if (sortValue === 'oldest') return dateA - dateB;
      if (sortValue === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    const list = document.getElementById('tableList');
    list.innerHTML = '';

    tables.forEach(table => {
      const general = table.general || {};
      const client = general.client || 'N/A';
      const start = general.start ? new Date(general.start).toLocaleDateString() : 'N/A';
      const end = general.end ? new Date(general.end).toLocaleDateString() : 'N/A';

      const card = document.createElement('div');
      card.className = 'table-card';

      const header = document.createElement('div');
      header.className = 'event-header';

      const title = document.createElement('h3');
      title.textContent = table.title;

      const details = document.createElement('div');
      details.className = 'event-details';
      details.innerHTML = `Client: ${client} <br> ${start} - ${end}`;

      header.appendChild(title);
      header.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'action-buttons';

      const openBtn = document.createElement('button');
      openBtn.className = 'btn-open';
      openBtn.textContent = 'Open';
      openBtn.onclick = () => {
        window.location.href = `event.html?id=${table._id}`;
      };

      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn-share';
      shareBtn.textContent = 'Share';
      shareBtn.onclick = () => {
        currentTableId = table._id;
        document.getElementById('shareModal').style.display = 'flex';
      };

      const isOwner = Array.isArray(table.owners) && table.owners.includes(userId);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = async () => {
        if (confirm('Are you sure you want to delete this table?')) {
          await fetch(`${API_BASE}/api/tables/${table._id}`, {
            method: 'DELETE',
            headers: { Authorization: token }
          });
          loadTables();
        }
      };

      actions.append(openBtn, shareBtn);
      if (isOwner) actions.append(deleteBtn);

      card.append(header, actions);
      list.appendChild(card);
    });
  }

  function closeModal() {
    document.getElementById('shareModal').style.display = 'none';
    document.getElementById('shareEmail').value = '';
    document.getElementById('makeOwnerCheckbox').checked = false;
  }

  async function submitShare() {
    const email = document.getElementById('shareEmail').value;
    const makeOwner = document.getElementById('makeOwnerCheckbox').checked;

    if (!email || !currentTableId) return alert('Missing info');

    const res = await fetch(`${API_BASE}/api/tables/${currentTableId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ email, makeOwner })
    });

    const result = await res.json();
    alert(result.message || result.error || 'Done');
    closeModal();
  }

  function logout() {
    localStorage.removeItem('fullName');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sortDropdown')?.addEventListener('change', loadTables);
    loadTables();
  });