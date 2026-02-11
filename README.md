# Offline JSON Table Editor

A lightweight offline web app to load, edit, and save JSON data in a table format.

## What is now supported

This app supports your JSON structure where the root is an object with:

- scalar fields (example: `version`, `timestamp`)
- array sections (example: `farms`, `staff`, `attendance`, `expenses`, `transactions`, `incomes`)

You can:

- load a `.json` file from local disk
- select a section from the dropdown
- edit rows inline in a simple table
- add/delete rows in the selected section
- edit top-level scalar fields
- download the full updated JSON object

## Run locally

No build step is required.

Option 1: open `index.html` directly in your browser.

Option 2 (recommended): serve the folder with a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## JSON format expected

The app expects a top-level object containing at least one array section, for example:

```json
{
  "version": 1,
  "timestamp": 1770704201516,
  "farms": [{ "id": 3, "name": "Mayuri Natural Farm" }],
  "staff": [{ "id": 6, "name": "Ramesh" }],
  "attendance": [],
  "expenses": []
}
```
