// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';
import {MockIssuesManager} from '../../models/issues_manager/MockIssuesManager.js';

describe('AggregatedIssue', async () => {
  it('aggregates two TWA issues with same violationType correctly', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const details1 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url1.com',
      httpStatusCode: 500,
    };
    const issue1 = new IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue(details1);
    const details2 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url2.com',
      httpStatusCode: 400,
    };
    const issue2 = new IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue(details2);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 1);
    const violationType = [...issues[0].getTrustedWebActivityIssues()].map(r => r.details().violationType).sort();
    assert.deepStrictEqual(violationType, [
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
    ]);
    const httpStatusCode = [...issues[0].getTrustedWebActivityIssues()].map(r => r.details().httpStatusCode).sort();
    assert.deepStrictEqual(httpStatusCode, [400, 500]);
    const url = [...issues[0].getTrustedWebActivityIssues()].map(r => r.details().url).sort();
    assert.deepStrictEqual(url, ['test.url1.com', 'test.url2.com']);
  });

  it('TWA issues with different violationType do not aggregate', () => {
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;
    const details1 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      url: 'test.url1.com',
      httpStatusCode: 500,
    };
    const issue1 = new IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue(details1);
    const details2 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline,
      url: 'test.url2.com',
    };
    const issue2 = new IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue(details2);
    const details3 = {
      violationType: Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks,
      url: 'test.url3.com',
    };
    const issue3 = new IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue(details3);

    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue1});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue2});
    mockManager.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue: issue3});

    const issues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(issues.length, 3);
    const violationType =
        [...issues].map(r => Array.from(r.getTrustedWebActivityIssues())[0].details().violationType).sort();
    assert.deepStrictEqual(violationType, [
      Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks,
      Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
      Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline,
    ]);
  });
});
