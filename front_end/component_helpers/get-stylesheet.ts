// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

const sheetsCache = new Map<string, {sheets: CSSStyleSheet[], patchThemeSupport: boolean}>();

/**
 * Helper for importing a legacy stylesheet into a component.
 *
 * Given a path to a stylesheet, it returns a CSSStyleSheet that can then be
 * adopted by your component.
 *
 * Pass `patchThemeSupport: true` to turn on the legacy dark mode theming and be
 * returned both the original stylesheet and the new patched rules for dark mode.
 */
export function getStyleSheets(path: string, {patchThemeSupport = false} = {}): CSSStyleSheet[] {
  const cachedResult = sheetsCache.get(path);
  if (cachedResult && cachedResult.patchThemeSupport === patchThemeSupport) {
    return cachedResult.sheets;
  }

  if (!self.Runtime) {
    return [];
  }

  const content = self.Runtime.cachedResources[path] || '';
  if (!content) {
    throw new Error(`${path} not preloaded.`);
  }

  const originalStylesheet = new CSSStyleSheet();
  originalStylesheet.replaceSync(content);

  const themeStyleSheet = self.UI && (self.UI.themeSupport as UI.UIUtils.ThemeSupport).themeStyleSheet(path, content);
  if (!patchThemeSupport || !themeStyleSheet) {
    sheetsCache.set(path, {patchThemeSupport, sheets: [originalStylesheet]});
    return [originalStylesheet];
  }

  const patchedStyleSheet = new CSSStyleSheet();

  patchedStyleSheet.replaceSync(themeStyleSheet + '\n' + Root.Runtime.Runtime.resolveSourceURL(path + '.theme'));
  sheetsCache.set(path, {patchThemeSupport, sheets: [originalStylesheet, patchedStyleSheet]});

  return [originalStylesheet, patchedStyleSheet];
}

/**
 * The combination of these gives components a way to toggle styling for dark
 * mode. It's not enough to just just the media query because the user may have
 * their OS level set to light mode but have turned on the dark theme via
 * settings.
 *
 * See ElementsBreadcrumbs.ts for an example of how this is used.
 */
export const DARK_MODE_CLASS = '.component-in-dark-mode';
export function applyDarkModeClassIfNeeded() {
  if (document.documentElement.classList.contains('-theme-with-dark-background') ||
      window.matchMedia('prefers-color-scheme: dark')) {
    return DARK_MODE_CLASS.slice(1);
  }

  return '';
}
