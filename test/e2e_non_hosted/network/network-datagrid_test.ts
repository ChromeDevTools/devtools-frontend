// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getAllRequestNames,
  navigateToNetworkTab,
  selectRequestByName,
  setCacheDisabled,
  setInvert,
  setPersistLog,
  setTextFilter,
  waitForSelectedRequestChange,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function getRequestRowInfo(devToolsPage: DevToolsPage, name: string) {
  const statusColumn = await devToolsPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.status-column')).map(node => node.textContent);
  });
  const timeColumn = await devToolsPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.time-column')).map(node => node.textContent);
  });
  const typeColumn = await devToolsPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.type-column')).map(node => node.textContent);
  });
  const nameColumn = await devToolsPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.name-column')).map(node => node.textContent);
  });
  const index = nameColumn.findIndex(x => x === name);
  return {status: statusColumn[index], time: timeColumn[index], type: typeColumn[index]};
}

describe('The Network Tab', function() {
  // See byte formatting in front_end/core/i18n/ByteUtilities.ts
  const formatKbSize = (value: number) => {
    const kilobytes = value / 1000;
    if (kilobytes < 100) {
      return `${kilobytes.toFixed(1)}\xA0kB`;
    }
    return `${kilobytes}\xA0kB`;
  };

  async function loadNetworkTab(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    await setTextFilter('favicon.ico', devToolsPage);
    await setInvert(true, devToolsPage);
    await setCacheDisabled(true, devToolsPage);
    await setPersistLog(false, devToolsPage);
  }

  it('can click on checkbox label to toggle checkbox', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    await navigateToNetworkTab('resources-from-cache.html', devToolsPage, inspectedPage);

    // Click the label next to the checkbox input element
    await devToolsPage.click('[title^="Disable cache"] + label');

    const checkbox = await devToolsPage.waitFor('[title^="Disable cache"]');
    const checked = await checkbox.evaluate(box => (box as HTMLInputElement).checked);

    assert.isFalse(checked, 'The disable cache checkbox should be unchecked');
  });

  it('shows Last-Modified', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    await navigateToNetworkTab('last-modified.html', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await devToolsPage.click('.name-column', {clickOptions: {button: 'right'}});

    await devToolsPage.click('aria/Response Headers');

    await devToolsPage.click('aria/Last-Modified, unchecked');

    const expectedValues = JSON.stringify(['Last-Modified', '', 'Sun, 26 Sep 2010 22:04:35 GMT']);
    await devToolsPage.waitForFunction(async () => {
      const lastModifiedColumnValues = await devToolsPage.page.$$eval(
          'pierce/.response-header-last-modified-column',
          cells => cells.map(element => element.textContent),
      );
      return JSON.stringify(lastModifiedColumnValues) === expectedValues;
    });
  });

  it('shows size of chunked responses', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    await navigateToNetworkTab('chunked.txt?numChunks=5', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});
    await waitForSomeRequestsToAppear(1, devToolsPage);

    // Get the size of the first two network request responses (excluding header and favicon.ico).
    const getNetworkRequestSize = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(1, 3).map(node => node.textContent);
    });

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatKbSize(210)}${formatKbSize(25)}`,
    ]);
  });

  it('shows size of chunked responses for sync XHR', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    await navigateToNetworkTab('chunked_sync.html', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});
    await waitForSomeRequestsToAppear(2, devToolsPage);

    // Get the size of the first two network request responses (excluding header and favicon.ico).
    const getNetworkRequestSize = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(1, 3).map(node => node.textContent);
    });

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatKbSize(313)}${formatKbSize(128)}`,
      `${formatKbSize(210)}${formatKbSize(25)}`,
    ]);
  });

  it('the HTML response including cyrillic characters with utf-8 encoding', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    await navigateToNetworkTab('utf-8.rawresponse', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(1, devToolsPage);

    // Open the HTML file that was loaded
    await devToolsPage.click('td.name-column');
    // Open the raw response HTML
    await devToolsPage.click('[aria-label="Response"]');
    // Disable pretty printing
    const prettyPrintButton = await devToolsPage.waitFor('[title="Pretty print"]');
    if (await devToolsPage.hasClass(prettyPrintButton, 'toggled')) {
      await devToolsPage.click('[title="Pretty print"]');
    }
    // await new Promise<void>(resolve => setTimeout(resolve, 25000));
    assert.isFalse(await devToolsPage.hasClass(prettyPrintButton, 'toggled'));
    // Wait for the raw response editor to show up
    const codeMirrorEditor = await devToolsPage.waitFor('[aria-label="Code editor"]');

    const htmlRawResponse = await codeMirrorEditor.evaluate(editor => editor.textContent);

    assert.include(
        htmlRawResponse,
        '<body>The following word is written using cyrillic letters and should look like "SUCCESS": SU\u0421\u0421\u0415SS.</body>');
  });

  it('the correct MIME type when resources came from HTTP cache', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('resources-from-cache.html', devToolsPage, inspectedPage);

    // Reload the page without a cache, to force a fresh load of the network resources
    await setCacheDisabled(true, devToolsPage);
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(2, devToolsPage);

    // Get the size of the first two network request responses (excluding header and favicon.ico).
    const getNetworkRequestSize = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(1, 3).map(node => node.textContent);
    });
    const getNetworkRequestMimeTypes = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.type-column')).slice(1, 3).map(node => node.textContent);
    });

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatKbSize(404)}${formatKbSize(219)}`,
      `${formatKbSize(376)}${formatKbSize(28)}`,
    ]);
    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);

    // Allow resources from the cache again and reload the page to load from cache
    await setCacheDisabled(false, devToolsPage);
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});
    // Wait for the column to show up and populate its values
    await waitForSomeRequestsToAppear(2, devToolsPage);

    assert.deepEqual(await getNetworkRequestSize(), [
      `${formatKbSize(404)}${formatKbSize(219)}`,
      `(memory cache)${formatKbSize(28)}`,
    ]);

    assert.deepEqual(await getNetworkRequestMimeTypes(), [
      'document',
      'script',
    ]);
  });

  it('shows the correct initiator address space', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('fetch.html', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await devToolsPage.click('.name-column', {clickOptions: {button: 'right'}});

    await devToolsPage.click('aria/Initiator Address Space, unchecked');

    const expectedValues = JSON.stringify(['Initiator Address Space', '', 'Loopback']);
    await devToolsPage.waitForFunction(async () => {
      const initiatorAddressSpaceValues = await devToolsPage.page.$$eval(
          'pierce/.initiator-address-space-column',
          cells => cells.map(element => element.textContent),
      );
      return JSON.stringify(initiatorAddressSpaceValues) === expectedValues;
    });
  });

  it('shows the correct remote address space', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('fetch.html', devToolsPage, inspectedPage);

    // Reload to populate network request table
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await devToolsPage.click('.name-column', {clickOptions: {button: 'right'}});

    await devToolsPage.click('aria/Remote Address Space, unchecked');

    const expectedValues = JSON.stringify(['Remote Address Space', 'Loopback', 'Loopback']);
    await devToolsPage.waitForFunction(async () => {
      const remoteAddressSpaceValues = await devToolsPage.page.$$eval(
          'pierce/.remote-address-space-column',
          cells => cells.map(element => element.textContent),
      );
      return JSON.stringify(remoteAddressSpaceValues) === expectedValues;
    });
  });

  it('indicates resources from the web bundle in the size column', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('resources-from-webbundle.html', devToolsPage, inspectedPage);

    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(3, devToolsPage);
    await devToolsPage.waitForElementWithTextContent(`(Web Bundle)${formatKbSize(27)}`);

    const getNetworkRequestSize = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.size-column')).slice(2, 4).map(node => node.textContent);
    });

    assert.sameMembers(await getNetworkRequestSize(), [
      `${formatKbSize(653)}${formatKbSize(0)}`,
      `(Web Bundle)${formatKbSize(27)}`,
    ]);
  });

  it('shows web bundle metadata error in the status column', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('resources-from-webbundle-with-bad-metadata.html', devToolsPage, inspectedPage);

    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(3, devToolsPage);
    await devToolsPage.waitForElementWithTextContent('Web Bundle error');
    await devToolsPage.waitForFunction(async () => {
      const [nameColumn, statusColumn] = await devToolsPage.evaluate(() => {
        return [
          Array.from(document.querySelectorAll('.name-column')).map(node => node.textContent),
          Array.from(document.querySelectorAll('.status-column')).map(node => node.textContent),
        ];
      });
      const webBundleStatus = statusColumn[nameColumn.indexOf('webbundle_bad_metadata.wbn/test/e2e/resources/network')];
      const webBundleInnerRequestStatus =
          statusColumn[nameColumn.indexOf('uuid-in-package:020111b3-437a-4c5c-ae07-adb6bbffb720')];
      return webBundleStatus === 'Web Bundle error' &&
          (webBundleInnerRequestStatus === '(failed)net::ERR_INVALID_WEB_BUNDLE' ||
           // There's a race in the renderer where the subresource request will
           // be canceled if it hasn't finished before parsing the metadata failed.
           webBundleInnerRequestStatus === '(canceled)');
    });
  });

  it('shows web bundle inner request error in the status column', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('resources-from-webbundle-with-bad-inner-request.html', devToolsPage, inspectedPage);

    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(3, devToolsPage);
    await devToolsPage.waitForElementWithTextContent('Web Bundle error');

    const getNetworkRequestSize = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.status-column')).slice(2, 4).map(node => node.textContent);
    });

    assert.sameMembers(await getNetworkRequestSize(), ['200OK', 'Web Bundle error']);
  });

  it('shows web bundle icons', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('resources-from-webbundle.html', devToolsPage, inspectedPage);

    await setCacheDisabled(true, devToolsPage);
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await waitForSomeRequestsToAppear(3, devToolsPage);
    await devToolsPage.waitFor('.name-column > [role="link"] > .icon');

    const getNetworkRequestIcons = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.name-column > .icon'))
          .slice(1, 4)
          .map(node => (node as HTMLDivElement).title);
    });
    assert.sameMembers(await getNetworkRequestIcons(), [
      'Script',
      'WebBundle',
    ]);
    const getFromWebBundleIcons = () => devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.name-column > [role="link"] > .icon'))
          .map(node => (node as HTMLDivElement).title);
    });
    assert.sameMembers(await getFromWebBundleIcons(), [
      'Served from Web Bundle',
    ]);
  });

  it('shows preserved pending requests as unknown', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('send_beacon_on_unload.html', devToolsPage, inspectedPage);

    await setCacheDisabled(true, devToolsPage);
    await inspectedPage.bringToFront();
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});

    await devToolsPage.bringToFront();
    await waitForSomeRequestsToAppear(1, devToolsPage);

    await setPersistLog(true, devToolsPage);

    await navigateToNetworkTab('fetch.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(1, devToolsPage);

    // We need to wait for the network log to update.
    await devToolsPage.waitForFunction(async () => {
      const {status} = await getRequestRowInfo(devToolsPage, 'sendBeacon');
      // Depending on timing of the reporting, the status information (404) might reach DevTools in time.
      return (status === '(unknown)' || status === '404Not Found');
    });
  });

  it('repeats xhr request on "r" shortcut when the request is focused', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);

    await navigateToNetworkTab('xhr.html', devToolsPage, inspectedPage);
    await inspectedPage.page.reload({waitUntil: 'networkidle0'});
    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('image.svg', {devToolsPage});
    await waitForSelectedRequestChange(null, devToolsPage);
    await devToolsPage.pressKey('r');
    await waitForSomeRequestsToAppear(3, devToolsPage);

    const updatedRequestNames = await getAllRequestNames(devToolsPage);
    assert.deepEqual(updatedRequestNames, ['xhr.html', 'image.svg', 'image.svg']);
  });

  it('displays focused background color when request is selected via keyboard navigation',
     async ({devToolsPage, inspectedPage}) => {
       await loadNetworkTab(devToolsPage, inspectedPage);

       await navigateToNetworkTab('xhr.html', devToolsPage, inspectedPage);
       await inspectedPage.page.reload({waitUntil: 'networkidle0'});
       await waitForSomeRequestsToAppear(2, devToolsPage);
       await selectRequestByName('xhr.html', {devToolsPage});
       await devToolsPage.pressKey('ArrowDown');

       const getSelectedRequestBgColor = () => devToolsPage.evaluate(() => {
         return document.querySelector('.network-log-grid tbody tr.selected')?.getAttribute('style');
       });

       assert.deepEqual(await getSelectedRequestBgColor(), 'background-color: var(--color-grid-focus-selected);');
     });

  it('shows the request panel when clicked during a websocket message (https://crbug.com/1222382)',
     async ({devToolsPage, inspectedPage}) => {
       await loadNetworkTab(devToolsPage, inspectedPage);
       await navigateToNetworkTab('websocket.html?infiniteMessages=true', devToolsPage, inspectedPage);

       await waitForSomeRequestsToAppear(2, devToolsPage);

       // WebSocket messages get sent every 100 milliseconds, so holding the mouse
       // down for 300 milliseconds should suffice.
       await selectRequestByName('localhost', {delay: 300, devToolsPage});

       await devToolsPage.waitFor('.network-item-view');
     });

  it('shows the main service worker request as complete', async ({devToolsPage, inspectedPage}) => {
    await loadNetworkTab(devToolsPage, inspectedPage);
    const promises = [
      devToolsPage.waitForFunction(async () => {
        const {status, type} = await getRequestRowInfo(devToolsPage, 'service-worker.html/test/e2e/resources/network');
        return status === '200OK' && type === 'document';
      }),
      devToolsPage.waitForFunction(async () => {
        const {status, type} =
            await getRequestRowInfo(devToolsPage, '⚙ service-worker.jslocalhost/test/e2e/resources/network');
        return status === 'Finished' && type === 'script';
      }),
    ];
    await navigateToNetworkTab('service-worker.html', devToolsPage, inspectedPage);
    await inspectedPage.page.waitForSelector('xpath///div[@id="content" and text()="pong"]');
    await Promise.all(promises);
  });
});
