// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';

import * as IssuesManager from './issues_manager.js';

describe('WebInstallIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  const manifestUrl = 'https://example.com/manifest.json';

  for (const [reason, descriptionFile] of [
           [
             Protocol.Audits.WebInstallIssueReason.ManifestParsingOrNetworkError,
             'webInstallManifestParsingOrNetworkError.md',
           ],
           [Protocol.Audits.WebInstallIssueReason.StartUrlInvalid, 'webInstallStartUrlInvalid.md'],
           [
             Protocol.Audits.WebInstallIssueReason.ManifestMissingNameOrShortName,
             'webInstallManifestMissingNameOrShortName.md',
           ],
           [Protocol.Audits.WebInstallIssueReason.ManifestMissingId, 'webInstallManifestMissingId.md'],
  ] as const) {
    it(`creates an issue for ${reason}`, () => {
      const inspectorIssue: Protocol.Audits.InspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.WebInstallIssue,
        details: {webInstallIssueDetails: {manifestUrl, reason}},
      };

      const issues = IssuesManager.WebInstallIssue.WebInstallIssue.fromInspectorIssue(mockModel, inspectorIssue);

      assert.lengthOf(issues, 1);
      assert.strictEqual(issues[0].getCategory(), IssuesManager.Issue.IssueCategory.OTHER);
      assert.strictEqual(issues[0].getKind(), IssuesManager.Issue.IssueKind.PAGE_ERROR);
      const description = issues[0].getDescription();
      assert.exists(description);
      assert.strictEqual(description.file, descriptionFile);
      assert.deepEqual(issues[0].requests(), [{url: manifestUrl}]);
    });
  }

  it('creates a no-manifest issue without an affected request', () => {
    const inspectorIssue: Protocol.Audits.InspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.WebInstallIssue,
      details: {
        webInstallIssueDetails: {
          reason: Protocol.Audits.WebInstallIssueReason.NoManifest,
        },
      },
    };

    const issues = IssuesManager.WebInstallIssue.WebInstallIssue.fromInspectorIssue(mockModel, inspectorIssue);

    assert.lengthOf(issues, 1);
    assert.strictEqual(issues[0].getDescription()?.file, 'webInstallNoManifest.md');
    assert.deepEqual(issues[0].requests(), []);
    assert.strictEqual(issues[0].primaryKey(),
                       JSON.stringify({reason: Protocol.Audits.WebInstallIssueReason.NoManifest}));
  });

  it('rejects an issue without details', () => {
    const inspectorIssue: Protocol.Audits.InspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.WebInstallIssue,
      details: {},
    };
    assert.deepEqual(IssuesManager.WebInstallIssue.WebInstallIssue.fromInspectorIssue(mockModel, inspectorIssue), []);
  });

  it('rejects an issue with an unknown reason', () => {
    const consoleWarn = sinon.stub(console, 'warn');
    const inspectorIssue: Protocol.Audits.InspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.WebInstallIssue,
      details: {
        webInstallIssueDetails: {
          manifestUrl,
          reason: 'UnknownReason' as Protocol.Audits.WebInstallIssueReason,
        },
      },
    };
    const issues = IssuesManager.WebInstallIssue.WebInstallIssue.fromInspectorIssue(mockModel, inspectorIssue);

    assert.lengthOf(issues, 1);
    assert.isNull(issues[0].getDescription());
    sinon.assert.calledOnceWithExactly(consoleWarn, 'Unknown WebInstallIssueReason:', 'UnknownReason');
  });
});
