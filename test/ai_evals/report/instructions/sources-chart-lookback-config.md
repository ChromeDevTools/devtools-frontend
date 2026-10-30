## Expected Findings for `sources-chart-lookback-config`

A high-quality response to "How can I change the lookback horizon options and limits for the chart in the code?" will include:
- Identifies that the dropdown `<option>` values (`30`, `60`, `90`, `180`, `365` days) are defined inside `<select id="range-select">` in `pages/analytics/fare-trends.js`.
- Identifies that `resolveChartLookbackWindow()` in `fare-chart-loader.js` (and `pages/analytics/fare-trends.js`) clamps the requested days against `CORRIDOR_LOOKBACK_LIMITS` (`transatlantic: 90`, `european_short_haul: 60`, `asia_pacific: 180`), `DEFAULT_CHART_LOOKBACK_DAYS = 90`, and `MAX_HISTORICAL_HORIZON_DAYS = 365`.
- Explains that allowing longer lookback horizons requires updating both the `<option>` elements in `pages/analytics/fare-trends.js` and the clamping constants (`CORRIDOR_LOOKBACK_LIMITS` and `MAX_HISTORICAL_HORIZON_DAYS`) in `fare-chart-loader.js` and `pages/analytics/fare-trends.js`.
