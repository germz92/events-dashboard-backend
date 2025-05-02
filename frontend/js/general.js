const token = localStorage.getItem('token');
const params = new URLSearchParams(window.location.search);
const tableId = params.get('id');
let isOwner = false;

document.addEventListener('DOMContentLoaded', async () => {
  if (tableId && token) {
    const res = await fetch(`${API_BASE}/api/tables/${tableId}`, {
      headers: { Authorization: token }
    });

    if (res.ok) {
      const table = await res.json();
      const general = table.general || {};
      const userId = getUserIdFromToken();
      isOwner = Array.isArray(table.owners) && table.owners.includes(userId);

      document.getElementById('eventTitle').textContent = table.title;

      ['location', 'weather', 'attendees', 'budget'].forEach(id => {
        const el = document.getElementById(id);
        const div = document.createElement('div');
        div.id = id;
        div.dataset.value = general[id] || '';
        div.className = 'read-only';
        div.textContent = general[id] || '';
        el.replaceWith(div);
      });

      document.getElementById('start').value = general.start || '';
      document.getElementById('end').value = general.end || '';

      const contactRows = document.getElementById('contactRows');
      contactRows.innerHTML = '';
      (general.contacts || []).forEach(data => renderContactRow(data, true));

      const locationRows = document.getElementById('locationsRows');
      locationRows.innerHTML = '';
      (general.locations || []).forEach(data => renderLocationRow(data, true));

      document.getElementById('editBtn').style.display = isOwner ? 'inline-block' : 'none';
      document.querySelectorAll('.add-row-btn').forEach(btn => {
        btn.style.display = isOwner ? 'inline-block' : 'none';
      });
    }
  }
});

function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}

function createLinkedTextarea(value, type) {
  const textarea = document.createElement('textarea');
  textarea.value = value || '';
  textarea.placeholder = type.charAt(0).toUpperCase() + type.slice(1);
  textarea.addEventListener('input', () => autoResizeTextarea(textarea));
  autoResizeTextarea(textarea);

  textarea.addEventListener('dblclick', () => {
    const val = textarea.value.trim();
    if (!val) return;
    if (type === 'email') window.location.href = `mailto:${val}`;
    else if (type === 'phone') window.location.href = `tel:${val}`;
    else if (type === 'address') window.open(`https://www.google.com/maps/search/?q=${encodeURIComponent(val)}`, '_blank');
  });

  return textarea;
}

function createLinkHTML(value, type) {
  if (!value) return '<div>(empty)</div>';
  value = value.trim();
  let href = '#';
  if (type === 'email') href = `mailto:${value}`;
  else if (type === 'phone') href = `tel:${value}`;
  else if (type === 'address') href = `https://www.google.com/maps/search/?q=${encodeURIComponent(value)}`;
  else return `<div>${value}</div>`;
  return `<a href="${href}" target="_blank" style="color: #007BFF; text-decoration: underline;">${value}</a>`;
}

function createTd(child) {
  const td = document.createElement('td');
  td.appendChild(child);
  return td;
}

function deleteButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '❌';
  btn.onclick = e => e.target.closest('tr').remove();
  return btn;
}

function renderContactRow(data = {}, readOnly = false) {
  const tbody = document.getElementById('contactRows');
  const row = document.createElement('tr');
  const fields = [
    { value: data.name, type: 'text' },
    { value: data.number, type: 'phone' },
    { value: data.email, type: 'email' },
    { value: data.role, type: 'text' }
  ];

  fields.forEach(({ value, type }) => {
    const td = document.createElement('td');
    if (readOnly) {
      td.innerHTML = createLinkHTML(value, type);
    } else {
      td.appendChild(createLinkedTextarea(value, type));
    }
    row.appendChild(td);
  });

  const deleteTd = document.createElement('td');
  if (!readOnly) deleteTd.appendChild(deleteButton());
  row.appendChild(deleteTd);
  tbody.appendChild(row);
}

function renderLocationRow(data = {}, readOnly = false) {
  const tbody = document.getElementById('locationsRows');
  const row = document.createElement('tr');
  const fields = [
    { value: data.name, type: 'text' },
    { value: data.address, type: 'address' },
    { value: data.event, type: 'text' }
  ];

  fields.forEach(({ value, type }) => {
    const td = document.createElement('td');
    if (readOnly) {
      td.innerHTML = createLinkHTML(value, type);
    } else {
      td.appendChild(createLinkedTextarea(value, type));
    }
    row.appendChild(td);
  });

  const deleteTd = document.createElement('td');
  if (!readOnly) deleteTd.appendChild(deleteButton());
  row.appendChild(deleteTd);
  tbody.appendChild(row);
}

function collectContacts() {
  return Array.from(document.querySelectorAll("#contactRows tr")).map(row => {
    const inputs = row.querySelectorAll("textarea");
    return {
      name: inputs[0].value.trim(),
      number: inputs[1].value.trim(),
      email: inputs[2].value.trim(),
      role: inputs[3].value.trim()
    };
  });
}

function collectLocations() {
  return Array.from(document.querySelectorAll("#locationsRows tr")).map(row => {
    const inputs = row.querySelectorAll("textarea");
    return {
      name: inputs[0].value.trim(),
      address: inputs[1].value.trim(),
      event: inputs[2].value.trim()
    };
  });
}

async function saveGeneralInfo() {
  if (!isOwner) {
    alert("You are not allowed to edit this page.");
    return;
  }

  const getTextValue = id => {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.tagName.toLowerCase() === 'textarea' ? el.value.trim() : el.textContent.trim();
  };

  const location = getTextValue('location');
  const weather = getTextValue('weather');
  const attendees = getTextValue('attendees');
  const budget = getTextValue('budget');
  const start = document.getElementById('start')?.value || '';
  const end = document.getElementById('end')?.value || '';
  const contacts = collectContacts();
  const locations = collectLocations();

  const generalData = { location, weather, start, end, attendees, budget, contacts, locations };

  try {
    const res = await fetch(`${API_BASE}/api/tables/${tableId}/general`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify(generalData)
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Failed to save: ${res.status} ${responseText}`);
    }

    alert("Saved successfully!");
    window.location.reload();
  } catch (err) {
    console.error("Failed to save general info:", err);
    alert("Error saving general info.");
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

document.addEventListener('input', function (e) {
  if (e.target.tagName.toLowerCase() === 'textarea') {
    autoResizeTextarea(e.target);
  }
});

function collectReadOnlyData(selector, count) {
  return Array.from(document.querySelectorAll(`${selector} tr`)).map(row => {
    const tds = Array.from(row.querySelectorAll('td')).slice(0, count);
    return tds.map(td => td.innerText.trim()).reduce((acc, val, i) => {
      const keys = count === 4 ? ['name', 'number', 'email', 'role'] : ['name', 'address', 'event'];
      acc[keys[i]] = val;
      return acc;
    }, {});
  });
}

function switchToEdit() {
  if (!isOwner) return;

  ['location', 'weather', 'attendees', 'budget'].forEach(id => {
    const div = document.getElementById(id);
    const textarea = document.createElement('textarea');
    textarea.id = id;
    textarea.value = div.dataset.value || div.textContent || '';
    div.replaceWith(textarea);
    autoResizeTextarea(textarea);
  });

  const contactData = collectReadOnlyData('#contactRows', 4);
  document.getElementById('contactRows').innerHTML = '';
  contactData.forEach(data => renderContactRow(data, false));

  const locationData = collectReadOnlyData('#locationsRows', 3);
  document.getElementById('locationsRows').innerHTML = '';
  locationData.forEach(data => renderLocationRow(data, false));

  document.querySelectorAll('.add-row-btn').forEach(btn => btn.style.display = 'inline-block');
  document.getElementById('editBtn').style.display = 'none';
}

function addContactRow() {
  if (document.getElementById('editBtn')?.style.display !== 'none') {
    switchToEdit();
  }
  renderContactRow({}, false);
}

function addLocationRow() {
  if (document.getElementById('editBtn')?.style.display !== 'none') {
    switchToEdit();
  }
  renderLocationRow({}, false);
}
