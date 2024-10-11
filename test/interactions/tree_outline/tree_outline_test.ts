// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {$, $$, click, waitFor, waitForFunction} from '../../shared/helper.js';
import {loadComponentDocExample} from '../helpers/shared.js';

async function getTreeOutline(root?: ElementHandle) {
  const treeOutline = await waitFor<HTMLElement>('devtools-tree-outline', root);
  if (!treeOutline) {
    assert.fail('Could not find tree-outline.');
  }
  return treeOutline;
}

interface VisibleTreeNodeFromDOM {
  key: string;
  children?: VisibleTreeNodeFromDOM[];
}

async function buildTreeNode(handler: ElementHandle<HTMLLIElement>): Promise<VisibleTreeNodeFromDOM> {
  const keyNode = await $('[data-node-key]', handler);
  const keyText = keyNode ? await keyNode.evaluate(k => (k.textContent || '').trim()) : '';
  const item: VisibleTreeNodeFromDOM = {
    key: keyText,
  };

  const ariaExpandedAttribute = await handler.evaluate(elem => elem.getAttribute('aria-expanded'));
  if (ariaExpandedAttribute && ariaExpandedAttribute === 'true') {
    // Figure out the aria-level of the parent, so we only select its immediate children that are one level down.
    const parentNodeLevel = await handler.evaluate(elem => window.parseInt(elem.getAttribute('aria-level') || ''));
    item.children = [];
    const childNodes =
        await $$<HTMLLIElement>(`ul[role="group"] > li[role="treeitem"][aria-level="${parentNodeLevel + 1}"]`, handler);
    for (const child of childNodes) {
      const newNode = await buildTreeNode(child);
      item.children.push(newNode);
    }
  }

  return item;
}

async function getRenderedNodesTextAsTree(treeOutline: ElementHandle<HTMLElement>): Promise<VisibleTreeNodeFromDOM[]> {
  const tree: VisibleTreeNodeFromDOM[] = [];

  const rootNodes = await $$<HTMLLIElement>('ul[role="tree"]>li[role="treeitem"]', treeOutline);
  for (const root of rootNodes) {
    const newNode = await buildTreeNode(root);
    tree.push(newNode);
  }

  return tree;
}

describe('TreeOutline', () => {
  it('renders the top level nodes by default', async () => {
    await loadComponentDocExample('tree_outline/basic.html');
    const treeOutline = await getTreeOutline();
    const renderedNodeTree = await getRenderedNodesTextAsTree(treeOutline);
    assert.deepEqual(renderedNodeTree, [
      {key: 'Offices'},
      {key: 'Products'},
    ]);
  });

  it('lets the user click to expand a node', async () => {
    await loadComponentDocExample('tree_outline/basic.html');
    const treeOutline = await getTreeOutline();
    await click('.arrow-icon', {
      root: treeOutline,
    });
    await waitForFunction(async () => {
      const visibleNodes = await $$('li[role="treeitem"]', treeOutline);
      // 3: 2 original root nodes, and the 1 child of the first root node.
      return visibleNodes.length === 3;
    });
    const renderedNodeTree = await getRenderedNodesTextAsTree(treeOutline);
    assert.deepEqual(renderedNodeTree, [
      {key: 'Offices', children: [{key: 'Europe'}]},
      {key: 'Products'},
    ]);
  });
});
