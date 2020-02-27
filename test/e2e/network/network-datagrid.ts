// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';

async function navigateToNetworkTab(target: puppeteer.Page, testName: string) {
  await target.goto(`${resourcesPath}/network/${testName}`);
  await click('#tab-network');
  // Make sure the network tab is shown on the screen
  await waitFor('.network-log-grid');
}

describe('The Network Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can click on checkbox label to toggle checkbox', async () => {
    const {target} = getBrowserAndPages();
    await navigateToNetworkTab(target, 'resources-from-cache.html');

    // Click the label next to the checkbox input element
    await click(`[aria-label="Disable cache"] + label`);

    const checkbox = await $('[aria-label="Disable cache"]');
    const checked = await checkbox.evaluate(box => box.checked);

    assert.equal(checked, true, 'The disable cache checkbox should be checked');
  });

  it('shows Last-Modified', async () => {
    const {target, frontend} = getBrowserAndPages();
    await navigateToNetworkTab(target, 'last-modified.html');

    // Open the contextmenu for all network column
    await click('.name-column', {clickOptions: {button: 'right'}});

    // Enable the Last-Modified column in the network datagrid
    await click(`[aria-label="Response Headers"]`);
    await click(`[aria-label="Last-Modified, unchecked"]`);

    // Wait for the column to show up and populate its values
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.last-modified-column').length === 3;
    });

    const lastModifiedColumnValues = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.last-modified-column')).map(message => message.textContent);
    });

    assert.deepEqual(lastModifiedColumnValues, [
      `Last-Modified`,
      ``,
      `Sun, 26 Sep 2010 22:04:35 GMT`,
    ]);
  });

  it('shows the HTML response including cyrillic characters with utf-8 encoding', async () => {
    const {target, frontend} = getBrowserAndPages();

    await navigateToNetworkTab(target, 'utf-8.rawresponse');

    // Wait for the column to show up and populate its values
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.name-column').length === 2;
    });

    // Open the HTML file that was loaded
    await click('td.name-column');
    // Wait for the detailed network information pane to show up
    await waitFor(`[aria-label="Response"]`);
    // Open the raw response HTML
    await click(`[aria-label="Response"]`);
    // Wait for the raw response editor to show up
    await waitFor('.CodeMirror-code');

    const codeMirrorEditor = await $('.CodeMirror-code');
    const htmlRawResponse = await codeMirrorEditor.evaluate(editor => editor.textContent);

    assert.equal(
        htmlRawResponse,
        `1<html><body>The following word is written using cyrillic letters and should look like "SUCCESS": SU\u0421\u0421\u0415SS.</body></html>`);
  });

  it('shows correct MimeType when resources came from HTTP cache', async () => {
    const {target, frontend} = getBrowserAndPages();

    await navigateToNetworkTab(target, 'resources-from-cache.html');

    // Wait for the column to show up and populate its values
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.name-column').length === 3;
    });

    // Reload the page without a cache, to force a fresh load of the network resources
    await click(`[aria-label="Disable cache"]`);
    await target.reload({waitUntil: 'networkidle2'});

    // Request the first two network request responses (excluding header and favicon.ico)
    const obtainNetworkRequestSize = () => frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(1, 3).map(node => node.textContent);
    });
    const obtainNetworkRequestMimeTypes = () => frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.type-column')).slice(1, 3).map(node => node.textContent);
    });
    const computeByteSize = (value: number) => {
      return `${value}\xA0B`;
    };

    assert.deepEqual(await obtainNetworkRequestSize(), [
      computeByteSize(378) + computeByteSize(258),
      computeByteSize(362) + computeByteSize(28),
    ]);
    assert.deepEqual(await obtainNetworkRequestMimeTypes(), [
      `document`,
      `script`,
    ]);

    // Allow resources from the cache again and reload the page to load from cache
    await click(`[aria-label="Disable cache"]`);
    await target.reload({waitUntil: 'networkidle2'});

    assert.deepEqual(await obtainNetworkRequestSize(), [
      computeByteSize(378) + computeByteSize(258),
      `(memory cache)${computeByteSize(28)}`,
    ]);

    assert.deepEqual(await obtainNetworkRequestMimeTypes(), [
      `document`,
      `script`,
    ]);
  });
});
