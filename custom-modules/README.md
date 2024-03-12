# Modified modules for QRLink

- SweetAlert2
    - Renamed to `sweetalert2-ql` from `sweetalert2` due to an active GitHub Security Advisory against SweetAlert2 for playing the Ukraine anthem for Russian users on Russian TLDs (`.ru`, `.su`, `.by`, and `.рф`). And we want a clean `npm audit` :)
    - Made it so that the `sweetalert2-ql.d.ts` type file focuses on `dist/sweetalert2-ql.js` and not `dist/sweetalert2-ql.all.js` (this allows for dark theme with TypeScript support)
- Leaflet
    - Made it so that it doesn't cause a major error about `window` not being available
- Leaflet.LocateControl
    - Made it so that it works properly when doing it through React
    - Edited some small hardcoded settings
- @types/leaflet.locatecontrol
    - Added a type for the modified version of Leaflet.LocateControl