// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

function createProtocolIssue(
    federatedAuthUserInfoRequestIssueDetails: Protocol.Audits.FederatedAuthUserInfoRequestIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.FederatedAuthUserInfoRequestIssue,
    details: {federatedAuthUserInfoRequestIssueDetails},
  };
}

describeWithLocale('FederatedAuthUserInfoRequestIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created for various error reasons', () => {
    const errorReasons = [
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotSameOrigin,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotIframe,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotPotentiallyTrustworthy,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoAPIPermission,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotSignedInWithIdp,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoAccountSharingPermission,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.InvalidConfigOrWellKnown,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.InvalidAccountsResponse,
      Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoReturningUserFromFetchedAccounts,
    ];
    for (const errorReason of errorReasons) {
      const issueDetails = {
        federatedAuthUserInfoRequestIssueReason: errorReason,
      };
      const issue = createProtocolIssue(issueDetails);
      const federatedAuthUserInfoRequestIssues =
          IssuesManager.FederatedAuthUserInfoRequestIssue.FederatedAuthUserInfoRequestIssue.fromInspectorIssue(
              mockModel, issue);
      assert.lengthOf(federatedAuthUserInfoRequestIssues, 1);
      const federatedAuthUserInfoRequestIssue = federatedAuthUserInfoRequestIssues[0];

      assert.strictEqual(federatedAuthUserInfoRequestIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepStrictEqual(federatedAuthUserInfoRequestIssue.details(), issueDetails);
      assert.strictEqual(federatedAuthUserInfoRequestIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      assert.isNotNull(federatedAuthUserInfoRequestIssue.getDescription());
    }
  });
});
