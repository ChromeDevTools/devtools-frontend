// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

function createProtocolIssue(sharedDictionaryIssueDetails: Protocol.Audits.SharedDictionaryIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.SharedDictionaryIssue,
    details: {sharedDictionaryIssueDetails},
  };
}

describeWithLocale('SharedDictionaryIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created for various error reasons', () => {
    const errorReasons = [
      Protocol.Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest,
      Protocol.Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure,
      Protocol.Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed,
      Protocol.Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader,
      Protocol.Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest,
      Protocol.Audits.SharedDictionaryError.WriteErrorDisallowedBySettings,
      Protocol.Audits.SharedDictionaryError.WriteErrorExpiredResponse,
      Protocol.Audits.SharedDictionaryError.WriteErrorFeatureDisabled,
      Protocol.Audits.SharedDictionaryError.WriteErrorInsufficientResources,
      Protocol.Audits.SharedDictionaryError.WriteErrorInvalidMatchField,
      Protocol.Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader,
      Protocol.Audits.SharedDictionaryError.WriteErrorNavigationRequest,
      Protocol.Audits.SharedDictionaryError.WriteErrorNoMatchField,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonListMatchDestField,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonSecureContext,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonStringIdField,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonStringMatchField,
      Protocol.Audits.SharedDictionaryError.WriteErrorNonTokenTypeField,
      Protocol.Audits.SharedDictionaryError.WriteErrorRequestAborted,
      Protocol.Audits.SharedDictionaryError.WriteErrorShuttingDown,
      Protocol.Audits.SharedDictionaryError.WriteErrorTooLongIdField,
      Protocol.Audits.SharedDictionaryError.WriteErrorUnsupportedType,
    ];
    for (const errorReason of errorReasons) {
      const issueDetails = {
        sharedDictionaryError: errorReason,
        request: {
          requestId: 'test-request-id' as Protocol.Network.RequestId,
          url: 'https://example.com/',
        },
      };
      const issue = createProtocolIssue(issueDetails);
      const sharedDictionaryIssues =
          IssuesManager.SharedDictionaryIssue.SharedDictionaryIssue.fromInspectorIssue(mockModel, issue);
      assert.lengthOf(sharedDictionaryIssues, 1);
      const sharedDictionaryIssue = sharedDictionaryIssues[0];

      assert.strictEqual(sharedDictionaryIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.deepStrictEqual(sharedDictionaryIssue.details(), issueDetails);
      assert.strictEqual(sharedDictionaryIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      assert.isNotNull(sharedDictionaryIssue.getDescription());
    }
  });
});
