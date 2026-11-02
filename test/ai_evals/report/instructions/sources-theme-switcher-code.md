## Expected Findings for `sources-theme-switcher-code`

A high-quality response to "how does the theme switching and customisation work?" will include:
- Identifies `/assets/settings/theme-switcher.js` (`window.CobaltThemeSwitcher`) and `pages/settings/appearance.js` (`AppearancePreferencesPage`).
- Explains `handleToggleTheme()` and `handleSelectTheme(themeId)` calling `applyWorkspaceColorScheme(requestedMode, storageNamespace)`, which persists the mode in `window.localStorage` under `'cobalt:workspace:color_scheme'` and sets the `data-workspace-theme` attribute on `document.documentElement` (`<html>`).
- Explains `formatPreviewSample(scale)` computing scaled `fontSize` and `lineHeight` for `TYPOGRAPHY_PRESETS`, and `resolveDensityTokens(preset)` returning spacing and sizing tokens (`padding`, `fontSize`, `rowHeight`, `iconSize`, `gap`) for `DENSITY_PRESETS`.
