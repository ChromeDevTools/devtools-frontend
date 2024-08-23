// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Issues from '../../panels/issues/issues.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../testing/MockIssuesManager.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

function createProtocolIssue(stylesheetLoadingIssueDetails: Protocol.Audits.StylesheetLoadingIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue,
    details: {stylesheetLoadingIssueDetails},
  };
}

describeWithLocale('StylesheetLoadingIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;

  it('can be created for failed stylesheet requests', () => {
    const issueDetails = {
      sourceCodeLocation: {
        url: 'http://example.com',
        lineNumber: 2,
        columnNumber: 2,
      },
      styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.RequestFailed,
      failedRequestInfo:
          {url: 'http://invalid', failureMessage: 'failureMessage', requestId: '12345' as Protocol.Network.RequestId},
    };
    const issue = createProtocolIssue(issueDetails);
    const stylesheetIssues =
        IssuesManager.StylesheetLoadingIssue.StylesheetLoadingIssue.fromInspectorIssue(mockModel, issue);
    assert.lengthOf(stylesheetIssues, 1);
    const stylesheetIssue = stylesheetIssues[0];

    assert.strictEqual(stylesheetIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
    assert.deepStrictEqual(stylesheetIssue.sources(), [issueDetails.sourceCodeLocation]);
    const {url, requestId} = issueDetails.failedRequestInfo;
    assert.deepStrictEqual(stylesheetIssue.requests(), [{url, requestId}]);
    assert.strictEqual(stylesheetIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    assert.isNotNull(stylesheetIssue.getDescription());
  });

  it('can be created for late import rules', () => {
    const issueDetails = {
      sourceCodeLocation: {
        url: 'http://example.com',
        lineNumber: 2,
        columnNumber: 2,
      },
      styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule,
    };
    const issue = createProtocolIssue(issueDetails);
    const stylesheetIssues =
        IssuesManager.StylesheetLoadingIssue.StylesheetLoadingIssue.fromInspectorIssue(mockModel, issue);
    assert.lengthOf(stylesheetIssues, 1);
    const stylesheetIssue = stylesheetIssues[0];

    assert.strictEqual(stylesheetIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
    assert.deepStrictEqual(stylesheetIssue.sources(), [issueDetails.sourceCodeLocation]);
    assert.strictEqual(stylesheetIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    assert.isNotNull(stylesheetIssue.getDescription());
  });

  it('correctly aggregates issues', () => {
    const issueDetails = [
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 1,
          columnNumber: 1,
        },
        styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule,
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 2,
          columnNumber: 1,
        },
        styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule,
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 1,
          columnNumber: 2,
        },
        styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.RequestFailed,
        failedRequestInfo: {url: 'http://invalid', failureMessage: 'failureMessage'},
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 2,
          columnNumber: 2,
        },
        styleSheetLoadingIssueReason: Protocol.Audits.StyleSheetLoadingIssueReason.RequestFailed,
        failedRequestInfo:
            {url: 'http://invalid', failureMessage: 'failureMessage', requestId: '12354' as Protocol.Network.RequestId},
      },
    ];

    const issues = issueDetails
                       .map(
                           details => IssuesManager.StylesheetLoadingIssue.StylesheetLoadingIssue.fromInspectorIssue(
                               mockModel, createProtocolIssue(details)))
                       .flat();

    assert.lengthOf(issues, 4);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
    }

    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.lengthOf(aggregatedIssues, 2);

    assert.deepStrictEqual(
        Array.from(aggregatedIssues[0].sources()),
        [issueDetails[0].sourceCodeLocation, issueDetails[1].sourceCodeLocation]);
    assert.deepStrictEqual(
        Array.from(aggregatedIssues[1].sources()),
        [issueDetails[2].sourceCodeLocation, issueDetails[3].sourceCodeLocation]);
    assert.deepStrictEqual(Array.from(aggregatedIssues[0].requests()), []);
    const {url, requestId} = issueDetails[3].failedRequestInfo as Protocol.Audits.FailedRequestInfo;
    assert.exists(requestId);
    assert.deepStrictEqual(Array.from(aggregatedIssues[1].requests()), [{url, requestId}]);
  });
});
