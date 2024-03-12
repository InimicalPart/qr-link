# Modified modules for QRLink

- SweetAlert2
    - Made it so that the `sweetalert2.d.ts` type file focuses on `dist/sweetalert2.js` and not `dist/sweetalert2.all.js` (this allows for dark theme with TypeScript support)
- Leaflet
    - Made it so that it doesn't cause a major error about `window` not being available
- Leaflet.LocateControl
    - Made it so that it works properly when doing it through React
    - Edited some small hardcoded settings
- @types/leaflet.locatecontrol
    - Added a type for the modified version of Leaflet.LocateControl