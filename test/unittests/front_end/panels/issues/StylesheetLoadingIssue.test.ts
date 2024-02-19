// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../models/issues_manager/MockIssuesManager.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';

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

    assert.strictEqual(stylesheetIssue.getCategory(), IssuesManager.Issue.IssueCategory.Other);
    assert.deepStrictEqual(stylesheetIssue.sources(), [issueDetails.sourceCodeLocation]);
    const {url, requestId} = issueDetails.failedRequestInfo;
    assert.deepStrictEqual(stylesheetIssue.requests(), [{url, requestId}]);
    assert.strictEqual(stylesheetIssue.getKind(), IssuesManager.Issue.IssueKind.PageError);
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

    assert.strictEqual(stylesheetIssue.getCategory(), IssuesManager.Issue.IssueCategory.Other);
    assert.deepStrictEqual(stylesheetIssue.sources(), [issueDetails.sourceCodeLocation]);
    assert.strictEqual(stylesheetIssue.getKind(), IssuesManager.Issue.IssueKind.PageError);
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
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
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
    Platform.assertNotNullOrUndefined(requestId);
    assert.deepStrictEqual(Array.from(aggregatedIssues[1].requests()), [{url, requestId}]);
  });
});
