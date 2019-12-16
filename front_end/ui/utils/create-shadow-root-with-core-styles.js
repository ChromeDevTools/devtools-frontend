// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {appendStyle} from './append-style.js';
import {focusChanged} from './focus-changed.js';
import {injectCoreStyles} from './inject-core-styles.js';

/**
 * @param {!Element} element
 * @param {string=} cssFile
 * @param {boolean=} delegatesFocus
 * @return {!DocumentFragment}
 */
export function createShadowRootWithCoreStyles(element, cssFile, delegatesFocus) {
  const shadowRoot = element.attachShadow({mode: 'open', delegatesFocus});
  injectCoreStyles(shadowRoot);
  if (cssFile) {
    appendStyle(shadowRoot, cssFile);
  }
  shadowRoot.addEventListener('focus', focusChanged.bind(UI), true);
  return shadowRoot;
}
