// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step, waitFor, waitForAria, waitForFunction} from '../../shared/helper.js';
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

  it('shows Last-Modified', async () => {
    const {target, frontend} = getBrowserAndPages();
    await navigateToNetworkTab('last-modified.html');

    // Reload to populate network request table
    await target.reload({waitUntil: 'networkidle0'});

    await step('Wait for the column to show up and populate its values', async () => {
      await waitForSomeRequestsToAppear(2);
    });

    await step('Open the contextmenu for all network column', async () => {
      await click('.name-column', {clickOptions: {button: 'right'}});
    });

    await step('Click "Response Headers" submenu', async () => {
      const responseHeaders = await waitForAria('Response Headers');
      await click(responseHeaders);
    });

    await step('Enable the Last-Modified column in the network datagrid', async () => {
      const lastModified = await waitForAria('Last-Modified, unchecked');
      await click(lastModified);
    });

    await step('Wait for the "Last-Modified" column to have the expected values', async () => {
      const expectedValues = JSON.stringify(['Last-Modified', '', 'Sun, 26 Sep 2010 22:04:35 GMT']);
      await waitForFunction(async () => {
        const lastModifiedColumnValues = await frontend.$$eval(
            'pierce/.last-modified-column',
            cells => cells.map(element => element.textContent),
        );
        return JSON.stringify(lastModifiedColumnValues) === expectedValues;
      });
    });
  });

  it('shows the HTML response including cyrillic characters with utf-8 encoding', async () => {
    const {target} = getBrowserAndPages();
    await navigateToNetworkTab('utf-8.rawresponse');

    // Reload to populate network request table
    await target.reload({waitUntil: 'networkidle0'});

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(1);

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

  it('shows the correct MIME type when resources came from HTTP cache', async () => {
    const {target, frontend} = getBrowserAndPages();

    await navigateToNetworkTab('resources-from-cache.html');

    // Reload the page without a cache, to force a fresh load of the network resources
    await click('[aria-label="Disable cache"]');
    await target.reload({waitUntil: 'networkidle0'});

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(2);

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
      `${formatByteSize(361)}${formatByteSize(219)}`,
      `${formatByteSize(362)}${formatByteSize(28)}`,
    ]);
    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);

    // Allow resources from the cache again and reload the page to load from cache
    await click('[aria-label="Disable cache"]');
    await target.reload({waitUntil: 'networkidle0'});
    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(2);

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatByteSize(361)}${formatByteSize(219)}`,
      `(memory cache)${formatByteSize(28)}`,
    ]);

    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);
  });

  it('shows the correct initiator address space', async () => {
    const {target, frontend} = getBrowserAndPages();

    await navigateToNetworkTab('fetch.html');

    // Reload to populate network request table
    await target.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(2);

    await step('Open the contextmenu for all network column', async () => {
      await click('.name-column', {clickOptions: {button: 'right'}});
    });

    await step('Enable the Initiator Address Space column in the network datagrid', async () => {
      const initiatorAddressSpace = await waitForAria('Initiator Address Space, unchecked');
      await click(initiatorAddressSpace);
    });

    await step('Wait for the Initiator Address Space column to have the expected values', async () => {
      const expectedValues = JSON.stringify(['Initiator Address Space', '', 'Local']);
      await waitForFunction(async () => {
        const initiatorAddressSpaceValues = await frontend.$$eval(
            'pierce/.initiator-address-space-column',
            cells => cells.map(element => element.textContent),
        );
        return JSON.stringify(initiatorAddressSpaceValues) === expectedValues;
      });
    });
  });
});
