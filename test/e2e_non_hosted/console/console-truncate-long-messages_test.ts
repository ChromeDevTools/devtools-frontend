// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  checkCommandResultFunction,
  navigateToConsoleTab,
} from '../../e2e/helpers/console-helpers.js';

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

    await checkCommandResult(
        `console.log("a".repeat(${overMaxLength}))`,
        `${'a'.repeat(5000)}`,
        'Console unable to truncate long strings',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("%s", "a".repeat(${overMaxLength}))`,
        `${'a'.repeat(5000)}`,
        'Console unable to truncate long formatted strings',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("a".repeat(${overMaxLength}), "b".repeat(${overMaxLength}))`,
        `${'a'.repeat(5000)} ${'b'.repeat(5000)}`,
        'Console unable to truncate multiple long strings',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("%o", "a".repeat(${overMaxLength}))`,
        `'${'a'.repeat(4999)}`,
        'Console unable to truncate DOM element',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("%c" + "a".repeat(${overMaxLength}), "color: green")`,
        `${'a'.repeat(5000)}`,
        'Console unable to truncate formatted string with CSS rules',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("foo %s %o bar", "a".repeat(${overMaxLength}), {a: 1})`,
        `foo ${'a'.repeat(4996)}{a: 1} bar`,
        'Console unable to truncate formatted string with DOM element',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log({a: 1}, "a".repeat(${overMaxLength}), {b: 1})`,
        `{a: 1} '${'a'.repeat(4999)} {b: 1}`,
        'Console unable to truncate string containing objects',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("a".repeat(${overMaxLength}), "https://chromium.org")`,
        `${'a'.repeat(5000)} https://chromium.org`,
        'Console unable to truncate string ending with a link',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log("https://chromium.org", "a".repeat(${overMaxLength}))`,
        `https://chromium.org ${'a'.repeat(5000)}`,
        'Console unable to truncate string beginning with a link',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log(RegExp("a".repeat(${overMaxLength})))`,
        `\/${'a'.repeat(4999)}`,
        'Console unable to truncate a regular expression',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log(Symbol("a".repeat(${overMaxLength})))`,
        `Symbol(${'a'.repeat(4993)}`,
        'Console unable to truncate a symbol',
        devToolsPage,
    );

    await checkCommandResult(
        `console.log(["a".repeat(${overMaxLength})])`,
        `['${'a'.repeat(50)}…${'a'.repeat(49)}']`,
        'Console unable to truncate an array',
        devToolsPage,
    );
  });
});
