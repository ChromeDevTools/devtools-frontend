// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Issues from '../../panels/issues/issues.js';
import {MockIssuesManager} from '../../testing/MockIssuesManager.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('LowTextContrastIssue', () => {
  it('aggregates multiple issues with duplicates correctly', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const commonDetails = {
      violatingNodeSelector: 'div',
      contrastRatio: 1,
      thresholdAA: 1,
      thresholdAAA: 1,
      fontSize: '14px',
      fontWeight: '500',
    };
    const issueDetails = [
      {
        ...commonDetails,
        violatingNodeId: 1 as Protocol.DOM.BackendNodeId,
      },
      {
        ...commonDetails,
        violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
      },
      {
        ...commonDetails,
        violatingNodeId: 3 as Protocol.DOM.BackendNodeId,
      },
    ];
    const issues =
        issueDetails.map(details => new IssuesManager.LowTextContrastIssue.LowTextContrastIssue(details, mockModel));

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
    }

    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.lengthOf(aggregatedIssues, 1);
    const lowContrastIssues = Array.from(aggregatedIssues[0].getLowContrastIssues());
    assert.lengthOf(lowContrastIssues, 3);
    const violatingNodeIds = [];
    for (const contrastIssue of lowContrastIssues) {
      violatingNodeIds.push(contrastIssue.details().violatingNodeId);
    }
    violatingNodeIds.sort();
    assert.deepEqual(violatingNodeIds, [1, 2, 3]);
  });
});
