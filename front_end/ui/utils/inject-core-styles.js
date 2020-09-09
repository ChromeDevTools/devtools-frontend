// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {appendStyle} from './append-style.js';

/**
 * @param {!Element|!ShadowRoot} root
 */
export function injectCoreStyles(root) {
  appendStyle(root, 'ui/inspectorCommon.css');
  appendStyle(root, 'ui/textButton.css');
  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
  ThemeSupport.ThemeSupport.instance().injectCustomStyleSheets(root);
}
