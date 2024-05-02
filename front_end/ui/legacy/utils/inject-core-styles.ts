// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import applicationColorTokensStyles from '../applicationColorTokens.css.legacy.js';
import inspectorCommonStyles from '../inspectorCommon.css.legacy.js';
import textButtonStyles from '../textButton.css.legacy.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import themeColorsStyles from '../themeColors.css.legacy.js';
import tokens from '../tokens.css.legacy.js';

export function injectCoreStyles(root: Element|ShadowRoot): void {
  ThemeSupport.ThemeSupport.instance().appendStyle(root, applicationColorTokensStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, inspectorCommonStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, textButtonStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, themeColorsStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, tokens);

  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
  ThemeSupport.ThemeSupport.instance().injectCustomStyleSheets(root);
}
