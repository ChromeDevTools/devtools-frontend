// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThemeSupport from '../theme_support/theme_support.js';

import {focusChanged} from './focus-changed.js';
import {injectCoreStyles} from './inject-core-styles.js';

interface Options {
  cssFile?: CSSStyleSheet[]|{cssContent: string};
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
  if (cssFile) {
    if ('cssContent' in cssFile) {
      ThemeSupport.ThemeSupport.instance().appendStyle(shadowRoot, cssFile);
    } else {
      shadowRoot.adoptedStyleSheets = cssFile;
    }
  }
  shadowRoot.addEventListener('focus', focusChanged, true);
  return shadowRoot;
}
