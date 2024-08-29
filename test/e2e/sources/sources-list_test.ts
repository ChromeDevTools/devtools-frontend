// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';

import {navigateToElementsTab} from '../helpers/elements-helpers.js';
import {
  captureAddedSourceFiles,
  openFileInSourcesPanel,
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __sourceFilesAddedEvents: string[];
  }
}

describe('The Sources Tab', () => {
  it('can show JavaScript files after dynamic loading', async () => {
    const {target} = getBrowserAndPages();

    await openFileInSourcesPanel('dynamic-loading-javascript.html');

    // Load the JavaScript files by executing the function in `dynamic-loading.html`
    const capturedFileNames = await captureAddedSourceFiles(2, async () => {
      await target.evaluate('go();');
    });

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/minified-sourcecode.js',
      '/test/e2e/resources/sources/evalSourceURL.js',
    ]);
  });

  it('can show CSS files after dynamic loading', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel('dynamic-loading-css.html');

    const capturedFileNames = await captureAddedSourceFiles(1, async () => {
      // Load the CSS file by executing the function in `dynamic-loading-css.html`
      await target.evaluate('go();');

      // We must focus the target page, as Chrome does not actually fetch the
      // css file if the tab is not focused
      await target.bringToFront();
      await frontend.bringToFront();
    });

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/dynamic.css',
    ]);
  });

  it('populates sources even if it the Sources Tab was not open at refresh', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('pages/hello-world.html');
    await navigateToElementsTab();
    const capturedFileNames = await captureAddedSourceFiles(1, async () => {
      await target.reload({waitUntil: 'networkidle0'});
      await openSourcesPanel();
    });

    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/pages/hello-world.html']);
  });
});
