// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {navigateToIssuesTab} from '../../e2e/helpers/issues-helpers.js';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';
const PRETTY_PRINTED_TOGGLE = 'devtools-text-editor.pretty-printed';

async function getIconComponents(
    devToolsPage: DevToolsPage, className: string, root?: puppeteer.ElementHandle<Element>) {
  return await devToolsPage.waitForFunction(async () => {
    const icons = await devToolsPage.$$(`devtools-icon.${className}`, root);
    return icons.length > 0 ? icons : undefined;
  });
}

async function getRowsText(devToolsPage: DevToolsPage, root: puppeteer.ElementHandle<Element>): Promise<string[]> {
  const rowMessages = await devToolsPage.$$('.text-editor-row-message', root);
  const messages = [];
  for (const rowMessage of rowMessages) {
    const messageText = await rowMessage.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
    messages.push(messageText);
  }
  return messages;
}

async function openFileInSourceTab(devToolsPage: DevToolsPage, inspectedPage: InspectedPage, fileName: string) {
  await inspectedPage.goToResource(`network/${fileName}`);
  await openSourcesPanel(devToolsPage);
  const element = await devToolsPage.waitFor(`[aria-label="${fileName}, file"]`);
  await element.click();
}

async function getExpandedIssuesTitle(devToolsPage: DevToolsPage): Promise<Set<string>> {
  const expandedIssues = new Set<string>();
  const issues = await devToolsPage.$$('.issue');
  for (const issue of issues) {
    const expanded = await issue.evaluate(x => x.classList.contains('expanded'));
    if (expanded) {
      const titleHandler = await devToolsPage.waitFor('.title', issue);
      const title = await titleHandler.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
      expandedIssues.add(title);
    }
  }
  return expandedIssues;
}

async function waitForExpandedIssueTitle(
    devToolsPage: DevToolsPage, issueIconComponent: puppeteer.ElementHandle<Element>): Promise<Set<string>> {
  return await devToolsPage.waitForFunction(async () => {
    await devToolsPage.clickElement(issueIconComponent);
    const expandedIssues = await getExpandedIssuesTitle(devToolsPage);
    if (expandedIssues.size) {
      return expandedIssues;
    }
    return undefined;
  });
}

describe('The row\'s icon bucket', function() {
  it('should use the correct error icon', async ({devToolsPage, inspectedPage}) => {
    const errorIconSelector = '.cm-messageIcon-error[name="cross-circle-filled"]';
    await inspectedPage.goToResource('network/trusted-type-violations-enforced.rawresponse');
    await openSourcesPanel(devToolsPage);
    const element = await devToolsPage.waitFor('[aria-label="trusted-type-violations-enforced.rawresponse, file"]');
    await element.click();

    await devToolsPage.waitFor(errorIconSelector);
    const iconsInSource = await devToolsPage.$$(errorIconSelector);
    assert.lengthOf(iconsInSource, 1);
    await devToolsPage.hover(errorIconSelector);
    const glassPane = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    const icons = await devToolsPage.$$('.text-editor-row-message-icon[name="cross-circle-filled"]', glassPane);
    assert.lengthOf(icons, 2);
  });

  // This test and the tests below require the use of unsafe hoverElement/clickElement helpers
  // because they return a list of elements and check each one of them. Perhaps, the tests
  // can be changed to check the elements one by one using the safer hover/click helpers.
  // Or perhaps the tests only ever check a single element and the list checks are not needed at all.
  it('should display error messages', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourceTab(devToolsPage, inspectedPage, 'trusted-type-violations-enforced.rawresponse');
    const iconComponents = await getIconComponents(devToolsPage, 'cm-messageIcon-error');
    const messages: string[] = [];
    const expectedMessages = [
      'Refused to create a TrustedTypePolicy named \'policy2\' because it violates the following Content Security Policy directive: "trusted-types policy1".',
      'Uncaught TypeError: Failed to execute \'createPolicy\' on \'TrustedTypePolicyFactory\': Policy "policy2" disallowed.',
    ];
    for (const iconComponent of iconComponents) {
      await devToolsPage.hoverElement(iconComponent);
      const vbox = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(devToolsPage, vbox);
      messages.push(...rowMessages);
    }
    assert.deepEqual(messages, expectedMessages);
  });

  it('should display issue messages', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourceTab(devToolsPage, inspectedPage, 'trusted-type-violations-report-only.rawresponse');

    // We need to disable the pretty printing, so that
    // we can check whether the Sources panel correctly
    // scrolls horizontally upon stopping.
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);
    await Promise.all([
      devToolsPage.click(PRETTY_PRINT_BUTTON),
      devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE),
    ]);

    const issueIconComponents = await getIconComponents(devToolsPage, 'cm-messageIcon-issue');

    const issueMessages: string[] = [];
    const expectedIssueMessages = [
      'Trusted Type policy creation blocked by Content Security Policy',
      'Trusted Type expected, but String received',
    ];
    for (const issueIconComponent of issueIconComponents) {
      await devToolsPage.hoverElement(issueIconComponent);
      const vbox = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(devToolsPage, vbox);
      issueMessages.push(...rowMessages);
    }
    assert.deepEqual(issueMessages.sort(), expectedIssueMessages.sort());
  });

  it('should also mark issues in inline event handlers in HTML documents', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourceTab(devToolsPage, inspectedPage, 'trusted-type-violations-report-only-in-html.rawresponse');

    // We need to disable the pretty printing, so that
    // we can check whether the Sources panel correctly
    // scrolls horizontally upon stopping.
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);
    await Promise.all([
      devToolsPage.click(PRETTY_PRINT_BUTTON),
      devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE),
    ]);

    const icons = await getIconComponents(devToolsPage, 'cm-messageIcon-issue');
    assert.lengthOf(icons, 1);
  });

  it('should reveal Issues tab when the icon is clicked', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourceTab(devToolsPage, inspectedPage, 'trusted-type-policy-violation-report-only.rawresponse');

    const HIDE_DEBUGGER_SELECTOR = '[aria-label="Hide debugger"]';
    const HIDE_NAVIGATOR_SELECTOR = '[aria-label="Hide navigator"]';
    await devToolsPage.click(HIDE_DEBUGGER_SELECTOR);
    await devToolsPage.click(HIDE_NAVIGATOR_SELECTOR);

    const bucketIssueIconComponents = await getIconComponents(devToolsPage, 'cm-messageIcon-issue');
    assert.lengthOf(bucketIssueIconComponents, 1);
    const issueIconComponent = bucketIssueIconComponents[0];
    await devToolsPage.clickElement(issueIconComponent);

    const expandedIssues = await waitForExpandedIssueTitle(devToolsPage, issueIconComponent);
    assert.isTrue(expandedIssues.has('Trusted Type policy creation blocked by Content Security Policy'));
  });

  it('should reveal the Issues tab if the icon in the popover is clicked', async ({devToolsPage, inspectedPage}) => {
    if (this.timeout()) {
      this.timeout(20000);
    }
    await navigateToIssuesTab(devToolsPage);
    await openFileInSourceTab(devToolsPage, inspectedPage, 'trusted-type-violations-report-only.rawresponse');

    // We need to disable the pretty printing, so that
    // we can check whether the Sources panel correctly
    // scrolls horizontally upon stopping.
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);
    await Promise.all([
      devToolsPage.click(PRETTY_PRINT_BUTTON),
      devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE),
    ]);

    const HIDE_DEBUGGER_SELECTOR = '[aria-label="Hide debugger"]';
    const HIDE_NAVIGATOR_SELECTOR = '[aria-label="Hide navigator"]';
    await devToolsPage.click(HIDE_DEBUGGER_SELECTOR);
    await devToolsPage.click(HIDE_NAVIGATOR_SELECTOR);

    const {issueIcon, issueTitle} = await devToolsPage.waitForFunction(async () => {
      const bucketIssueIconComponents = await getIconComponents(devToolsPage, 'cm-messageIcon-issue');
      assert.lengthOf(bucketIssueIconComponents, 1);
      const issueIconComponent = bucketIssueIconComponents[0];
      await issueIconComponent.hover();
      const vbox = await devToolsPage.waitForWithTries('div.vbox.flex-auto.no-pointer-events', undefined, {tries: 3});
      if (!vbox) {
        return undefined;
      }
      const rowMessage = await devToolsPage.waitForWithTries('.text-editor-row-message', vbox, {tries: 3});
      if (!rowMessage) {
        return undefined;
      }
      const issueTitle = await rowMessage.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
      const issueIcon = await devToolsPage.waitForWithTries('.text-editor-row-message-icon', rowMessage, {tries: 3});
      if (!issueIcon) {
        return undefined;
      }
      return {issueIcon, issueTitle};
    });

    const expandedIssues = await waitForExpandedIssueTitle(devToolsPage, issueIcon);
    assert.isTrue(expandedIssues.has(issueTitle));
  });
});
