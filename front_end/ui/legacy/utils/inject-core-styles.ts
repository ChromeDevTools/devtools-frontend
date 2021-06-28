// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThemeSupport from '../theme_support/theme_support.js';
import {appendStyle} from './append-style.js';

export function injectCoreStyles(root: Element|ShadowRoot): void {
  // TODO: Migrate inspectorCommpon.css last https://crbug.com/1222666
  appendStyle(root, 'ui/legacy/inspectorCommon.css');
  appendStyle(root, 'ui/legacy/inspectorScrollbars.css');
  appendStyle(root, 'ui/legacy/textButton.css');
  appendStyle(root, 'ui/legacy/themeColors.css');

  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
  ThemeSupport.ThemeSupport.instance().injectCustomStyleSheets(root);
}

let bodyComputedStylesCached: CSSStyleDeclaration|null = null;
export function getThemeColorValue(variableName: string): string {
  if (!bodyComputedStylesCached) {
    /**
     * We are safe to cache this value as we're only using this code to look up
     * theme variables, and they do not change during runtime. And if the user
     * swaps from light => dark theme, or vice-versa, DevTools is entirely
     * reloaded, removing this cache.
     */
    bodyComputedStylesCached = window.getComputedStyle(document.body);
  }

  const colorValue = bodyComputedStylesCached.getPropertyValue(variableName);
  if (!colorValue) {
    throw new Error(`Could not find theme color for variable ${variableName}.`);
  }
  return colorValue;
}

export function getCurrentTheme(): 'light'|'dark' {
  if (document.documentElement.classList.contains('-theme-with-dark-background')) {
    return 'dark';
  }
  return 'light';
}
