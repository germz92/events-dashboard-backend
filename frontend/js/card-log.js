// 🔥 Global variables
let users = [];
const cameras = ["A7IV-A", "A7IV-B", "A7IV-C", "A7IV-D", "A7IV-E", "A7RV-A", "FX3-A", "A7IV", "A7RV", "A7III"];
let isOwner = false;

async function loadUsers() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: token } });
  if (!res.ok) return console.error('Failed to fetch users');
  const data = await res.json();
  users = data.map(u => u.fullName?.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

async function loadCardLog() {
  const token = localStorage.getItem('token');
  const eventId = localStorage.getItem('eventId');
  const res = await fetch(`${API_BASE}/api/tables/${eventId}`, { headers: { Authorization: token } });
  if (!res.ok) return console.error('Failed to load table data');
  const table = await res.json();
  const userId = getUserIdFromToken();
  isOwner = Array.isArray(table.owners) && table.owners.includes(userId);
  if (!table.cardLog || table.cardLog.length === 0) return;
  const container = document.getElementById('table-container');
  container.innerHTML = '';
  table.cardLog.forEach(day => addDaySection(day.date, day.entries));
}

function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}

function addDaySection(date, entries = []) {
  const container = document.getElementById('table-container');
  const dayDiv = document.createElement('div');
  dayDiv.className = 'day-table';
  dayDiv.id = `day-${date}`;
  dayDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <h3 style="margin: 0;">${date}</h3>
      ${isOwner ? `<button class="delete-day-btn" data-date="${date}" title="Delete Day" style="background: transparent; border: none; font-size: 20px; cursor: pointer;">🗑️</button>` : ''}
    </div>
    <table>
      <colgroup>
        <col style="width: 25%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
        <col style="width: 35%;">
        <col style="width: 10%;">
      </colgroup>
      <thead>
        <tr>
          <th>Camera</th>
          <th>Card 1</th>
          <th>Card 2</th>
          <th>User</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="tbody-${date}"></tbody>
    </table>
    <div style="text-align: center; margin-top: 10px;">
      <button class="add-row-btn" data-date="${date}">Add Row</button>
    </div>
  `;
  container.appendChild(dayDiv);
  entries.forEach(entry => addRow(date, entry));
}

function addRow(date, entry = {}) {
  const tbody = document.getElementById(`tbody-${date}`);
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><select class="camera-select">
      ${cameras.map(cam => `<option value="${cam}">${cam}</option>`).join('')}
      <option value="add-new-camera">➕ Add New Camera</option>
    </select></td>
    <td><input type="text" value="${entry.card1 || ''}" placeholder="Card 1" /></td>
    <td><input type="text" value="${entry.card2 || ''}" placeholder="Card 2" /></td>
    <td><select class="user-select">
      ${users.map(user => `<option value="${user}">${user}</option>`).join('')}
      <option value="add-new-user">➕ Add New User</option>
    </select></td>
    <td style="text-align:center;">
      ${isOwner ? '<button class="delete-row-btn" title="Delete Row" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: #d11a2a;">🗑️</button>' : ''}
    </td>
  `;
  tbody.appendChild(row);

  const cameraSelect = row.querySelector('.camera-select');
  const userSelect = row.querySelector('.user-select');
  if (entry.camera && !cameras.includes(entry.camera)) {
    const newOption = new Option(entry.camera, entry.camera, false, false);
    cameraSelect.insertBefore(newOption, cameraSelect.querySelector('[value="add-new-camera"]'));
  }
  cameraSelect.value = entry.camera || '';

  if (entry.user && !users.includes(entry.user)) {
    const newOption = new Option(entry.user, entry.user, false, false);
    userSelect.insertBefore(newOption, userSelect.querySelector('[value="add-new-user"]'));
  }
  userSelect.value = entry.user || '';

  cameraSelect.addEventListener('change', function () {
    if (this.value === 'add-new-camera') {
      const newCamera = prompt('Enter new camera name:');
      if (newCamera) {
        cameras.push(newCamera);
        const option = new Option(newCamera, newCamera, true, true);
        this.insertBefore(option, this.querySelector('[value="add-new-camera"]'));
      } else this.value = '';
    }
  });

  userSelect.addEventListener('change', function () {
    if (this.value === 'add-new-user') {
      const newUser = prompt('Enter new user name:');
      if (newUser) {
        users.push(newUser);
        const option = new Option(newUser, newUser, true, true);
        this.insertBefore(option, this.querySelector('[value="add-new-user"]'));
      } else this.value = '';
    }
  });
}

// 🔥 Main
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const eventId = localStorage.getItem('eventId');
  let saveTimeout;

  if (!eventId) return alert('Event ID missing. Cannot load card logs.');

  async function saveToMongoDB() {
    const tables = document.querySelectorAll('.day-table');
    const cardLog = Array.from(tables).map(dayTable => {
      const date = dayTable.querySelector('h3').textContent;
      const entries = Array.from(dayTable.querySelectorAll('tbody tr')).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          camera: cells[0].querySelector('select')?.value || '',
          card1: cells[1].querySelector('input')?.value || '',
          card2: cells[2].querySelector('input')?.value || '',
          user: cells[3].querySelector('select')?.value || ''
        };
      });
      return { date, entries };
    });

    await fetch(`${API_BASE}/api/tables/${eventId}/cardlog`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ cardLog })
    });
  }

  function debounceSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToMongoDB, 250); // More responsive
  }

  function openDateModal() {
    document.getElementById('date-modal').style.display = 'flex';
  }

  function closeDateModal() {
    document.getElementById('date-modal').style.display = 'none';
  }

  function createNewDay() {
    const dateInput = document.getElementById('new-date-input');
    const date = dateInput.value;
    if (!date || document.getElementById(`day-${date}`)) return alert('Date missing or already exists');
    addDaySection(date);
    dateInput.value = '';
    closeDateModal();
    saveToMongoDB();
  }

  document.getElementById('add-day-btn').addEventListener('click', openDateModal);
  document.getElementById('cancel-modal').addEventListener('click', closeDateModal);
  document.getElementById('submit-date').addEventListener('click', createNewDay);

  document.getElementById('table-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('add-row-btn')) {
      const date = e.target.getAttribute('data-date');
      addRow(date);
      saveToMongoDB();
    }
    if (e.target.classList.contains('delete-row-btn') && isOwner) {
      e.target.closest('tr').remove();
      saveToMongoDB();
    }
    if (e.target.classList.contains('delete-day-btn') && isOwner) {
      const dayDiv = e.target.closest('.day-table');
      if (dayDiv && confirm('Delete this entire day?')) {
        dayDiv.remove();
        saveToMongoDB();
      }
    }
  });

  // 🔁 Save on all input/select changes
  document.getElementById('table-container').addEventListener('input', debounceSave);
  document.getElementById('table-container').addEventListener('change', debounceSave);

  await loadUsers();
  await loadCardLog();
});
