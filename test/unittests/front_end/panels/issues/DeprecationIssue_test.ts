// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../models/issues_manager/MockIssuesManager.js';

describeWithLocale('DeprecationIssue', async () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const mockManager = new MockIssuesManager([]) as unknown as IssuesManager.IssuesManager.IssuesManager;

  function createDeprecationIssue(message: string, deprecationType: string, type: Protocol.Audits.DeprecationIssueType):
      IssuesManager.DeprecationIssue.DeprecationIssue {
    return new IssuesManager.DeprecationIssue.DeprecationIssue(
        {
          sourceCodeLocation: {
            url: 'empty.html',
            lineNumber: 1,
            columnNumber: 1,
          },
          message,
          deprecationType,
          type,
        },
        mockModel);
  }

  function createDeprecationIssueDetails(
      message: string, deprecationType: string,
      type: Protocol.Audits.DeprecationIssueType): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      details: {
        deprecationIssueDetails: {
          sourceCodeLocation: {
            url: 'empty.html',
            lineNumber: 1,
            columnNumber: 1,
          },
          message,
          deprecationType,
          type,
        },
      },
    };
  }

  it('deprecation issue with good translated details works', () => {
    const details = createDeprecationIssueDetails('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isNotEmpty(issue);
  });

  it('deprecation issue with bad translated details fails', () => {
    const details =
        createDeprecationIssueDetails('Test', 'Test', Protocol.Audits.DeprecationIssueType.DeprecationExample);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isEmpty(issue);
  });

  it('deprecation issue with good untranslated details works', () => {
    const details = createDeprecationIssueDetails('Test', 'Test', Protocol.Audits.DeprecationIssueType.Untranslated);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isNotEmpty(issue);
  });

  it('deprecation issue with bad untranslated details fails', () => {
    const details = createDeprecationIssueDetails('', '', Protocol.Audits.DeprecationIssueType.Untranslated);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isEmpty(issue);
  });

  it('aggregates untranslated issues with the same type', () => {
    const issues = [
      createDeprecationIssue('Message A', 'Type A', Protocol.Audits.DeprecationIssueType.Untranslated),
      createDeprecationIssue('Message B', 'Type A', Protocol.Audits.DeprecationIssueType.Untranslated),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 1);
    const deprecationIssues = Array.from(aggregatedIssues[0].getDeprecationIssues());
    assert.strictEqual(deprecationIssues.length, 2);
  });

  it('does not aggregate untranslated issues with different types', () => {
    const issues = [
      createDeprecationIssue('Message A', 'Type A', Protocol.Audits.DeprecationIssueType.Untranslated),
      createDeprecationIssue('Message B', 'Type B', Protocol.Audits.DeprecationIssueType.Untranslated),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 2);
  });

  it('does not aggregate translated and untranslated issues', () => {
    const issues = [
      createDeprecationIssue('Message A', 'Type A', Protocol.Audits.DeprecationIssueType.Untranslated),
      createDeprecationIssue('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 2);
  });

  it('aggregates translated issues with the same type', () => {
    const issues = [
      createDeprecationIssue('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample),
      createDeprecationIssue('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 1);
    const deprecationIssues = Array.from(aggregatedIssues[0].getDeprecationIssues());
    assert.strictEqual(deprecationIssues.length, 2);
  });

  it('does not aggregate translated issues with different types', () => {
    const issues = [
      createDeprecationIssue('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample),
      // TODO(crbug.com/1264960): Use a real translated type here once one exists.
      createDeprecationIssue('', '', Protocol.Audits.DeprecationIssueType.Untranslated),
    ];
    const aggregator = new Issues.IssueAggregator.IssueAggregator(mockManager);
    for (const issue of issues) {
      mockManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.IssueAdded, {issuesModel: mockModel, issue});
    }
    const aggregatedIssues = Array.from(aggregator.aggregatedIssues());
    assert.strictEqual(aggregatedIssues.length, 2);
  });
});
