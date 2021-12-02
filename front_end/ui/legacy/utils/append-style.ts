// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function appendStyle(node: Node, {cssContent}: {cssContent: string}): void {
  const styleElement = document.createElement('style');
  styleElement.textContent = cssContent;
  node.appendChild(styleElement);
}
