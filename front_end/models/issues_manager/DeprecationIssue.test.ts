// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Issues from '../../panels/issues/issues.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../testing/MockIssuesManager.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describeWithLocale('DeprecationIssue', () => {
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
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
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
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 2);
  });
});
