// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$$, click, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
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
  const imageSrc = await issueIcon.evaluate(x => window.getComputedStyle(x).backgroundImage);
  const splitImageSrc = imageSrc.substring(5, imageSrc.length - 2).split('/');
  return splitImageSrc[splitImageSrc.length - 1];
}

async function openFileInSourceTab(fileName: string) {
  await goToResource(`network/${fileName}`);
  await openSourcesPanel();
  const element = await waitFor(`[aria-label="${fileName}, file"]`);
  await element.click();
}

describe('Display error information next to affected lines', async () => {
  it('Error messages should be displayed', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const iconComponents = await getIconComponents('text-editor-line-decoration-icon-error');
    const messages: string[] = [];
    const expectedMessages = [
      '[Report Only] Refused to create a TrustedTypePolicy named \'policy2\' because it violates the following Content Security Policy directive: "trusted-types policy1".',
      '[Report Only] This document requires \'TrustedHTML\' assignment.',
    ];
    for (const iconComponent of iconComponents) {
      await click(iconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(vbox);
      messages.push(...rowMessages);
    }
    assert.deepEqual(messages, expectedMessages);
  });
  it('Error icons should be correct', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const bucketIconComponents = await getIconComponents('text-editor-line-decoration-icon-error');
    for (const bucketIconComponent of bucketIconComponents) {
      await click(bucketIconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const iconComponents = await getIconComponents('text-editor-row-message-icon', vbox);
      for (const iconComponent of iconComponents) {
        assert.strictEqual(await getIconFile(iconComponent), 'error_icon.svg');
      }
      assert.strictEqual(await getIconFile(bucketIconComponent), 'error_icon.svg');
    }
  });
  it('Issue messages should be displayed', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const issueIconComponents = await getIconComponents('text-editor-line-decoration-icon-issue');

    const issueMessages: string[] = [];
    const expectedIssueMessages = [
      'Trusted Type policy creation blocked by Content Security Policy',
      'Trusted Type expected, but String received',
    ];
    for (const issueIconComponent of issueIconComponents) {
      await click(issueIconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const rowMessages = await getRowsText(vbox);
      issueMessages.push(...rowMessages);
    }
    assert.deepEqual(issueMessages, expectedIssueMessages);
  });
  it('Issues should also appear inside HTML', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only-in-html.rawresponse');
    const icons = await getIconComponents('text-editor-line-decoration-icon-issue');
    assert.strictEqual(icons.length, 1);
  });
  it('Issue icons should be correct', async () => {
    await openFileInSourceTab('trusted-type-violations-report-only.rawresponse');
    const bucketIssueIconComponents = await getIconComponents('text-editor-line-decoration-icon-issue');
    for (const bucketIssueIconComponent of bucketIssueIconComponents) {
      await click(bucketIssueIconComponent);
      const vbox = await waitFor('div.vbox.flex-auto.no-pointer-events');
      const issueIconComponents = await getIconComponents('text-editor-row-message-icon', vbox);
      for (const issueIconComponent of issueIconComponents) {
        assert.strictEqual(await getIconFile(issueIconComponent), 'breaking_change_icon.svg');
      }
      assert.strictEqual(await getIconFile(bucketIssueIconComponent), 'breaking_change_icon.svg');
    }
  });
});
