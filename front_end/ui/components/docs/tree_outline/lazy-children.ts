// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as TreeOutline from '../../tree_outline/tree_outline.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

async function loadInSomeNodes(): Promise<TreeOutline.TreeOutlineUtils.TreeNode<string>[]> {
  const europeanOffices: TreeOutline.TreeOutlineUtils.TreeNode<string>[] = [
    {
      treeNodeData: 'UK',
      id: 'UK',
      children: () => Promise.resolve([
        {
          treeNodeData: 'LON',
          id: 'LON',
          children: () => Promise.resolve(
              [{treeNodeData: '6PS', id: '6PS'}, {treeNodeData: 'CSG', id: 'CSG'}, {treeNodeData: 'BEL', id: 'BEL'}]),
        },
      ]),
    },
    {
      treeNodeData: 'Germany',
      id: 'Germany',
      children: () => Promise.resolve([
        {treeNodeData: 'MUC', id: 'MUC'},
        {treeNodeData: 'BER', id: 'MUC'},
      ]),
    },
  ];

  return new Promise(resolve => {
    setTimeout(() => resolve(europeanOffices), 250);
  });
}

const data: TreeOutline.TreeOutline.TreeOutlineData<string> = {
  defaultRenderer: TreeOutline.TreeOutline.defaultRenderer,
  tree: [
    {
      treeNodeData: 'Offices',
      id: 'Offices',
      children: () => Promise.resolve([
        {
          treeNodeData: 'Europe',
          id: 'Europe',
          async children() {
            const children = await loadInSomeNodes();
            return children;
          },
        },
      ]),
    },
    {
      treeNodeData: 'Products',
      id: 'Products',
      children: () => Promise.resolve([
        {
          treeNodeData: 'Chrome',
          id: 'Chrome',
        },
        {
          treeNodeData: 'YouTube',
          id: 'YouTube',
        },
        {
          treeNodeData: 'Drive',
          id: 'Drive',
        },
        {
          treeNodeData: 'Calendar',
          id: 'Calendar',
        },
      ]),

    },
  ],

};
const component = new TreeOutline.TreeOutline.TreeOutline<string>();
component.setAttribute('toplevelbordercolor', 'var(--sys-color-token-property-special)');
component.data = data;

document.getElementById('container')?.appendChild(component);
document.getElementById('recursively-expand')?.addEventListener('click', () => {
  void component.expandRecursively();
});
