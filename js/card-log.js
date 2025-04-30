// 🔥 Global variables
let users = [];
const cameras = ["A7IV-A", "A7IV-B", "A7IV-C", "A7IV-D", "A7IV-E", "A7RV-A", "FX3-A", "A7IV", "A7RV", "A7III"];

async function loadUsers() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: token } });

  if (!res.ok) {
    console.error('Failed to fetch users');
    return;
  }

  const data = await res.json();
  users = data.map(u => u.fullName?.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

async function loadCardLog() {
  const token = localStorage.getItem('token');
  const eventId = localStorage.getItem('eventId');
  const res = await fetch(`${API_BASE}/api/tables/${eventId}`, { headers: { Authorization: token } });

  if (!res.ok) {
    console.error('Failed to load table data');
    return;
  }

  const table = await res.json();
  if (!table.cardLog || table.cardLog.length === 0) return;

  const container = document.getElementById('table-container');
  container.innerHTML = ''; // Clear old data

  table.cardLog.forEach(day => addDaySection(day.date, day.entries));
}

function addDaySection(date, entries = []) {
  const container = document.getElementById('table-container');
  const dayDiv = document.createElement('div');
  dayDiv.className = 'day-table';
  dayDiv.id = `day-${date}`;

  dayDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <h3 style="margin: 0;">${date}</h3>
      <button class="delete-day-btn" data-date="${date}" title="Delete Day" style="background: transparent; border: none; font-size: 20px; cursor: pointer;">🗑️</button>
    </div>
    <table>
      <colgroup>
        <col style="width: 25%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
        <col style="width: 35%;">
        <col style="width: 10%;">  <!-- 🗑️ Trash button -->
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

  const tbody = document.getElementById(`tbody-${date}`);
  entries.forEach(entry => addRow(date, entry));
}

function addRow(date, entry = {}) {
  const tbody = document.getElementById(`tbody-${date}`);
  const row = document.createElement('tr');

  row.innerHTML = `
    <td data-label="Camera">
      <select class="camera-select">
        <option disabled selected>Select Camera</option>
        ${cameras.map(cam => `<option value="${cam}">${cam}</option>`).join('')}
        <option value="add-new-camera">➕ Add New Camera</option>
      </select>
    </td>
    <td data-label="Card 1">
      <input type="text" value="${entry.card1 || ''}" placeholder="Card 1" />
    </td>
    <td data-label="Card 2">
      <input type="text" value="${entry.card2 || ''}" placeholder="Card 2" />
    </td>
    <td data-label="User">
      <select class="user-select">
        <option disabled selected>Select User</option>
        ${users.map(user => `<option value="${user}">${user}</option>`).join('')}
        <option value="add-new-user">➕ Add New User</option>
      </select>
    </td>
    <td data-label="Action" style="text-align:center;">
      <button class="delete-row-btn" title="Delete Row" style="
        background: transparent;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #d11a2a;
      ">🗑️</button>
    </td>
  `;

  tbody.appendChild(row);

  // After appending, attach listeners to new selects:
  const cameraSelect = row.querySelector('.camera-select');
  const userSelect = row.querySelector('.user-select');

  cameraSelect.addEventListener('change', function () {
    if (this.value === 'add-new-camera') {
      const newCamera = prompt('Enter new camera name:');
      if (newCamera) {
        cameras.push(newCamera);
        const newOption = document.createElement('option');
        newOption.value = newCamera;
        newOption.textContent = newCamera;
        this.insertBefore(newOption, this.querySelector('option[value="add-new-camera"]'));
        this.value = newCamera; // auto select new camera
      } else {
        this.value = ''; // reset if cancelled
      }
    }
  });

  userSelect.addEventListener('change', function () {
    if (this.value === 'add-new-user') {
      const newUser = prompt('Enter new user name:');
      if (newUser) {
        users.push(newUser);
        const newOption = document.createElement('option');
        newOption.value = newUser;
        newOption.textContent = newUser;
        this.insertBefore(newOption, this.querySelector('option[value="add-new-user"]'));
        this.value = newUser; // auto select new user
      } else {
        this.value = ''; // reset if cancelled
      }
    }
  });
}


// 🔥 Main
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const eventId = localStorage.getItem('eventId');
  let saveTimeout;

  if (!eventId) {
    alert('Event ID missing. Cannot load card logs.');
    return;
  }

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
    saveTimeout = setTimeout(saveToMongoDB, 500);
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

    if (!date) {
      alert('Please select a date.');
      return;
    }

    if (document.getElementById(`day-${date}`)) {
      alert('This date already exists!');
      return;
    }

    addDaySection(date);
    dateInput.value = '';
    closeDateModal();
    saveToMongoDB();
  }

  // ✨ Button Click Handlers
  document.getElementById('add-day-btn').addEventListener('click', openDateModal);
  document.getElementById('cancel-modal').addEventListener('click', closeDateModal);
  document.getElementById('submit-date').addEventListener('click', createNewDay);

  document.getElementById('table-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('add-row-btn')) {
      const date = e.target.getAttribute('data-date');
      addRow(date);
      saveToMongoDB();
    }

    if (e.target.classList.contains('delete-row-btn')) {
      e.target.closest('tr').remove();
      saveToMongoDB();
    }

    if (e.target.classList.contains('delete-day-btn')) {
      const dayDiv = e.target.closest('.day-table');
      if (dayDiv && confirm('Delete this entire day?')) {
        dayDiv.remove();
        saveToMongoDB();
      }
    }
  });

  document.getElementById('table-container').addEventListener('change', (e) => {
    if (e.target.matches('input, select')) {
      debounceSave();
    }
  });

  await loadUsers();
  await loadCardLog();
});
