// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  closeConsoleSidebar,
  CONSOLE_MESSAGE_WRAPPER_SELECTOR,
  deleteConsoleMessagesFilter,
  filterConsoleMessages,
  getConsoleMessages,
  getCurrentConsoleMessages,
  Level,
  openConsoleSidebar,
  selectConsoleSidebarItem,
  SidebarItem,
  toggleShowCorsErrors,
  waitForConsoleMessagesToBeNonEmpty,
  waitForExactConsoleMessageCount,
} from '../../e2e/helpers/console-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {
  step,
} from '../../shared/helper.js';

type MessageCheck = (msg: string) => boolean;

function createUrlFilter(url: string) {
  return `-url:${url}`;
}

function collectSourceUrlsFromConsoleOutput(frontend: puppeteer.Page) {
  return frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(wrapper => {
      return ((wrapper.querySelector('.devtools-link') as HTMLElement).textContent as string).split(':')[0];
    });
  }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
}

function getExpectedMessages(unfilteredMessages: string[], filter: MessageCheck) {
  return unfilteredMessages.filter((msg: string) => {
    return filter(msg);
  });
}

async function testMessageFilter(
    filter: string, expectedMessageFilter: MessageCheck, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  let unfilteredMessages: string[];
  const showMessagesWithAnchor = true;

  await step('navigate to console-filter.html and get console messages', async () => {
    unfilteredMessages =
        await getConsoleMessages('console-filter', showMessagesWithAnchor, undefined, devToolsPage, inspectedPage);
  });

  await step(`filter to only show messages containing '${filter}'`, async () => {
    await filterConsoleMessages(filter, devToolsPage);
  });

  await step('check that messages are correctly filtered', async () => {
    const filteredMessages =
        await getCurrentConsoleMessages(showMessagesWithAnchor, undefined, undefined, devToolsPage);
    const expectedMessages = getExpectedMessages(unfilteredMessages, expectedMessageFilter);
    assert.isNotEmpty(filteredMessages);
    assert.deepEqual(filteredMessages, expectedMessages);
  });
}

describe('The Console Tab', () => {
  it('shows logged messages', async ({devToolsPage, inspectedPage}) => {
    let messages: string[];
    const withAnchor = true;
    await step('navigate to console-filter.html and get console messages', async () => {
      messages = await getConsoleMessages('console-filter', withAnchor, undefined, devToolsPage, inspectedPage);
    });

    await step('check that all console messages appear', async () => {
      assert.deepEqual(messages, [
        'console-filter.html:10 1topGroup: log1()',
        'log-source.js:6 2topGroup: log2()',
        'console-filter.html:10 3topGroup: log1()',
        'console-filter.html:17 enterGroup outerGroup',
        'console-filter.html:10 1outerGroup: log1()',
        'log-source.js:6 2outerGroup: log2()',
        'console-filter.html:21 enterGroup innerGroup1',
        'console-filter.html:10 1innerGroup1: log1()',
        'log-source.js:6 2innerGroup1: log2()',
        'console-filter.html:26 enterGroup innerGroup2',
        'console-filter.html:10 1innerGroup2: log1()',
        'log-source.js:6 2innerGroup2: log2()',
        'console-filter.html:33 enterCollapsedGroup collapsedGroup',
        'console-filter.html:10 4topGroup: log1()',
        'log-source.js:6 5topGroup: log2()',
        'console-filter.html:42 Hello 1',
        'console-filter.html:43 Hello 2',
        'console-filter.html:46 end',
      ]);
    });
  });

  it('can exclude messages from a source url', async ({devToolsPage, inspectedPage}) => {
    let sourceUrls: string[];
    let uniqueUrls = new Set<string>();

    await step('navigate to console-filter.html and wait for console messages', async () => {
      await getConsoleMessages('console-filter', undefined, undefined, devToolsPage, inspectedPage);
    });

    await step('collect source urls from all messages', async () => {
      sourceUrls = await collectSourceUrlsFromConsoleOutput(devToolsPage.page);
    });

    await step('find unique urls', async () => {
      uniqueUrls = new Set(sourceUrls);
      assert.isNotEmpty(uniqueUrls);
    });

    for (const urlToExclude of uniqueUrls) {
      const filter = createUrlFilter(urlToExclude);
      const expectedMessageFilter: MessageCheck = msg => {
        if (msg.includes('enterGroup')) {
          return true;
        }
        // When we exclude "log-source.js", all groups match,
        // as they are created from "console-filter.html".
        // When a group matches, its content is fully shown.
        if (msg.includes('log-source') && (msg.includes('innerGroup') || msg.includes('outerGroup'))) {
          return true;
        }
        return msg.indexOf(urlToExclude) === -1;
      };
      await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);

      await step(`remove filter '${filter}'`, async () => {
        await deleteConsoleMessagesFilter(devToolsPage);
      });
    }
  });

  it('can include messages from a given source url', async ({devToolsPage, inspectedPage}) => {
    let sourceUrls: string[];
    let uniqueUrls = new Set<string>();

    await step('navigate to console-filter.html and wait for console messages', async () => {
      await getConsoleMessages('console-filter', undefined, undefined, devToolsPage, inspectedPage);
    });

    await step('collect source urls from all messages', async () => {
      sourceUrls = await collectSourceUrlsFromConsoleOutput(devToolsPage.page);
    });

    await step('find unique urls', async () => {
      uniqueUrls = new Set(sourceUrls);
      assert.isNotEmpty(uniqueUrls);
    });

    for (const urlToKeep of uniqueUrls) {
      const filter = urlToKeep;
      const expectedMessageFilter: MessageCheck = msg => {
        if (msg.includes('enterGroup')) {
          return true;
        }
        // When we include from any of the two URLs, all groups match.
        // When a group matches, its content is fully shown.
        if (msg.includes('log-source') && (msg.includes('innerGroup') || msg.includes('outerGroup'))) {
          return true;
        }
        return msg.indexOf(urlToKeep) !== -1;
      };
      await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);

      await step(`remove filter '${filter}'`, async () => {
        await deleteConsoleMessagesFilter(devToolsPage);
      });
    }
  });

  it('can apply empty filter', async ({devToolsPage, inspectedPage}) => {
    const filter = '';

    const expectedMessageFilter: MessageCheck = _ => true;
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching outer group title', async ({devToolsPage, inspectedPage}) => {
    const filter = 'enterGroup outerGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      if (msg.includes('outerGroup')) {
        return true;
      }
      if (msg.includes('innerGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching inner group title', async ({devToolsPage, inspectedPage}) => {
    const filter = 'enterGroup innerGroup1';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      // In addition, the group titles of parent groups should be shown.
      if (msg.includes('enterGroup outerGroup')) {
        return true;
      }
      if (msg.includes('innerGroup1')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching outer group content', async ({devToolsPage, inspectedPage}) => {
    const filter = '1outerGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      if (msg.includes('enterGroup outerGroup')) {
        return true;
      }
      if (msg.includes('1outerGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching inner group content', async ({devToolsPage, inspectedPage}) => {
    const filter = '1innerGroup1';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      // In addition, the group titles of parent groups should be shown.
      if (msg.includes('enterGroup outerGroup')) {
        return true;
      }
      if (msg.includes('enterGroup innerGroup1')) {
        return true;
      }
      if (msg.includes('1innerGroup1')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching collapsed group title', async ({devToolsPage, inspectedPage}) => {
    const filter = 'enterCollapsedGroup collapsedGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // The matched group is collapsed, so only the group title will be shown.
      if (msg.includes('enterCollapsedGroup collapsedGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching collapsed group content', async ({devToolsPage, inspectedPage}) => {
    const filter = '1collapsedGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // The matched content is within a collapsed group, so only the group
      // title will be shown.
      if (msg.includes('enterCollapsedGroup collapsedGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply text filter matching non-grouped content', async ({devToolsPage, inspectedPage}) => {
    const filter = 'topGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // No grouped content is shown.
      if (msg.includes('topGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply start/end line regex filter', async ({devToolsPage, inspectedPage}) => {
    const filter = '/^Hello\\s\\d$/';
    const expectedMessageFilter: MessageCheck = msg => {
      return /^console-filter\.html:\d{2}\sHello\s\d$/.test(msg);
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply context filter', async ({devToolsPage, inspectedPage}) => {
    const expectedMessageFilter: MessageCheck = msg => {
      return msg.indexOf('Hello') !== -1;
    };
    await testMessageFilter('context:context', expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can apply multi text filter', async ({devToolsPage, inspectedPage}) => {
    const filter = 'Group /[2-3]top/';
    const expectedMessageFilter: MessageCheck = msg => {
      return /[2-3]top/.test(msg);
    };
    await testMessageFilter(filter, expectedMessageFilter, devToolsPage, inspectedPage);
  });

  it('can filter by selecting console sidebar items', async ({devToolsPage, inspectedPage}) => {
    const withAnchor = true;
    const allMessages = Level.All;

    const initialMessages: string[] = await getConsoleMessages(
        'console-filter', withAnchor, () => waitForConsoleMessagesToBeNonEmpty(18, devToolsPage), devToolsPage,
        inspectedPage);

    await openConsoleSidebar(devToolsPage);

    // Verify only verbose messages are shown.
    await selectConsoleSidebarItem(devToolsPage, SidebarItem.Verbose);
    const verboseMessages = await getCurrentConsoleMessages(
        withAnchor, allMessages, () => waitForExactConsoleMessageCount(1, devToolsPage), devToolsPage);
    assert.deepEqual(verboseMessages, ['console-filter.html:45 verbose debug message']);

    // Verify that groups containing matches are shown.
    await selectConsoleSidebarItem(devToolsPage, SidebarItem.Errors);
    const errorMessages = await getCurrentConsoleMessages(
        withAnchor, allMessages, () => waitForExactConsoleMessageCount(1, devToolsPage), devToolsPage);
    assert.deepEqual(errorMessages, ['console-filter.html:33 enterCollapsedGroup collapsedGroup']);

    // Verify that closing the sidebar reverts any filtering.
    await closeConsoleSidebar(devToolsPage);
    const messagesAfterClose = await getCurrentConsoleMessages(
        withAnchor, allMessages, () => waitForConsoleMessagesToBeNonEmpty(18, devToolsPage), devToolsPage);
    assert.deepEqual(messagesAfterClose, initialMessages);
  });

  it('can exclude CORS error messages', async ({devToolsPage, inspectedPage}) => {
    const CORS_DETAILED_ERROR_PATTERN =
        /Access to fetch at 'https:.*' from origin 'https:.*' has been blocked by CORS policy: .*/;
    const NETWORK_ERROR_PATTERN = /GET https:.* net::ERR_FAILED/;
    const JS_ERROR_PATTERN = /Uncaught \(in promise\) TypeError: Failed to fetch.*/;
    const allMessages = await getConsoleMessages(
        'cors-issue', false, () => waitForConsoleMessagesToBeNonEmpty(6, devToolsPage), devToolsPage, inspectedPage);
    allMessages.sort();
    assert.lengthOf(allMessages, 6);
    assert.match(allMessages[0], CORS_DETAILED_ERROR_PATTERN);
    assert.match(allMessages[1], CORS_DETAILED_ERROR_PATTERN);
    assert.match(allMessages[2], NETWORK_ERROR_PATTERN);
    assert.match(allMessages[3], NETWORK_ERROR_PATTERN);
    assert.match(allMessages[4], JS_ERROR_PATTERN);
    assert.match(allMessages[5], JS_ERROR_PATTERN);

    await toggleShowCorsErrors(devToolsPage);
    const filteredMessages = await getCurrentConsoleMessages(undefined, undefined, undefined, devToolsPage);
    assert.lengthOf(filteredMessages, 2);
    for (const message of filteredMessages) {
      assert.match(message, JS_ERROR_PATTERN);
    }
  });
});
