// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../../front_end/generated/protocol.js';
// eslint-disable-next-line rulesdir/es_modules_import
import {
  Issue,
  IssueCategory,
  IssueKind,
} from '../../../../../front_end/models/issues_manager/Issue.js';

export class StubIssue extends Issue {
  private requestIds: string[];
  private cookieNames: string[];
  private issueKind: IssueKind;
  private locations: Protocol.Audits.SourceCodeLocation[] = [];
  private mockIssueId?: Protocol.Audits.IssueId;

  constructor(code: string, requestIds: string[], cookieNames: string[], issueKind = IssueKind.Improvement) {
    super(code);
    this.requestIds = requestIds;
    this.cookieNames = cookieNames;
    this.issueKind = issueKind;
  }

  getDescription() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({} as any);
  }

  primaryKey(): string {
    return `${this.code()}-(${this.cookieNames.join(';')})-(${this.requestIds.join(';')})`;
  }

  override requests() {
    return this.requestIds.map(id => {
      return {requestId: id as Protocol.Network.RequestId, url: ''};
    });
  }

  getCategory() {
    return IssueCategory.Other;
  }

  override sources() {
    return this.locations;
  }

  getKind() {
    return this.issueKind;
  }

  override cookies() {
    return this.cookieNames.map(name => {
      return {name, domain: '', path: ''};
    });
  }

  override getIssueId() {
    return this.mockIssueId;
  }

  static createFromRequestIds(requestIds: string[]) {
    return new StubIssue('StubIssue', requestIds, []);
  }

  static createFromCookieNames(cookieNames: string[]) {
    return new StubIssue('StubIssue', [], cookieNames);
  }

  static createFromIssueKinds(issueKinds: IssueKind[]) {
    return issueKinds.map(k => new StubIssue('StubIssue', [], [], k));
  }

  static createFromAffectedLocations(locations: Protocol.Audits.SourceCodeLocation[]) {
    const issue = new StubIssue('StubIssue', [], []);
    issue.locations = locations;
    return issue;
  }

  static createFromIssueId(issueId: Protocol.Audits.IssueId) {
    const issue = new StubIssue('StubIssue', [], []);
    issue.mockIssueId = issueId;
    return issue;
  }
}

export class ThirdPartyStubIssue extends StubIssue {
  private isThirdParty: boolean;

  constructor(code: string, isThirdParty: boolean) {
    super(code, [], []);
    this.isThirdParty = isThirdParty;
  }

  override isCausedByThirdParty() {
    return this.isThirdParty;
  }
}

export function mkInspectorCspIssue(blockedURL: string): Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
    details: {
      contentSecurityPolicyIssueDetails: {
        isReportOnly: true,
        violatedDirective: 'testdirective',
        contentSecurityPolicyViolationType: Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation,
        blockedURL,
      },
    },
  };
}
