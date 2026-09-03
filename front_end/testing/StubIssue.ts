// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../generated/protocol.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';

export class StubIssue extends IssuesManager.Issue.Issue {
  private requestIds: string[];
  private cookieNames: string[];
  private issueKind: IssuesManager.Issue.IssueKind;
  private locations: Protocol.Audits.SourceCodeLocation[] = [];
  private mockIssueId?: Protocol.Audits.IssueId;
  private mockIssueCategory?: IssuesManager.Issue.IssueCategory;

  constructor(
      code: string, requestIds: string[], cookieNames: string[],
      issueKind: IssuesManager.Issue.IssueKind = IssuesManager.Issue.IssueKind.IMPROVEMENT) {
    super(code, null);
    this.requestIds = requestIds;
    this.cookieNames = cookieNames;
    this.issueKind = issueKind;
  }

  getDescription(): IssuesManager.MarkdownIssueDescription.MarkdownIssueDescription {
    return {
      file: '',
      links: [],
    };
  }

  primaryKey(): string {
    return `${this.code()}-(${this.cookieNames.join(';')})-(${this.requestIds.join(';')})`;
  }

  override requests(): Protocol.Audits.AffectedRequest[] {
    return this.requestIds.map(id => {
      return {requestId: id as Protocol.Network.RequestId, url: ''};
    });
  }

  getCategory(): IssuesManager.Issue.IssueCategory {
    return this.mockIssueCategory ? this.mockIssueCategory : IssuesManager.Issue.IssueCategory.OTHER;
  }

  override sources(): Protocol.Audits.SourceCodeLocation[] {
    return this.locations;
  }

  getKind(): IssuesManager.Issue.IssueKind {
    return this.issueKind;
  }

  override cookies(): Protocol.Audits.AffectedCookie[] {
    return this.cookieNames.map(name => {
      return {name, domain: '', path: ''};
    });
  }

  override getIssueId(): Protocol.Audits.IssueId|undefined {
    return this.mockIssueId;
  }

  static createFromRequestIds(requestIds: string[]): StubIssue {
    return new StubIssue('StubIssue', requestIds, []);
  }

  static createFromCookieNames(cookieNames: string[]): StubIssue {
    return new StubIssue('StubIssue', [], cookieNames);
  }

  static createFromIssueKinds(issueKinds: IssuesManager.Issue.IssueKind[]): StubIssue[] {
    return issueKinds.map(k => new StubIssue('StubIssue', [], [], k));
  }

  static createFromAffectedLocations(locations: Protocol.Audits.SourceCodeLocation[]): StubIssue {
    const issue = new StubIssue('StubIssue', [], []);
    issue.locations = locations;
    return issue;
  }

  static createFromIssueId(issueId: Protocol.Audits.IssueId): StubIssue {
    const issue = new StubIssue('StubIssue', [], []);
    issue.mockIssueId = issueId;
    return issue;
  }

  static createCookieIssue(code: string): StubIssue {
    const issue = new StubIssue(code, [], []);
    issue.mockIssueCategory = IssuesManager.Issue.IssueCategory.COOKIE;
    return issue;
  }
}

export class ThirdPartyStubIssue extends StubIssue {
  private isThirdParty: boolean;

  constructor(code: string, isThirdParty: boolean) {
    super(code, [], []);
    this.isThirdParty = isThirdParty;
  }

  override isCausedByThirdParty(): boolean {
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
