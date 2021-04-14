// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {appendStyle} from './append-style.js';
import {focusChanged} from './focus-changed.js';
import {injectCoreStyles} from './inject-core-styles.js';

interface Options {
  cssFile?: string;
  delegatesFocus?: boolean;
  enableLegacyPatching: boolean;
}

export function createShadowRootWithCoreStyles(element: Element, options: Options = {
  delegatesFocus: undefined,
  cssFile: undefined,
  enableLegacyPatching: false,
}): ShadowRoot {
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
  shadowRoot.addEventListener('focus', focusChanged, true);
  return shadowRoot;
}
