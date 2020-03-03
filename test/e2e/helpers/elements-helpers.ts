// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {$, waitFor} from '../../shared/helper.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';

export async function assertContentOfSelectedElementsNode(expectedTextContent: string) {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.equal(selectedTextContent, expectedTextContent);
}

export async function
waitForChildrenOfSelectedElementNode() {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
}
