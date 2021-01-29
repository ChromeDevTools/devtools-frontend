// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import type * as BrowserSDKModule from '../../../../front_end/browser_sdk/browser_sdk.js';
import type * as SDKModule from '../../../../front_end/sdk/sdk.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {StubIssue} from '../sdk/StubIssue.js';
import {MockIssuesModel} from '../sdk/MockIssuesModel.js';

describeWithEnvironment('AggregatedIssue', async () => {
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
  });

  it('deduplicates network requests across issues', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1', 'id2']);
    const issue2 = StubIssue.createFromRequestIds(['id1']);

    const aggregatedIssue = new Issues.IssueAggregator.AggregatedIssue('code');
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);

    const actualRequestIds = [...aggregatedIssue.requests()].map(r => r.requestId).sort();
    assert.deepStrictEqual(actualRequestIds, ['id1', 'id2']);
  });

  it('deduplicates affected cookies across issues', () => {
    const issue1 = StubIssue.createFromCookieNames(['cookie1']);
    const issue2 = StubIssue.createFromCookieNames(['cookie2']);
    const issue3 = StubIssue.createFromCookieNames(['cookie1', 'cookie2']);

    const aggregatedIssue = new Issues.IssueAggregator.AggregatedIssue('code');
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);
    aggregatedIssue.addInstance(issue3);

    const actualCookieNames = [...aggregatedIssue.cookies()].map(c => c.name).sort();
    assert.deepStrictEqual(actualCookieNames, ['cookie1', 'cookie2']);
  });
});

describeWithEnvironment('IssueAggregator', async () => {
  let BrowserSDK: typeof BrowserSDKModule;
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
    BrowserSDK = await import('../../../../front_end/browser_sdk/browser_sdk.js');
  });

  it('deduplicates issues with the same code', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1']);
    const issue2 = StubIssue.createFromRequestIds(['id2']);

    const mockModel = new MockIssuesModel([]);
    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 1);
    const requestIds = [...issues[0].requests()].map(r => r.requestId).sort();
    assert.deepStrictEqual(requestIds, ['id1', 'id2']);
  });

  it('deduplicates issues with the same code added before its creation', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1']);
    const issue2 = StubIssue.createFromRequestIds(['id2']);
    const issue1_2 = StubIssue.createFromRequestIds(['id1']);  // Duplicate id.
    const issue3 = StubIssue.createFromRequestIds(['id3']);

    const mockModel = new MockIssuesModel([issue1_2, issue3]);
    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 1);
    const requestIds = [...issues[0].requests()].map(r => r.requestId).sort();
    assert.deepStrictEqual(requestIds, ['id1', 'id2', 'id3']);
  });

  it('keeps issues with different codes separate', () => {
    const issue1 = new StubIssue('codeA', ['id1'], []);
    const issue2 = new StubIssue('codeB', ['id1'], []);
    const issue1_2 = new StubIssue('codeC', ['id1'], []);
    const issue3 = new StubIssue('codeA', ['id1'], []);

    const mockModel = new MockIssuesModel([issue1_2, issue3]);
    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 3);
    const issueCodes = issues.map(r => r.code()).sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(issueCodes, ['codeA', 'codeB', 'codeC']);
  });
});

describeWithEnvironment('IssueAggregator', async () => {
  let BrowserSDK: typeof BrowserSDKModule;
  let Issues: typeof IssuesModule;
  let SDK: typeof SDKModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
    BrowserSDK = await import('../../../../front_end/browser_sdk/browser_sdk.js');
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  it('aggregates heavy ad issues correctly', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDKModule.IssuesModel.IssuesModel;
    const details1 = {
      resolution: Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked,
      reason: Protocol.Audits.HeavyAdReason.CpuPeakLimit,
      frame: {frameId: 'main'},
    };
    const issue1 = new SDK.HeavyAdIssue.HeavyAdIssue(details1, mockModel);
    const details2 = {
      resolution: Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning,
      reason: Protocol.Audits.HeavyAdReason.NetworkTotalLimit,
      frame: {frameId: 'main'},
    };
    const issue2 = new SDK.HeavyAdIssue.HeavyAdIssue(details2, mockModel);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 1);
    const resolutions = [...issues[0].heavyAds()].map(r => r.resolution).sort();
    assert.deepStrictEqual(resolutions, [
      Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked,
      Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning,
    ]);
  });
});
