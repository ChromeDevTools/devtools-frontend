// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describeWithLocale('ElementAccessibilityIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  function createProtocolIssueWithoutDetails(): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue,
      details: {},
    };
  }

  function createProtocolIssueWithDetails(
      elementAccessibilityIssueDetails: Protocol.Audits.ElementAccessibilityIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue,
      details: {elementAccessibilityIssueDetails},
    };
  }

  expectConsoleLogs({
    warn: ['Select Element Accessibility issue without details received.'],
  });

  it('can be created for various reasons', () => {
    const reasons = [
      Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
      Protocol.Audits.ElementAccessibilityIssueReason.DisallowedOptGroupChild,
      Protocol.Audits.ElementAccessibilityIssueReason.NonPhrasingContentOptionChild,
      Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild,
      Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentLegendChild,
      Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant,
    ];
    for (const reason of reasons) {
      const issueDetails = {
        nodeId: 1 as Protocol.DOM.BackendNodeId,
        elementAccessibilityIssueReason: reason,
        hasDisallowedAttributes: false,
      };
      const issue = createProtocolIssueWithDetails(issueDetails);
      const selectIssues =
          IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue.fromInspectorIssue(mockModel, issue);
      assert.lengthOf(selectIssues, 1);
      const selectIssue = selectIssues[0];

      assert.strictEqual(selectIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepEqual(selectIssue.details(), issueDetails);
      assert.strictEqual(selectIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      assert.isNotNull(selectIssue.getDescription());
    }
  });

  it('adds a disallowed select child issue without details', () => {
    const inspectorIssueWithoutGenericDetails = createProtocolIssueWithoutDetails();
    const selectIssues = IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue.fromInspectorIssue(
        mockModel, inspectorIssueWithoutGenericDetails);

    assert.isEmpty(selectIssues);
  });

  it('adds an interactive content attributes select child issue with valid details', () => {
    const issueDetails = {
      nodeId: 1 as Protocol.DOM.BackendNodeId,
      elementAccessibilityIssueReason: Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild,
      hasDisallowedAttributes: true,
    };
    const issue = createProtocolIssueWithDetails(issueDetails);
    const selectIssues =
        IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue.fromInspectorIssue(mockModel, issue);
    assert.lengthOf(selectIssues, 1);
    const selectIssue = selectIssues[0];

    assert.strictEqual(selectIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
    assert.deepEqual(selectIssue.details(), issueDetails);
    assert.strictEqual(selectIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    assert.isNotNull(selectIssue.getDescription());
  });
});
