// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
  click,
  disableExperiment,
  goToResource,
  waitFor,
  clickElement,
  waitForFunction,
  waitForWithTries,
  hoverElement,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToIssuesTab} from '../helpers/issues-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

async function getIconComponents(className: string, root?: puppeteer.ElementHandle<Element>) {
  return await waitForFunction(async () => {
    const icons = await $$(`devtools-icon.${className}`, root);
    return icons.length > 0 ? icons : undefined;
  });
}

async function getRowsText(root: puppeteer.ElementHandle<Element>): Promise<string[]> {
  const rowMessages = await $$('.text-editor-row-message', root);
  const messages = [];
  for (const rowMessage of rowMessages) {
    const messageText = await rowMessage.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
    messages.push(messageText);
  }
  return messages;
}

async function getIconFile(iconComponent: puppeteer.ElementHandle<Element>): Promise<string> {
  const issueIcon = await waitFor('.icon-basic', iconComponent);
  const imageSrc = await issueIcon.evaluate(x => window.getComputedStyle(x).webkitMaskImage);
  const splitImageSrc = imageSrc.substring(5, imageSrc.length - 2).split('/');
  return splitImageSrc[splitImageSrc.length - 1];
}

async function openFileInSourceTab(fileName: string) {
  await goToResource(`network/${fileName}`);
  await openSourcesPanel();
  const element = await waitFor(`[aria-label="${fileName}, file"]`);
  await element.click();
}

async function getExpandedIssuesTitle(): Promise<Set<string>> {
  const expandedIssues = new Set<string>();
  const issues = await $$('.issue');
  for (const issue of issues) {
    const expanded = await issue.evaluate(x => x.classList.contains('expanded'));
    if (expanded) {
      const titleHandler = await waitFor('.title', issue);
      const title = await titleHandler.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
      expandedIssues.add(title);
    }
  }
  return expandedIssues;
}

async function waitForExpandedIssueTitle(issueIconComponent: puppeteer.ElementHandle<Element>): Promise<Set<string>> {
  return await waitForFunction(async () => {
    await clickElement(issueIconComponent);
    const expandedIssues = await getExpandedIssuesTitle();
    if (expandedIssues.size) {
      return expandedIssues;
    }
    return undefined;
  });
}

describe('The row\'s icon bucket', async function() {
  if (this.timeout()) {
    this.timeout(10000);
  }

  // TODO(crbug.com/1382752): These tests currently don't interact well with pretty-printing.
  beforeEach(async () => {
    await disableExperiment('sourcesPrettyPrint');
  });

  // This test and the tests below require the use of unsafe hoverElement/clickElement helpers
  // because they return a list of elements and check each one of them. Perhaps, the tests
  // can be changed to check the elements one by one using the safer hover/click helpers.
  // Or perhaps the tests only ever check a single element and the list checks are not needed at all.
  it('should display error messages', async () => {
    await openFileInSourceTab('trusted-type-policy-violation-report-only.rawresponse');
    const iconComponents = await getIconComponents('cm-messageIcon-error');
    const messages: string[] = [];
    const expectedMessages = [
      '[Report Only] Refused to create a TrustedTypePolicy named \'policy2\' because it violates the following Content Security Policy directive: "trusted-types policy1".',
    ];
    for (const iconComponent of iconComponents) {
      await hoverElement(iconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(vbox);
      messages.push(...rowMessages);
    }
    assert.deepEqual(messages, expectedMessages);
  });

  it('should use the correct error icon', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const bucketIconComponents = await getIconComponents('cm-messageIcon-error');
    for (const bucketIconComponent of bucketIconComponents) {
      await hoverElement(bucketIconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const iconComponents = await getIconComponents('text-editor-row-message-icon', vbox);
      for (const iconComponent of iconComponents) {
        assert.strictEqual(await getIconFile(iconComponent), 'cross-circle-filled.svg');
      }
      assert.strictEqual(await getIconFile(bucketIconComponent), 'cross-circle-filled.svg');
    }
  });

  it('should display issue messages', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const issueIconComponents = await getIconComponents('cm-messageIcon-issue');

    const issueMessages: string[] = [];
    const expectedIssueMessages = [
      'Trusted Type policy creation blocked by Content Security Policy',
      'Trusted Type expected, but String received',
    ];
    for (const issueIconComponent of issueIconComponents) {
      await hoverElement(issueIconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(vbox);
      issueMessages.push(...rowMessages);
    }
    assert.deepEqual(issueMessages.sort(), expectedIssueMessages.sort());
  });

  it('should also mark issues in inline event handlers in HTML documents', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only-in-html.rawresponse');
    const icons = await getIconComponents('cm-messageIcon-issue');
    assert.strictEqual(icons.length, 1);
  });

  it('should reveal Issues tab when the icon is clicked', async () => {
    await openFileInSourceTab('trusted-type-policy-violation-report-only.rawresponse');

    const HIDE_DEBUGGER_SELECTOR = '[aria-label="Hide debugger"]';
    const HIDE_NAVIGATOR_SELECTOR = '[aria-label="Hide navigator"]';
    await click(HIDE_DEBUGGER_SELECTOR);
    await click(HIDE_NAVIGATOR_SELECTOR);

    const bucketIssueIconComponents = await getIconComponents('cm-messageIcon-issue');
    assert.strictEqual(bucketIssueIconComponents.length, 1);
    const issueIconComponent = bucketIssueIconComponents[0];
    await clickElement(issueIconComponent);

    const expandedIssues = await waitForExpandedIssueTitle(issueIconComponent);
    assert.isTrue(expandedIssues.has('Trusted Type policy creation blocked by Content Security Policy'));
  });

  it('should reveal the Issues tab if the icon in the popover is clicked', async () => {
    if (this.timeout()) {
      this.timeout(20000);
    }
    await navigateToIssuesTab();
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');

    const HIDE_DEBUGGER_SELECTOR = '[aria-label="Hide debugger"]';
    const HIDE_NAVIGATOR_SELECTOR = '[aria-label="Hide navigator"]';
    await click(HIDE_DEBUGGER_SELECTOR);
    await click(HIDE_NAVIGATOR_SELECTOR);

    const {issueIcon, issueTitle} = await waitForFunction(async () => {
      const bucketIssueIconComponents = await getIconComponents('cm-messageIcon-issue');
      assert.strictEqual(bucketIssueIconComponents.length, 1);
      const issueIconComponent = bucketIssueIconComponents[0];
      await issueIconComponent.hover();
      const vbox = await waitForWithTries('div.vbox.flex-auto.no-pointer-events', undefined, {tries: 3});
      if (!vbox) {
        return undefined;
      }
      const rowMessage = await waitForWithTries('.text-editor-row-message', vbox, {tries: 3});
      if (!rowMessage) {
        return undefined;
      }
      const issueTitle = await rowMessage.evaluate(x => (x instanceof HTMLElement) ? x.innerText : '');
      const issueIcon = await waitForWithTries('.text-editor-row-message-icon', rowMessage, {tries: 3});
      if (!issueIcon) {
        return undefined;
      }
      return {issueIcon, issueTitle};
    });

    const expandedIssues = await waitForExpandedIssueTitle(issueIcon);
    assert.isTrue(expandedIssues.has(issueTitle));
  });
});
