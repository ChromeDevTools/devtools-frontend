// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import type * as BrowserSDKModule from '../../../../front_end/browser_sdk/browser_sdk.js';
import type * as SDKModule from '../../../../front_end/sdk/sdk.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {MockIssuesModel} from '../sdk/MockIssuesModel.js';

describeWithEnvironment('AggregatedIssue', async () => {
  let BrowserSDK: typeof BrowserSDKModule;
  let Issues: typeof IssuesModule;
  let SDK: typeof SDKModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
    BrowserSDK = await import('../../../../front_end/browser_sdk/browser_sdk.js');
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  it('aggregates two TWA issues with same violationType correctly', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDKModule.IssuesModel.IssuesModel;
    const details1 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url1.com',
      httpStatusCode: 500,
    };
    const issue1 = new SDK.TrustedWebActivityIssue.TrustedWebActivityIssue(details1);
    const details2 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url2.com',
      httpStatusCode: 400,
    };
    const issue2 = new SDK.TrustedWebActivityIssue.TrustedWebActivityIssue(details2);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 1);
    const violationType = [...issues[0].trustedWebActivityIssues()].map(r => r.details().violationType).sort();
    assert.deepStrictEqual(violationType, [
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
    ]);
    const httpStatusCode = [...issues[0].trustedWebActivityIssues()].map(r => r.details().httpStatusCode).sort();
    assert.deepStrictEqual(httpStatusCode, [400, 500]);
    const url = [...issues[0].trustedWebActivityIssues()].map(r => r.details().url).sort();
    assert.deepStrictEqual(url, ['test.url1.com', 'test.url2.com']);
  });

  it('TWA issues with different violationType do not aggregate', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDKModule.IssuesModel.IssuesModel;
    const details1 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url1.com',
      httpStatusCode: 500,
    };
    const issue1 = new SDK.TrustedWebActivityIssue.TrustedWebActivityIssue(details1);
    const details2 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline,
      url: 'test.url2.com',
    };
    const issue2 = new SDK.TrustedWebActivityIssue.TrustedWebActivityIssue(details2);
    const details3 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks,
      url: 'test.url3.com',
    };
    const issue3 = new SDK.TrustedWebActivityIssue.TrustedWebActivityIssue(details3);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(
        (mockModel as unknown) as BrowserSDKModule.IssuesManager.IssuesManager);
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});
    mockModel.dispatchEventToListeners(
        BrowserSDK.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue3});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 3);
    const violationType =
        [...issues].map(r => Array.from(r.trustedWebActivityIssues())[0].details().violationType).sort();
    assert.deepStrictEqual(violationType, [
      Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks,
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline,
    ]);
  });
});
