// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('ConnectionAllowlistIssue', () => {
  setupLocaleHooks();

  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  it('can be created from an inspector issue', () => {
    const details: Protocol.Audits.ConnectionAllowlistIssueDetails = {
      error: Protocol.Audits.ConnectionAllowlistError.InvalidHeader,
      request: {
        requestId: 'n1' as Protocol.Network.RequestId,
        url: 'https://example.com',
      },
    };
    const inspectorIssue: Protocol.Audits.InspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.ConnectionAllowlistIssue,
      details: {
        connectionAllowlistIssueDetails: details,
      },
    };

    const issues =
        IssuesManager.ConnectionAllowlistIssue.ConnectionAllowlistIssue.fromInspectorIssue(mockModel, inspectorIssue);
    assert.lengthOf(issues, 1);
    assert.strictEqual(issues[0].code(), 'ConnectionAllowlistIssue::InvalidHeader');
  });

  it('correctly creates descriptions for all error types', () => {
    const errors = [
      Protocol.Audits.ConnectionAllowlistError.InvalidHeader,
      Protocol.Audits.ConnectionAllowlistError.MoreThanOneList,
      Protocol.Audits.ConnectionAllowlistError.ItemNotInnerList,
      Protocol.Audits.ConnectionAllowlistError.InvalidAllowlistItemType,
      Protocol.Audits.ConnectionAllowlistError.ReportingEndpointNotToken,
      Protocol.Audits.ConnectionAllowlistError.InvalidUrlPattern,
    ];

    for (const error of errors) {
      const details: Protocol.Audits.ConnectionAllowlistIssueDetails = {
        error,
        request: {
          requestId: 'n1' as Protocol.Network.RequestId,
          url: 'https://example.com',
        },
      };
      const issue = new IssuesManager.ConnectionAllowlistIssue.ConnectionAllowlistIssue(details, mockModel);
      const description = issue.getDescription();
      assert.exists(description, `Description for ${error} should exist`);
      assert.strictEqual(description?.file, `connectionAllowlist${error}.md`);
    }
  });
});
