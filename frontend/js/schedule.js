let tableData = { programs: [] };
const params = new URLSearchParams(window.location.search);
const tableId = params.get('id');
let saveTimeout;
let searchQuery = '';
let filterDate = 'all';
let allNotesVisible = false;
let isOwner = false;

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTo12Hour(time) {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

async function loadPrograms() {
  try {
    const res = await fetch(`${API_BASE}/api/tables/${tableId}`, {
      headers: { Authorization: localStorage.getItem('token') },
    });
    const data = await res.json();
    tableData.programs = data.programSchedule || [];
    isOwner = data.owner === getUserIdFromToken();
    renderProgramSections();

    // 🔒 Hide date controls for non-owners
    if (!isOwner) {
      const newDateInput = document.getElementById('newDate');
      const addDateBtn = document.querySelector('button[onclick="addDateSection()"]');
      if (newDateInput) newDateInput.style.display = 'none';
      if (addDateBtn) addDateBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load programs:', err);
    tableData.programs = [];
    renderProgramSections();
  }
}


function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}

async function savePrograms() {
  try {
    await fetch(`${API_BASE}/api/tables/${tableId}/program-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token'),
      },
      body: JSON.stringify({ programSchedule: tableData.programs }),
    });
    console.log('Programs saved!');
  } catch (err) {
    console.error('Failed to save programs:', err);
  }
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(savePrograms, 1000);
}

function renderProgramSections() {
  const container = document.getElementById('programSections');
  if (!container) return console.error('Missing #programSections div!');
  container.innerHTML = '';

  const filterDropdown = document.getElementById('filterDateDropdown');
  if (filterDropdown) {
    const allDates = [...new Set(tableData.programs.map(p => p.date))].sort((a, b) => a.localeCompare(b));
    const currentSelection = filterDropdown.value;
    filterDropdown.innerHTML = `<option value="all">All Dates</option>`;
    allDates.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = formatDate(date);
      filterDropdown.appendChild(option);
    });
    filterDropdown.value = currentSelection || 'all';
  }

  if (tableData.programs.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No programs yet. Add a new date to get started.';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px';
    empty.style.color = '#777';
    container.appendChild(empty);
    return;
  }

  const dates = [...new Set(tableData.programs.map(p => p.date))].sort((a, b) => a.localeCompare(b));

  dates.forEach(date => {
    const matchingPrograms = tableData.programs
      .map((p, i) => ({ ...p, __index: i }))
      .filter(p => p.date === date && matchesSearch(p))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (matchingPrograms.length === 0) return;

    const section = document.createElement('div');
    section.className = 'date-section';
    section.setAttribute('data-date', date);

    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'date-header';
    headerWrapper.innerHTML = `
      <div>${formatDate(date)}</div>
      ${isOwner ? `<button onclick="deleteDate('${date}')">🗑️</button>` : ''}
    `;
    section.appendChild(headerWrapper);

    matchingPrograms.forEach(program => {
      const entry = document.createElement('div');
      entry.className = 'program-entry' + (program.done ? ' done-entry' : '');
      entry.setAttribute('data-program-index', program.__index);

      entry.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <input class="program-name" type="text"
            ${!isOwner ? 'readonly' : ''}
            placeholder="Program Name"
            style="flex: 1;"
            value="${program.name || ''}" 
            onfocus="${isOwner ? 'enableEdit(this)' : ''}" 
            onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'name')` : ''}">

          <label style="display: flex; align-items: center; gap: 6px; font-size: 14px;">
            <input type="checkbox" class="done-checkbox"
              style="width: 20px; height: 20px;"
              ${program.done ? 'checked' : ''}
              onchange="toggleDone(this, ${program.__index})">
          </label>
        </div>

        <div style="display: flex; align-items: center; gap: 3px;">
          <input type="time" placeholder="Start Time" style="flex: 1; min-width: 0; text-align: left;"
            value="${program.startTime || ''}"
            ${!isOwner ? 'readonly' : ''}
            onfocus="${isOwner ? 'enableEdit(this)' : ''}"
            onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'startTime')` : ''}">

          <input type="time" placeholder="End Time" style="flex: 1; min-width: 0; text-align: left;"
            value="${program.endTime || ''}"
            ${!isOwner ? 'readonly' : ''}
            onfocus="${isOwner ? 'enableEdit(this)' : ''}"
            onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'endTime')` : ''}">
        </div>

        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
          <div style="display: flex; align-items: center; flex: 1;">
            <span style="margin-right: 4px;">📍</span>
            <textarea style="flex: 1; resize: none;"
              placeholder="Location"
              ${!isOwner ? 'readonly' : ''}
              onfocus="${isOwner ? 'enableEdit(this)' : ''}"
              oninput="${isOwner ? 'autoResizeTextarea(this)' : ''}"
              onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'location')` : ''}">${program.location || ''}</textarea>
          </div>
          <div style="display: flex; align-items: center; flex: 1;">
            <span style="margin-right: 4px;">👤</span>
            <textarea style="flex: 1; resize: none;"
              placeholder="Photographer"
              ${!isOwner ? 'readonly' : ''}
              onfocus="${isOwner ? 'enableEdit(this)' : ''}"
              oninput="${isOwner ? 'autoResizeTextarea(this)' : ''}"
              onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'photographer')` : ''}">${program.photographer || ''}</textarea>
          </div>
        </div>

        <button class="show-notes-btn" onclick="toggleNotes(this)">Show Notes</button>
        <div class="notes-field" style="display:none;">
          <textarea placeholder="Notes"
            ${!isOwner ? 'readonly' : ''}
            onfocus="${isOwner ? 'enableEdit(this)' : ''}"
            oninput="${isOwner ? 'autoResizeTextarea(this)' : ''}"
            onblur="${isOwner ? `autoSave(this, '${program.date}', ${program.__index}, 'notes')` : ''}">${program.notes || ''}</textarea>
        </div>

        ${isOwner ? `<button class="delete-btn" onclick="deleteProgram(this)">🗑️</button>` : ''}
      `;
      section.appendChild(entry);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Add Row';
    addBtn.onclick = () => addProgram(date);
    if (isOwner) section.appendChild(addBtn);

    container.appendChild(section);
  });

  setTimeout(() => {
    document.querySelectorAll('textarea').forEach(autoResizeTextarea);
  }, 50);
}


function toggleDone(checkbox, index) {
  if (!isNaN(index)) {
    tableData.programs[index].done = checkbox.checked;
    const entry = checkbox.closest('.program-entry');
    if (entry) {
      entry.classList.toggle('done-entry', checkbox.checked);
    }
    scheduleSave();
  }
}

function matchesSearch(program) {
  if (filterDate !== 'all' && program.date !== filterDate) return false;
  if (!searchQuery.trim()) return true;
  const lower = searchQuery.toLowerCase();
  return (
    (program.name || '').toLowerCase().includes(lower) ||
    (program.startTime || '').toLowerCase().includes(lower) ||
    (program.endTime || '').toLowerCase().includes(lower) ||
    (program.location || '').toLowerCase().includes(lower) ||
    (program.photographer || '').toLowerCase().includes(lower) ||
    (program.notes || '').toLowerCase().includes(lower)
  );
}

function enableEdit(field) {
  field.classList.add('editing');
}

function autoSave(field, date, ignoredIndex, key) {
  field.classList.remove('editing');
  const entry = field.closest('.program-entry');
  const programIndex = parseInt(entry.getAttribute('data-program-index'), 10);
  if (!isNaN(programIndex)) {
    tableData.programs[programIndex][key] = field.value.trim();
    scheduleSave();
  }
}

function toggleNotes(button) {
  const notesField = button.nextElementSibling;
  const textarea = notesField.querySelector('textarea');
  const isOpen = notesField.style.display === 'block';
  notesField.style.display = isOpen ? 'none' : 'block';
  button.textContent = isOpen ? 'Show Notes' : 'Hide Notes';
  if (!isOpen && textarea) autoResizeTextarea(textarea);
}

function toggleAllNotes() {
  const allNotes = document.querySelectorAll('.notes-field');
  const allButtons = document.querySelectorAll('.show-notes-btn');
  allNotes.forEach(note => {
    note.style.display = allNotesVisible ? 'none' : 'block';
    const textarea = note.querySelector('textarea');
    if (!allNotesVisible && textarea) autoResizeTextarea(textarea);
  });
  allButtons.forEach(btn => {
    btn.textContent = allNotesVisible ? 'Show Notes' : 'Hide Notes';
  });
  allNotesVisible = !allNotesVisible;
  const toggleBtn = document.getElementById('toggleAllNotesBtn');
  if (toggleBtn) toggleBtn.textContent = allNotesVisible ? 'Hide All Notes' : 'Show All Notes';
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function captureCurrentPrograms() {
  const sections = document.querySelectorAll('.date-section');
  tableData.programs = [];
  sections.forEach(section => {
    const date = section.getAttribute('data-date');
    section.querySelectorAll('.program-entry').forEach(entry => {
      tableData.programs.push({
        date,
        name: entry.querySelector('input.program-name')?.value.trim() || '',
        startTime: entry.querySelector('input[placeholder="Start Time"]')?.value.trim() || '',
        endTime: entry.querySelector('input[placeholder="End Time"]')?.value.trim() || '',
        location: entry.querySelector('textarea[placeholder="Location"]')?.value.trim() || '',
        photographer: entry.querySelector('textarea[placeholder="Photographer"]')?.value.trim() || '',
        notes: entry.querySelector('textarea[placeholder="Notes"]')?.value.trim() || '',
        done: entry.querySelector('input.done-checkbox')?.checked || false,
      });
    });
  });
}

function addDateSection() {
  const date = document.getElementById('newDate').value;
  if (!date) return alert('Please select a date');
  captureCurrentPrograms();
  tableData.programs.push({ date, name: '', startTime: '', endTime: '', location: '', photographer: '', notes: '' });
  document.getElementById('newDate').value = '';
  renderProgramSections();
  scheduleSave();
}

function addProgram(date) {
  captureCurrentPrograms();
  tableData.programs.push({ date, name: '', startTime: '', endTime: '', location: '', photographer: '', notes: '' });
  renderProgramSections();
  scheduleSave();
}

function deleteProgram(button) {
  const index = parseInt(button.closest('.program-entry').getAttribute('data-program-index'), 10);
  if (!isNaN(index)) {
    tableData.programs.splice(index, 1);
    renderProgramSections();
    scheduleSave();
  }
}

function deleteDate(date) {
  if (confirm('Delete all programs for this date?')) {
    tableData.programs = tableData.programs.filter(p => p.date !== date);
    renderProgramSections();
    scheduleSave();
  }
}

function goBack() {
  window.location.href = `event.html?id=${tableId}`;
}

function handleSearchInput(e) {
  searchQuery = e.target.value.trim();
  renderProgramSections();
}

async function loadEventTitle() {
  try {
    const res = await fetch(`${API_BASE}/api/tables/${tableId}`, {
      headers: { Authorization: localStorage.getItem('token') }
    });
    const data = await res.json();
    const titleEl = document.getElementById('eventTitle');
    if (titleEl && data.title) {
      titleEl.textContent = `${data.title} Schedule`;
    }
  } catch (err) {
    console.error('Failed to load event title:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const newDateInput = document.getElementById('newDate');
  const addDateBtn = document.querySelector('button[onclick="addDateSection()"]');

  if (newDateInput && addDateBtn) {
    const toggleNotesBtn = document.createElement('button');
    toggleNotesBtn.id = 'toggleAllNotesBtn';
    toggleNotesBtn.textContent = 'Show All Notes';
    toggleNotesBtn.style.fontSize = '16px';
    toggleNotesBtn.style.background = 'none';
    toggleNotesBtn.style.border = 'none';
    toggleNotesBtn.style.color = '#007bff';
    toggleNotesBtn.style.cursor = 'pointer';
    toggleNotesBtn.style.padding = '0';
    toggleNotesBtn.style.marginLeft = '8px';
    toggleNotesBtn.style.textDecoration = 'underline';
    toggleNotesBtn.style.alignSelf = 'center';
    toggleNotesBtn.onclick = toggleAllNotes;
    addDateBtn.insertAdjacentElement('afterend', toggleNotesBtn);
  }

  // Inject search and filter into fixed header
  const searchContainer = document.getElementById('searchFilterContainer');
  const controlsWrapper = document.createElement('div');
  controlsWrapper.style.display = 'flex';
  controlsWrapper.style.flexWrap = 'wrap';
  controlsWrapper.style.justifyContent = 'center';
  controlsWrapper.style.gap = '8px';
  controlsWrapper.style.paddingTop = '10px';

  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.placeholder = 'Search...';
  searchBox.style.padding = '8px';
  searchBox.style.minWidth = '180px';
  searchBox.style.fontSize = '16px';
  searchBox.addEventListener('input', handleSearchInput);

  const filterSelect = document.createElement('select');
  filterSelect.id = 'filterDateDropdown';
  filterSelect.style.padding = '8px';
  filterSelect.style.minWidth = '180px';
  filterSelect.style.fontSize = '16px';
  filterSelect.innerHTML = `<option value="all">All Dates</option>`;
  filterSelect.addEventListener('change', e => {
    filterDate = e.target.value;
    renderProgramSections();
  });

  controlsWrapper.appendChild(searchBox);
  controlsWrapper.appendChild(filterSelect);

  if (searchContainer) {
    searchContainer.appendChild(controlsWrapper);
  }

  loadPrograms();
  loadEventTitle();
});
