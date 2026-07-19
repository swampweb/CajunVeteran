# CajunVeteran 3D Printing - Shared House Version

This version lets multiple browsers/PCs in the same house use the same data.

## How it works
- The site is served by `server.js`.
- Shared data is saved in `data.json`.
- The browser still keeps a local fallback copy, but the server data is the shared source when you run this from `server.js`.

## Run on the main PC
1. Install Node.js if needed.
2. Open a terminal/command prompt in this folder.
3. Run:

```bash
node server.js
```

Or double-click `start-windows.bat` on Windows.

Then open:

```text
http://localhost:3000
```

## Open from another PC in the house
Find the main PC IP address, then open:

```text
http://MAIN-PC-IP:3000
```

Example:

```text
http://192.168.1.50:3000
```

## Move existing browser data into shared data
On the PC/browser where your current data exists:
1. Open the old working Admin page.
2. Click `Download Backup (JSON)`.
3. Start this shared version with `node server.js`.
4. Open `http://localhost:3000/admin.html`.
5. Use `Restore from JSON`.
6. That restore will save into `data.json`, making the data available to other house PCs.

## New feature
Admin Items now has a search box above the Items form/table. It searches SKU, name, size, description, price, qty, and colors.
