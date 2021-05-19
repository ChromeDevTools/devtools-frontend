// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNull, getResourcesPath, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertIssueTitle, expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

const triggerQuirksModeIssueInIssuesTab = async (path: string) => {
  await goToResource(path);
  await navigateToIssuesTab();
  await expandIssue();
  const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
  await assertIssueTitle(issueTitle);
  const issueElement = await getIssueByTitle(issueTitle);
  assertNotNull(issueElement);
  return issueElement;
};

describe('Quirks Mode issues', async () => {
  it('should report Quirks Mode issues', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode.html');
    const section = await getResourcesElement('1 element', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Document in the DOM tree',
      'Mode',
      'URL',
    ]);
    assert.deepEqual(table[1], [
      'document',
      'Quirks Mode',
      `${getResourcesPath()}/elements/quirks-mode.html`,
    ]);
  });

  it('should report Limited Quirks Mode issues', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/limited-quirks-mode.html');
    const section = await getResourcesElement('1 element', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 2);
    assert.deepEqual(table[0], [
      'Document in the DOM tree',
      'Mode',
      'URL',
    ]);
    assert.deepEqual(table[1], [
      'document',
      'Limited Quirks Mode',
      `${getResourcesPath()}/elements/limited-quirks-mode.html`,
    ]);
  });

  it('should report Quirks Mode issues in iframes', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode-iframes.html');
    const section = await getResourcesElement('2 elements', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Document in the DOM tree',
      'Mode',
      'URL',
    ]);
    const [limitedQuirksMode, quirksMode] = table.slice(1).sort((rowA, rowB) => rowA[1].localeCompare(rowB[1]));
    assert.deepEqual(limitedQuirksMode, [
      'document',
      'Limited Quirks Mode',
      `${getResourcesPath()}/elements/limited-quirks-mode.html`,
    ]);
    assert.deepEqual(quirksMode, [
      'document',
      'Quirks Mode',
      `${getResourcesPath()}/elements/quirks-mode.html`,
    ]);
  });
});
