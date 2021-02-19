// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import type * as BrowserSDKModule from '../../../../front_end/browser_sdk/browser_sdk.js';
import type * as SDKModule from '../../../../front_end/sdk/sdk.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {MockIssuesModel} from '../sdk/MockIssuesModel.js';
import {MockIssuesManager} from '../browser_sdk/MockIssuesManager.js';

describeWithEnvironment('AggregatedIssue', async () => {
  let Issues: typeof IssuesModule;
  let BrowserSDK: typeof BrowserSDKModule;
  let SDK: typeof SDKModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');

    BrowserSDK = await import('../../../../front_end/browser_sdk/browser_sdk.js');
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  it('aggregates multiple issues with duplicates correctly', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDKModule.IssuesModel.IssuesModel;
    const mockManager = new MockIssuesManager([]) as unknown as BrowserSDKModule.IssuesManager.IssuesManager;
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
        violatingNodeId: 1,
      },
      {
        ...commonDetails,
        violatingNodeId: 2,
      },
      {
        ...commonDetails,
        violatingNodeId: 3,
      },
    ];
    const issues = issueDetails.map(details => new SDK.LowTextContrastIssue.LowTextContrastIssue(details));

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }

    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 1);
    const lowContrastIssues = Array.from(aggregatedIssues[0].getLowContrastIssues());
    assert.strictEqual(lowContrastIssues.length, 3);
    const violatingNodeIds = [];
    for (const contrastIssue of lowContrastIssues) {
      violatingNodeIds.push(contrastIssue.details().violatingNodeId);
    }
    violatingNodeIds.sort();
    assert.deepEqual(violatingNodeIds, [1, 2, 3]);
  });
});
