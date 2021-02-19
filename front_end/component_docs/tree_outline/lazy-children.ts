// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

async function loadInSomeNodes(): Promise<Components.TreeOutlineUtils.TreeNode<string>[]> {
  const europeanOffices: Components.TreeOutlineUtils.TreeNode<string>[] = [
    {
      treeNodeData: 'UK',
      children: () => Promise.resolve([
        {
          treeNodeData: 'LON',
          children: () => Promise.resolve([{treeNodeData: '6PS'}, {treeNodeData: 'CSG'}, {treeNodeData: 'BEL'}]),
        },
      ]),
    },
    {
      treeNodeData: 'Germany',
      children: () => Promise.resolve([
        {treeNodeData: 'MUC'},
        {treeNodeData: 'BER'},
      ]),
    },
  ];

  return new Promise(resolve => {
    setTimeout(() => resolve(europeanOffices), 250);
  });
}

const data: Components.TreeOutline.TreeOutlineData<string> = {
  defaultRenderer: Components.TreeOutline.defaultRenderer,
  tree: [
    {
      treeNodeData: 'Offices',
      children: () => Promise.resolve([
        {
          treeNodeData: 'Europe',
          async children() {
            const children = await loadInSomeNodes();
            return children;
          },
        },
      ]),
    },
    {
      treeNodeData: 'Products',
      children: () => Promise.resolve([
        {
          treeNodeData: 'Chrome',
        },
        {
          treeNodeData: 'YouTube',
        },
        {
          treeNodeData: 'Drive',
        },
        {
          treeNodeData: 'Calendar',
        },
      ]),

    },
  ],

};
const component = new Components.TreeOutline.TreeOutline<string>();
component.data = data;

document.getElementById('container')?.appendChild(component);
document.getElementById('recursively-expand')?.addEventListener('click', () => {
  component.expandRecursively();
});
