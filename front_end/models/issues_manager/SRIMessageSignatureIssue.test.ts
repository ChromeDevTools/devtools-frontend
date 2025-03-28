// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

function createProtocolIssue(sriMessageSignatureIssueDetails: Protocol.Audits.SRIMessageSignatureIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.SRIMessageSignatureIssue,
    details: {sriMessageSignatureIssueDetails},
  };
}

describeWithLocale('SRIMessageSignatureIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created for various error reasons', () => {
    const errorReasons = [
      Protocol.Audits.SRIMessageSignatureError.MissingSignatureHeader,
      Protocol.Audits.SRIMessageSignatureError.MissingSignatureInputHeader,
      Protocol.Audits.SRIMessageSignatureError.InvalidSignatureHeader,
      Protocol.Audits.SRIMessageSignatureError.InvalidSignatureInputHeader,
      Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsNotByteSequence,
      Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsParameterized,
      Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsIncorrectLength,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingLabel,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueNotInnerList,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueMissingComponents,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentType,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentName,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidHeaderComponentParameter,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidDerivedComponentParameter,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderKeyIdLength,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidParameter,
      Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingRequiredParameters,
      Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureExpired,
      Protocol.Audits.SRIMessageSignatureError.ValidationFailedInvalidLength,
      Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureMismatch,
      Protocol.Audits.SRIMessageSignatureError.ValidationFailedIntegrityMismatch,
    ];
    for (const errorReason of errorReasons) {
      const issueDetails = {
        error: errorReason,
        request: {
          requestId: 'test-request-id' as Protocol.Network.RequestId,
          url: 'https://example.com/',
        },
        signatureBase: 'test-signature-base',
        integrityAssertions: [],
      };
      const issue = createProtocolIssue(issueDetails);
      const sriMessageSignatureIssues =
          IssuesManager.SRIMessageSignatureIssue.SRIMessageSignatureIssue.fromInspectorIssue(mockModel, issue);
      assert.lengthOf(sriMessageSignatureIssues, 1);
      const sriMessageSignatureIssue = sriMessageSignatureIssues[0];

      assert.strictEqual(sriMessageSignatureIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepEqual(sriMessageSignatureIssue.details(), issueDetails);
      assert.strictEqual(sriMessageSignatureIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      assert.isNotNull(sriMessageSignatureIssue.getDescription());
    }
  });
});
