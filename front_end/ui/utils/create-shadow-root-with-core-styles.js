// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {appendStyle} from './append-style.js';
import {focusChanged} from './focus-changed.js';
import {injectCoreStyles} from './inject-core-styles.js';

/**
 * @param {!Element} element
 * @param {(!{cssFile:(string|undefined),delegatesFocus:(boolean|undefined),enableLegacyPatching:boolean}|undefined)} options
 * @return {!DocumentFragment}
 */
export function createShadowRootWithCoreStyles(element, options = {
  delegatesFocus: undefined,
  cssFile: undefined,
  enableLegacyPatching: false,
}) {
  const {
    cssFile,
    delegatesFocus,
    enableLegacyPatching,
  } = options;

  const shadowRoot = element.attachShadow({mode: 'open', delegatesFocus});
  injectCoreStyles(shadowRoot);
  if (cssFile) {
    appendStyle(shadowRoot, cssFile, {enableLegacyPatching});
  }
  shadowRoot.addEventListener('focus', focusChanged.bind(UI), true);
  return shadowRoot;
}
