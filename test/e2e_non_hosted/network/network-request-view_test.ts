// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {expectError} from '../../conductor/events.js';
import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
} from '../../e2e/helpers/console-helpers.js';
import {triggerLocalFindDialog} from '../../e2e/helpers/memory-helpers.js';
import {
  clickInfobarButton,
  getAllRequestNames,
  getTextFromHeadersRow,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 2;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

const configureAndCheckHeaderOverrides = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
  await clickInfobarButton(devToolsPage);
  let networkView = await devToolsPage.waitFor('.network-item-view');
  await devToolsPage.click('#tab-headers-component', {
    root: networkView,
  });
  await devToolsPage.waitFor('#tab-headers-component[role=tab][aria-selected=true]', networkView);
  let responseHeaderSection = await devToolsPage.waitFor('[aria-label="Response Headers"]', networkView);

  let row = await devToolsPage.waitFor('.row', responseHeaderSection);
  assert.deepEqual(await getTextFromHeadersRow(row, devToolsPage), [
    'cache-control',
    'max-age=3600',
  ]);

  await devToolsPage.waitForFunction(async () => {
    await devToolsPage.click('.header-name', {root: row});
    await devToolsPage.click('.header-value', {root: row});
    await devToolsPage.pasteText('Foo');
    return (await getTextFromHeadersRow(row, devToolsPage))[1] === 'Foo';
  });

  await devToolsPage.click('[title="Reveal header override definitions"]');

  const headersView = await devToolsPage.waitFor('devtools-sources-headers-view');
  const headersViewRow = await devToolsPage.waitFor('.row.padded', headersView);
  assert.deepEqual(await getTextFromHeadersRow(headersViewRow, devToolsPage), [
    'cache-control',
    'Foo',
  ]);

  await navigateToNetworkTab('hello.html', devToolsPage, inspectedPage);
  await selectRequestByName('hello.html', {devToolsPage});
  networkView = await devToolsPage.waitFor('.network-item-view');
  await devToolsPage.click('#tab-headers-component', {
    root: networkView,
  });

  responseHeaderSection = await devToolsPage.waitFor('[aria-label="Response Headers"]');
  row = await devToolsPage.waitFor('.row.header-overridden', responseHeaderSection);
  assert.deepEqual(await getTextFromHeadersRow(row, devToolsPage), ['cache-control', 'Foo']);
};

describe('The Network Request view', () => {
  it('re-opens the same tab after switching to another panel and navigating back to the "Network" tab (https://crbug.com/1184578)',
     async ({
       devToolsPage,
       inspectedPage,
     }) => {
       await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);

       await waitForSomeRequestsToAppear(SIMPLE_PAGE_REQUEST_NUMBER + 1, devToolsPage);

       await selectRequestByName('image.svg?id=0', {devToolsPage});
       let networkView = await devToolsPage.waitFor('.network-item-view');
       await devToolsPage.clickMoreTabsButton(networkView);
       await devToolsPage.click('[aria-label=Timing]');
       await devToolsPage.waitFor('[aria-label=Timing][role=tab][aria-selected=true]', networkView);

       await devToolsPage.click(CONSOLE_TAB_SELECTOR);
       await focusConsolePrompt(devToolsPage);

       await devToolsPage.click('#tab-network');
       await devToolsPage.waitFor('.network-log-grid');

       networkView = await devToolsPage.waitFor('.network-item-view');
       const selectedTabHeader = await devToolsPage.waitFor('[role=tab][aria-selected=true]', networkView);
       const selectedTabText = await selectedTabHeader.evaluate(element => element.textContent || '');

       assert.strictEqual(selectedTabText, 'Timing');
     });

  it('prevents requests on the preview tab.', async ({
                                                devToolsPage,
                                                inspectedPage,
                                              }) => {
    await navigateToNetworkTab('embedded_requests.html', devToolsPage, inspectedPage);

    // For the issue to manifest it's mandatory to load the stylesheet by absolute URL. A relative URL would be treated
    // relative to the data URL in the preview iframe and thus not work. We need to generate the URL because the
    // resources path is dynamic, but we can't have any scripts in the resource page since they would be disabled in the
    // preview. Therefore, the resource page contains just an iframe and we're filling it dynamically with content here.
    const stylesheet = `${inspectedPage.getResourcesPath()}/network/style.css`;
    const contents = `<head><link rel="stylesheet" href="${stylesheet}"></head><body><p>Content</p></body>`;
    await inspectedPage.waitForFunction(async () => (await inspectedPage.page.$('iframe')) ?? undefined);
    const dataUrl = `data:text/html,${contents}`;
    await inspectedPage.evaluate((dataUrl: string) => {
      (document.querySelector('iframe') as HTMLIFrameElement).src = dataUrl;
    }, dataUrl);

    await waitForSomeRequestsToAppear(3, devToolsPage);

    const names = await getAllRequestNames(devToolsPage);
    const name = names.find(v => v?.startsWith('data:'));
    assert.isOk(name);
    await selectRequestByName(name, {devToolsPage});

    const styleSrcError = expectError(`Loading the stylesheet '${stylesheet}' violates`);
    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=Preview][role=tab]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Preview][role=tab][aria-selected=true]', networkView);

    const frame = await devToolsPage.waitFor('.html-preview-frame');
    const content = await devToolsPage.waitForFunction(async () => (await frame.contentFrame()) ?? undefined);
    const p = await devToolsPage.waitForFunction(async () => (await content.$('p')) ?? undefined);

    const color = await p.evaluate(e => getComputedStyle(e).color);

    assert.deepEqual(color, 'rgb(0, 0, 0)');
    await devToolsPage.waitForFunction(async () => styleSrcError.caught);
  });

  it('permits inline styles on the preview tab.', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('embedded_requests.html', devToolsPage, inspectedPage);
    const contents = '<head><style>p { color: red; }</style></head><body><p>Content</p></body>';
    await devToolsPage.waitForFunction(async () => (await inspectedPage.page.$('iframe')) ?? undefined);
    const dataUrl = `data:text/html,${contents}`;
    await inspectedPage.evaluate((dataUrl: string) => {
      (document.querySelector('iframe') as HTMLIFrameElement).src = dataUrl;
    }, dataUrl);

    await waitForSomeRequestsToAppear(2, devToolsPage);

    const name = await devToolsPage.waitForFunction(async () => {
      const names = await getAllRequestNames(devToolsPage);
      const name = names.find(v => v?.startsWith('data:'));
      return name;
    });
    await selectRequestByName(name, {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=Preview][role=tab]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Preview][role=tab][aria-selected=true]', networkView);

    const frame = await devToolsPage.waitFor('.html-preview-frame');
    const content = await devToolsPage.waitForFunction(async () => (await frame.contentFrame()) ?? undefined);
    const p = await devToolsPage.waitForFunction(async () => (await content.$('p')) ?? undefined);

    const color = await p.evaluate(e => getComputedStyle(e).color);

    assert.deepEqual(color, 'rgb(255, 0, 0)');
  });

  const navigateToEventStreamMessages = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
    await navigateToNetworkTab('eventstream.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('event-stream.rawresponse', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=EventStream][role=tab]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=EventStream][role=tab][aria-selected=true]', networkView);
    return await devToolsPage.waitFor('.event-source-messages-view');
  };

  interface EventSourceMessageRaw {
    id: string|undefined;
    type: string|undefined;
    data: string|undefined;
    time?: string;
  }

  const waitForMessages = async (
      messagesView: puppeteer.ElementHandle<Element>,
      count: number,
      devToolsPage: DevToolsPage,
      ) => {
    return await devToolsPage.waitForFunction(async () => {
      const messages = await devToolsPage.$$('.data-grid-data-grid-node', messagesView);
      if (messages.length !== count) {
        return undefined;
      }

      return await Promise.all(messages.map(message => {
        return new Promise<EventSourceMessageRaw>(async resolve => {
          const [id, type, data] = await Promise.all([
            devToolsPage.getTextContent('.id-column', message),
            devToolsPage.getTextContent('.type-column', message),
            devToolsPage.getTextContent('.data-column', message),
          ]);
          resolve({
            id,
            type,
            data,
          });
        });
      }));
    });
  };

  const knownMessages: EventSourceMessageRaw[] = [
    {id: '1', type: 'custom-one', data: '{"one": "value-one"}'},
    {id: '2', type: 'message', data: '{"two": "value-two"}'},
    {id: '3', type: 'message', data: '{"three": "value-three"}'},
  ];
  const assertMessage = (actualMessage: EventSourceMessageRaw, expectedMessage: EventSourceMessageRaw) => {
    assert.deepEqual(actualMessage.id, expectedMessage.id);
    assert.deepEqual(actualMessage.type, expectedMessage.type);
    assert.deepEqual(actualMessage.data, expectedMessage.data);
  };
  const assertBaseState = async (
      messagesView: puppeteer.ElementHandle<Element>,
      devToolsPage: DevToolsPage,
      ) => {
    const messages = await waitForMessages(messagesView, 3, devToolsPage);
    assertMessage(messages[0], knownMessages[0]);
    assertMessage(messages[1], knownMessages[1]);
    assertMessage(messages[2], knownMessages[2]);
  };

  it('stores EventSource filter', async ({devToolsPage, inspectedPage}) => {
    const messagesView = await navigateToEventStreamMessages(devToolsPage, inspectedPage);
    let messages = await waitForMessages(messagesView, 3, devToolsPage);
    await assertBaseState(messagesView, devToolsPage);

    const inputSelector = '[aria-placeholder="Filter using regex (example: https?)';

    const filterInput = await devToolsPage.waitFor(inputSelector, messagesView);

    // "one"
    await filterInput.focus();
    await devToolsPage.typeText('one');
    messages = await waitForMessages(messagesView, 1, devToolsPage);
    assertMessage(messages[0], knownMessages[0]);

    // clear
    await devToolsPage.click('[title="Clear"]', {
      root: messagesView,
    });
    await assertBaseState(messagesView, devToolsPage);

    // "two"
    await filterInput.focus();
    await devToolsPage.typeText('two');
    messages = await waitForMessages(messagesView, 1, devToolsPage);
    assertMessage(messages[0], knownMessages[1]);

    // invalid regex
    await filterInput.focus();
    await devToolsPage.typeText('invalid(');
    messages = await waitForMessages(messagesView, 0, devToolsPage);
  });

  it('handles EventSource clear', async ({devToolsPage, inspectedPage}) => {
    const messagesView = await navigateToEventStreamMessages(devToolsPage, inspectedPage);
    await assertBaseState(messagesView, devToolsPage);

    await devToolsPage.click('[aria-label="Clear all"]', {
      root: messagesView,
    });
    await waitForMessages(messagesView, 0, devToolsPage);
  });

  it('stores websocket filter', async ({devToolsPage, inspectedPage}) => {
    const navigateToWebsocketMessages = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
      await navigateToNetworkTab('websocket.html', devToolsPage, inspectedPage);

      await waitForSomeRequestsToAppear(2, devToolsPage);

      await selectRequestByName('localhost', {devToolsPage});

      const networkView = await devToolsPage.waitFor('.network-item-view');
      await devToolsPage.click('[aria-label=Messages][role=tab]', {
        root: networkView,
      });
      await devToolsPage.waitFor('[aria-label=Messages][role=tab][aria-selected=true]', networkView);
      return await devToolsPage.waitFor('.resource-chunk-view');
    };

    let messagesView = await navigateToWebsocketMessages(devToolsPage, inspectedPage);
    const waitForMessages = async (count: number, devToolsPage: DevToolsPage) => {
      return await devToolsPage.waitForFunction(async () => {
        const messages = await devToolsPage.$$('.data-column.resource-chunk-view-td', messagesView);
        if (messages.length !== count) {
          return undefined;
        }
        return await Promise.all(messages.map(message => {
          return message.evaluate(message => message.textContent || '');
        }));
      });
    };
    let messages = await waitForMessages(4, devToolsPage);

    const filterInput = await devToolsPage.waitFor(
        '[aria-label="Filter using regex (example: (web)?socket)"][role=textbox]', messagesView);
    await filterInput.focus();
    await devToolsPage.typeText('p[ai]ng');

    messages = await waitForMessages(2, devToolsPage);
    assert.deepEqual(messages, ['ping', 'ping']);

    messagesView = await navigateToWebsocketMessages(devToolsPage, inspectedPage);
    messages = await waitForMessages(2, devToolsPage);

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

  it('shows request headers and payload', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('headers-and-payload.html', devToolsPage, inspectedPage);

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('image.svg?id=42&param=a%20b', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=Headers][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Headers][role=tab][aria-selected=true]', networkView);
    const expectedHeadersContent = [
      {
        aria: 'General',
        rows: [
          'Request URL',
          'https://localhost:%/test/e2e/resources/network/image.svg?id=42&param=a%20b',
          'Request Method',
          'POST',
          'Status Code',
          '200 OK',
          'Remote Address',
          '[::1]:%',
          'Referrer Policy',
          'strict-origin-when-cross-origin',
        ],
      },
      {
        aria: 'Response Headers',
        rows: [
          'cache-control',
          'max-age=%',
          'connection',
          'keep-alive',
          'content-type',
          'image/svg+xml; charset=utf-8',
          'date',
          '%',
          'keep-alive',
          'timeout=5',
          'transfer-encoding',
          'chunked',
          'vary',
          'Origin',
        ],
      },
      {
        aria: 'Request Headers',
        rows: [
          'accept',
          '*/*',
          'accept-encoding',
          '%',
          'accept-language',
          '%',
          'connection',
          'keep-alive',
          'content-length',
          '32',
          'content-type',
          'application/x-www-form-urlencoded;charset=UTF-8',
          'host',
          'localhost:%',
          'origin',
          'https://localhost:%',
          'referer',
          'https://localhost:%/test/e2e/resources/network/headers-and-payload.html',
          'sec-ch-ua',
          '%',
          'sec-ch-ua-mobile',
          '?0',
          'sec-ch-ua-platform',
          '%',
          'sec-fetch-dest',
          'empty',
          'sec-fetch-mode',
          'cors',
          'sec-fetch-site',
          'same-origin',
          'user-agent',
          'Mozilla/5.0 %',
          'x-same-domain',
          '1',
        ],
      },
    ];

    for (const sectionContent of expectedHeadersContent) {
      const section = await devToolsPage.waitFor(`[aria-label="${sectionContent.aria}"]`);
      const rows = await devToolsPage.$$('.row', section);
      const rowsText =
          await (await Promise.all(rows.map(async row => await getTextFromHeadersRow(row, devToolsPage)))).flat();
      assertOutlineMatches(sectionContent.rows, rowsText);
    }

    await devToolsPage.click('[aria-label=Payload][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Payload][role=tab][aria-selected=true]', networkView);
    const payloadView = await devToolsPage.waitFor('.request-payload-view');
    const payloadOutline = await devToolsPage.$$('[role=treeitem]:not(.hidden)', payloadView);
    const payloadOutlineText =
        await Promise.all(payloadOutline.map(async item => await item.evaluate(el => el.textContent || '')));
    const expectedPayloadContent = [
      'Query String Parameters (2)View sourceView URL-encoded',
      ['id42', 'parama b'],
      'Form Data (4)View sourceView URL-encoded',
      ['fooalpha', 'barbeta:42:0', 'baz', '(empty)'],
    ].flat();

    assertOutlineMatches(expectedPayloadContent, payloadOutlineText);

    // Context menu to copy single parsed entry.
    const parsedEntry = await devToolsPage.waitForElementWithTextContent('alpha');
    await parsedEntry.click({button: 'right'});
    await (await devToolsPage.waitForElementWithTextContent('Copy value')).click();
    assert.strictEqual(await devToolsPage.readClipboard(), 'alpha');

    // Context menu to copy the raw payload.
    const viewSource = await devToolsPage.waitForElementWithTextContent('View source');
    await viewSource.click();
    const source = await devToolsPage.waitForElementWithTextContent('id=42&param=a%20b');
    await source.click({button: 'right'});
    await (await devToolsPage.waitForElementWithTextContent('Copy')).click();
    assert.strictEqual(await devToolsPage.readClipboard(), 'id=42&param=a%20b');
  });

  it('shows raw headers', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('headers-and-payload.html', devToolsPage, inspectedPage);

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('image.svg?id=42&param=a%20b', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=Headers][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Headers][role=tab][aria-selected=true]', networkView);
    const section = await devToolsPage.waitFor('[aria-label="Response Headers"]');
    await devToolsPage.click('input', {
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
    const rawHeaders = await devToolsPage.waitFor('.raw-headers', section);
    const rawHeadersText = await rawHeaders.evaluate(el => el.textContent || '');
    assertOutlineMatches([expectedRawHeadersContent], [rawHeadersText]);

    const expectedHeadersContent = [
      {
        aria: 'General',
        rows: [
          'Request URL',
          'https://localhost:%/test/e2e/resources/network/image.svg?id=42&param=a%20b',
          'Request Method',
          'POST',
          'Status Code',
          '200 OK',
          'Remote Address',
          '[::1]:%',
          'Referrer Policy',
          'strict-origin-when-cross-origin',
        ],
      },
      {
        aria: 'Request Headers',
        rows: [
          'accept',
          '*/*',
          'accept-encoding',
          '%',
          'accept-language',
          '%',
          'connection',
          'keep-alive',
          'content-length',
          '32',
          'content-type',
          'application/x-www-form-urlencoded;charset=UTF-8',
          'host',
          'localhost:%',
          'origin',
          'https://localhost:%',
          'referer',
          'https://localhost:%/test/e2e/resources/network/headers-and-payload.html',
          'sec-ch-ua',
          '%',
          'sec-ch-ua-mobile',
          '?0',
          'sec-ch-ua-platform',
          '%',
          'sec-fetch-dest',
          'empty',
          'sec-fetch-mode',
          'cors',
          'sec-fetch-site',
          'same-origin',
          'user-agent',
          'Mozilla/5.0 %',
          'x-same-domain',
          '1',
        ],
      },
    ];

    for (const sectionContent of expectedHeadersContent) {
      const section = await devToolsPage.waitFor(`[aria-label="${sectionContent.aria}"]`);
      const rows = await devToolsPage.$$('.row', section);
      const rowsText =
          await (await Promise.all(rows.map(async row => await getTextFromHeadersRow(row, devToolsPage)))).flat();
      assertOutlineMatches(sectionContent.rows, rowsText);
    }
  });

  it('payload tab selection is preserved', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('headers-and-payload.html', devToolsPage, inspectedPage);

    await waitForSomeRequestsToAppear(3, devToolsPage);

    await selectRequestByName('image.svg?id=42&param=a%20b', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('[aria-label=Payload][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Payload][role=tab][aria-selected=true]', networkView);

    await selectRequestByName('image.svg', {devToolsPage});
    await devToolsPage.waitForElementWithTextContent('foogamma');
  });

  it('no duplicate payload tab on headers update', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('requests.html', devToolsPage, inspectedPage);
    void inspectedPage.evaluate(() => fetch('image.svg?delay'));
    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('image.svg?delay', {devToolsPage});
    await inspectedPage.evaluate(async () => await fetch('/?send_delayed'));
  });

  it('can create header overrides via request\'s context menu', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await navigateToNetworkTab('hello.html', devToolsPage, inspectedPage);
    await selectRequestByName(
        'hello.html',
        {button: 'right', devToolsPage},
    );

    await devToolsPage.click('aria/Override headers');

    await configureAndCheckHeaderOverrides(devToolsPage, inspectedPage);
  });

  it('can create header overrides via header\'s pencil icon', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await navigateToNetworkTab('hello.html', devToolsPage, inspectedPage);
    await selectRequestByName('hello.html', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('#tab-headers-component', {
      root: networkView,
    });

    await devToolsPage.click('devtools-button.enable-editing');
    await configureAndCheckHeaderOverrides(devToolsPage, inspectedPage);
  });

  it('can search by headers name', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('headers-and-payload.html', devToolsPage, inspectedPage);

    await waitForSomeRequestsToAppear(2, devToolsPage);

    await selectRequestByName('image.svg?id=42&param=a%20b', {devToolsPage});
    const SEARCH_QUERY = '[aria-label="Find"]';
    const SEARCH_RESULT = '.search-result';

    await triggerLocalFindDialog(devToolsPage);
    await devToolsPage.waitFor(SEARCH_QUERY);
    const inputElement = await devToolsPage.$(SEARCH_QUERY);
    assert.isOk(inputElement, 'Unable to find search input field');

    await inputElement.focus();
    await inputElement.type('Cache-Control');
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.waitFor(SEARCH_RESULT);
  });
});
