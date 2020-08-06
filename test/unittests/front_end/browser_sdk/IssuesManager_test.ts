// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../front_end/sdk/sdk.js';
import * as BrowserSDK from '../../../../front_end/browser_sdk/browser_sdk.js';

import {resetSettingsStorage} from '../common/SettingsHelper.js';
import {StubIssue, ThirdPartyStubIssue} from '../sdk/StubIssue.js';
import {MockIssuesModel} from '../sdk/MockIssuesModel.js';

describe('IssuesManager', () => {
  it('collects issues from am issues model', () => {
    const issue1 = new StubIssue('StubIssue1', ['id1', 'id2'], []);
    const issue2 = new StubIssue('StubIssue2', ['id1', 'id2'], []);
    const issue2_1 = new StubIssue('StubIssue2', ['id1', 'id2'], ['id3']);

    const mockModel = new MockIssuesModel([issue1]);
    const issuesManager = new BrowserSDK.IssuesManager.IssuesManager();
    issuesManager.modelAdded(mockModel as unknown as SDK.IssuesModel.IssuesModel);

    const dispatchedIssues: SDK.Issue.Issue[] = [];
    issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.IssueAdded, event => dispatchedIssues.push(event.data.issue));

    mockModel.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    mockModel.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, issue: issue2_1});

    assert.deepStrictEqual(dispatchedIssues.map(i => i.code()), ['StubIssue2', 'StubIssue2']);

    // The `issue1` should not be present, as it was present before the IssuesManager
    // was instantiated.
    const issueCodes = Array.from(issuesManager.issues()).map(r => r.code());
    assert.deepStrictEqual(issueCodes, ['StubIssue2', 'StubIssue2']);
  });

  beforeEach(resetSettingsStorage);
  afterEach(resetSettingsStorage);

  it('filters third-party issues when the third-party issues setting is false, includes them otherwise', () => {
    const issues = [
      new ThirdPartyStubIssue('AllowedStubIssue1', false),
      new ThirdPartyStubIssue('StubIssue2', true),
      new ThirdPartyStubIssue('AllowedStubIssue3', false),
      new ThirdPartyStubIssue('StubIssue4', true),
    ];

    SDK.Issue.getShowThirdPartyIssuesSetting().set(false);

    const issuesManager = new BrowserSDK.IssuesManager.IssuesManager();
    const mockModel = new MockIssuesModel([]);
    issuesManager.modelAdded(mockModel as unknown as SDK.IssuesModel.IssuesModel);

    const firedIssueAddedEventCodes: string[] = [];
    issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.IssueAdded, event => firedIssueAddedEventCodes.push(event.data.issue.code()));

    for (const issue of issues) {
      mockModel.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, issue: issue});
    }

    let issueCodes = Array.from(issuesManager.issues()).map(i => i.code());
    assert.deepStrictEqual(issueCodes, ['AllowedStubIssue1', 'AllowedStubIssue3']);
    assert.deepStrictEqual(firedIssueAddedEventCodes, ['AllowedStubIssue1', 'AllowedStubIssue3']);

    SDK.Issue.getShowThirdPartyIssuesSetting().set(true);

    issueCodes = Array.from(issuesManager.issues()).map(i => i.code());
    assert.deepStrictEqual(issueCodes, ['AllowedStubIssue1', 'StubIssue2', 'AllowedStubIssue3', 'StubIssue4']);
  });
});
