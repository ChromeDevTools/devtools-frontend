// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getResourcesPath, goToResource, matchStringArray} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  assertIssueTitle,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSection,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

const triggerQuirksModeIssueInIssuesTab = async (path: string) => {
  await goToResource(path);
  await navigateToIssuesTab();
  await expandIssue();
  const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
  await assertIssueTitle(issueTitle);
  const issueElement = await getIssueByTitle(issueTitle);
  assertNotNullOrUndefined(issueElement);
  return issueElement;
};

describe('Quirks Mode issues', async () => {
  it('should report Quirks Mode issues', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode.html');
    const section = await getResourcesElement('1 element', issueElement);
    const expectedTableRows = [
      [
        'Document in the DOM tree',
        'Mode',
        'URL',
      ],
      [
        'document',
        'Quirks Mode',
        `${getResourcesPath()}/elements/quirks-mode.html`,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should report Limited Quirks Mode issues', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/limited-quirks-mode.html');
    const section = await getResourcesElement('1 element', issueElement);
    const expectedTableRows = [
      [
        'Document in the DOM tree',
        'Mode',
        'URL',
      ],
      [
        'document',
        'Limited Quirks Mode',
        `${getResourcesPath()}/elements/limited-quirks-mode.html`,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should report Quirks Mode issues in iframes', async () => {
    const issueElement = await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode-iframes.html');
    const section = await getResourcesElement('2 elements', issueElement);
    await waitForTableFromResourceSection(section.content, table => {
      if (table.length !== 3) {
        return undefined;
      }
      if (matchStringArray(table[0], [
            'Document in the DOM tree',
            'Mode',
            'URL',
          ]) !== true) {
        return undefined;
      }
      const [limitedQuirksMode, quirksMode] = table.slice(1).sort((rowA, rowB) => rowA[1].localeCompare(rowB[1]));
      if (matchStringArray(limitedQuirksMode, [
            'document',
            'Limited Quirks Mode',
            `${getResourcesPath()}/elements/limited-quirks-mode.html`,
          ]) !== true) {
        return undefined;
      }
      if (matchStringArray(quirksMode, [
            'document',
            'Quirks Mode',
            `${getResourcesPath()}/elements/quirks-mode.html`,
          ]) !== true) {
        return undefined;
      }
      return true;
    });
  });
});
