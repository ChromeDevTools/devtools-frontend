// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('LazyLoadImageIssue', () => {
  setupLocaleHooks();

  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  function createProtocolIssueWithoutDetails(): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.LazyLoadImageIssue,
      details: {},
    };
  }

  function createProtocolIssueWithDetails(lazyLoadImageIssueDetails: Protocol.Audits.LazyLoadImageIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.LazyLoadImageIssue,
      details: {lazyLoadImageIssueDetails},
    };
  }

  it('creates a lazy load image issue with valid details', () => {
    const issueDetails = {
      nodeId: 42 as Protocol.DOM.BackendNodeId,
      url: 'https://example.com/image.jpg',
      frameId: 'main' as Protocol.Page.FrameId,
    };
    const issue = createProtocolIssueWithDetails(issueDetails);

    const issues = IssuesManager.LazyLoadImageIssue.LazyLoadImageIssue.fromInspectorIssue(mockModel, issue);
    assert.lengthOf(issues, 1);
    const lazyIssue = issues[0];

    assert.strictEqual(lazyIssue.getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
    assert.strictEqual(lazyIssue.primaryKey(), `LazyLoadImageIssue-(42)-(https://example.com/image.jpg)`);
    assert.strictEqual(lazyIssue.getKind(), IssuesManager.Issue.IssueKind.IMPROVEMENT);
    assert.isNotNull(lazyIssue.getDescription());
  });

  it('returns empty array without details', () => {
    const inspectorIssueWithoutDetails = createProtocolIssueWithoutDetails();
    const issues =
        IssuesManager.LazyLoadImageIssue.LazyLoadImageIssue.fromInspectorIssue(mockModel, inspectorIssueWithoutDetails);

    assert.isEmpty(issues);
  });
});
