# Offline JSON Table Editor

A lightweight offline web app to load, edit, and save JSON data in a table format.

## Features

- Load a local JSON file (`.json`) containing an array of objects.
- Display data in a simple editable table.
- Edit table cells inline.
- Add and delete rows.
- Download updated data as JSON.
- Load sample data instantly.

## Run locally

No build step is required.

Option 1: open `index.html` directly in your browser.

Option 2 (recommended): serve the folder with a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## JSON format expected

The app expects a JSON array of objects, for example:

```json
[
  { "id": 1, "name": "Alice", "role": "Engineer" },
  { "id": 2, "name": "Bob", "role": "Designer" }
]
```
