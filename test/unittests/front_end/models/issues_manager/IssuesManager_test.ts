// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';

import {createFakeSetting, createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';
import {mkInspectorCspIssue, StubIssue, ThirdPartyStubIssue} from './StubIssue.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';

describeWithMockConnection('IssuesManager', () => {
  let target: SDK.Target.Target;
  let model: SDK.IssuesModel.IssuesModel;

  beforeEach(() => {
    target = createTarget();
    const maybeModel = target.model(SDK.IssuesModel.IssuesModel);
    assertNotNullOrUndefined(maybeModel);
    model = maybeModel;
  });

  it('collects issues from an issues model', () => {
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();

    const dispatchedIssues: IssuesManager.Issue.Issue[] = [];
    issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.IssueAdded, event => dispatchedIssues.push(event.data.issue));

    model.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: model, inspectorIssue: mkInspectorCspIssue('url1')});
    model.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: model, inspectorIssue: mkInspectorCspIssue('url2')});

    const expected = ['ContentSecurityPolicyIssue::kURLViolation', 'ContentSecurityPolicyIssue::kURLViolation'];
    assert.deepStrictEqual(dispatchedIssues.map(i => i.code()), expected);

    const issueCodes = Array.from(issuesManager.issues()).map(r => r.code());
    assert.deepStrictEqual(issueCodes, expected);
  });

  function getBlockedUrl(issue: IssuesManager.Issue.Issue): string|undefined {
    const cspIssue = issue as IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue;
    return cspIssue.details().blockedURL;
  }

  function assertOutOfScopeIssuesAreFiltered():
      {issuesManager: IssuesManager.IssuesManager.IssuesManager, prerenderTarget: SDK.Target.Target} {
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();

    const dispatchedIssues: IssuesManager.Issue.Issue[] = [];
    issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.IssueAdded, event => dispatchedIssues.push(event.data.issue));

    model.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: model, inspectorIssue: mkInspectorCspIssue('url1')});
    const prerenderTarget = createTarget({subtype: 'prerender'});
    const prerenderModel = prerenderTarget.model(SDK.IssuesModel.IssuesModel);
    assertNotNullOrUndefined(prerenderModel);
    prerenderModel.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: prerenderModel, inspectorIssue: mkInspectorCspIssue('url2')});

    const expected = ['url1'];
    assert.deepStrictEqual(dispatchedIssues.map(getBlockedUrl), expected);

    assert.deepStrictEqual(Array.from(issuesManager.issues()).map(getBlockedUrl), expected);
    return {issuesManager, prerenderTarget};
  }

  it('updates filtered issues when switching scope', () => {
    const {issuesManager, prerenderTarget} = assertOutOfScopeIssuesAreFiltered();

    SDK.TargetManager.TargetManager.instance().setScopeTarget(prerenderTarget);
    assert.deepStrictEqual(Array.from(issuesManager.issues()).map(getBlockedUrl), ['url2']);
  });

  it('keeps issues of prerendered page upon activation', () => {
    const {issuesManager, prerenderTarget} = assertOutOfScopeIssuesAreFiltered();

    const resourceTreeModel = prerenderTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    const frame = {url: 'http://example.com/', resourceTreeModel: () => resourceTreeModel} as
        SDK.ResourceTreeModel.ResourceTreeFrame;

    SDK.TargetManager.TargetManager.instance().setScopeTarget(prerenderTarget);
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Activation});
    assert.deepStrictEqual(Array.from(issuesManager.issues()).map(getBlockedUrl), ['url2']);
  });

  const updatesOnPrimaryPageChange = (primary: boolean) => () => {
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();

    model.dispatchEventToListeners(
        SDK.IssuesModel.Events.IssueAdded, {issuesModel: model, inspectorIssue: mkInspectorCspIssue('url1')});
    assert.strictEqual(issuesManager.numberOfIssues(), 1);

    const FRAME = {
      id: 'main',
      loaderId: 'test',
      url: 'http://example.com',
      securityOrigin: 'http://example.com',
      mimeType: 'text/html',
    };
    if (primary) {
      dispatchEvent(target, 'Page.frameNavigated', {frame: FRAME});
    } else {
      const prerenderTarget = createTarget({subtype: 'prerender'});
      dispatchEvent(prerenderTarget, 'Page.frameNavigated', {frame: FRAME});
    }
    assert.strictEqual(issuesManager.numberOfIssues(), primary ? 0 : 1);
  };

  it('clears issues after primary page navigation', updatesOnPrimaryPageChange(true));
  it('does not clear issues after non-primary page navigation', updatesOnPrimaryPageChange(false));

  it('filters third-party issues when the third-party issues setting is false, includes them otherwise', () => {
    const issues = [
      new ThirdPartyStubIssue('AllowedStubIssue1', false),
      new ThirdPartyStubIssue('StubIssue2', true),
      new ThirdPartyStubIssue('AllowedStubIssue3', false),
      new ThirdPartyStubIssue('StubIssue4', true),
    ];

    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', false);
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager(showThirdPartyIssuesSetting);

    const firedIssueAddedEventCodes: string[] = [];
    issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.IssueAdded,
        event => firedIssueAddedEventCodes.push(event.data.issue.code()));

    for (const issue of issues) {
      issuesManager.addIssue(model, issue);
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

    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();

    issuesManager.addIssue(model, issue1);
    issuesManager.addIssue(model, issue2);
    issuesManager.addIssue(model, issue3);

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
      issuesManager.addIssue(model, issue);
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
      issuesManager.addIssue(model, issue);
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
    for (const issue of issues) {
      issuesManager.addIssue(model, issue);
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
    for (const issue of issues) {
      issuesManager.addIssue(model, issue);
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

  it('send update event on scope change', async () => {
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();

    const updateRequired = issuesManager.once(IssuesManager.IssuesManager.Events.FullUpdateRequired);
    const anotherTarget = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
    await updateRequired;
  });

  it('clears BounceTrackingIssue only on user-initiated navigation', () => {
    const issuesManager = new IssuesManager.IssuesManager.IssuesManager();
    const issue = {
      code: Protocol.Audits.InspectorIssueCode.BounceTrackingIssue,
      details: {
        bounceTrackingIssueDetails: {
          trackingSites: ['example_1.test'],
        },
      },
    };

    model.dispatchEventToListeners(SDK.IssuesModel.Events.IssueAdded, {issuesModel: model, inspectorIssue: issue});
    assert.strictEqual(issuesManager.numberOfIssues(), 1);

    dispatchEvent(target, 'Network.requestWillBeSent', {
      requestId: 'requestId1',
      loaderId: 'loaderId1',
      request: {url: 'http://example.com'},
      hasUserGesture: false,
    } as unknown as Protocol.Network.RequestWillBeSentEvent);
    const frame1 = {
      id: 'main',
      loaderId: 'loaderId1',
      url: 'http://example.com',
      securityOrigin: 'http://example.com',
      mimeType: 'text/html',
    };
    dispatchEvent(target, 'Page.frameNavigated', {frame: frame1});
    assert.strictEqual(issuesManager.numberOfIssues(), 1);

    dispatchEvent(target, 'Network.requestWillBeSent', {
      requestId: 'requestId2',
      loaderId: 'loaderId2',
      request: {url: 'http://example.com/page'},
      hasUserGesture: true,
    } as unknown as Protocol.Network.RequestWillBeSentEvent);
    const frame2 = {
      id: 'main',
      loaderId: 'loaderId2',
      url: 'http://example.com/page',
      securityOrigin: 'http://example.com',
      mimeType: 'text/html',
    };
    dispatchEvent(target, 'Page.frameNavigated', {frame: frame2});
    assert.strictEqual(issuesManager.numberOfIssues(), 0);
  });
});
