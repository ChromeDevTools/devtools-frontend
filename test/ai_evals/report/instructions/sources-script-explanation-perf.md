## Expected Findings for `sources-script-explanation-perf`

A high-quality response to "How does this page calculate the flight data? Is the code good?" will include:
- Explains `flight-telemetry-engine.js` (`window.MeridianTelemetryEngine`, used by `pages/flight-status/route-map.js`) and its core calculation functions (`reconcileTelemetryFrames`, `computeGreatCircleWaypoints`, `rankAlternateAirports`, `calculateGreatCircleDistanceNm`).
- Notes that input handling and bounds checking are safe (`Array.isArray` checks and `clamp()` on latitude, longitude, and altitude).
- Identifies the three performance bottlenecks in `reconcileTelemetryFrames()`:
  1. Deep-cloning `safeHistorical` with `JSON.parse(JSON.stringify(safeHistorical))` inside the loop on every frame.
  2. Nested $O(N^2)$ linear `.find()` and `.filter()` scans over `safeSecondary` and `clonedHistoricalBuffer` inside the loop instead of pre-indexing into a `Map`.
  3. Instantiating `new Intl.DateTimeFormat(...)` inside the loop on every iteration instead of reusing a single instance.
