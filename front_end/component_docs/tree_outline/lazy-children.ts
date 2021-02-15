// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

async function loadInSomeNodes(): Promise<Components.TreeOutlineUtils.TreeNode[]> {
  const europeanOffices: Components.TreeOutlineUtils.TreeNode[] = [
    {
      key: 'UK',
      children: (): Promise<Components.TreeOutlineUtils.TreeNode[]> => Promise.resolve([
        {
          key: 'LON',
          children: (): Promise<Components.TreeOutlineUtils.TreeNode[]> =>
              Promise.resolve([{key: '6PS'}, {key: 'CSG'}, {key: 'BEL'}]),
        },
      ]),
    },
    {
      key: 'Germany',
      children: (): Promise<Components.TreeOutlineUtils.TreeNode[]> => Promise.resolve([
        {key: 'MUC'},
        {key: 'BER'},
      ]),
    },
  ];

  return new Promise(resolve => {
    setTimeout(() => resolve(europeanOffices), 250);
  });
}

const data: Components.TreeOutline.TreeOutlineData = {
  tree: [
    {
      key: 'Offices',
      children: (): Promise<Components.TreeOutlineUtils.TreeNode[]> => Promise.resolve([
        {
          key: 'Europe',
          chldren: async(): Promise<Components.TreeOutlineUtils.TreeNode[]> => {
            const children = await loadInSomeNodes();
            return children;
          },
        },
      ]),
    },
    {
      key: 'Products',
      children: (): Promise<Components.TreeOutlineUtils.TreeNode[]> => Promise.resolve([
        {
          key: 'Chrome',
        },
        {
          key: 'YouTube',
        },
        {
          key: 'Drive',
        },
        {
          key: 'Calendar',
        },
      ]),

    },
  ],

};
const component = new Components.TreeOutline.TreeOutline();
component.data = data;

document.getElementById('container')?.appendChild(component);
document.getElementById('recursively-expand')?.addEventListener('click', () => {
  component.expandRecursively();
});
