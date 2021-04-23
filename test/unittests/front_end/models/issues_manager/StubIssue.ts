// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Issue, IssueCategory, IssueKind} from '../../../../../front_end/models/issues_manager/Issue.js';  // eslint-disable-line rulesdir/es_modules_import

export class StubIssue extends Issue {
  private requestIds: string[];
  private cookieNames: string[];
  private issueKind: IssueKind;

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

  requests() {
    return this.requestIds.map(id => {
      return {requestId: id, url: ''};
    });
  }

  getCategory() {
    return IssueCategory.Other;
  }

  getKind() {
    return this.issueKind;
  }

  cookies() {
    return this.cookieNames.map(name => {
      return {name, domain: '', path: ''};
    });
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
}

export class ThirdPartyStubIssue extends StubIssue {
  private isThirdParty: boolean;

  constructor(code: string, isThirdParty: boolean) {
    super(code, [], []);
    this.isThirdParty = isThirdParty;
  }

  isCausedByThirdParty() {
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
