const token = localStorage.getItem('token');
const params = new URLSearchParams(window.location.search);
const tableId = params.get('id');

if (!tableId) {
  alert('Missing table ID. Returning to events page...');
  window.location.href = 'event.html';
}

function addContactRow(contact = {}, isReadOnly = false) {
  const container = document.getElementById('contactRows');
  const row = document.createElement('tr');

  if (isReadOnly) {
    row.innerHTML = `
      <td>${contact.name || ''}</td>
      <td>
        ${contact.number
          ? `<a href="tel:${contact.number}">${contact.number}</a>`
          : ''}
      </td>
      <td>
        ${contact.email
          ? `<a href="mailto:${contact.email}">${contact.email}</a>`
          : ''}
      </td>
      <td>${contact.role || ''}</td>
      <td><button type="button" class="delete-btn" onclick="this.closest('tr').remove()">🗑</button></td>
    `;
  }
   else {
    row.innerHTML = `
      <td><textarea name="contactName" placeholder="Name">${contact.name || ''}</textarea></td>
      <td><textarea name="contactNumber" placeholder="Number">${contact.number || ''}</textarea></td>
      <td><textarea name="contactEmail" placeholder="E-Mail Address">${contact.email || ''}</textarea></td>
      <td><textarea name="contactRole" placeholder="Role">${contact.role || ''}</textarea></td>
      <td><button type="button" class="delete-btn" onclick="this.closest('tr').remove()">🗑</button></td>
    `;
  }

  container.appendChild(row);
}



function formatDateInput(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const offset = date.getTimezoneOffset();
  date.setMinutes(date.getMinutes() - offset); // neutralize timezone offset
  return date.toISOString().split('T')[0]; // return YYYY-MM-DD
}

async function loadGeneralInfo() {
  const res = await fetch(`${API_BASE}/api/tables/${tableId}/general`, {
    headers: { Authorization: token }
  });
  const data = await res.json();

  const form = document.getElementById('generalForm');
  form.location.value = data.location || '';
  form.weather.value = data.weather || '';
  form.start.value = formatDateInput(data.start);
  form.end.value = formatDateInput(data.end);
  form.attendees.value = data.attendees || '';
  form.budget.value = data.budget || '';

  (data.contacts || []).forEach(contact => addContactRow(contact, true));
}


async function saveGeneralInfo() {
  const form = document.getElementById('generalForm');
  const container = document.getElementById('contactRows');
  const allRows = container.querySelectorAll('tr');

  const contacts = Array.from(allRows).map(row => {
    const fields = row.querySelectorAll('input, textarea');
    if (fields.length) {
      return {
        name: fields[0].value,
        number: fields[1].value,
        email: fields[2].value,
        role: fields[3].value
      };
    } else {
      const cells = row.querySelectorAll('td');
      return {
        name: cells[0]?.textContent.trim(),
        number: cells[1]?.textContent.trim(),
        email: cells[2]?.textContent.trim(),
        role: cells[3]?.textContent.trim()
      };
    }
      
  });

  // 👇 Append T12:00:00 to avoid timezone offset shifting
  const start = form.start.value ? `${form.start.value}T12:00:00` : '';
  const end = form.end.value ? `${form.end.value}T12:00:00` : '';

  const general = {
    location: form.location.value,
    weather: form.weather.value,
    start,
    end,
    attendees: parseInt(form.attendees.value) || 0,
    budget: form.budget.value,
    contacts
  };

  await fetch(`${API_BASE}/api/tables/${tableId}/general`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify(general)
  });

  alert('General information saved!');
}


loadGeneralInfo();

function goBack() {
  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('id');
  window.location.href = `event.html?id=${tableId}`;
}
