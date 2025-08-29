// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertIssueTitle,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../../e2e/helpers/issues-helpers.js';

describe('Low contrast issues', () => {
  setup({
    enabledDevToolsExperiments: ['contrast-issues'],
  });

  it('should report low contrast issues', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/low-contrast.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueTitle = 'Users may have difficulties reading text content due to insufficient color contrast';
    await assertIssueTitle(issueTitle, devToolsPage);
    const issueElement = await getIssueByTitle(issueTitle, devToolsPage);
    assert.isOk(issueElement);
    const section = await getResourcesElement('3 elements', issueElement, undefined, devToolsPage);
    const expectedTableRows = [
      [
        'Element',
        'Contrast ratio',
        'Minimum AA ratio',
        'Minimum AAA ratio',
        'Text size',
        'Text weight',
      ],
      [
        'div#el1',
        '1',
        '4.5',
        '7',
        '16px',
        '400',
      ],
      [
        'span#el2',
        '1',
        '4.5',
        '7',
        '16px',
        '400',
      ],
      [
        'span#el3',
        '1.49',
        '4.5',
        '7',
        '16px',
        '400',
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
