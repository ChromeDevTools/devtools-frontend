// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  expandIssue,
  getAndExpandSpecificIssueByTitle,
  getIssueByTitle,
  navigateToIssuesTab,
  RESOURCES_LABEL,
} from '../../e2e/helpers/issues-helpers.js';

describe('Partitioning Blob URL Issue', () => {
  it('should display the blocked fetching Blob URL and description based on partitioning info',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await navigateToIssuesTab(devToolsPage);

       // Test case 1: BlockedCrossPartitionFetching
       await devToolsPage.evaluate(() => {
         const issue = {
           code: 'PartitioningBlobURLIssue',
           details: {
             partitioningBlobURLIssueDetails: {
               url: 'blob:https://example.com/myblob1',
               partitioningBlobURLInfo: 'BlockedCrossPartitionFetching',
             },
           },
         };
         // @ts-expect-error
         window.addIssueForTest(issue);
       });
       const issueElement = await getAndExpandSpecificIssueByTitle('Fetching Partitioned Blob URL Issue', devToolsPage);
       assert.isOk(issueElement);
     });

  it('should display the enforced noopener for navigation Blob URL and description based on partitioning info',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await navigateToIssuesTab(devToolsPage);

       // Test case 2: EnforceNoopenerForNavigation
       await devToolsPage.evaluate(() => {
         const issue = {
           code: 'PartitioningBlobURLIssue',
           details: {
             partitioningBlobURLIssueDetails: {
               url: 'blob:https://example.com/myblob2',
               partitioningBlobURLInfo: 'EnforceNoopenerForNavigation',
             },
           },
         };
         // @ts-expect-error
         window.addIssueForTest(issue);
       });
       const issueElement =
           await getAndExpandSpecificIssueByTitle('Navigating Partitioned Blob URL Issue', devToolsPage);
       assert.isOk(issueElement);
     });

  it('partitioning blob resource view is hidden if there is no resource', async ({devToolsPage, inspectedPage}) => {
    // Regression test for b/401184804
    // Trigger an issue for quirks mode
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueTitle = 'Page layout may be unexpected due to Quirks Mode';
    const issueElement = await getIssueByTitle(issueTitle, devToolsPage);
    assert.isOk(issueElement);
    const childElements = await devToolsPage.$$(RESOURCES_LABEL, issueElement);
    let foundBlobResourceElement = false;
    let foundQuirkyElement = false;
    for (const el of childElements) {
      const content = await el.evaluate(el => el.textContent);
      const visibility = await el.evaluate(function(el) {
        const parent = el.parentElement;
        if (parent === null) {
          return 'no parent';
        }
        return parent.checkVisibility() ? 'visible' : 'invisible';
      });
      // There is a hidden child element for Blob URL resources that counts 0.
      if (content === 'Blob URL issues count: 0') {
        foundBlobResourceElement = true;
        assert.strictEqual(visibility, 'invisible');
      }
      // There is a visible child element for the resource that triggered quirks mode.
      if (content === '1 element') {
        foundQuirkyElement = true;
        assert.strictEqual(visibility, 'visible');
      }
    }
    assert.isTrue(foundBlobResourceElement);
    assert.isTrue(foundQuirkyElement);
  });
});
