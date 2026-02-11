const test = require('node:test');
const assert = require('node:assert/strict');
const { inferValue, jsonToExcelXml } = require('../converter');

test('inferValue handles primitives', () => {
  assert.equal(inferValue('42'), 42);
  assert.equal(inferValue('TRUE'), true);
  assert.equal(inferValue('false'), false);
  assert.equal(inferValue('text'), 'text');
});

test('jsonToExcelXml creates workbook xml with sheets', () => {
  const xml = jsonToExcelXml({ version: 1, farms: [{ id: 1, name: 'A' }] });
  assert.match(xml, /<Worksheet ss:Name="farms">/);
  assert.match(xml, /<Worksheet ss:Name="_meta">/);
  assert.match(xml, /<Data ss:Type="String">version<\/Data>/);
});
