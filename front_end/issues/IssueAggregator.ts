// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/**
 * An `AggregatedIssue` representes a number of `SDK.Issue.Issue` objects that are displayed together.
 * Currently only grouping by issue code, is supported. The class provides helpers to support displaying
 * of all resources that are affected by the aggregated issues.
 */
export class AggregatedIssue extends SDK.Issue.Issue {
  private affectedCookies: Map<string, {
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }>;
  private affectedRequests: Map<string, Protocol.Audits.AffectedRequest>;
  private heavyAdIssueDetails: Map<string, Protocol.Audits.HeavyAdIssueDetails>;
  private blockedByResponseDetails: Map<string, Protocol.Audits.BlockedByResponseIssueDetails>;
  private corsIssues: Set<SDK.CorsIssue.CorsIssue>;
  private cspIssues: Set<SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>;
  private lowContrastIssues: Set<SDK.LowTextContrastIssue.LowTextContrastIssue>;
  private mixedContentIssues: Set<SDK.MixedContentIssue.MixedContentIssue>;
  private sharedArrayBufferIssues: Set<SDK.SharedArrayBufferIssue.SharedArrayBufferIssue>;
  private trustedWebActivityIssues: Set<SDK.TrustedWebActivityIssue.TrustedWebActivityIssue>;
  private representative: SDK.Issue.Issue|null;
  private aggregatedIssuesCount: number;

  constructor(code: string) {
    super(code);
    this.affectedCookies = new Map();
    this.affectedRequests = new Map();
    this.heavyAdIssueDetails = new Map();
    this.blockedByResponseDetails = new Map();
    this.corsIssues = new Set();
    this.cspIssues = new Set();
    this.lowContrastIssues = new Set();
    this.mixedContentIssues = new Set();
    this.sharedArrayBufferIssues = new Set();
    this.trustedWebActivityIssues = new Set();
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

  cookiesWithRequestIndicator(): Iterable<{
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }> {
    return this.affectedCookies.values();
  }

  heavyAds(): Iterable<Protocol.Audits.HeavyAdIssueDetails> {
    return this.heavyAdIssueDetails.values();
  }

  getMixedContentIssues(): Iterable<SDK.MixedContentIssue.MixedContentIssue> {
    return this.mixedContentIssues.values();
  }

  getTrustedWebActivityIssues(): Iterable<SDK.TrustedWebActivityIssue.TrustedWebActivityIssue> {
    return this.trustedWebActivityIssues;
  }

  getCorsIssues(): Iterable<SDK.CorsIssue.CorsIssue> {
    return this.corsIssues;
  }

  getCspIssues(): Iterable<SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue> {
    return this.cspIssues;
  }

  getLowContrastIssues(): Iterable<SDK.LowTextContrastIssue.LowTextContrastIssue> {
    return this.lowContrastIssues;
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.affectedRequests.values();
  }

  getSharedArrayBufferIssues(): Iterable<SDK.SharedArrayBufferIssue.SharedArrayBufferIssue> {
    return this.sharedArrayBufferIssues;
  }

  getDescription(): SDK.Issue.MarkdownIssueDescription|null {
    if (this.representative) {
      return this.representative.getDescription();
    }
    return null;
  }

  getCategory(): symbol {
    if (this.representative) {
      return this.representative.getCategory();
    }
    return SDK.Issue.IssueCategory.Other;
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

  addInstance(issue: SDK.Issue.Issue): void {
    this.aggregatedIssuesCount++;
    if (!this.representative) {
      this.representative = issue;
    }
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
    if (issue instanceof SDK.MixedContentIssue.MixedContentIssue) {
      this.mixedContentIssues.add(issue);
    }
    for (const heavyAds of issue.heavyAds()) {
      const key = JSON.stringify(heavyAds);
      this.heavyAdIssueDetails.set(key, heavyAds);
    }
    for (const details of issue.getBlockedByResponseDetails()) {
      const key = JSON.stringify(details, ['parentFrame', 'blockedFrame', 'requestId', 'frameId', 'reason', 'request']);
      this.blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof SDK.TrustedWebActivityIssue.TrustedWebActivityIssue) {
      this.trustedWebActivityIssues.add(issue);
    }
    if (issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this.cspIssues.add(issue);
    }
    if (issue instanceof SDK.SharedArrayBufferIssue.SharedArrayBufferIssue) {
      this.sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof SDK.LowTextContrastIssue.LowTextContrastIssue) {
      this.lowContrastIssues.add(issue);
    }
    if (issue instanceof SDK.CorsIssue.CorsIssue) {
      this.corsIssues.add(issue);
    }
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper {
  private aggregatedIssuesByCode: Map<string, AggregatedIssue>;
  private issuesManager: BrowserSDK.IssuesManager.IssuesManager;

  constructor(issuesManager: BrowserSDK.IssuesManager.IssuesManager) {
    super();
    this.aggregatedIssuesByCode = new Map();
    this.issuesManager = issuesManager;
    this.issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssueAdded, this.onIssueAdded, this);
    this.issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.FullUpdateRequired, this.onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.aggregateIssue(issue);
    }
  }

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issue} = (event.data as {
      issuesModel: SDK.IssuesModel.IssuesModel,
      issue: SDK.Issue.Issue,
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

  private aggregateIssue(issue: SDK.Issue.Issue): AggregatedIssue {
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
