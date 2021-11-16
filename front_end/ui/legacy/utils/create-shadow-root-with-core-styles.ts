// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {appendStyle} from './append-style.js';
import {focusChanged} from './focus-changed.js';
import {injectCoreStyles} from './inject-core-styles.js';

interface Options {
  cssFile?: string|CSSStyleSheet[]|{cssContent: string};
  delegatesFocus?: boolean;
}

export function createShadowRootWithCoreStyles(element: Element, options: Options = {
  delegatesFocus: undefined,
  cssFile: undefined,
}): ShadowRoot {
  const {
    cssFile,
    delegatesFocus,
  } = options;

  const shadowRoot = element.attachShadow({mode: 'open', delegatesFocus});
  injectCoreStyles(shadowRoot);
  if (typeof cssFile === 'string' || (cssFile !== undefined && 'cssContent' in cssFile)) {
    appendStyle(shadowRoot, cssFile);
  } else if (cssFile) {
    shadowRoot.adoptedStyleSheets = cssFile;
  }
  shadowRoot.addEventListener('focus', focusChanged, true);
  return shadowRoot;
}
