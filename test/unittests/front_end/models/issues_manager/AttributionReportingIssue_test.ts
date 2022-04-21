// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';

import {MockIssuesModel} from './MockIssuesModel.js';

describe('AttributionReportingIssue', () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  function createProtocolIssueWithDetails(
      attributionReportingIssueDetails: Protocol.Audits.AttributionReportingIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.AttributionReportingIssue,
      details: {attributionReportingIssueDetails},
    };
  }

  it('creates different frontend issues for the same AttributionSourceUntrustworthyOrigin protocol issue', () => {
    const violationType = Protocol.Audits.AttributionReportingIssueType.AttributionSourceUntrustworthyOrigin;
    const withFrameDetails = {violationType, frame: {frameId: 'frameId1' as Protocol.Page.FrameId}};
    const withoutFrameDetails = {violationType};

    const frontendIssueWithFrame = IssuesManager.AttributionReportingIssue.AttributionReportingIssue.fromInspectorIssue(
        mockModel, createProtocolIssueWithDetails(withFrameDetails));
    const frontendIssueWithoutFrame =
        IssuesManager.AttributionReportingIssue.AttributionReportingIssue.fromInspectorIssue(
            mockModel, createProtocolIssueWithDetails(withoutFrameDetails));

    assert.notStrictEqual(frontendIssueWithFrame[0].code(), frontendIssueWithoutFrame[0].code());
  });

  it('creates different frontend issues for the same AttributionUntrustworthyOrigin protocol issue', () => {
    const violationType = Protocol.Audits.AttributionReportingIssueType.AttributionUntrustworthyOrigin;
    const withFrameDetails = {violationType, frame: {frameId: 'frameId1' as Protocol.Page.FrameId}};
    const withoutFrameDetails = {violationType};

    const frontendIssueWithFrame = IssuesManager.AttributionReportingIssue.AttributionReportingIssue.fromInspectorIssue(
        mockModel, createProtocolIssueWithDetails(withFrameDetails));
    const frontendIssueWithoutFrame =
        IssuesManager.AttributionReportingIssue.AttributionReportingIssue.fromInspectorIssue(
            mockModel, createProtocolIssueWithDetails(withoutFrameDetails));

    assert.notStrictEqual(frontendIssueWithFrame[0].code(), frontendIssueWithoutFrame[0].code());
  });
});
