const jsonFileInput = document.getElementById('jsonFileInput');
const addRowBtn = document.getElementById('addRowBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const tableHead = document.querySelector('#jsonTable thead');
const tableBody = document.querySelector('#jsonTable tbody');
const statusBox = document.getElementById('status');

let tableData = [];
let headers = [];

jsonFileInput.addEventListener('change', handleFileUpload);
addRowBtn.addEventListener('click', addRow);
downloadBtn.addEventListener('click', downloadJson);
loadSampleBtn.addEventListener('click', () => {
  tableData = [
    { id: 1, name: 'Alice', role: 'Engineer', active: true },
    { id: 2, name: 'Bob', role: 'Designer', active: false }
  ];
  headers = deriveHeaders(tableData);
  renderTable();
  setStatus('Sample data loaded.');
});

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON root must be an array of objects.');
      }

      tableData = parsed.map((row) => {
        if (typeof row !== 'object' || row === null || Array.isArray(row)) {
          throw new Error('Every array item must be an object.');
        }
        return { ...row };
      });

      headers = deriveHeaders(tableData);
      renderTable();
      setStatus(`Loaded ${tableData.length} row(s) from ${file.name}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  };

  reader.onerror = () => setStatus('Could not read file.', true);
  reader.readAsText(file);
}

function deriveHeaders(rows) {
  const set = new Set();
  rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
  return [...set];
}

function renderTable() {
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (headers.length === 0) {
    tableHead.innerHTML = '<tr><th>Empty</th></tr>';
    tableBody.innerHTML = '<tr><td>No data loaded yet.</td></tr>';
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

  tableData.forEach((row, rowIndex) => {
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
      tableData.splice(rowIndex, 1);
      renderTable();
      setStatus('Row deleted.');
    });

    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);
    tableBody.appendChild(tr);
  });
}

function addRow() {
  if (headers.length === 0) {
    headers = ['id', 'name'];
  }

  const newRow = Object.fromEntries(headers.map((header) => [header, '']));
  tableData.push(newRow);
  renderTable();
  setStatus('New row added.');
}

function downloadJson() {
  try {
    const jsonText = JSON.stringify(tableData, null, 2);
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
  return String(value);
}

function fromEditableText(text) {
  const trimmed = text.trim();

  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);

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

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
}

renderTable();
