// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('FederatedAuthRequestIssue', () => {
  setupLocaleHooks();

  function createProtocolIssue(federatedAuthRequestIssueDetails: Protocol.Audits.FederatedAuthRequestIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.FederatedAuthRequestIssue,
      details: {federatedAuthRequestIssueDetails},
    };
  }

  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created and correctly resolves markdown description and details for allowlist block reasons', () => {
    const allowlistErrorReasons = [
      {
        reason: Protocol.Audits.FederatedAuthRequestIssueReason.WellKnownBlockedByConnectionAllowlist,
        file: 'federatedAuthRequestWellKnownBlockedByConnectionAllowlist.md',
      },
      {
        reason: Protocol.Audits.FederatedAuthRequestIssueReason.ConfigBlockedByConnectionAllowlist,
        file: 'federatedAuthRequestConfigBlockedByConnectionAllowlist.md',
      },
      {
        reason: Protocol.Audits.FederatedAuthRequestIssueReason.AccountsBlockedByConnectionAllowlist,
        file: 'federatedAuthRequestAccountsBlockedByConnectionAllowlist.md',
      },
      {
        reason: Protocol.Audits.FederatedAuthRequestIssueReason.IdTokenBlockedByConnectionAllowlist,
        file: 'federatedAuthRequestIdTokenBlockedByConnectionAllowlist.md',
      },
    ];

    for (const {reason, file} of allowlistErrorReasons) {
      const issueDetails = {
        federatedAuthRequestIssueReason: reason,
      };
      const issue = createProtocolIssue(issueDetails);
      const federatedAuthRequestIssues =
          IssuesManager.FederatedAuthRequestIssue.FederatedAuthRequestIssue.fromInspectorIssue(mockModel, issue);
      assert.lengthOf(federatedAuthRequestIssues, 1);
      const federatedAuthRequestIssue = federatedAuthRequestIssues[0];

      assert.strictEqual(federatedAuthRequestIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepEqual(federatedAuthRequestIssue.details(), issueDetails);
      assert.strictEqual(federatedAuthRequestIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);

      const description = federatedAuthRequestIssue.getDescription();
      assert.isNotNull(description);
      assert.strictEqual(description?.file, file);
      assert.lengthOf(description?.links ?? [], 1);
      assert.strictEqual(description?.links[0].link, 'https://github.com/WICG/connection-allowlists');
    }
  });
});
