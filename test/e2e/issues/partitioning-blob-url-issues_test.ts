// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {
  getAndExpandSpecificIssueByTitle,
  navigateToIssuesTab,
} from '../helpers/issues-helpers.js';

describe('Partitioning Blob URL Issue', () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display the blocked fetching Blob URL and description based on partitioning info', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();

    // Test case 1: BlockedCrossPartitionFetching
    await frontend.evaluate(() => {
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
    const issueElement = await getAndExpandSpecificIssueByTitle('Fetching Partitioned Blob URL Issue');
    assertNotNullOrUndefined(issueElement);
  });

  it('should display the enforced noopener for navigation Blob URL and description based on partitioning info',
     async () => {
       await navigateToIssuesTab();
       const {frontend} = getBrowserAndPages();

       // Test case 2: EnforceNoopenerForNavigation
       await frontend.evaluate(() => {
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
       const issueElement = await getAndExpandSpecificIssueByTitle('Navigating Partitioned Blob URL Issue');
       assertNotNullOrUndefined(issueElement);
     });
});
