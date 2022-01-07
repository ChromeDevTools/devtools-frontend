// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import inspectorCommonStyles from '../inspectorCommon.css.legacy.js';
import textButtonStyles from '../textButton.css.legacy.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import themeColorsStyles from '../themeColors.css.legacy.js';

import {appendStyle} from './append-style.js';

export function injectCoreStyles(root: Element|ShadowRoot): void {
  appendStyle(root, inspectorCommonStyles);
  appendStyle(root, textButtonStyles);
  appendStyle(root, themeColorsStyles);

  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
  ThemeSupport.ThemeSupport.instance().injectCustomStyleSheets(root);
}
