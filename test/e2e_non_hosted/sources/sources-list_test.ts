// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToElementsTab} from '../../e2e/helpers/elements-helpers.js';
import {
  captureAddedSourceFiles,
  openFileInSourcesPanel,
  openSourcesPanel,
} from '../../e2e/helpers/sources-helpers.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __sourceFilesAddedEvents: string[];
  }
}

describe('The Sources Tab', () => {
  it('can show JavaScript files after dynamic loading', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('dynamic-loading-javascript.html', devToolsPage, inspectedPage);

    // Load the JavaScript files by executing the function in `dynamic-loading.html`
    const capturedFileNames = await captureAddedSourceFiles(2, async () => {
      await inspectedPage.evaluate('go();');
    }, devToolsPage);

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/minified-sourcecode.js',
      '/test/e2e/resources/sources/evalSourceURL.js',
    ]);
  });

  it('can show CSS files after dynamic loading', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('dynamic-loading-css.html', devToolsPage, inspectedPage);

    const capturedFileNames = await captureAddedSourceFiles(1, async () => {
      // Load the CSS file by executing the function in `dynamic-loading-css.html`
      await inspectedPage.evaluate('go();');

      // We must focus the target page, as Chrome does not actually fetch the
      // css file if the tab is not focused
      await inspectedPage.bringToFront();
      await devToolsPage.bringToFront();
    }, devToolsPage);

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/dynamic.css',
    ]);
  });

  it('populates sources even if it the Sources Tab was not open at refresh', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('pages/hello-world.html');
    await navigateToElementsTab(devToolsPage);
    const capturedFileNames = await captureAddedSourceFiles(1, async () => {
      await inspectedPage.page.reload({waitUntil: 'networkidle0'});
      await openSourcesPanel(devToolsPage);
    }, devToolsPage);

    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/pages/hello-world.html']);
  });
});
