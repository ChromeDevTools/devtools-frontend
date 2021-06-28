// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';

export function appendStyle(node: Node, cssFile: string): void {
  const content = Root.Runtime.cachedResources.get(cssFile) || '';
  if (!content) {
    console.error(cssFile + ' not preloaded. Check module.json');
  }
  const styleElement = document.createElement('style');
  styleElement.textContent = content;
  node.appendChild(styleElement);
}
