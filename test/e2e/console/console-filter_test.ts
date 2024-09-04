// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {$, getBrowserAndPages, step} from '../../shared/helper.js';

import {
  CONSOLE_MESSAGE_WRAPPER_SELECTOR,
  deleteConsoleMessagesFilter,
  filterConsoleMessages,
  getConsoleMessages,
  getCurrentConsoleMessages,
  showVerboseMessages,
  toggleShowCorsErrors,
  waitForConsoleMessagesToBeNonEmpty,
} from '../helpers/console-helpers.js';

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

async function testMessageFilter(filter: string, expectedMessageFilter: MessageCheck) {
  const {frontend} = getBrowserAndPages();
  let unfilteredMessages: string[];
  const showMessagesWithAnchor = true;

  await step('navigate to console-filter.html and get console messages', async () => {
    unfilteredMessages = await getConsoleMessages('console-filter', showMessagesWithAnchor);
  });

  await step(`filter to only show messages containing '${filter}'`, async () => {
    await filterConsoleMessages(frontend, filter);
  });

  await step('check that messages are correctly filtered', async () => {
    const filteredMessages = await getCurrentConsoleMessages(showMessagesWithAnchor);
    const expectedMessages = getExpectedMessages(unfilteredMessages, expectedMessageFilter);
    assert.isNotEmpty(filteredMessages);
    assert.deepEqual(filteredMessages, expectedMessages);
  });
}

describe('The Console Tab', () => {
  it('shows logged messages', async () => {
    let messages: string[];
    const withAnchor = true;
    await step('navigate to console-filter.html and get console messages', async () => {
      messages = await getConsoleMessages('console-filter', withAnchor);
    });

    await step('check that all console messages appear', async () => {
      assert.deepEqual(messages, [
        'console-filter.html:10 1topGroup: log1()',
        'log-source.js:6 2topGroup: log2()',
        'console-filter.html:10 3topGroup: log1()',
        'console-filter.html:17 enter outerGroup',
        'console-filter.html:10 1outerGroup: log1()',
        'log-source.js:6 2outerGroup: log2()',
        'console-filter.html:21 enter innerGroup1',
        'console-filter.html:10 1innerGroup1: log1()',
        'log-source.js:6 2innerGroup1: log2()',
        'console-filter.html:26 enter innerGroup2',
        'console-filter.html:10 1innerGroup2: log1()',
        'log-source.js:6 2innerGroup2: log2()',
        'console-filter.html:10 4topGroup: log1()',
        'log-source.js:6 5topGroup: log2()',
        'console-filter.html:38 Hello 1',
        'console-filter.html:39 Hello 2',
        'console-filter.html:42 end',
      ]);
    });
  });

  it('shows messages from all levels', async () => {
    let messages: string[];
    const withAnchor = true;
    await step('navigate to console-filter.html and get console messages', async () => {
      messages = await getConsoleMessages('console-filter', withAnchor, showVerboseMessages);
    });

    await step('ensure that all levels are logged', async () => {
      const allLevelsDropdown = await $('[aria-label^="Log level: All levels"]');
      assert.isNotNull(allLevelsDropdown);
    });

    await step('check that all console messages appear', async () => {
      assert.deepEqual(messages, [
        'console-filter.html:10 1topGroup: log1()',
        'log-source.js:6 2topGroup: log2()',
        'console-filter.html:10 3topGroup: log1()',
        'console-filter.html:17 enter outerGroup',
        'console-filter.html:10 1outerGroup: log1()',
        'log-source.js:6 2outerGroup: log2()',
        'console-filter.html:21 enter innerGroup1',
        'console-filter.html:10 1innerGroup1: log1()',
        'log-source.js:6 2innerGroup1: log2()',
        'console-filter.html:26 enter innerGroup2',
        'console-filter.html:10 1innerGroup2: log1()',
        'log-source.js:6 2innerGroup2: log2()',
        'console-filter.html:10 4topGroup: log1()',
        'log-source.js:6 5topGroup: log2()',
        'console-filter.html:38 Hello 1',
        'console-filter.html:39 Hello 2',
        'console-filter.html:41 verbose debug message',
        'console-filter.html:42 end',
      ]);
    });
  });

  it('can exclude messages from a source url', async () => {
    const {frontend} = getBrowserAndPages();
    let sourceUrls: string[];
    let uniqueUrls: Set<string> = new Set();

    await step('navigate to console-filter.html and wait for console messages', async () => {
      await getConsoleMessages('console-filter');
    });

    await step('collect source urls from all messages', async () => {
      sourceUrls = await collectSourceUrlsFromConsoleOutput(frontend);
    });

    await step('find unique urls', async () => {
      uniqueUrls = new Set(sourceUrls);
      assert.isNotEmpty(uniqueUrls);
    });

    for (const urlToExclude of uniqueUrls) {
      const filter = createUrlFilter(urlToExclude);
      const expectedMessageFilter: MessageCheck = msg => {
        if (msg.includes('enter')) {
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
      await testMessageFilter(filter, expectedMessageFilter);

      await step(`remove filter '${filter}'`, async () => {
        await deleteConsoleMessagesFilter(frontend);
      });
    }
  });

  it('can include messages from a given source url', async () => {
    const {frontend} = getBrowserAndPages();
    let sourceUrls: string[];
    let uniqueUrls: Set<string> = new Set();

    await step('navigate to console-filter.html and wait for console messages', async () => {
      await getConsoleMessages('console-filter');
    });

    await step('collect source urls from all messages', async () => {
      sourceUrls = await collectSourceUrlsFromConsoleOutput(frontend);
    });

    await step('find unique urls', async () => {
      uniqueUrls = new Set(sourceUrls);
      assert.isNotEmpty(uniqueUrls);
    });

    for (const urlToKeep of uniqueUrls) {
      const filter = urlToKeep;
      const expectedMessageFilter: MessageCheck = msg => {
        if (msg.includes('enter')) {
          return true;
        }
        // When we include from any of the two URLs, all groups match.
        // When a group matches, its content is fully shown.
        if (msg.includes('log-source') && (msg.includes('innerGroup') || msg.includes('outerGroup'))) {
          return true;
        }
        return msg.indexOf(urlToKeep) !== -1;
      };
      await testMessageFilter(filter, expectedMessageFilter);

      await step(`remove filter '${filter}'`, async () => {
        await deleteConsoleMessagesFilter(frontend);
      });
    }
  });

  it('can apply empty filter', async () => {
    const filter = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const expectedMessageFilter: MessageCheck = _ => true;
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply text filter matching outer group title', async () => {
    const filter = 'enter outerGroup';
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
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply text filter matching inner group title', async () => {
    const filter = 'enter innerGroup1';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      // In addition, the group titles of parent groups should be shown.
      if (msg.includes('enter outerGroup')) {
        return true;
      }
      if (msg.includes('innerGroup1')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply text filter matching outer group content', async () => {
    const filter = '1outerGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      if (msg.includes('enter outerGroup')) {
        return true;
      }
      if (msg.includes('1outerGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply text filter matching inner group content', async () => {
    const filter = '1innerGroup1';
    const expectedMessageFilter: MessageCheck = msg => {
      // If the group title matches, all of its content should be shown.
      // In addition, the group titles of parent groups should be shown.
      if (msg.includes('enter outerGroup')) {
        return true;
      }
      if (msg.includes('enter innerGroup1')) {
        return true;
      }
      if (msg.includes('1innerGroup1')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply text filter matching non-grouped content', async () => {
    const filter = 'topGroup';
    const expectedMessageFilter: MessageCheck = msg => {
      // No grouped content is shown.
      if (msg.includes('topGroup')) {
        return true;
      }
      return false;
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply start/end line regex filter', async () => {
    const filter = '/^Hello\\s\\d$/';
    const expectedMessageFilter: MessageCheck = msg => {
      return /^console-filter\.html:\d{2}\sHello\s\d$/.test(msg);
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can apply context filter', async () => {
    const expectedMessageFilter: MessageCheck = msg => {
      return msg.indexOf('Hello') !== -1;
    };
    await testMessageFilter('context:context', expectedMessageFilter);
  });

  it('can apply multi text filter', async () => {
    const filter = 'Group /[2-3]top/';
    const expectedMessageFilter: MessageCheck = msg => {
      return /[2-3]top/.test(msg);
    };
    await testMessageFilter(filter, expectedMessageFilter);
  });

  it('can reset filter', async () => {
    const {frontend} = getBrowserAndPages();
    let unfilteredMessages: string[];

    await step('get unfiltered messages', async () => {
      unfilteredMessages = await getConsoleMessages('console-filter');
    });

    await step('apply message filter', async () => {
      await filterConsoleMessages(frontend, 'outer');
    });

    await step('delete message filter', async () => {
      void deleteConsoleMessagesFilter(frontend);
    });

    await step('check if messages are unfiltered', async () => {
      const messages = await getCurrentConsoleMessages();
      assert.deepEqual(messages, unfilteredMessages);
    });
  });

  it('can exclude CORS error messages', async () => {
    const CORS_DETAILED_ERROR_PATTERN =
        /Access to fetch at 'https:.*' from origin 'https:.*' has been blocked by CORS policy: .*/;
    const NETWORK_ERROR_PATTERN = /GET https:.* net::ERR_FAILED/;
    const JS_ERROR_PATTERN = /Uncaught \(in promise\) TypeError: Failed to fetch.*/;
    const allMessages = await getConsoleMessages('cors-issue', false, () => waitForConsoleMessagesToBeNonEmpty(6));
    allMessages.sort();
    assert.strictEqual(allMessages.length, 6);
    assert.match(allMessages[0], CORS_DETAILED_ERROR_PATTERN);
    assert.match(allMessages[1], CORS_DETAILED_ERROR_PATTERN);
    assert.match(allMessages[2], NETWORK_ERROR_PATTERN);
    assert.match(allMessages[3], NETWORK_ERROR_PATTERN);
    assert.match(allMessages[4], JS_ERROR_PATTERN);
    assert.match(allMessages[5], JS_ERROR_PATTERN);

    await toggleShowCorsErrors();
    const filteredMessages = await getCurrentConsoleMessages();
    assert.strictEqual(2, filteredMessages.length);
    for (const message of filteredMessages) {
      assert.match(message, JS_ERROR_PATTERN);
    }
  });
});
