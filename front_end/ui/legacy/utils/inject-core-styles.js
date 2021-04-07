// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThemeSupport from '../../../theme_support/theme_support.js';

import {appendStyle} from './append-style.js';

/**
 * @param {!Element|!ShadowRoot} root
 */
export function injectCoreStyles(root) {
  appendStyle(root, 'ui/legacy/inspectorCommon.css', {enableLegacyPatching: true});
  appendStyle(root, 'ui/legacy/inspectorScrollbars.css', {enableLegacyPatching: false});
  appendStyle(root, 'ui/legacy/themeColors.css', {enableLegacyPatching: false});
  appendStyle(root, 'ui/legacy/textButton.css', {enableLegacyPatching: true});
  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
  ThemeSupport.ThemeSupport.instance().injectCustomStyleSheets(root);
}
