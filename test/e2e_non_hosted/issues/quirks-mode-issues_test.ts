// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertIssueTitle,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSection,
  waitForTableFromResourceSectionContents,
} from '../../e2e/helpers/issues-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {matchStringArray} from '../../shared/helper.js';

const triggerQuirksModeIssueInIssuesTab =
    async (path: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
  await inspectedPage.goToResource(path);
  await navigateToIssuesTab(devToolsPage);
  await expandIssue(devToolsPage);
  const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
  await assertIssueTitle(issueTitle, devToolsPage);
  const issueElement = await getIssueByTitle(issueTitle, devToolsPage);
  assert.isOk(issueElement);
  return issueElement;
};

describe('Quirks Mode issues', () => {
  it('should report Quirks Mode issues', async ({devToolsPage, inspectedPage}) => {
    const issueElement =
        await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode.html', devToolsPage, inspectedPage);
    const section = await getResourcesElement('1 element', issueElement, undefined, devToolsPage);
    const expectedTableRows = [
      [
        'Document in the DOM tree',
        'Mode',
        'URL',
      ],
      [
        'document',
        'Quirks Mode',
        `${inspectedPage.getResourcesPath()}/elements/quirks-mode.html`,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should report Limited Quirks Mode issues', async ({devToolsPage, inspectedPage}) => {
    const issueElement =
        await triggerQuirksModeIssueInIssuesTab('elements/limited-quirks-mode.html', devToolsPage, inspectedPage);
    const section = await getResourcesElement('1 element', issueElement, undefined, devToolsPage);
    const expectedTableRows = [
      [
        'Document in the DOM tree',
        'Mode',
        'URL',
      ],
      [
        'document',
        'Limited Quirks Mode',
        `${inspectedPage.getResourcesPath()}/elements/limited-quirks-mode.html`,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should report Quirks Mode issues in iframes', async ({devToolsPage, inspectedPage}) => {
    const issueElement =
        await triggerQuirksModeIssueInIssuesTab('elements/quirks-mode-iframes.html', devToolsPage, inspectedPage);
    const section = await getResourcesElement('2 elements', issueElement, undefined, devToolsPage);
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
            `${inspectedPage.getResourcesPath()}/elements/limited-quirks-mode.html`,
          ]) !== true) {
        return undefined;
      }
      if (matchStringArray(quirksMode, [
            'document',
            'Quirks Mode',
            `${inspectedPage.getResourcesPath()}/elements/quirks-mode.html`,
          ]) !== true) {
        return undefined;
      }
      return true;
    }, devToolsPage);
  });
});
