const jsonFileInput = document.getElementById('jsonFileInput');
const sectionButtons = document.getElementById('sectionButtons');
const addRowBtn = document.getElementById('addRowBtn');
const copyTsvBtn = document.getElementById('copyTsvBtn');
const applyTsvBtn = document.getElementById('applyTsvBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const tableHead = document.querySelector('#jsonTable thead');
const tableBody = document.querySelector('#jsonTable tbody');
const statusBox = document.getElementById('status');
const metaGrid = document.getElementById('metaGrid');
const excelPasteArea = document.getElementById('excelPasteArea');

let rootData = {};
let sectionNames = [];
let selectedSection = '';

jsonFileInput.addEventListener('change', handleFileUpload);
addRowBtn.addEventListener('click', addRow);
copyTsvBtn.addEventListener('click', copySectionAsTsv);
applyTsvBtn.addEventListener('click', applyExcelPasteArea);
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
  renderSectionButtons();
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
    wrapper.append(label, input);
    metaGrid.appendChild(wrapper);
  });
}

function renderSectionButtons() {
  sectionButtons.innerHTML = '';
  if (sectionNames.length === 0) {
    const msg = document.createElement('span');
    msg.textContent = 'No array sections';
    sectionButtons.appendChild(msg);
    return;
  }

  sectionNames.forEach((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'section-btn';
    if (name === selectedSection) btn.classList.add('active');
    btn.textContent = `${name} (${rootData[name].length})`;
    btn.addEventListener('click', () => {
      selectedSection = name;
      renderSectionButtons();
      renderTable();
      setStatus(`Switched to section: ${selectedSection}`);
    });
    sectionButtons.appendChild(btn);
  });
}

function deriveHeaders(rows) {
  const keys = new Set();
  rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
  return [...keys];
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

  const headerRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  const actionHeader = document.createElement('th');
  actionHeader.className = 'row-actions';
  actionHeader.textContent = 'Actions';
  headerRow.appendChild(actionHeader);
  tableHead.appendChild(headerRow);

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    headers.forEach((header, colIndex) => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.dataset.row = String(rowIndex);
      td.dataset.col = String(colIndex);
      td.textContent = row[header] === undefined ? '' : toEditableText(row[header]);
      td.addEventListener('blur', () => {
        row[header] = fromEditableText(td.textContent);
      });
      td.addEventListener('paste', (event) => handleGridPaste(event, rowIndex, colIndex, headers));
      tr.appendChild(td);
    });

    const actionCell = document.createElement('td');
    actionCell.className = 'row-actions';
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      rows.splice(rowIndex, 1);
      renderSectionButtons();
      renderTable();
      setStatus(`Deleted row from ${selectedSection}.`);
    });
    actionCell.appendChild(del);
    tr.appendChild(actionCell);
    tableBody.appendChild(tr);
  });
}

function handleGridPaste(event, startRow, startCol, headers) {
  const clipboard = event.clipboardData?.getData('text');
  if (!clipboard || (!clipboard.includes('\t') && !clipboard.includes('\n'))) return;

  event.preventDefault();
  const matrix = parseTsv(clipboard);
  const rows = rootData[selectedSection];

  matrix.forEach((line, rOffset) => {
    const targetIndex = startRow + rOffset;
    while (targetIndex >= rows.length) {
      rows.push(Object.fromEntries(headers.map((h) => [h, ''])));
    }
    line.forEach((cell, cOffset) => {
      const header = headers[startCol + cOffset];
      if (header !== undefined) rows[targetIndex][header] = fromEditableText(cell);
    });
  });

  renderSectionButtons();
  renderTable();
  setStatus('Pasted Excel data into table.');
}

function addRow() {
  if (!selectedSection || !Array.isArray(rootData[selectedSection])) {
    setStatus('Select a valid section before adding rows.', true);
    return;
  }
  const rows = rootData[selectedSection];
  const headers = deriveHeaders(rows);
  const row = headers.length === 0 ? { id: '', name: '' } : Object.fromEntries(headers.map((h) => [h, '']));
  rows.push(row);
  renderSectionButtons();
  renderTable();
  setStatus(`Added row to ${selectedSection}.`);
}

async function copySectionAsTsv() {
  if (!selectedSection || !Array.isArray(rootData[selectedSection])) {
    setStatus('No valid section selected.', true);
    return;
  }
  const rows = rootData[selectedSection];
  const headers = deriveHeaders(rows);
  if (headers.length === 0) {
    setStatus('No columns to copy.', true);
    return;
  }

  const tsv = sectionToTsv(headers, rows);
  excelPasteArea.value = tsv;

  try {
    await navigator.clipboard.writeText(tsv);
    setStatus(`Copied ${selectedSection} as Excel text.`);
  } catch {
    setStatus('Section copied to text area. Press Ctrl+C to copy manually.');
  }
}

function applyExcelPasteArea() {
  if (!selectedSection || !Array.isArray(rootData[selectedSection])) {
    setStatus('No valid section selected.', true);
    return;
  }
  const raw = excelPasteArea.value.trim();
  if (!raw) {
    setStatus('Paste Excel data into the text area first.', true);
    return;
  }

  const currentRows = rootData[selectedSection];
  let headers = deriveHeaders(currentRows);
  const matrix = parseTsv(raw);
  if (matrix.length === 0) {
    setStatus('No rows found in pasted data.', true);
    return;
  }

  if (headers.length === 0) headers = matrix[0].map((_, idx) => `column${idx + 1}`);

  let start = 0;
  if (arraysEqual(matrix[0], headers)) start = 1;

  rootData[selectedSection] = matrix.slice(start).map((line) => {
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = fromEditableText(line[idx] ?? '');
    });
    return row;
  });

  renderSectionButtons();
  renderTable();
  setStatus(`Applied ${rootData[selectedSection].length} row(s) to ${selectedSection}.`);
}

function sectionToTsv(headers, rows) {
  const escape = (value) => String(value ?? '').replace(/\t/g, ' ').replace(/\n/g, ' ');
  const lines = [headers.join('\t')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(toEditableText(row[h]))).join('\t'));
  });
  return lines.join('\n');
}

function parseTsv(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t'));
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, idx) => v === b[idx]);
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
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value ?? '');
}

function fromEditableText(text) {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed);
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
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
    farms: [{ id: 3, name: 'Mayuri Natural Farm', ownerName: 'Pch Nagi Reddy', totalLandArea: 30, landUnit: 'Acres' }],
    staff: [
      { id: 6, name: 'Ramesh', role: 'Farm Worker', staffType: 'Permanent', wage: 10000, isActive: true, farmId: 3 },
      { id: 7, name: 'Ramesh (w)', role: 'Farm Worker', staffType: 'Permanent', wage: 5000, isActive: true, farmId: 3 }
    ],
    attendance: [{ staffId: 6, farmId: 3, date: 1767205800000, status: 'PRESENT' }],
    expenses: [{ id: 8, date: 1770469985795, category: 'Staff', amount: 500, description: 'Petty cash', farmId: 3 }],
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
