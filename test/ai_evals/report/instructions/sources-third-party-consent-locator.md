## Expected Findings for `sources-third-party-consent-locator`

A high-quality response to "What third-party scripts are used on this page, including the cookie banner?" will include:
- Identifies the four vendor scripts loaded on `pages/partners/terminal-guide.js`:
  1. **Cookie consent banner**: TrustGuard CMP / OneTrust Enterprise Partner (`/vendor/trustguard-consent-sdk.js`, `#trustguard-consent-sdk`, `window.TrustGuardConsent`, `initTrustGuardConsentBanner()`, storing preferences in `localStorage` under `meridian_trustguard_consent_preferences`).
  2. **Google Maps**: Google Maps JavaScript API v3.56 terminal wayfinding loader (`/vendor/google-maps-terminal-loader.js`, `#google-maps-script-tag`, `mapId: 'MRD_LHR_T5_WAYFINDING'`, `window.MeridianGoogleMapsLoader`).
  3. **Weather widget**: AeroWeather Global API v2.3.1 (`/vendor/airspace-weather-widget.js`, `#airspace-weather-widget`, `window.AeroWeatherClient`).
  4. **Crowd telemetry**: Veovo CrowdSense Airport Flow SDK v3.1.0 (`/vendor/concourse-crowd-telemetry.js`, `#concourse-crowd-telemetry`, `window.CrowdSenseTelemetry`).
