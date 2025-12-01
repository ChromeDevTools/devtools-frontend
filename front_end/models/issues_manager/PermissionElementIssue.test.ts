// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';

import * as IssuesManager from './issues_manager.js';

describe('PermissionElementIssue', () => {
  setupLocaleHooks();
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  function createProtocolIssue(permissionElementIssueDetails: Protocol.Audits.PermissionElementIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.PermissionElementIssue,
      details: {
        permissionElementIssueDetails,
      },
    };
  }

  it('should be created correctly for all issue types', () => {
    const enumValues = [
      Protocol.Audits.PermissionElementIssueType.InvalidType,
      Protocol.Audits.PermissionElementIssueType.FencedFrameDisallowed,
      Protocol.Audits.PermissionElementIssueType.CspFrameAncestorsMissing,
      Protocol.Audits.PermissionElementIssueType.PermissionsPolicyBlocked,
      Protocol.Audits.PermissionElementIssueType.PaddingRightUnsupported,
      Protocol.Audits.PermissionElementIssueType.PaddingBottomUnsupported,
      Protocol.Audits.PermissionElementIssueType.InsetBoxShadowUnsupported,
      Protocol.Audits.PermissionElementIssueType.RequestInProgress,
      Protocol.Audits.PermissionElementIssueType.UntrustedEvent,
      Protocol.Audits.PermissionElementIssueType.RegistrationFailed,
      Protocol.Audits.PermissionElementIssueType.TypeNotSupported,
      Protocol.Audits.PermissionElementIssueType.InvalidTypeActivation,
      Protocol.Audits.PermissionElementIssueType.SecurityChecksFailed,
      Protocol.Audits.PermissionElementIssueType.ActivationDisabled,
      Protocol.Audits.PermissionElementIssueType.GeolocationDeprecated,
      Protocol.Audits.PermissionElementIssueType.InvalidDisplayStyle,
      Protocol.Audits.PermissionElementIssueType.NonOpaqueColor,
      Protocol.Audits.PermissionElementIssueType.LowContrast,
      Protocol.Audits.PermissionElementIssueType.FontSizeTooSmall,
      Protocol.Audits.PermissionElementIssueType.FontSizeTooLarge,
      Protocol.Audits.PermissionElementIssueType.InvalidSizeValue,
    ];
    for (const issueType of enumValues) {
      const details: Protocol.Audits.PermissionElementIssueDetails = {
        issueType,
        nodeId: 1 as Protocol.DOM.BackendNodeId,
        type: 'test-type',  // Default type for most issues
      };

      // Add/override specific fields required by certain issue types
      switch (issueType) {
        case Protocol.Audits.PermissionElementIssueType.PermissionsPolicyBlocked:
          details.permissionName = 'test-permission';
          break;
        case Protocol.Audits.PermissionElementIssueType.ActivationDisabled:
          details.disableReason = 'test-reason';
          break;
        case Protocol.Audits.PermissionElementIssueType.GeolocationDeprecated:
          delete details.type;  // This type does not use the 'type' field
          break;
      }

      const inspectorIssue = createProtocolIssue(details);

      const issues =
          IssuesManager.PermissionElementIssue.PermissionElementIssue.fromInspectorIssue(mockModel, inspectorIssue);
      assert.lengthOf(issues, 1, `For ${issueType}: fromInspectorIssue should return one issue.`);
      const issue = issues[0];
      assert.strictEqual(
          issue.code(), `${Protocol.Audits.InspectorIssueCode.PermissionElementIssue}::${issueType}`,
          `For ${issueType}: issue code should be specific to the issueType.`);
      assert.strictEqual(
          issue.getCategory(), IssuesManager.Issue.IssueCategory.PERMISSION_ELEMENT,
          `For ${issueType}: category should be PERMISSION_ELEMENT.`);
      assert.strictEqual(
          issue.getKind(),
          details.isWarning ? IssuesManager.Issue.IssueKind.IMPROVEMENT : IssuesManager.Issue.IssueKind.PAGE_ERROR,
          `For ${issueType}: kind should be correct based on isWarning.`);
      assert.include(issue.primaryKey(), details.issueType, `For ${issueType}: primary key should include issueType.`);
      if (details.nodeId) {
        assert.lengthOf(Array.from(issue.elements()), 1, `For ${issueType}: should have one affected element.`);
      }
      const description = issue.getDescription();
      assert.isNotNull(description, `For ${issueType}: description should not be null.`);
      if (description) {
        assert.include(
            description.file, 'permissionElement',
            `For ${issueType}: description file should be a permissionElement file.`);
      }
    }
  });
});
