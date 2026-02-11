(function () {
  const jsonInput = document.getElementById('jsonInput');
  const excelInput = document.getElementById('excelInput');
  const jsonToExcelBtn = document.getElementById('jsonToExcelBtn');
  const excelToJsonBtn = document.getElementById('excelToJsonBtn');
  const logEl = document.getElementById('log');

  function log(message) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  }

  function downloadBlob(filename, payload, mimeType) {
    const blob = payload instanceof Blob ? payload : new Blob([payload], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }

  jsonInput.addEventListener('change', () => {
    jsonToExcelBtn.disabled = !jsonInput.files?.length;
  });

  excelInput.addEventListener('change', () => {
    excelToJsonBtn.disabled = !excelInput.files?.length;
  });

  jsonToExcelBtn.addEventListener('click', async () => {
    const file = jsonInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const xml = Converter.jsonToExcelXml(jsonData);
      const baseName = file.name.replace(/\.json$/i, '') || 'data';
      downloadBlob(`${baseName}.xml`, xml, 'application/xml');
      log(`Converted ${file.name} to ${baseName}.xml (Excel XML 2003)`);
    } catch (error) {
      log(`JSON → Excel failed: ${error.message}`);
    }
  });

  excelToJsonBtn.addEventListener('click', async () => {
    const file = excelInput.files?.[0];
    if (!file) return;

    try {
      const xmlText = await file.text();
      const jsonData = Converter.excelXmlToJson(xmlText);
      const jsonPretty = JSON.stringify(jsonData, null, 2);
      const baseName = file.name.replace(/\.[^/.]+$/i, '') || 'data';
      downloadBlob(`${baseName}.json`, jsonPretty, 'application/json');
      log(`Converted ${file.name} to ${baseName}.json`);
    } catch (error) {
      log(`Excel → JSON failed: ${error.message}`);
    }
  });
})();
