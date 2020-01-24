// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {appendStyle} from './append-style.js';

/**
 * @param {!Element|!ShadowRoot} root
 */
export function injectCoreStyles(root) {
  appendStyle(root, 'ui/inspectorCommon.css');
  appendStyle(root, 'ui/textButton.css');
  self.UI.themeSupport.injectHighlightStyleSheets(root);
  self.UI.themeSupport.injectCustomStyleSheets(root);
}
