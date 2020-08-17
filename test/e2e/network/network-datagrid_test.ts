// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToNetworkTab, waitForSomeRequestsToAppear} from '../helpers/network-helpers.js';

describe('The Network Tab', async () => {
  it('can click on checkbox label to toggle checkbox', async () => {
    await navigateToNetworkTab('resources-from-cache.html');

    // Click the label next to the checkbox input element
    await click('[aria-label="Disable cache"] + label');

    const checkbox = await waitFor('[aria-label="Disable cache"]');
    const checked = await checkbox.evaluate(box => (box as HTMLInputElement).checked);

    assert.strictEqual(checked, true, 'The disable cache checkbox should be checked');
  });

  // Flaky test
  it.skip('[crbug.com/1066813] shows Last-Modified', async () => {
    const {frontend} = getBrowserAndPages();
    await navigateToNetworkTab('last-modified.html');

    // Open the contextmenu for all network column
    await click('.name-column', {clickOptions: {button: 'right'}});

    // Enable the Last-Modified column in the network datagrid
    await click('[aria-label="Response Headers"]');
    await click('[aria-label="Last-Modified, unchecked"]');

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(3);

    const lastModifiedColumnValues = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.last-modified-column')).map(message => message.textContent);
    });

    assert.deepEqual(lastModifiedColumnValues, [
      'Last-Modified',
      '',
      'Sun, 26 Sep 2010 22:04:35 GMT',
    ]);
  });

  // Flaky test
  it.skip('[crbug.com/1066813] shows the HTML response including cyrillic characters with utf-8 encoding', async () => {
    await navigateToNetworkTab('utf-8.rawresponse');

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(2);

    // Open the HTML file that was loaded
    await click('td.name-column');
    // Wait for the detailed network information pane to show up
    await waitFor('[aria-label="Response"]');
    // Open the raw response HTML
    await click('[aria-label="Response"]');
    // Wait for the raw response editor to show up
    await waitFor('.CodeMirror-code');

    const codeMirrorEditor = await waitFor('.CodeMirror-code');
    const htmlRawResponse = await codeMirrorEditor.evaluate(editor => editor.textContent);

    assert.strictEqual(
        htmlRawResponse,
        '1<html><body>The following word is written using cyrillic letters and should look like "SUCCESS": SU\u0421\u0421\u0415SS.</body></html>');
  });

  // Flaky test
  it.skip('[crbug.com/1066813] shows the correct MIME type when resources came from HTTP cache', async () => {
    const {target, frontend} = getBrowserAndPages();

    await navigateToNetworkTab('resources-from-cache.html');

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(3);

    // Reload the page without a cache, to force a fresh load of the network resources
    await click('[aria-label="Disable cache"]');
    await target.reload({waitUntil: 'networkidle2'});

    // Get the size of the first two network request responses (excluding header and favicon.ico).
    const getNetworkRequestSize = () => frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(1, 3).map(node => node.textContent);
    });
    const getNetworkRequestMimeTypes = () => frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.type-column')).slice(1, 3).map(node => node.textContent);
    });
    const formatByteSize = (value: number) => {
      return `${value}\xA0B`;
    };

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatByteSize(338)}${formatByteSize(219)}`,
      `${formatByteSize(362)}${formatByteSize(28)}`,
    ]);
    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);

    // Allow resources from the cache again and reload the page to load from cache
    await click('[aria-label="Disable cache"]');
    await target.reload({waitUntil: 'networkidle2'});

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatByteSize(338)}${formatByteSize(219)}`,
      `(memory cache)${formatByteSize(28)}`,
    ]);

    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);
  });
});
