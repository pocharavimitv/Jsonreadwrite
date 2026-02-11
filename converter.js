(function (global) {
  function inferValue(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed === '') return '';

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (trimmed === 'true' || trimmed === 'TRUE') return true;
    if (trimmed === 'false' || trimmed === 'FALSE') return false;
    if (trimmed === 'null') return null;

    try {
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return JSON.parse(trimmed);
      }
    } catch (_) {
      // keep string
    }

    return value;
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function normalizeRows(rows) {
    const headers = [...new Set(rows.flatMap((row) => (row && typeof row === 'object' ? Object.keys(row) : [])))];
    const normalized = rows.map((row) => {
      const output = {};
      headers.forEach((header) => {
        const v = row?.[header];
        output[header] = v !== undefined && v !== null && typeof v === 'object' ? JSON.stringify(v) : v ?? '';
      });
      return output;
    });
    return { headers, normalized };
  }

  function sheetXml(name, headers, rows) {
    const headerCells = headers
      .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
      .join('');

    const dataRows = rows
      .map((row) => {
        const cells = headers
          .map((header) => {
            const value = row[header] ?? '';
            const isNum = typeof value === 'number';
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
          })
          .join('');
        return `<Row>${cells}</Row>`;
      })
      .join('');

    return `<Worksheet ss:Name="${escapeXml(name.slice(0, 31) || 'Sheet')}"><Table><Row>${headerCells}</Row>${dataRows}</Table></Worksheet>`;
  }

  function jsonToExcelXml(jsonData) {
    if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) {
      throw new Error('Root JSON must be an object.');
    }

    const metaRows = [];
    const sheets = [];

    Object.entries(jsonData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const { headers, normalized } = normalizeRows(value);
        sheets.push(sheetXml(key, headers, normalized));
      } else {
        metaRows.push({ key, value: typeof value === 'object' && value !== null ? JSON.stringify(value) : value ?? '' });
      }
    });

    sheets.push(sheetXml('_meta', ['key', 'value'], metaRows));

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${sheets.join('\n')}
</Workbook>`;
  }

  function excelXmlToJson(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid Excel XML file. Use XML Spreadsheet 2003 format.');
    }

    const worksheets = Array.from(doc.getElementsByTagName('Worksheet'));
    const result = {};

    worksheets.forEach((worksheet) => {
      const name = worksheet.getAttribute('ss:Name') || worksheet.getAttribute('Name') || 'Sheet';
      const rows = Array.from(worksheet.getElementsByTagName('Row'));
      if (!rows.length) {
        result[name] = [];
        return;
      }

      const extractCells = (row) => Array.from(row.getElementsByTagName('Data')).map((d) => d.textContent || '');
      const headers = extractCells(rows[0]);
      const bodyRows = rows.slice(1).map((row) => {
        const cells = extractCells(row);
        const out = {};
        headers.forEach((header, i) => {
          if (header) out[header] = inferValue(cells[i] ?? '');
        });
        return out;
      });

      if (name === '_meta') {
        bodyRows.forEach((row) => {
          if (row.key !== undefined && row.key !== '') {
            result[String(row.key)] = inferValue(row.value);
          }
        });
      } else {
        result[name] = bodyRows.filter((row) => Object.values(row).some((v) => v !== ''));
      }
    });

    return result;
  }

  const api = { inferValue, jsonToExcelXml, excelXmlToJson };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Converter = api;
})(typeof window !== 'undefined' ? window : globalThis);
