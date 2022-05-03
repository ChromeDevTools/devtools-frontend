// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, enableExperiment, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  assertIssueTitle,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Low contrast issues', async () => {
  it('should report low contrast issues', async () => {
    await enableExperiment('contrastIssues');
    await goToResource('elements/low-contrast.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueTitle = 'Users may have difficulties reading text content due to insufficient color contrast';
    await assertIssueTitle(issueTitle);
    const issueElement = await getIssueByTitle(issueTitle);
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('3 elements', issueElement);
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
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
