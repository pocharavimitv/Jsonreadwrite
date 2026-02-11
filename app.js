const jsonFileInput = document.getElementById('jsonFileInput');
const sectionSelect = document.getElementById('sectionSelect');
const addRowBtn = document.getElementById('addRowBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const tableHead = document.querySelector('#jsonTable thead');
const tableBody = document.querySelector('#jsonTable tbody');
const statusBox = document.getElementById('status');
const metaGrid = document.getElementById('metaGrid');

let rootData = {};
let sectionNames = [];
let selectedSection = '';

jsonFileInput.addEventListener('change', handleFileUpload);
sectionSelect.addEventListener('change', () => {
  selectedSection = sectionSelect.value;
  renderTable();
  setStatus(`Switched to section: ${selectedSection}`);
});
addRowBtn.addEventListener('click', addRow);
downloadBtn.addEventListener('click', downloadJson);
loadSampleBtn.addEventListener('click', () => {
  rootData = buildSampleData();
  initializeFromRootData();
  setStatus('Sample farm JSON loaded.');
});

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      validateRootJson(parsed);
      rootData = deepClone(parsed);
      initializeFromRootData();
      setStatus(`Loaded ${file.name}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  };

  reader.onerror = () => setStatus('Could not read file.', true);
  reader.readAsText(file);
}

function validateRootJson(parsed) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON root must be an object.');
  }

  const arrayKeys = Object.keys(parsed).filter((key) => Array.isArray(parsed[key]));
  if (arrayKeys.length === 0) {
    throw new Error('JSON must include at least one array section (e.g., farms or staff).');
  }

  arrayKeys.forEach((key) => {
    parsed[key].forEach((row) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        throw new Error(`Section "${key}" must contain only objects.`);
      }
    });
  });
}

function initializeFromRootData() {
  sectionNames = Object.keys(rootData).filter((key) => Array.isArray(rootData[key]));
  selectedSection = sectionNames[0] || '';
  renderMetaFields();
  renderSectionSelect();
  renderTable();
}

function renderMetaFields() {
  metaGrid.innerHTML = '';

  const scalarKeys = Object.keys(rootData).filter((key) => !Array.isArray(rootData[key]));
  if (scalarKeys.length === 0) {
    metaGrid.innerHTML = '<p>No non-array top-level fields found.</p>';
    return;
  }

  scalarKeys.forEach((key) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'meta-item';

    const label = document.createElement('label');
    label.textContent = key;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = toEditableText(rootData[key]);
    input.addEventListener('change', () => {
      rootData[key] = fromEditableText(input.value);
      setStatus(`Updated top-level field: ${key}`);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    metaGrid.appendChild(wrapper);
  });
}

function renderSectionSelect() {
  sectionSelect.innerHTML = '';

  if (sectionNames.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No array sections';
    sectionSelect.appendChild(opt);
    return;
  }

  sectionNames.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${name} (${rootData[name].length})`;
    if (name === selectedSection) opt.selected = true;
    sectionSelect.appendChild(opt);
  });
}

function deriveHeaders(rows) {
  const set = new Set();
  rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
  return [...set];
}

function renderTable() {
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (!selectedSection || !Array.isArray(rootData[selectedSection])) {
    tableHead.innerHTML = '<tr><th>Empty</th></tr>';
    tableBody.innerHTML = '<tr><td>No section selected.</td></tr>';
    return;
  }

  const rows = rootData[selectedSection];
  const headers = deriveHeaders(rows);

  if (headers.length === 0) {
    tableHead.innerHTML = '<tr><th>Empty</th></tr>';
    tableBody.innerHTML = `<tr><td>Section "${selectedSection}" has no row fields yet.</td></tr>`;
    return;
  }

  const headRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    headRow.appendChild(th);
  });

  const actionHeader = document.createElement('th');
  actionHeader.className = 'row-actions';
  actionHeader.textContent = 'Actions';
  headRow.appendChild(actionHeader);
  tableHead.appendChild(headRow);

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    headers.forEach((header) => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      const value = row[header];
      td.textContent = value === undefined ? '' : toEditableText(value);

      td.addEventListener('blur', () => {
        row[header] = fromEditableText(td.textContent);
      });

      tr.appendChild(td);
    });

    const actionCell = document.createElement('td');
    actionCell.className = 'row-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => {
      rows.splice(rowIndex, 1);
      renderSectionSelect();
      renderTable();
      setStatus(`Deleted row from ${selectedSection}.`);
    });

    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);
    tableBody.appendChild(tr);
  });
}

function addRow() {
  if (!selectedSection || !Array.isArray(rootData[selectedSection])) {
    setStatus('Select a valid section before adding rows.', true);
    return;
  }

  const rows = rootData[selectedSection];
  const headers = deriveHeaders(rows);

  let newRow = {};
  if (headers.length === 0) {
    newRow = { id: '', name: '' };
  } else {
    newRow = Object.fromEntries(headers.map((header) => [header, '']));
  }

  rows.push(newRow);
  renderSectionSelect();
  renderTable();
  setStatus(`Added row to ${selectedSection}.`);
}

function downloadJson() {
  try {
    const jsonText = JSON.stringify(rootData, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'updated-data.json';
    link.click();

    URL.revokeObjectURL(url);
    setStatus('Updated JSON downloaded.');
  } catch {
    setStatus('Unable to generate JSON file.', true);
  }
}

function toEditableText(value) {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

function fromEditableText(text) {
  const trimmed = text.trim();

  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed);

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }

  return text;
}

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function buildSampleData() {
  return {
    version: 1,
    timestamp: 1770704201516,
    farms: [
      {
        id: 3,
        name: 'Mayuri Natural Farm',
        ownerName: 'Pch Nagi Reddy',
        totalLandArea: 30,
        landUnit: 'Acres'
      }
    ],
    staff: [
      {
        id: 6,
        name: 'Ramesh',
        role: 'Farm Worker',
        staffType: 'Permanent',
        wage: 10000,
        isActive: true,
        farmId: 3
      }
    ],
    attendance: [
      {
        staffId: 6,
        farmId: 3,
        date: 1767205800000,
        status: 'PRESENT'
      }
    ],
    expenses: [
      {
        id: 8,
        date: 1770469985795,
        category: 'Staff',
        amount: 500,
        description: 'Petty cash',
        farmId: 3
      }
    ],
    transactions: [],
    incomes: []
  };
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
}

rootData = buildSampleData();
initializeFromRootData();
setStatus('Ready. Load your JSON file to start editing.');
