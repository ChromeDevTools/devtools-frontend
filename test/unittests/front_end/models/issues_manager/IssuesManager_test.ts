// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as IssuesManagerModule from '../../../../../front_end/models/issues_manager/issues_manager.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {mkInspectorCspIssue, StubIssue, ThirdPartyStubIssue} from './StubIssue.js';
import {MockIssuesModel} from './MockIssuesModel.js';

describeWithEnvironment('IssuesManager', () => {
  let IssuesManager: typeof IssuesManagerModule;
  before(async () => {
    IssuesManager = await import('../../../../../front_end/models/issues_manager/issues_manager.js');
  });

  it('collects issues from an issues model', () => {
    const issue1 = new StubIssue('StubIssue1', ['id1', 'id2'], []);
    const mockModel = new MockIssuesModel([issue1]) as unknown as SDK.IssuesModel.IssuesModel;
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();
    issuesManager.modelAdded(mockModel);

    const dispatchedIssues: IssuesManagerModule.Issue.Issue[] = [];
    issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.IssueAdded, event => dispatchedIssues.push(event.data.issue));

    mockModel.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, inspectorIssue: mkInspectorCspIssue('url1')});
    mockModel.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, inspectorIssue: mkInspectorCspIssue('url2')});

    const expected = ['ContentSecurityPolicyIssue::kURLViolation', 'ContentSecurityPolicyIssue::kURLViolation'];
    assert.deepStrictEqual(dispatchedIssues.map(i => i.code()), expected);

    // The `issue1` should not be present, as it was present before the IssuesManager
    // was instantiated.
    const issueCodes = Array.from(issuesManager.issues()).map(r => r.code());
    assert.deepStrictEqual(issueCodes, expected);
  });

  it('filters third-party issues when the third-party issues setting is false, includes them otherwise', () => {
    const issues = [
      new ThirdPartyStubIssue('AllowedStubIssue1', false),
      new ThirdPartyStubIssue('StubIssue2', true),
      new ThirdPartyStubIssue('AllowedStubIssue3', false),
      new ThirdPartyStubIssue('StubIssue4', true),
    ];

    IssuesManager.Issue.getShowThirdPartyIssuesSetting().set(false);

    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    issuesManager.modelAdded(mockModel);

    const firedIssueAddedEventCodes: string[] = [];
    issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.IssueAdded,
        event => firedIssueAddedEventCodes.push(event.data.issue.code()));

    for (const issue of issues) {
      issuesManager.addIssue(mockModel, issue);
    }

    let issueCodes = Array.from(issuesManager.issues()).map(i => i.code());
    assert.deepStrictEqual(issueCodes, ['AllowedStubIssue1', 'AllowedStubIssue3']);
    assert.deepStrictEqual(firedIssueAddedEventCodes, ['AllowedStubIssue1', 'AllowedStubIssue3']);

    IssuesManager.Issue.getShowThirdPartyIssuesSetting().set(true);

    issueCodes = Array.from(issuesManager.issues()).map(i => i.code());
    assert.deepStrictEqual(issueCodes, ['AllowedStubIssue1', 'StubIssue2', 'AllowedStubIssue3', 'StubIssue4']);
  });

  it('reports issue counts by kind', () => {
    const issue1 = new StubIssue('StubIssue1', ['id1'], [], IssuesManager.Issue.IssueKind.Improvement);
    const issue2 = new StubIssue('StubIssue1', ['id2'], [], IssuesManager.Issue.IssueKind.Improvement);
    const issue3 = new StubIssue('StubIssue1', ['id3'], [], IssuesManager.Issue.IssueKind.BreakingChange);

    const mockModel = new MockIssuesModel([issue1]) as unknown as SDK.IssuesModel.IssuesModel;
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();
    issuesManager.modelAdded(mockModel);

    issuesManager.addIssue(mockModel, issue1);
    issuesManager.addIssue(mockModel, issue2);
    issuesManager.addIssue(mockModel, issue3);

    assert.deepStrictEqual(issuesManager.numberOfIssues(), 3);
    assert.deepStrictEqual(issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.Improvement), 2);
    assert.deepStrictEqual(issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.BreakingChange), 1);
    assert.deepStrictEqual(issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.PageError), 0);
  });
});
