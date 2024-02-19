// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../models/issues_manager/MockIssuesManager.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';

function createProtocolIssue(propertyRuleIssueDetails: Protocol.Audits.PropertyRuleIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.PropertyRuleIssue,
    details: {propertyRuleIssueDetails},
  };
}

describeWithLocale('propertyRuleIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;

  it('can be created for property rules parsing failures', () => {
    const issueDetails = {
      sourceCodeLocation: {
        url: 'http://example.com',
        lineNumber: 2,
        columnNumber: 2,
      },
      propertyRuleIssueReason: Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue,
      propertyValue: 'invalid',
    };
    const issue = createProtocolIssue(issueDetails);
    const propertyRuleIssues = IssuesManager.PropertyRuleIssue.PropertyRuleIssue.fromInspectorIssue(mockModel, issue);
    assert.lengthOf(propertyRuleIssues, 1);
    const propertyRuleIssue = propertyRuleIssues[0];

    assert.strictEqual(propertyRuleIssue.getCategory(), IssuesManager.Issue.IssueCategory.Other);
    assert.deepStrictEqual(propertyRuleIssue.sources(), [issueDetails.sourceCodeLocation]);
    assert.strictEqual(propertyRuleIssue.getKind(), IssuesManager.Issue.IssueKind.PageError);
    assert.isNotNull(propertyRuleIssue.getDescription());
    assert.strictEqual(propertyRuleIssue.getPropertyName(), 'initial-value');
  });

  it('only aggregates identical issues', () => {
    const issueDetails = [
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 2,
          columnNumber: 2,
        },
        propertyRuleIssueReason: Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue,
        propertyValue: 'invalid',
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 2,
          columnNumber: 2,
        },
        propertyRuleIssueReason: Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue,
        propertyValue: 'invalid',
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 2,
          columnNumber: 2,
        },
        propertyRuleIssueReason: Protocol.Audits.PropertyRuleIssueReason.InvalidInherits,
        propertyValue: 'invalid',
      },
      {
        sourceCodeLocation: {
          url: 'http://example.com',
          lineNumber: 3,
          columnNumber: 2,
        },
        propertyRuleIssueReason: Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue,
        propertyValue: 'invalid',
      },
    ];

    const issues = issueDetails
                       .map(
                           details => IssuesManager.PropertyRuleIssue.PropertyRuleIssue.fromInspectorIssue(
                               mockModel, createProtocolIssue(details)))
                       .flat();

    assert.lengthOf(issues, 4);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }

    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.lengthOf(aggregatedIssues, 3);

    // Use shallow comparison. We thus ensure the correct issues are aggregated:
    assert.strictEqual(Array.from(aggregatedIssues[0].sources())[0], issueDetails[0].sourceCodeLocation);
    assert.strictEqual(Array.from(aggregatedIssues[1].sources())[0], issueDetails[2].sourceCodeLocation);
    assert.strictEqual(Array.from(aggregatedIssues[2].sources())[0], issueDetails[3].sourceCodeLocation);
  });
});
