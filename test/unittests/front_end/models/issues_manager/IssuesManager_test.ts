// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import * as Root from '../../../../../front_end/core/root/root.js';

import {createFakeSetting, enableFeatureForTest} from '../../helpers/EnvironmentHelpers.js';
import {mkInspectorCspIssue, StubIssue, ThirdPartyStubIssue} from './StubIssue.js';
import {MockIssuesModel} from './MockIssuesModel.js';

describe('IssuesManager', () => {
  it('collects issues from an issues model', () => {
    const issue1 = new StubIssue('StubIssue1', ['id1', 'id2'], []);
    const mockModel = new MockIssuesModel([issue1]) as unknown as SDK.IssuesModel.IssuesModel;
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();
    issuesManager.modelAdded(mockModel);

    const dispatchedIssues: IssuesManager.Issue.Issue[] = [];
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

    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', false);
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting);
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

    showThirdPartyIssuesSetting.set(true);

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
  describe('instance', () => {
    it('throws an Error if its not the first instance created with "ensureFirst" set', () => {
      IssuesManager.IssuesManager.IssuesManager.instance();

      assert.throws(() => IssuesManager.IssuesManager.IssuesManager.instance({forceNew: true, ensureFirst: true}));
      assert.throws(() => IssuesManager.IssuesManager.IssuesManager.instance({forceNew: false, ensureFirst: true}));
    });
  });
});

describe('IssuesManager', () => {
  beforeEach(() => {
    enableFeatureForTest('hideIssuesFeature');
  });

  afterEach(() => {
    Root.Runtime.experiments.clearForTest();
  });

  it('hides issues added after setting has been initialised', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];
    const hideIssueByCodeSetting =
        createFakeSetting('hide by code', ({} as IssuesManager.IssuesManager.HideIssueMenuSetting));
    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', true);
    const issuesManager =
        new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting, hideIssueByCodeSetting);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    issuesManager.modelAdded(mockModel);

    const hiddenIssues: string[] = [];
    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.IssueAdded, event => {
      if (event.data.issue.isHidden()) {
        hiddenIssues.push(event.data.issue.code());
      }
    });
    // This Setting can either have been initialised in a previous Devtools session and retained
    // through to a new session.
    // OR
    // These settings have been updated by clicking on "hide issue" and cause the updateHiddenIssues
    // method to be called. These issues are being added to the IssuesManager after this has happened.
    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });

    for (const issue of issues) {
      issuesManager.addIssue(mockModel, issue);
    }

    assert.deepStrictEqual(hiddenIssues, ['HiddenStubIssue1', 'HiddenStubIssue2']);
  });

  it('hides issues present in IssuesManager when setting is updated', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];
    const hideIssueByCodeSetting =
        createFakeSetting('hide by code', ({} as IssuesManager.IssuesManager.HideIssueMenuSetting));
    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', true);
    const issuesManager =
        new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting, hideIssueByCodeSetting);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    issuesManager.modelAdded(mockModel);

    let hiddenIssues: string[] = [];
    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.FullUpdateRequired, () => {
      hiddenIssues = [];
      for (const issue of issuesManager.issues()) {
        if (issue.isHidden()) {
          hiddenIssues.push(issue.code());
        }
      }
    });
    for (const issue of issues) {
      issuesManager.addIssue(mockModel, issue);
    }
    // Setting is updated by clicking on "hide issue".
    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });
    assert.deepStrictEqual(hiddenIssues, ['HiddenStubIssue1']);

    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });
    assert.deepStrictEqual(hiddenIssues, ['HiddenStubIssue1', 'HiddenStubIssue2']);
  });

  it('unhides issues present in IssuesManager when setting is updated', () => {
    enableFeatureForTest('hideIssuesFeature');
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];
    const hideIssueByCodeSetting =
        createFakeSetting('hide by code', ({} as IssuesManager.IssuesManager.HideIssueMenuSetting));
    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', true);
    const issuesManager =
        new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting, hideIssueByCodeSetting);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    issuesManager.modelAdded(mockModel);
    for (const issue of issues) {
      issuesManager.addIssue(mockModel, issue);
    }
    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });
    let UnhiddenIssues: string[] = [];
    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.FullUpdateRequired, () => {
      UnhiddenIssues = [];
      for (const issue of issuesManager.issues()) {
        if (!issue.isHidden()) {
          UnhiddenIssues.push(issue.code());
        }
      }
    });

    // Setting updated by clicking on "unhide issue"
    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Unhidden,
      'UnhiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });
    assert.deepStrictEqual(UnhiddenIssues, ['UnhiddenStubIssue1']);

    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Unhidden,
      'UnhiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Unhidden,
    });
    assert.deepStrictEqual(UnhiddenIssues, ['UnhiddenStubIssue1', 'UnhiddenStubIssue2']);
  });

  it('unhides all issues correctly', () => {
    enableFeatureForTest('hideIssuesFeature');
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];
    const hideIssueByCodeSetting =
        createFakeSetting('hide by code', ({} as IssuesManager.IssuesManager.HideIssueMenuSetting));
    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', true);
    const issuesManager =
        new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting, hideIssueByCodeSetting);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    issuesManager.modelAdded(mockModel);
    for (const issue of issues) {
      issuesManager.addIssue(mockModel, issue);
    }
    hideIssueByCodeSetting.set({
      'HiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'HiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue1': IssuesManager.IssuesManager.IssueStatus.Hidden,
      'UnhiddenStubIssue2': IssuesManager.IssuesManager.IssueStatus.Hidden,
    });
    let UnhiddenIssues: string[] = [];
    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.FullUpdateRequired, () => {
      UnhiddenIssues = [];
      for (const issue of issuesManager.issues()) {
        if (!issue.isHidden()) {
          UnhiddenIssues.push(issue.code());
        }
      }
    });
    issuesManager.unhideAllIssues();
    assert.deepStrictEqual(
        UnhiddenIssues, ['HiddenStubIssue1', 'HiddenStubIssue2', 'UnhiddenStubIssue1', 'UnhiddenStubIssue2']);
  });
});
