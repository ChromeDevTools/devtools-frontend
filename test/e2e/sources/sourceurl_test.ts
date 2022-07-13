// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getTestServerPort} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';

import {expandFileTree, openFileInSourcesPanel, type NestedFileSelector} from '../helpers/sources-helpers.js';

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
  it('resolves relative sourceURL annotations correctly', async () => {
    const domainName = `localhost:${getTestServerPort()}`;
    await openFileInSourcesPanel('sourceurl.html');
    await expandFileTree(createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'eval.js'));
    await expandFileTree(createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'inline.js'));
  });

  it('retains absolute webpack:/// and webpack-internal:/// sourceURL annotations', async () => {
    await openFileInSourcesPanel('sourceurl.html');
    await expandFileTree(createSelectorsForFile('webpack://', 'src', 'index.js'));
    await expandFileTree(createSelectorsForFile('webpack-internal://', '(webpack-dev-server)', 'generated.js'));
  });
});
