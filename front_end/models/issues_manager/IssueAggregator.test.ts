// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {MockIssuesManager} from '../../testing/MockIssuesManager.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import {StubIssue} from '../../testing/StubIssue.js';

import * as IssuesManager from './issues_manager.js';

function requestIds(...issues: IssuesManager.IssueAggregator.AggregatedIssue[]): Set<string|undefined> {
  const requestIds = new Set<string|undefined>();
  for (const issue of issues) {
    for (const {requestId} of issue.requests()) {
      requestIds.add(requestId);
    }
  }
  return requestIds;
}

describe('AggregatedIssue', () => {
  const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
  it('deduplicates network requests across issues', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1', 'id2']);
    const issue2 = StubIssue.createFromRequestIds(['id1']);

    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);

    assert.deepEqual(requestIds(aggregatedIssue), new Set(['id1', 'id2']));
  });

  it('deduplicates affected cookies across issues', () => {
    const issue1 = StubIssue.createFromCookieNames(['cookie1']);
    const issue2 = StubIssue.createFromCookieNames(['cookie2']);
    const issue3 = StubIssue.createFromCookieNames(['cookie1', 'cookie2']);

    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);
    aggregatedIssue.addInstance(issue3);

    const actualCookieNames = [...aggregatedIssue.cookies()].map(c => c.name).sort();
    assert.deepEqual(actualCookieNames, ['cookie1', 'cookie2']);
  });
});

function createModel() {
  const model = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  assert.exists(model);
  return model;
}

describe('IssueAggregator', () => {
  it('deduplicates issues with the same code', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1']);
    const issue2 = StubIssue.createFromRequestIds(['id2']);

    const model = createModel();
    const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue2});

    assert.deepEqual(requestIds(...aggregator.aggregatedIssues()), new Set(['id1', 'id2']));
  });

  it('deduplicates issues with the same code added before its creation', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1']);
    const issue2 = StubIssue.createFromRequestIds(['id2']);
    const issue1b = StubIssue.createFromRequestIds(['id1']);  // Duplicate id.
    const issue3 = StubIssue.createFromRequestIds(['id3']);

    const model = createModel();
    const mockManager =
        new MockIssuesManager([issue1b, issue3]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue2});

    assert.deepEqual(requestIds(...aggregator.aggregatedIssues()), new Set(['id1', 'id2', 'id3']));
  });

  it('keeps issues with different codes separate', () => {
    const issue1 = new StubIssue('codeA', ['id1'], []);
    const issue2 = new StubIssue('codeB', ['id1'], []);
    const issue1b = new StubIssue('codeC', ['id1'], []);
    const issue3 = new StubIssue('codeA', ['id1'], []);

    const model = createModel();
    const mockManager =
        new MockIssuesManager([issue1b, issue3]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.lengthOf(issues, 3);
    const issueCodes = issues.map(r => r.aggregationKey().toString()).sort((a, b) => a.localeCompare(b));
    assert.deepEqual(issueCodes, ['codeA', 'codeB', 'codeC']);
  });

  describe('aggregates issue kind', () => {
    it('for a single issue', () => {
      const issues = StubIssue.createFromIssueKinds([IssuesManager.Issue.IssueKind.IMPROVEMENT]);

      const mockManager = new MockIssuesManager(issues) as unknown as IssuesManager.IssuesManager.IssuesManager;
      const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);

      const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
      assert.lengthOf(aggregatedIssues, 1);
      const aggregatedIssue = aggregatedIssues[0];
      assert.strictEqual(aggregatedIssue.getKind(), IssuesManager.Issue.IssueKind.IMPROVEMENT);
    });

    it('for issues of two different kinds', () => {
      const issues = StubIssue.createFromIssueKinds([
        IssuesManager.Issue.IssueKind.IMPROVEMENT,
        IssuesManager.Issue.IssueKind.BREAKING_CHANGE,
        IssuesManager.Issue.IssueKind.IMPROVEMENT,
      ]);

      const mockManager = new MockIssuesManager(issues) as unknown as IssuesManager.IssuesManager.IssuesManager;
      const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);

      const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
      assert.lengthOf(aggregatedIssues, 1);
      const aggregatedIssue = aggregatedIssues[0];
      assert.strictEqual(aggregatedIssue.getKind(), IssuesManager.Issue.IssueKind.BREAKING_CHANGE);
    });

    it('for issues of three different kinds', () => {
      const issues = StubIssue.createFromIssueKinds([
        IssuesManager.Issue.IssueKind.BREAKING_CHANGE,
        IssuesManager.Issue.IssueKind.PAGE_ERROR,
        IssuesManager.Issue.IssueKind.IMPROVEMENT,
      ]);

      const mockManager = new MockIssuesManager(issues) as unknown as IssuesManager.IssuesManager.IssuesManager;
      const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);

      const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
      assert.lengthOf(aggregatedIssues, 1);
      const aggregatedIssue = aggregatedIssues[0];
      assert.strictEqual(aggregatedIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    });
  });
});

describe('IssueAggregator', () => {
  it('aggregates heavy ad issues correctly', () => {
    const model = createModel();
    const details1 = {
      resolution: Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked,
      reason: Protocol.Audits.HeavyAdReason.CpuPeakLimit,
      frame: {frameId: 'main' as Protocol.Page.FrameId},
    };
    const issue1 = new IssuesManager.HeavyAdIssue.HeavyAdIssue(details1, model);
    const details2 = {
      resolution: Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning,
      reason: Protocol.Audits.HeavyAdReason.NetworkTotalLimit,
      frame: {frameId: 'main' as Protocol.Page.FrameId},
    };
    const issue2 = new IssuesManager.HeavyAdIssue.HeavyAdIssue(details2, model);

    const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.lengthOf(issues, 1);
    const resolutions = [...issues[0].getHeavyAdIssues()].map(r => r.details().resolution).sort();
    assert.deepEqual(resolutions, [
      Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked,
      Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning,
    ]);
  });

  const scriptId1 = '1' as Protocol.Runtime.ScriptId;

  describe('IssueAggregator', () => {
    it('aggregates affected locations correctly', () => {
      const model = createModel();
      const issue1 = StubIssue.createFromAffectedLocations([{url: 'foo', lineNumber: 1, columnNumber: 1}]);
      const issue2 = StubIssue.createFromAffectedLocations([
        {url: 'foo', lineNumber: 1, columnNumber: 1},
        {url: 'foo', lineNumber: 1, columnNumber: 12},
      ]);
      const issue3 = StubIssue.createFromAffectedLocations([
        {url: 'bar', lineNumber: 1, columnNumber: 1},
        {url: 'baz', lineNumber: 1, columnNumber: 1},
      ]);
      const issue4 = StubIssue.createFromAffectedLocations([
        {url: 'bar', lineNumber: 1, columnNumber: 1, scriptId: scriptId1},
        {url: 'foo', lineNumber: 2, columnNumber: 1},
      ]);

      const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
      const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(mockManager);
      for (const issue of [issue1, issue2, issue3, issue4]) {
        mockManager.dispatchEventToListeners(
            IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: model, issue});
      }

      const issues = Array.from(aggregator.aggregatedIssues());
      assert.lengthOf(issues, 1);
      const locations = [...issues[0].sources()].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
      assert.deepEqual(locations, [
        {url: 'bar', lineNumber: 1, columnNumber: 1, scriptId: scriptId1},
        {url: 'bar', lineNumber: 1, columnNumber: 1},
        {url: 'baz', lineNumber: 1, columnNumber: 1},
        {url: 'foo', lineNumber: 1, columnNumber: 1},
        {url: 'foo', lineNumber: 1, columnNumber: 12},
        {url: 'foo', lineNumber: 2, columnNumber: 1},
      ]);
    });
  });
});

describe('IssueAggregator', () => {
  let issuesManager: MockIssuesManager;
  let aggregator: IssuesManager.IssueAggregator.IssueAggregator;

  beforeEach(() => {
    issuesManager = new MockIssuesManager([]);
    aggregator = new IssuesManager.IssueAggregator.IssueAggregator(issuesManager);
  });

  it('aggregates hidden issues correctly', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];

    for (const issue of issues) {
      if (issue.code().includes('Hidden')) {
        issue.setHidden(true);
      }
      issuesManager.addIssue(issue);
    }
    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 2);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 2);
  });

  it('aggregates hidden issues correctly on updating settings', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];

    issues[0].setHidden(true);
    for (const issue of issues) {
      issuesManager.addIssue(issue);
    }

    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 3);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 1);

    issues[1].setHidden(true);

    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.FULL_UPDATE_REQUIRED);

    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 2);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 2);
  });

  it('aggregates hidden issues correctly when issues get unhidden', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];

    for (const issue of issues) {
      issue.setHidden(true);
      issuesManager.addIssue(issue);
    }

    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 4);
    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 0);

    issues[2].setHidden(false);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.FULL_UPDATE_REQUIRED);
    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 1);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 3);
  });

  it('aggregates hidden issues correctly when all issues get unhidden', () => {
    const issues = [
      new StubIssue('HiddenStubIssue1', [], []),
      new StubIssue('HiddenStubIssue2', [], []),
      new StubIssue('UnhiddenStubIssue1', [], []),
      new StubIssue('UnhiddenStubIssue2', [], []),
    ];

    for (const issue of issues) {
      issue.setHidden(true);
      issuesManager.addIssue(issue);
    }

    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 4);
    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 0);

    for (const issue of issues) {
      issue.setHidden(false);
    }

    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.FULL_UPDATE_REQUIRED);

    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 4);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 0);
  });
});

describe('IssueAggregator', () => {
  function getTestCookieIssue(
      warningReason?: Protocol.Audits.CookieWarningReason,
      exclusionReason?: Protocol.Audits.CookieExclusionReason): IssuesManager.Issue.Issue {
    return IssuesManager.IssuesManager.createIssuesFromProtocolIssue(model, {
      code: Protocol.Audits.InspectorIssueCode.CookieIssue,
      details: {
        cookieIssueDetails: {
          cookie: {
            name: 'test',
            path: '/',
            domain: 'a.test',
          },
          cookieExclusionReasons: exclusionReason ? [exclusionReason] : [],
          cookieWarningReasons: warningReason ? [warningReason] : [],
          operation: Protocol.Audits.CookieOperation.ReadCookie,
          cookieUrl: 'a.test',
        },
      },
    })[0];
  }

  let issuesManager: MockIssuesManager;
  let model: SDK.IssuesModel.IssuesModel;

  beforeEach(() => {
    issuesManager = new MockIssuesManager([]);
    model = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  });
  it('should not aggregate third-party cookie phaseout or mitigation related issues', async () => {
    // Preexisting issues should not be added
    const issues = [
      getTestCookieIssue(Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata),
      getTestCookieIssue(Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic),
      getTestCookieIssue(Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout),
      getTestCookieIssue(undefined, Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout)
    ];
    for (const issue of issues) {
      issuesManager.addIssue(issue as StubIssue);
    }
    const aggregator = new IssuesManager.IssueAggregator.IssueAggregator(issuesManager);

    for (const issue of issues) {
      issuesManager.addIssue(issue as StubIssue);
    }

    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 0);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 0);

    // But other cookie issues should get aggregated
    issuesManager.addIssue(getTestCookieIssue(Protocol.Audits.CookieWarningReason.WarnDomainNonASCII) as StubIssue);
    issuesManager.addIssue(
        getTestCookieIssue(undefined, Protocol.Audits.CookieExclusionReason.ExcludeDomainNonASCII) as StubIssue);

    assert.strictEqual(aggregator.numberOfAggregatedIssues(), 2);
    assert.strictEqual(aggregator.numberOfHiddenAggregatedIssues(), 0);
  });
});
