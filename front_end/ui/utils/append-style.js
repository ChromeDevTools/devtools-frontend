// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Node} node
 * @param {string} cssFile
 * @suppressGlobalPropertiesCheck
 */
export function appendStyle(node, cssFile) {
  const content = self.Runtime.cachedResources[cssFile] || '';
  if (!content) {
    console.error(cssFile + ' not preloaded. Check module.json');
  }
  let styleElement = createElement('style');
  styleElement.textContent = content;
  node.appendChild(styleElement);

  const themeStyleSheet = self.UI.themeSupport.themeStyleSheet(cssFile, content);
  if (themeStyleSheet) {
    styleElement = createElement('style');
    styleElement.textContent = themeStyleSheet + '\n' + Root.Runtime.resolveSourceURL(cssFile + '.theme');
    node.appendChild(styleElement);
  }
}
