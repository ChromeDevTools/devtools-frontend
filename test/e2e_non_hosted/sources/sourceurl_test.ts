// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expandFileTree, type NestedFileSelector, openFileInSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

function createSelectorsForFile(domainName: string, folderName: string, fileName: string): NestedFileSelector {
  const rootSelector = '.navigator-frame-tree-item[aria-label="top, frame"]';
  const domainSelector = `${rootSelector} + ol > [aria-label="${domainName}, domain"]`;
  const folderSelector = `${domainSelector} + ol > [aria-label^="${folderName}, "]`;
  const fileSelector = `${folderSelector} + ol > [aria-label="${fileName}, file"]`;

  return {
    rootSelector,
    domainSelector,
    folderSelector,
    fileSelector,
  };
}

describe('The Sources Tab', () => {
  it('resolves relative sourceURL annotations correctly', async ({devToolsPage, inspectedPage}) => {
    const domainName = inspectedPage.getResourcesPath().split('/')[2];
    await openFileInSourcesPanel('sourceurl.html', devToolsPage, inspectedPage);
    await expandFileTree(createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'eval.js'), devToolsPage);
    await expandFileTree(createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'inline.js'), devToolsPage);
  });

  it('retains absolute webpack:/// and webpack-internal:/// sourceURL annotations',
     async ({devToolsPage, inspectedPage}) => {
       await openFileInSourcesPanel('sourceurl.html', devToolsPage, inspectedPage);
       await expandFileTree(createSelectorsForFile('webpack://', 'src', 'index.js'), devToolsPage);
       await expandFileTree(
           createSelectorsForFile('webpack-internal://', '(webpack-dev-server)', 'generated.js'), devToolsPage);
     });
});
