// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {createFakeSetting, createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Security from './security.js';

function getTestCookieIssue(
    readCookie?: boolean, exclusionReason?: Protocol.Audits.CookieExclusionReason,
    warningReason?: Protocol.Audits.CookieWarningReason, cookieName?: string): Protocol.Audits.InspectorIssue {
  // if no exclusion or warning reason provided, use a default
  if (!exclusionReason && !warningReason) {
    exclusionReason = Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout;
  }

  return {
    code: Protocol.Audits.InspectorIssueCode.CookieIssue,
    details: {
      cookieIssueDetails: {
        cookie: {
          name: cookieName + 'test',
          path: '/',
          domain: 'a.' + cookieName + 'test',
        },
        cookieExclusionReasons: exclusionReason ? [exclusionReason] : [],
        cookieWarningReasons: warningReason ? [warningReason] : [],
        operation: readCookie ? Protocol.Audits.CookieOperation.ReadCookie : Protocol.Audits.CookieOperation.SetCookie,
        cookieUrl: 'a.' + cookieName + 'test',
      },
    },
  };
}

describeWithMockConnection('CookieReportView', () => {
  let mockView: sinon.SinonStub;

  beforeEach(() => {
    mockView = sinon.stub();
    createTarget();
    const showThirdPartyIssuesSetting = createFakeSetting('third party flag', true);
    IssuesManager.IssuesManager.IssuesManager.instance({
      forceNew: false,
      ensureFirst: false,
      showThirdPartyIssuesSetting,
    });
  });

  it('should contain no rows if no issues were created', async () => {
    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);

    assert.strictEqual(view.gridData.length, 0);
  });

  it('should have row when there was a preexisting cookie issue', async () => {
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue());

    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);
    await view.pendingUpdate();

    assert.strictEqual(view.gridData.length, 1);
  });

  it('should add row when issue added after view creation', async () => {
    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 0);

    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue());

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 1);
  });

  it('should ignore non-third-party-cookie related exclusionReason', async () => {
    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);

    // @ts-ignore
    globalThis.addIssueForTest(
        getTestCookieIssue(undefined, Protocol.Audits.CookieExclusionReason.ExcludeSameSiteNoneInsecure));

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 0);

    // Make sure ExcludeThirdPartyPhaseout (default) is added.
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue());

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 1);
    assert.strictEqual(view.gridData[0].data.status, 'Blocked');
  });

  it('should ignore non-third-party-cookie related warningReason', async () => {
    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);

    // @ts-ignore
    globalThis.addIssueForTest(
        getTestCookieIssue(undefined, undefined, Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax));

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 0);

    // Make sure warning 3pc warning reasons are added
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue(
        undefined, undefined, Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata, 'metadata'));
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue(
        undefined, undefined, Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic, 'heuristic'));
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue(
        undefined, undefined, Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout, 'phaseout'));

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 3);
    assert.strictEqual(view.gridData[0].data.status, 'Allowed By Exception');
    assert.strictEqual(view.gridData[1].data.status, 'Allowed By Exception');
    assert.strictEqual(view.gridData[2].data.status, 'Allowed');
  });

  it('should only have a single entry for same cookie with a read and a write operations', async () => {
    const view = new Security.CookieReportView.CookieReportView(undefined, mockView);

    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue(true));
    // @ts-ignore
    globalThis.addIssueForTest(getTestCookieIssue(false));

    await view.pendingUpdate();
    assert.strictEqual(view.gridData.length, 1);
  });
});
