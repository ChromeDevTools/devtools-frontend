// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describeWithLocale('GenericIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  function createProtocolIssueWithoutDetails(): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {},
    };
  }

  function createProtocolIssueWithDetails(genericIssueDetails: Protocol.Audits.GenericIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {genericIssueDetails},
    };
  }

  beforeEach(() => {
    // The component warns if not provided with an issue that has details, but
    // we don't need that noise in the test output.
    sinon.stub(console, 'warn');
  });

  it('adds an incorrect form label use issue with valid details', () => {
    const issueDetails = {
      errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
      frameId: 'main' as Protocol.Page.FrameId,
      violatingNodeId: 1 as Protocol.DOM.BackendNodeId,
      violatingNodeAttribute: 'attribute',
    };
    const issue = createProtocolIssueWithDetails(issueDetails);

    const genericIssues = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, issue);
    assert.strictEqual(genericIssues.length, 1);
    const genericIssue = genericIssues[0];

    assert.strictEqual(genericIssue.getCategory(), IssuesManager.Issue.IssueCategory.GENERIC);
    assert.strictEqual(
        genericIssue.primaryKey(),
        `GenericIssue::FormLabelForNameError-(${'main' as Protocol.Page.FrameId})-(1)-(attribute)-(no-request)`);
    assert.strictEqual(genericIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    assert.isNotNull(genericIssue.getDescription());
  });

  it('adds an incorrect form label use issue without details', () => {
    const inspectorIssueWithoutGenericDetails = createProtocolIssueWithoutDetails();
    const genericIssues =
        IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssueWithoutGenericDetails);

    assert.isEmpty(genericIssues);
  });

  it('adds a CORB/ORB issue with valid details', () => {
    const issueDetails = {
      errorType: Protocol.Audits.GenericIssueErrorType.ResponseWasBlockedByORB,
      request: {requestId: 'blabla'} as Protocol.Audits.AffectedRequest,
    };
    const issue = createProtocolIssueWithDetails(issueDetails);

    const genericIssues = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, issue);
    assert.strictEqual(genericIssues.length, 1);
    const genericIssue = genericIssues[0];

    assert.strictEqual(genericIssue.getCategory(), IssuesManager.Issue.IssueCategory.GENERIC);
    assert.strictEqual(
        genericIssue.primaryKey(),
        'GenericIssue::ResponseWasBlockedByORB-(undefined)-(undefined)-(undefined)-(blabla)');
    assert.strictEqual(genericIssue.getKind(), IssuesManager.Issue.IssueKind.IMPROVEMENT);
    assert.isNotNull(genericIssue.getDescription());
  });
});
