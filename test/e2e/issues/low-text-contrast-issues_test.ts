// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNull, enableExperiment, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertIssueTitle, expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Low contrast issues', async () => {
  it('should report low contrast issues', async () => {
    await enableExperiment('contrastIssues');
    await goToResource('elements/low-contrast.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueTitle = 'Increase color contrast to improve accessibility';
    await assertIssueTitle(issueTitle);
    const issueElement = await getIssueByTitle(issueTitle);
    assertNotNull(issueElement);
    const section = await getResourcesElement('2 elements', issueElement);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 3);
    assert.deepEqual(table[0], [
      'Element',
      'Contrast ratio',
      'Minimum AA ratio',
      'Minimum AAA ratio',
      'Text size',
      'Text weight',
    ]);
    assert.deepEqual(table[1], [
      'div#el1',
      '1',
      '4.5',
      '7',
      '16px',
      '400',
    ]);
    assert.deepEqual(table[2], [
      'span#el2',
      '1',
      '4.5',
      '7',
      '16px',
      '400',
    ]);
  });
});
