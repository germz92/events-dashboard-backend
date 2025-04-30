const categories = ["Cameras", "Lenses", "Lighting", "Support", "Accessories"];
const token = localStorage.getItem('token');
const params = new URLSearchParams(window.location.search);
const tableId = params.get('id');
let savedGearLists = {};
let activeList = '';
let saveTimeout;
let filterSetting = 'all';

console.log("Using API_BASE:", API_BASE);


// Fail-safe for missing config or token
if (!API_BASE || !token || !tableId) {
  alert("Missing configuration: API_BASE, token, or tableId is not set.");
  throw new Error("Missing API_BASE, token, or tableId");
}

function goBack() {
  window.location.href = `event.html?id=${tableId}`;
}

async function loadGear() {
  console.log("Token:", token);
  console.log("Table ID:", tableId);
  console.log("API_BASE:", API_BASE);

  try {
    const res = await fetch(`${API_BASE}/api/tables/${tableId}/gear`, {
      headers: { Authorization: token }
    });
    console.log("Gear Fetch Status:", res.status);
    const text = await res.text();
    console.log("Gear Fetch Response:", text);

    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);

    const data = JSON.parse(text);
    savedGearLists = JSON.parse(JSON.stringify(data.lists || {})); // clean plain object
    activeList = Object.keys(savedGearLists)[0] || 'Default';

    ensureAllCategoriesExist();
    populateGearListDropdown();
    renderGear();

    document.getElementById('eventTitle').textContent = "Loaded Event";
  } catch (err) {
    console.error("Error loading gear:", err);
    document.getElementById('gearContainer').innerHTML =
      "<h3 style='color:red;'>Failed to load gear. Check console for details.</h3>";
  }
}

async function loadEventTitle() {
    try {
      const res = await fetch(`${API_BASE}/api/tables/${tableId}`, {
        headers: { Authorization: token }
      });
  
      if (!res.ok) throw new Error("Failed to fetch table");
  
      const table = await res.json();
      document.getElementById('eventTitle').textContent = table.title || 'Untitled Event';
    } catch (err) {
      console.error("Failed to load event title:", err);
      document.getElementById('eventTitle').textContent = "Untitled Event";
    }
  }
  

function ensureAllCategoriesExist() {
  if (!savedGearLists[activeList]) {
    savedGearLists[activeList] = {};
  }
  for (const category of categories) {
    if (!savedGearLists[activeList][category]) {
      savedGearLists[activeList][category] = [];
    }
  }
}

function populateGearListDropdown() {
  const select = document.getElementById("gearListSelect");
  select.innerHTML = '';

  for (const listName of Object.keys(savedGearLists)) {
    const option = document.createElement("option");
    option.value = listName;
    option.textContent = listName;
    if (listName === activeList) option.selected = true;
    select.appendChild(option);
  }

  select.onchange = () => {
    activeList = select.value;
    ensureAllCategoriesExist();
    renderGear();
  };
}

function renderGear() {
  const container = document.getElementById("gearContainer");
  container.innerHTML = "";
  categories.forEach(createCategory);
}

function createCategory(name) {
  const container = document.getElementById("gearContainer");
  const section = document.createElement("div");
  section.className = "category";
  section.innerHTML = `<h3>${name}</h3><div class="item-list"></div>`;
  const list = section.querySelector(".item-list");

  const items = savedGearLists[activeList][name] || [];

  items.forEach(item => {
    if ((filterSetting === "checked" && !item.checked) || (filterSetting === "unchecked" && item.checked)) return;

    const safeLabel = item.label.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<input type='checkbox' ${item.checked ? 'checked' : ''}><input type='text' value="${safeLabel}" />`;
    list.appendChild(el);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "add-btn";
  addBtn.textContent = "+ Add Item";
  addBtn.onclick = () => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = "<input type='checkbox'><input type='text'>";
    list.appendChild(row);
    triggerAutosave();
  };

  section.appendChild(addBtn);
  container.appendChild(section);
}

function collectGearData() {
  const data = {};
  for (const category of categories) {
    data[category] = [];
  }

  document.querySelectorAll(".category").forEach(section => {
    const name = section.querySelector("h3").textContent;
    const items = Array.from(section.querySelectorAll(".item")).map(row => {
      const text = row.querySelector("input[type='text']").value.trim();
      const checked = row.querySelector("input[type='checkbox']").checked;
      return text ? { label: text, checked } : null;
    }).filter(Boolean);
    if (categories.includes(name)) {
      data[name] = items;
    }
  });

  return data;
}

async function saveGear() {
  try {
    savedGearLists[activeList] = collectGearData();

    console.log("Saving gear to:", `${API_BASE}/api/tables/${tableId}/gear`);
    console.log("Token being used:", token);
    console.log("Payload:", JSON.stringify({ lists: savedGearLists }, null, 2));

    const res = await fetch(`${API_BASE}/api/tables/${tableId}/gear`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ lists: savedGearLists })
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${responseText}`);
    }

    console.log("Save successful:", responseText);
  } catch (err) {
    console.error("Error saving gear:", err.message);
    alert("Failed to save checklist. See console for details.");
  }
}

function triggerAutosave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveGear, 500);
}

function createNewGearList() {
  const name = prompt("Enter a name for the new gear list:")?.trim();
  if (!name || savedGearLists[name]) return;

  savedGearLists[name] = {
    Cameras: [],
    Lenses: [],
    Lighting: [],
    Support: [],
    Accessories: []
  };

  activeList = name;
  populateGearListDropdown();
  renderGear();
  triggerAutosave();
}

window.addEventListener("DOMContentLoaded", async () => {
    await loadGear();
    await loadEventTitle();
    document.getElementById('gearContainer').addEventListener('input', triggerAutosave);
    document.getElementById('gearContainer').addEventListener('change', triggerAutosave);
    document.getElementById("filterCheckbox").addEventListener("change", e => {
      filterSetting = e.target.value;
      renderGear();
    });
  });
  
