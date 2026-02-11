# Offline JSON Table Editor

A lightweight offline web app to load, edit, and save JSON data in a table format.

## What is now supported

This app supports object-root JSON with sections such as:

- `farms`
- `staff`
- `attendance`
- `expenses`
- `transactions`
- `incomes`

## Updated layout

- **Section** is now shown as clickable buttons (instead of a dropdown).
- Other actions are grouped under **Functions**.
- Long/wide tables are contained in a horizontal scroll area so they do not overflow the page.

## Excel-friendly editing

You can copy/paste data with Excel in two ways:

1. **Direct multi-cell paste into the table**
   - Copy a range in Excel
   - Click a table cell in the app
   - Paste (`Ctrl+V`)
   - The app fills matching rows/columns automatically

2. **Excel Paste Area**
   - Paste tab-separated rows into the text area
   - Click **Apply Pasted Excel Data** to replace the current section rows

You can click **Copy Section as Excel** to copy section data as tab-separated text (with headers).

## Run locally

No build step is required.

- Open `index.html` directly in your browser, or
- Run a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
