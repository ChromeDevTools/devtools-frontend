// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {listenForSourceFilesAdded, openFileInSourcesPanel, retrieveSourceFilesAdded, waitForAdditionalSourceFiles} from '../helpers/sources-helpers.js';

declare global {
  interface Window {
    __sourceFilesAddedEvents: string[];
  }
}

describe('The Sources Tab', async () => {
  it('can show JavaScript files after dynamic loading', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel('dynamic-loading-javascript.html');
    await listenForSourceFilesAdded(frontend);

    // Load the JavaScript files by executing the function in `dynamic-loading.html`
    await target.evaluate('go();');
    await waitForAdditionalSourceFiles(frontend);

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/minified-sourcecode.js',
      '/test/e2e/resources/sources/evalSourceURL.js',
    ]);
  });

  it('can show CSS files after dynamic loading', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel('dynamic-loading-css.html');
    await listenForSourceFilesAdded(frontend);

    // Load the CSS file by executing the function in `dynamic-loading-css.html`
    await target.evaluate('go();');

    // We must focus the target page, as Chrome does not actually fetch the
    // css file if the tab is not focused
    await target.bringToFront();
    await frontend.bringToFront();

    await waitForAdditionalSourceFiles(frontend);

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/dynamic.css',
    ]);
  });
});
