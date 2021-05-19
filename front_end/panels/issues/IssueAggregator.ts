// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Protocol from '../../generated/protocol.js';

/**
 * An `AggregatedIssue` representes a number of `IssuesManager.Issue.Issue` objects that are displayed together.
 * Currently only grouping by issue code, is supported. The class provides helpers to support displaying
 * of all resources that are affected by the aggregated issues.
 */
export class AggregatedIssue extends IssuesManager.Issue.Issue {
  private affectedCookies: Map<string, {
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }>;
  private affectedRequests: Map<string, Protocol.Audits.AffectedRequest>;
  private affectedLocations: Map<string, Protocol.Audits.SourceCodeLocation>;
  private heavyAdIssues: Set<IssuesManager.HeavyAdIssue.HeavyAdIssue>;
  private blockedByResponseDetails: Map<string, Protocol.Audits.BlockedByResponseIssueDetails>;
  private corsIssues: Set<IssuesManager.CorsIssue.CorsIssue>;
  private cspIssues: Set<IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>;
  private issueKind: IssuesManager.Issue.IssueKind;
  private lowContrastIssues: Set<IssuesManager.LowTextContrastIssue.LowTextContrastIssue>;
  private mixedContentIssues: Set<IssuesManager.MixedContentIssue.MixedContentIssue>;
  private sharedArrayBufferIssues: Set<IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue>;
  private trustedWebActivityIssues: Set<IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue>;
  private quirksModeIssues: Set<IssuesManager.QuirksModeIssue.QuirksModeIssue>;
  private representative: IssuesManager.Issue.Issue|null;
  private aggregatedIssuesCount: number;

  constructor(code: string) {
    super(code);
    this.affectedCookies = new Map();
    this.affectedRequests = new Map();
    this.affectedLocations = new Map();
    this.heavyAdIssues = new Set();
    this.blockedByResponseDetails = new Map();
    this.corsIssues = new Set();
    this.cspIssues = new Set();
    this.issueKind = IssuesManager.Issue.IssueKind.Improvement;
    this.lowContrastIssues = new Set();
    this.mixedContentIssues = new Set();
    this.sharedArrayBufferIssues = new Set();
    this.trustedWebActivityIssues = new Set();
    this.quirksModeIssues = new Set();
    this.representative = null;
    this.aggregatedIssuesCount = 0;
  }

  primaryKey(): string {
    throw new Error('This should never be called');
  }

  getBlockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return this.blockedByResponseDetails.values();
  }

  cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    return Array.from(this.affectedCookies.values()).map(x => x.cookie);
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    return this.affectedLocations.values();
  }

  cookiesWithRequestIndicator(): Iterable<{
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }> {
    return this.affectedCookies.values();
  }

  getHeavyAdIssues(): Iterable<IssuesManager.HeavyAdIssue.HeavyAdIssue> {
    return this.heavyAdIssues;
  }

  getMixedContentIssues(): Iterable<IssuesManager.MixedContentIssue.MixedContentIssue> {
    return this.mixedContentIssues;
  }

  getTrustedWebActivityIssues(): Iterable<IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue> {
    return this.trustedWebActivityIssues;
  }

  getCorsIssues(): Set<IssuesManager.CorsIssue.CorsIssue> {
    return this.corsIssues;
  }

  getCspIssues(): Iterable<IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue> {
    return this.cspIssues;
  }

  getLowContrastIssues(): Iterable<IssuesManager.LowTextContrastIssue.LowTextContrastIssue> {
    return this.lowContrastIssues;
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.affectedRequests.values();
  }

  getSharedArrayBufferIssues(): Iterable<IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue> {
    return this.sharedArrayBufferIssues;
  }

  getQuirksModeIssues(): Iterable<IssuesManager.QuirksModeIssue.QuirksModeIssue> {
    return this.quirksModeIssues;
  }

  getDescription(): IssuesManager.MarkdownIssueDescription.MarkdownIssueDescription|null {
    if (this.representative) {
      return this.representative.getDescription();
    }
    return null;
  }

  getCategory(): IssuesManager.Issue.IssueCategory {
    if (this.representative) {
      return this.representative.getCategory();
    }
    return IssuesManager.Issue.IssueCategory.Other;
  }

  getAggregatedIssuesCount(): number {
    return this.aggregatedIssuesCount;
  }

  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   */
  private keyForCookie(cookie: Protocol.Audits.AffectedCookie): string {
    const {domain, path, name} = cookie;
    return `${domain};${path};${name}`;
  }

  addInstance(issue: IssuesManager.Issue.Issue): void {
    this.aggregatedIssuesCount++;
    if (!this.representative) {
      this.representative = issue;
    }
    this.issueKind = IssuesManager.Issue.unionIssueKind(this.issueKind, issue.getKind());
    let hasRequest = false;
    for (const request of issue.requests()) {
      hasRequest = true;
      if (!this.affectedRequests.has(request.requestId)) {
        this.affectedRequests.set(request.requestId, request);
      }
    }
    for (const cookie of issue.cookies()) {
      const key = this.keyForCookie(cookie);
      if (!this.affectedCookies.has(key)) {
        this.affectedCookies.set(key, {cookie, hasRequest});
      }
    }
    for (const location of issue.sources()) {
      const key = JSON.stringify(location);
      if (!this.affectedLocations.has(key)) {
        this.affectedLocations.set(key, location);
      }
    }
    if (issue instanceof IssuesManager.MixedContentIssue.MixedContentIssue) {
      this.mixedContentIssues.add(issue);
    }
    if (issue instanceof IssuesManager.HeavyAdIssue.HeavyAdIssue) {
      this.heavyAdIssues.add(issue);
    }
    for (const details of issue.getBlockedByResponseDetails()) {
      const key = JSON.stringify(details, ['parentFrame', 'blockedFrame', 'requestId', 'frameId', 'reason', 'request']);
      this.blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof IssuesManager.TrustedWebActivityIssue.TrustedWebActivityIssue) {
      this.trustedWebActivityIssues.add(issue);
    }
    if (issue instanceof IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this.cspIssues.add(issue);
    }
    if (issue instanceof IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue) {
      this.sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof IssuesManager.LowTextContrastIssue.LowTextContrastIssue) {
      this.lowContrastIssues.add(issue);
    }
    if (issue instanceof IssuesManager.CorsIssue.CorsIssue) {
      this.corsIssues.add(issue);
    }
    if (issue instanceof IssuesManager.QuirksModeIssue.QuirksModeIssue) {
      this.quirksModeIssues.add(issue);
    }
  }

  getKind(): IssuesManager.Issue.IssueKind {
    return this.issueKind;
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper {
  private aggregatedIssuesByCode: Map<string, AggregatedIssue>;
  private issuesManager: IssuesManager.IssuesManager.IssuesManager;

  constructor(issuesManager: IssuesManager.IssuesManager.IssuesManager) {
    super();
    this.aggregatedIssuesByCode = new Map();
    this.issuesManager = issuesManager;
    this.issuesManager.addEventListener(IssuesManager.IssuesManager.Events.IssueAdded, this.onIssueAdded, this);
    this.issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.FullUpdateRequired, this.onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.aggregateIssue(issue);
    }
  }

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issue} = (event.data as {
      issuesModel: SDK.IssuesModel.IssuesModel,
      issue: IssuesManager.Issue.Issue,
    });
    this.aggregateIssue(issue);
  }

  private onFullUpdateRequired(): void {
    this.aggregatedIssuesByCode.clear();
    for (const issue of this.issuesManager.issues()) {
      this.aggregateIssue(issue);
    }
    this.dispatchEventToListeners(Events.FullUpdateRequired);
  }

  private aggregateIssue(issue: IssuesManager.Issue.Issue): AggregatedIssue {
    let aggregatedIssue = this.aggregatedIssuesByCode.get(issue.code());
    if (!aggregatedIssue) {
      aggregatedIssue = new AggregatedIssue(issue.code());
      this.aggregatedIssuesByCode.set(issue.code(), aggregatedIssue);
    }
    aggregatedIssue.addInstance(issue);
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
    return aggregatedIssue;
  }

  aggregatedIssues(): Iterable<AggregatedIssue> {
    return this.aggregatedIssuesByCode.values();
  }

  numberOfAggregatedIssues(): number {
    return this.aggregatedIssuesByCode.size;
  }
}

export const enum Events {
  AggregatedIssueUpdated = 'AggregatedIssueUpdated',
  FullUpdateRequired = 'FullUpdateRequired',
}
