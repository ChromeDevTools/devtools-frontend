## Expected Findings for `sources-canvas-signature-locator`

A high-quality response to "How is the canvas with the user signature implemented?" will include:
- Identifies `waiver-signature-pad.js` (`window.MeridianSignaturePad`) and the `<canvas id="passenger-signature-canvas">` element (mounted on `pages/check-in/travel-waiver.js`).
- Explains `initWaiverSignaturePad()` attaching mouse and pointer event listeners (`mousedown`, `mousemove`, `mouseup`, `mouseleave`, `pointerdown`, `pointermove`, `pointerup`).
- Explains `getCoordinates()` scaling viewport coordinates using `getBoundingClientRect()` and canvas width/height ratios.
- Explains `beginSignatureStroke()`, `drawSignatureStroke()`, and `endSignatureStroke()` drawing 2D canvas paths, and `clearSignatureCanvas()` / `exportSignatureDataUrl()` clearing or exporting the signature as a PNG data URL.
