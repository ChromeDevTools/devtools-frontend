// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  checkCommandResultFunction,
  CONSOLE_ALL_MESSAGES_SELECTOR,
  getCurrentConsoleMessages,
  Level,
  navigateToConsoleTab,
  waitForConsoleMessagesToBeNonEmpty,
} from '../helpers/console-helpers.js';

// offset is 1 because Console.log returns undefined after logging, so we want
// to check the output before the last one.
const checkCommandResult = checkCommandResultFunction(1);

describe('The Console Tab', function() {
  // This test takes longer than usual because each command is typed and
  // checked individually.
  this.timeout(20000);
  it('Truncates large messages', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('../resources/console/command-line-api-getEventListeners.html');
    await navigateToConsoleTab(devToolsPage);
    const overMaxLength = 10001;

    await checkCommandResult(devToolsPage, `console.log("a".repeat(${overMaxLength}))`, `${'a'.repeat(5000)}`,
                             'Console unable to truncate long strings');

    await checkCommandResult(devToolsPage, `console.log("%s", "a".repeat(${overMaxLength}))`, `${'a'.repeat(5000)}`,
                             'Console unable to truncate long formatted strings');

    await checkCommandResult(devToolsPage, `console.log("a".repeat(${overMaxLength}), "b".repeat(${overMaxLength}))`,
                             `${'a'.repeat(5000)} ${'b'.repeat(5000)}`,
                             'Console unable to truncate multiple long strings');

    await checkCommandResult(devToolsPage, `console.log("%o", "a".repeat(${overMaxLength}))`, `'${'a'.repeat(4999)}`,
                             'Console unable to truncate DOM element');

    await checkCommandResult(devToolsPage, `console.log("%c" + "a".repeat(${overMaxLength}), "color: green")`,
                             `${'a'.repeat(5000)}`, 'Console unable to truncate formatted string with CSS rules');

    await checkCommandResult(devToolsPage, `console.log("foo %s %o bar", "a".repeat(${overMaxLength}), {a: 1})`,
                             `foo ${'a'.repeat(4996)}{a: 1} bar`,
                             'Console unable to truncate formatted string with DOM element');

    await checkCommandResult(devToolsPage, `console.log({a: 1}, "a".repeat(${overMaxLength}), {b: 1})`,
                             `{a: 1} '${'a'.repeat(4999)} {b: 1}`,
                             'Console unable to truncate string containing objects');

    await checkCommandResult(devToolsPage, `console.log("a".repeat(${overMaxLength}), "https://chromium.org")`,
                             `${'a'.repeat(5000)} https://chromium.org`,
                             'Console unable to truncate string ending with a link');

    await checkCommandResult(devToolsPage, `console.log("https://chromium.org", "a".repeat(${overMaxLength}))`,
                             `https://chromium.org ${'a'.repeat(5000)}`,
                             'Console unable to truncate string beginning with a link');

    await checkCommandResult(devToolsPage, `console.log(RegExp("a".repeat(${overMaxLength})))`, `\/${'a'.repeat(4999)}`,
                             'Console unable to truncate a regular expression');

    await checkCommandResult(devToolsPage, `console.log(Symbol("a".repeat(${overMaxLength})))`,
                             `Symbol(${'a'.repeat(4993)}`, 'Console unable to truncate a symbol');

    await checkCommandResult(devToolsPage, `console.log(["a".repeat(${overMaxLength})])`,
                             `['${'a'.repeat(50)}…${'a'.repeat(49)}']`, 'Console unable to truncate an array');
  });

  it('trims long URLs', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToConsoleTab(devToolsPage);

    const longUrl =
        'http://example.com/2---------3---------4---------5---------6---------7---------8---------9---------0---------1---------2---------3---------4---------5---------6---------7---------8---------9---------0';
    const trimmedUrl =
        'http://example.com/2---------3---------4---------5---------6---------7-----…---3---------4---------5---------6---------7---------8---------9---------0';

    await inspectedPage.evaluate(url => {
      // eslint-disable-next-line no-console
      console.log('The URL is: %s', url);
      // eslint-disable-next-line no-console
      console.log(url);
    }, longUrl);

    const messages = await getCurrentConsoleMessages(devToolsPage, false, Level.All,
                                                     () => waitForConsoleMessagesToBeNonEmpty(devToolsPage, 2));
    assert.deepEqual(messages, [
      `The URL is: ${trimmedUrl}`,
      trimmedUrl,
    ]);

    const links = await devToolsPage.$$(`${CONSOLE_ALL_MESSAGES_SELECTOR} .devtools-link`);
    assert.lengthOf(links, 2);
    for (const link of links) {
      const linkDetails =
          await link.evaluate(el => ({
                                text: el.textContent,
                                ellipsis: el.querySelector('.devtools-link-ellipsis')?.textContent ?? null,
                                href: 'href' in el ? el.href : undefined,
                              }));
      assert.deepEqual(linkDetails, {
        text: trimmedUrl,
        ellipsis: '…',
        href: longUrl,
      });
    }
  });
});
