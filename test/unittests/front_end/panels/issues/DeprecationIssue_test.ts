// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../models/issues_manager/MockIssuesManager.js';

describeWithLocale('DeprecationIssue', async () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;

  function createDeprecationIssue(type: string): IssuesManager.DeprecationIssue.DeprecationIssue {
    return new IssuesManager.DeprecationIssue.DeprecationIssue(
        {
          sourceCodeLocation: {
            url: 'empty.html',
            lineNumber: 1,
            columnNumber: 1,
          },
          type,
        },
        mockModel);
  }

  function createDeprecationIssueDetails(type: string): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      details: {
        deprecationIssueDetails: {
          sourceCodeLocation: {
            url: 'empty.html',
            lineNumber: 1,
            columnNumber: 1,
          },
          type,
        },
      },
    };
  }

  it('normal deprecation issue works', () => {
    const details = createDeprecationIssueDetails('DeprecationExample');
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isNotEmpty(issue);
  });

  it('aggregates issues with the same type', () => {
    const issues = [
      createDeprecationIssue('DeprecationExample'),
      createDeprecationIssue('DeprecationExample'),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 1);
    const deprecationIssues = Array.from(aggregatedIssues[0].getDeprecationIssues());
    assert.strictEqual(deprecationIssues.length, 2);
  });

  it('does not aggregate issues with different types', () => {
    const issues = [
      createDeprecationIssue('DeprecationExample'),
      createDeprecationIssue('CrossOriginWindowAlert'),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 2);
  });
});
