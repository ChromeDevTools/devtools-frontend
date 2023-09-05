// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  $,
  $$,
  click,
  enableExperiment,
  step,
  typeText,
  waitFor,
  waitForAria,
  waitForElementWithTextContent,
  waitForFunction,
  getBrowserAndPages,
  getResourcesPath,
  assertNotNullOrUndefined,
  pasteText,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';
import {triggerLocalFindDialog} from '../helpers/memory-helpers.js';
import {
  getAllRequestNames,
  getTextFromHeadersRow,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 2;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

const configureAndCheckHeaderOverrides = async () => {
  const infoBar = await waitForAria('Select a folder to store override files in.');
  await click('.infobar-main-row .infobar-button', {
    root: infoBar,
  });

  let networkView = await waitFor('.network-item-view');
  await click('#tab-headersComponent', {
    root: networkView,
  });
  await waitFor('#tab-headersComponent[role=tab][aria-selected=true]', networkView);
  let responseHeaderSection = await waitFor('[aria-label="Response Headers"]', networkView);

  let row = await waitFor('.row', responseHeaderSection);
  assert.deepStrictEqual(await getTextFromHeadersRow(row), ['cache-control:', 'max-age=3600']);

  await waitForFunction(async () => {
    await click('.header-name', {root: row});
    await click('.header-value', {root: row});
    await pasteText('Foo');
    return (await getTextFromHeadersRow(row))[1] === 'Foo';
  });

  await click('[title="Reveal header override definitions"]');

  const headersView = await waitFor('devtools-sources-headers-view');
  const headersViewRow = await waitFor('.row.padded', headersView);
  assert.deepStrictEqual(await getTextFromHeadersRow(headersViewRow), ['cache-control', 'Foo']);

  await navigateToNetworkTab('hello.html');
  await selectRequestByName('hello.html');
  networkView = await waitFor('.network-item-view');
  await click('#tab-headersComponent', {
    root: networkView,
  });

  responseHeaderSection = await waitFor('[aria-label="Response Headers"]');
  row = await waitFor('.row.header-overridden', responseHeaderSection);
  assert.deepStrictEqual(await getTextFromHeadersRow(row), ['cache-control:', 'Foo']);
};

describe('The Network Request view', async () => {
  it('re-opens the same tab after switching to another panel and navigating back to the "Network" tab (https://crbug.com/1184578)',
     async () => {
       await navigateToNetworkTab(SIMPLE_PAGE_URL);

       await step('wait for all requests to be shown', async () => {
         await waitForSomeRequestsToAppear(SIMPLE_PAGE_REQUEST_NUMBER + 1);
       });

       await step('select the first SVG request', async () => {
         await selectRequestByName('image.svg?id=0');
       });

       await step('select the "Timing" tab', async () => {
         const networkView = await waitFor('.network-item-view');
         await click('[aria-label=Timing][role="tab"]', {
           root: networkView,
         });
         await waitFor('[aria-label=Timing][role=tab][aria-selected=true]', networkView);
       });

       await step('open the "Console" panel', async () => {
         await click(CONSOLE_TAB_SELECTOR);
         await focusConsolePrompt();
       });

       await step('open the "Network" panel', async () => {
         await click('#tab-network');
         await waitFor('.network-log-grid');
       });

       await step('ensure that the "Timing" tab is shown', async () => {
         const networkView = await waitFor('.network-item-view');
         const selectedTabHeader = await waitFor('[role=tab][aria-selected=true]', networkView);
         const selectedTabText = await selectedTabHeader.evaluate(element => element.textContent || '');

         assert.strictEqual(selectedTabText, 'Timing');
       });
     });

  it('shows webbundle content on preview tab', async () => {
    await navigateToNetworkTab('resources-from-webbundle.html');

    await waitForSomeRequestsToAppear(3);

    await selectRequestByName('webbundle.wbn');

    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Preview][role=tab]', {
      root: networkView,
    });
    await waitFor('[aria-label=Preview][role=tab][aria-selected=true]', networkView);

    await waitForElementWithTextContent('webbundle.wbn', networkView);
    await waitForElementWithTextContent('uuid-in-package:429fcc4e-0696-4bad-b099-ee9175f023ae', networkView);
    await waitForElementWithTextContent('uuid-in-package:020111b3-437a-4c5c-ae07-adb6bbffb720', networkView);
  });

  it('prevents requests on the preview tab.', async () => {
    await navigateToNetworkTab('embedded_requests.html');

    // For the issue to manifest it's mandatory to load the stylesheet by absolute URL. A relative URL would be treated
    // relative to the data URL in the preview iframe and thus not work. We need to generate the URL because the
    // resources path is dynamic, but we can't have any scripts in the resource page since they would be disabled in the
    // preview. Therefore, the resource page contains just an iframe and we're filling it dynamically with content here.
    const stylesheet = `${getResourcesPath()}/network/style.css`;
    const contents = `<head><link rel="stylesheet" href="${stylesheet}"></head><body><p>Content</p></body>`;
    const {target} = getBrowserAndPages();
    await waitForFunction(async () => (await target.$('iframe')) ?? undefined);
    const dataUrl = `data:text/html,${contents}`;
    await target.evaluate((dataUrl: string) => {
      (document.querySelector('iframe') as HTMLIFrameElement).src = dataUrl;
    }, dataUrl);

    await waitForSomeRequestsToAppear(3);

    const names = await getAllRequestNames();
    const name = names.find(v => v && v.startsWith('data:'));
    assertNotNullOrUndefined(name);
    await selectRequestByName(name);

    const styleSrcError = expectError(`Refused to load the stylesheet '${stylesheet}'`);
    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Preview][role=tab]', {
      root: networkView,
    });
    await waitFor('[aria-label=Preview][role=tab][aria-selected=true]', networkView);

    const frame = await waitFor('.html-preview-frame');
    const content = await waitForFunction(async () => (await frame.contentFrame() ?? undefined));
    const p = await waitForFunction(async () => (await content.$('p') ?? undefined));

    const color = await p.evaluate(e => getComputedStyle(e).color);

    assert.deepEqual(color, 'rgb(0, 0, 0)');
    await waitForFunction(async () => await styleSrcError.caught);
  });

  it('permits inline styles on the preview tab.', async () => {
    await navigateToNetworkTab('embedded_requests.html');
    const contents = '<head><style>p { color: red; }</style></head><body><p>Content</p></body>';
    const {target} = getBrowserAndPages();
    await waitForFunction(async () => (await target.$('iframe')) ?? undefined);
    const dataUrl = `data:text/html,${contents}`;
    await target.evaluate((dataUrl: string) => {
      (document.querySelector('iframe') as HTMLIFrameElement).src = dataUrl;
    }, dataUrl);

    await waitForSomeRequestsToAppear(2);

    const names = await getAllRequestNames();
    const name = names.find(v => v && v.startsWith('data:'));
    assertNotNullOrUndefined(name);
    await selectRequestByName(name);

    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Preview][role=tab]', {
      root: networkView,
    });
    await waitFor('[aria-label=Preview][role=tab][aria-selected=true]', networkView);

    const frame = await waitFor('.html-preview-frame');
    const content = await waitForFunction(async () => (await frame.contentFrame() ?? undefined));
    const p = await waitForFunction(async () => (await content.$('p') ?? undefined));

    const color = await p.evaluate(e => getComputedStyle(e).color);

    assert.deepEqual(color, 'rgb(255, 0, 0)');
  });

  it('stores websocket filter', async () => {
    const navigateToWebsocketMessages = async () => {
      await navigateToNetworkTab('websocket.html');

      await waitForSomeRequestsToAppear(2);

      await selectRequestByName('localhost');

      const networkView = await waitFor('.network-item-view');
      await click('[aria-label=Messages][role=tab]', {
        root: networkView,
      });
      await waitFor('[aria-label=Messages][role=tab][aria-selected=true]', networkView);
      return waitFor('.websocket-frame-view');
    };

    let messagesView = await navigateToWebsocketMessages();
    const waitForMessages = async (count: number) => {
      return waitForFunction(async () => {
        const messages = await $$('.data-column.websocket-frame-view-td', messagesView);
        if (messages.length !== count) {
          return undefined;
        }
        return Promise.all(messages.map(message => {
          return message.evaluate(message => message.textContent || '');
        }));
      });
    };
    let messages = await waitForMessages(4);

    const filterInput =
        await waitFor('[aria-label="Enter regex, for example: (web)?socket"][role=textbox]', messagesView);
    await filterInput.focus();
    await typeText('ping');

    messages = await waitForMessages(2);
    assert.deepEqual(messages, ['ping', 'ping']);

    messagesView = await navigateToWebsocketMessages();
    messages = await waitForMessages(2);

    assert.deepEqual(messages, ['ping', 'ping']);
  });

  function assertOutlineMatches(expectedPatterns: string[], outline: string[]) {
    const regexpSpecialChars = /[-\/\\^$*+?.()|[\]{}]/g;
    for (const item of outline) {
      const expectedPattern = expectedPatterns.shift();
      if (expectedPattern) {
        assert.match(item, new RegExp(expectedPattern.replace(regexpSpecialChars, '\\$&').replace(/%/g, '.*')));
      } else {
        assert.fail('Unexpected text: ' + item);
      }
    }
  }

  it('shows request headers and payload', async () => {
    await navigateToNetworkTab('headers-and-payload.html');

    await waitForSomeRequestsToAppear(2);

    await selectRequestByName('image.svg?id=42&param=a%20b');

    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Headers][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Headers][role=tab][aria-selected=true]', networkView);
    const expectedHeadersContent = [
      {
        aria: 'General',
        rows: [
          'Request URL:',
          'https://localhost:%/test/e2e/resources/network/image.svg?id=42&param=a%20b',
          'Request Method:',
          'POST',
          'Status Code:',
          '200 OK',
          'Remote Address:',
          '[::1]:%',
          'Referrer Policy:',
          'strict-origin-when-cross-origin',
        ],
      },
      {
        aria: 'Response Headers',
        rows: [
          'cache-control:',
          'max-age=%',
          'connection:',
          'keep-alive',
          'content-type:',
          'image/svg+xml; charset=utf-8',
          'date:',
          '%',
          'keep-alive:',
          'timeout=5',
          'transfer-encoding:',
          'chunked',
          'vary:',
          'Origin',
        ],
      },
      {
        aria: 'Request Headers',
        rows: [
          'accept:',
          '*/*',
          'accept-encoding:',
          '%',
          'accept-language:',
          '%',
          'connection:',
          'keep-alive',
          'content-length:',
          '32',
          'content-type:',
          'application/x-www-form-urlencoded;charset=UTF-8',
          'host:',
          'localhost:%',
          'origin:',
          'https://localhost:%',
          'referer:',
          'https://localhost:%/test/e2e/resources/network/headers-and-payload.html',
          'sec-ch-ua:',
          '%',
          'sec-ch-ua-mobile:',
          '?0',
          'sec-ch-ua-platform:',
          '%',
          'sec-fetch-dest:',
          'empty',
          'sec-fetch-mode:',
          'cors',
          'sec-fetch-site:',
          'same-origin',
          'user-agent:',
          'Mozilla/5.0 %',
          'x-same-domain:',
          '1',
        ],
      },
    ];

    for (const sectionContent of expectedHeadersContent) {
      const section = await waitFor(`[aria-label="${sectionContent.aria}"]`);
      const rows = await $$('.row', section);
      const rowsText = await (await Promise.all(rows.map(async row => await getTextFromHeadersRow(row)))).flat();
      assertOutlineMatches(sectionContent.rows, rowsText);
    }

    await click('[aria-label=Payload][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Payload][role=tab][aria-selected=true]', networkView);
    const payloadView = await waitFor('.request-payload-view');
    const payloadOutline = await $$('[role=treeitem]:not(.hidden)', payloadView);
    const payloadOutlineText =
        await Promise.all(payloadOutline.map(async item => item.evaluate(el => el.textContent || '')));
    const expectedPayloadContent = [
      'Query String Parameters (2)view sourceview URL-encoded',
      ['id: 42', 'param: a b'],
      'Form Data (4)view sourceview URL-encoded',
      [
        'foo: alpha',
        'bar: beta:42:0',
        'baz: ',
        '(empty)',
      ],
    ].flat();

    assertOutlineMatches(expectedPayloadContent, payloadOutlineText);
  });

  it('shows raw headers', async () => {
    await navigateToNetworkTab('headers-and-payload.html');

    await waitForSomeRequestsToAppear(2);

    await selectRequestByName('image.svg?id=42&param=a%20b');

    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Headers][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Headers][role=tab][aria-selected=true]', networkView);
    const section = await waitFor('[aria-label="Response Headers"]');
    await click('input', {
      root: section,
    });

    const expectedRawHeadersContent = [
      'HTTP/1.1 200 OK',
      'Content-Type: image/svg+xml; charset=utf-8',
      'Cache-Control: max-age=%',
      'Vary: Origin',
      'Date: %',
      'Connection: keep-alive',
      'Keep-Alive: timeout=5',
      'Transfer-Encoding: chunked',
    ].join('\r\n');
    const rawHeaders = await $('.raw-headers', section);
    const rawHeadersText = await rawHeaders.evaluate(el => el.textContent || '');
    assertOutlineMatches([expectedRawHeadersContent], [rawHeadersText]);

    const expectedHeadersContent = [
      {
        aria: 'General',
        rows: [
          'Request URL:',
          'https://localhost:%/test/e2e/resources/network/image.svg?id=42&param=a%20b',
          'Request Method:',
          'POST',
          'Status Code:',
          '200 OK',
          'Remote Address:',
          '[::1]:%',
          'Referrer Policy:',
          'strict-origin-when-cross-origin',
        ],
      },
      {
        aria: 'Request Headers',
        rows: [
          'accept:',
          '*/*',
          'accept-encoding:',
          '%',
          'accept-language:',
          '%',
          'connection:',
          'keep-alive',
          'content-length:',
          '32',
          'content-type:',
          'application/x-www-form-urlencoded;charset=UTF-8',
          'host:',
          'localhost:%',
          'origin:',
          'https://localhost:%',
          'referer:',
          'https://localhost:%/test/e2e/resources/network/headers-and-payload.html',
          'sec-ch-ua:',
          '%',
          'sec-ch-ua-mobile:',
          '?0',
          'sec-ch-ua-platform:',
          '%',
          'sec-fetch-dest:',
          'empty',
          'sec-fetch-mode:',
          'cors',
          'sec-fetch-site:',
          'same-origin',
          'user-agent:',
          'Mozilla/5.0 %',
          'x-same-domain:',
          '1',
        ],
      },
    ];

    for (const sectionContent of expectedHeadersContent) {
      const section = await waitFor(`[aria-label="${sectionContent.aria}"]`);
      const rows = await $$('.row', section);
      const rowsText = await (await Promise.all(rows.map(async row => await getTextFromHeadersRow(row)))).flat();
      assertOutlineMatches(sectionContent.rows, rowsText);
    }
  });

  it('payload tab selection is preserved', async () => {
    await navigateToNetworkTab('headers-and-payload.html');

    await waitForSomeRequestsToAppear(3);

    await selectRequestByName('image.svg?id=42&param=a%20b');

    const networkView = await waitFor('.network-item-view');
    await click('[aria-label=Payload][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Payload][role=tab][aria-selected=true]', networkView);

    await selectRequestByName('image.svg');
    await waitForElementWithTextContent('foo: gamma');
  });

  it('no duplicate payload tab on headers update', async () => {
    await navigateToNetworkTab('requests.html');
    const {target} = getBrowserAndPages();
    target.evaluate(() => fetch('image.svg?delay'));
    await waitForSomeRequestsToAppear(2);

    await selectRequestByName('image.svg?delay');
    await target.evaluate(async () => await fetch('/?send_delayed'));
  });

  it('can create header overrides via request\'s context menu', async () => {
    await enableExperiment('headerOverrides');
    await navigateToNetworkTab('hello.html');
    await selectRequestByName('hello.html', {button: 'right'});

    await click('aria/Override headers');

    await configureAndCheckHeaderOverrides();
  });

  it('can create header overrides via header\'s pencil icon', async () => {
    await enableExperiment('headerOverrides');
    await navigateToNetworkTab('hello.html');
    await selectRequestByName('hello.html');

    const networkView = await waitFor('.network-item-view');
    await click('#tab-headersComponent', {
      root: networkView,
    });

    await click('devtools-button.enable-editing');
    await configureAndCheckHeaderOverrides();
  });

  it('can search by headers name', async () => {
    await navigateToNetworkTab('headers-and-payload.html');

    await waitForSomeRequestsToAppear(2);

    await selectRequestByName('image.svg?id=42&param=a%20b');
    const SEARCH_QUERY = '[aria-label="Search Query"]';
    const SEARCH_RESULT = '.search-result';
    const {frontend} = getBrowserAndPages();

    await triggerLocalFindDialog(frontend);
    await waitFor(SEARCH_QUERY);
    const inputElement = await $(SEARCH_QUERY);
    if (!inputElement) {
      assert.fail('Unable to find search input field');
    }

    await inputElement.focus();
    await inputElement.type('Cache-Control');
    await frontend.keyboard.press('Enter');

    await waitFor(SEARCH_RESULT);
  });
});
