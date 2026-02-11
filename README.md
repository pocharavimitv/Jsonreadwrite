# Offline JSON ↔ Excel Converter

A simple offline web app that converts:

1. **JSON → Excel-compatible XML Spreadsheet 2003** (`.xml`)
2. **Updated Excel XML Spreadsheet 2003 → JSON** (`.json`)

## Why XML instead of `.xlsx`?

This project is fully offline and dependency-free. Generating/parsing native `.xlsx` in the browser normally requires external libraries. To keep this app self-contained, it uses **Excel XML Spreadsheet 2003** format, which Microsoft Excel can open/edit.

## How to use

1. Open `index.html` in your browser.
2. Under **JSON to Excel**, choose your JSON file and click convert.
3. Open the generated `.xml` in Excel, update data, and save.
   - If prompted, keep it in **XML Spreadsheet 2003 (.xml)** format.
4. Under **Excel to JSON**, choose the edited XML file and convert back to JSON.

## Supported structure

- Root-level JSON object.
- Root properties that are arrays become worksheets.
- Root properties that are non-arrays go to a `_meta` worksheet and are restored on import.
