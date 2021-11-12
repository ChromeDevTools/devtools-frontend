// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';

export function appendStyle(node: Node, cssReference: string|{cssContent: string}): void {
  let content: string;
  if (typeof cssReference === 'string') {
    content = Root.Runtime.cachedResources.get(cssReference) || '';
    if (!content) {
      console.error(cssReference + ' not preloaded. Check module.json');
    }
  } else {
    content = cssReference.cssContent;
  }
  const styleElement = document.createElement('style');
  styleElement.textContent = content;
  node.appendChild(styleElement);
}
