// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Function to return the root node of a given node.
 */
export function getRootNode(node: Node): ShadowRoot|Document {
  const potentialRoot = node.getRootNode();
  if (!(potentialRoot instanceof Document || potentialRoot instanceof ShadowRoot)) {
    throw new Error(`Expected root of widget to be a document or shadowRoot, but was "${potentialRoot.nodeName}"`);
  }
  return potentialRoot;
}
