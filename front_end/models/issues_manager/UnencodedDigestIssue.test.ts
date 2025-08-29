// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

function createProtocolIssue(unencodedDigestIssueDetails: Protocol.Audits.UnencodedDigestIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.UnencodedDigestIssue,
    details: {unencodedDigestIssueDetails},
  };
}

describeWithLocale('UnencodedDigestIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created for various error reasons', () => {
    const errorReasons = [
      Protocol.Audits.UnencodedDigestError.IncorrectDigestLength,
      Protocol.Audits.UnencodedDigestError.IncorrectDigestType,
      Protocol.Audits.UnencodedDigestError.MalformedDictionary,
      Protocol.Audits.UnencodedDigestError.UnknownAlgorithm,
    ];
    for (const errorReason of errorReasons) {
      const issueDetails = {
        error: errorReason,
        request: {
          requestId: 'test-request-id' as Protocol.Network.RequestId,
          url: 'https://example.com/',
        },
      };
      const issue = createProtocolIssue(issueDetails);
      const unencodedDigestIssues =
          IssuesManager.UnencodedDigestIssue.UnencodedDigestIssue.fromInspectorIssue(mockModel, issue);
      assert.lengthOf(unencodedDigestIssues, 1);
      const unencodedDigestIssue = unencodedDigestIssues[0];

      assert.strictEqual(unencodedDigestIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepEqual(unencodedDigestIssue.details(), issueDetails);
      assert.strictEqual(unencodedDigestIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      assert.isNotNull(unencodedDigestIssue.getDescription());
    }
  });
});
