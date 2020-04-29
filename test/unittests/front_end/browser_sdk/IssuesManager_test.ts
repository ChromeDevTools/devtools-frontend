// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../front_end/sdk/sdk.js';
import {StubIssue} from '../sdk/StubIssue.js';
import {IssuesManager, Events as IssuesManagerEvents} from '../../../../front_end/browser_sdk/IssuesManager.js';
import {MockIssuesModel} from '../sdk/MockIssuesModel.js';

describe('IssuesManager', () => {
  it('collects issues from am issues model', () => {
    const issue1 = new StubIssue('StubIssue1', ['id1', 'id2'], []);
    const issue2 = new StubIssue('StubIssue2', ['id1', 'id2'], []);
    const issue2_1 = new StubIssue('StubIssue2', ['id1', 'id2'], ['id3']);

    const mockModel = new MockIssuesModel([issue1]);
    const issuesManager = new IssuesManager();
    issuesManager.modelAdded((mockModel as any) as SDK.IssuesModel.IssuesModel);

    const dispatchedIssues: SDK.Issue.Issue[] = [];
    issuesManager.addEventListener(IssuesManagerEvents.IssueAdded, event => dispatchedIssues.push(event.data.issue));

    mockModel.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    mockModel.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: mockModel, issue: issue2_1});

    assert.deepStrictEqual(dispatchedIssues.map(i => i.code()), ['StubIssue2', 'StubIssue2']);

    // The `issue1` should not be present, as it was present before the IssuesManager
    // was instantiated.
    const issueCodes = Array.from(issuesManager.issues()).map(r => r.code());
    assert.deepStrictEqual(issueCodes, ['StubIssue2', 'StubIssue2']);
  });
});
