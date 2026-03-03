// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';

import * as IssuesManager from './issues_manager.js';

describeWithEnvironment('SelectivePermissionsInterventionIssue', () => {
  setupLocaleHooks();

  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const mockTarget = {
    id: () => 'fake-id',
    isDisposed: () => false,
    model: () => null,
  };
  mockModel.target = () => mockTarget as unknown as SDK.Target.Target;

  function createProtocolIssueWithDetails(
      selectivePermissionsInterventionIssueDetails: Protocol.Audits.SelectivePermissionsInterventionIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue,
      details: {selectivePermissionsInterventionIssueDetails},
    };
  }

  const issueDetails = {
    apiName: 'geolocation',
    stackTrace: {
      callFrames: [
        {
          functionName: 'foo',
          scriptId: '1' as Protocol.Runtime.ScriptId,
          url: 'https://example.com/foo.js',
          lineNumber: 10,
          columnNumber: 5,
        },
      ],
    },
    adAncestry: {
      adAncestryChain: [
        {
          scriptId: '2' as Protocol.Runtime.ScriptId,
          debuggerId: '123' as Protocol.Runtime.UniqueDebuggerId,
          name: 'https://ads.com/ad.js',
        },
      ],
      rootScriptFilterlistRule: '||ads.com^',
    },
  };

  it('correctly creates an issue with valid details', () => {
    const issue = createProtocolIssueWithDetails(issueDetails);

    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 1);
    const interventionIssue = interventionIssues[0];

    assert.strictEqual(
        interventionIssue.getCategory(), IssuesManager.Issue.IssueCategory.SELECTIVE_PERMISSIONS_INTERVENTION);
    assert.strictEqual(interventionIssue.getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
    const description = interventionIssue.getDescription();
    assert.strictEqual(description?.file, 'selectivePermissionsIntervention.md');
    assert.lengthOf(description?.links || [], 1);
    assert.strictEqual(description?.links[0].link, 'https://crbug.com/435223477');
    assert.deepEqual(Array.from([interventionIssue.details()]), [issueDetails]);
  });

  it('generates a stable primary key', () => {
    const issue = createProtocolIssueWithDetails(issueDetails);
    const interventionIssue1 =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue)[0];
    const interventionIssue2 =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue)[0];

    assert.strictEqual(interventionIssue1.primaryKey(), interventionIssue2.primaryKey());
  });

  it('generates different primary keys for different details', () => {
    const issue1 = createProtocolIssueWithDetails(issueDetails);
    const issue2 = createProtocolIssueWithDetails({...issueDetails, apiName: 'microphone'});
    const interventionIssue1 =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue1)[0];
    const interventionIssue2 =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue2)[0];

    assert.notStrictEqual(interventionIssue1.primaryKey(), interventionIssue2.primaryKey());
  });

  it('handles missing optional fields', () => {
    const issueDetailsMinimal = {
      apiName: 'geolocation',
      adAncestry: {
        adAncestryChain: [],
      },
    } as Protocol.Audits.SelectivePermissionsInterventionIssueDetails;
    const issue = createProtocolIssueWithDetails(issueDetailsMinimal);

    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 1);
    const interventionIssue = interventionIssues[0];

    assert.deepEqual(Array.from([interventionIssue.details()]), [issueDetailsMinimal]);
  });

  it('returns an empty array when details are missing', () => {
    const issue = {
      code: Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue,
      details: {},
    };
    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 0);
  });
});
