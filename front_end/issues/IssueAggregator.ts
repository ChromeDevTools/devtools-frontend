// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/**
 * An `AggregatedIssue` representes a number of `SDK.Issue.Issue` objects that are displayed together.
 * Currently only grouping by issue code, is supported. The class provides helpers to support displaying
 * of all resources that are affected by the aggregated issues.
 */
export class AggregatedIssue extends SDK.Issue.Issue {
  _cookies: Map<string, {
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }>;
  _requests: Map<string, Protocol.Audits.AffectedRequest>;
  _representative: SDK.Issue.Issue|null;
  _mixedContents: Map<string, Protocol.Audits.MixedContentIssueDetails>;
  _heavyAdIssueDetails: Map<string, Protocol.Audits.HeavyAdIssueDetails>;
  _cspIssues: Set<SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>;
  _lowContrastIssues: Set<SDK.LowTextContrastIssue.LowTextContrastIssue>;
  _blockedByResponseDetails: Map<string, Protocol.Audits.BlockedByResponseIssueDetails>;
  _trustedWebActivityIssues: Set<SDK.TrustedWebActivityIssue.TrustedWebActivityIssue>;
  _aggregatedIssuesCount: number;
  _sharedArrayBufferIssues: Set<SDK.SharedArrayBufferIssue.SharedArrayBufferIssue>;
  _corsIssues: Set<SDK.CorsIssue.CorsIssue>;

  constructor(code: string) {
    super(code);
    this._cookies = new Map();
    this._requests = new Map();
    this._representative = null;
    this._mixedContents = new Map();
    this._heavyAdIssueDetails = new Map();
    this._cspIssues = new Set();
    this._lowContrastIssues = new Set();
    this._blockedByResponseDetails = new Map();
    this._trustedWebActivityIssues = new Set();
    this._aggregatedIssuesCount = 0;
    this._sharedArrayBufferIssues = new Set();
    this._corsIssues = new Set();
  }

  primaryKey(): string {
    throw new Error('This should never be called');
  }

  blockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return this._blockedByResponseDetails.values();
  }

  cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    return Array.from(this._cookies.values()).map(x => x.cookie);
  }

  cookiesWithRequestIndicator(): Iterable<{
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }> {
    return this._cookies.values();
  }

  heavyAds(): Iterable<Protocol.Audits.HeavyAdIssueDetails> {
    return this._heavyAdIssueDetails.values();
  }

  mixedContents(): Iterable<Protocol.Audits.MixedContentIssueDetails> {
    return this._mixedContents.values();
  }

  trustedWebActivityIssues(): Iterable<SDK.TrustedWebActivityIssue.TrustedWebActivityIssue> {
    return this._trustedWebActivityIssues;
  }

  corsIssues(): Iterable<SDK.CorsIssue.CorsIssue> {
    return this._corsIssues;
  }

  cspIssues(): Iterable<SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue> {
    return this._cspIssues;
  }

  lowContrastIssues(): Iterable<SDK.LowTextContrastIssue.LowTextContrastIssue> {
    return this._lowContrastIssues;
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this._requests.values();
  }

  sharedArrayBufferIssues(): Iterable<SDK.SharedArrayBufferIssue.SharedArrayBufferIssue> {
    return this._sharedArrayBufferIssues;
  }

  getDescription(): SDK.Issue.MarkdownIssueDescription|null {
    if (this._representative) {
      return this._representative.getDescription();
    }
    return null;
  }

  getCategory(): symbol {
    if (this._representative) {
      return this._representative.getCategory();
    }
    return SDK.Issue.IssueCategory.Other;
  }

  getAggregatedIssuesCount(): number {
    return this._aggregatedIssuesCount;
  }

  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   */
  _keyForCookie(cookie: Protocol.Audits.AffectedCookie): string {
    const {domain, path, name} = cookie;
    return `${domain};${path};${name}`;
  }

  addInstance(issue: SDK.Issue.Issue): void {
    this._aggregatedIssuesCount++;
    if (!this._representative) {
      this._representative = issue;
    }
    let hasRequest = false;
    for (const request of issue.requests()) {
      hasRequest = true;
      if (!this._requests.has(request.requestId)) {
        this._requests.set(request.requestId, request);
      }
    }
    for (const cookie of issue.cookies()) {
      const key = this._keyForCookie(cookie);
      if (!this._cookies.has(key)) {
        this._cookies.set(key, {cookie, hasRequest});
      }
    }
    for (const mixedContent of issue.mixedContents()) {
      const key = JSON.stringify(mixedContent);
      this._mixedContents.set(key, mixedContent);
    }
    for (const heavyAds of issue.heavyAds()) {
      const key = JSON.stringify(heavyAds);
      this._heavyAdIssueDetails.set(key, heavyAds);
    }
    for (const details of issue.blockedByResponseDetails()) {
      const key = JSON.stringify(details, ['parentFrame', 'blockedFrame', 'requestId', 'frameId', 'reason', 'request']);
      this._blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof SDK.TrustedWebActivityIssue.TrustedWebActivityIssue) {
      this._trustedWebActivityIssues.add(issue);
    }
    if (issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this._cspIssues.add(issue);
    }
    if (issue instanceof SDK.SharedArrayBufferIssue.SharedArrayBufferIssue) {
      this._sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof SDK.LowTextContrastIssue.LowTextContrastIssue) {
      this._lowContrastIssues.add(issue);
    }
    if (issue instanceof SDK.CorsIssue.CorsIssue) {
      this._corsIssues.add(issue);
    }
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper {
  _aggregatedIssuesByCode: Map<string, AggregatedIssue>;
  _issuesManager: BrowserSDK.IssuesManager.IssuesManager;
  constructor(issuesManager: BrowserSDK.IssuesManager.IssuesManager) {
    super();
    this._aggregatedIssuesByCode = new Map();
    this._issuesManager = issuesManager;
    this._issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssueAdded, this._onIssueAdded, this);
    this._issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.FullUpdateRequired, this._onFullUpdateRequired, this);
    for (const issue of this._issuesManager.issues()) {
      this._aggregateIssue(issue);
    }
  }

  _onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issue} = (event.data as {
      issuesModel: SDK.IssuesModel.IssuesModel,
      issue: SDK.Issue.Issue,
    });
    this._aggregateIssue(issue);
  }

  _onFullUpdateRequired(): void {
    this._aggregatedIssuesByCode.clear();
    for (const issue of this._issuesManager.issues()) {
      this._aggregateIssue(issue);
    }
    this.dispatchEventToListeners(Events.FullUpdateRequired);
  }

  _aggregateIssue(issue: SDK.Issue.Issue): AggregatedIssue {
    let aggregatedIssue = this._aggregatedIssuesByCode.get(issue.code());
    if (!aggregatedIssue) {
      aggregatedIssue = new AggregatedIssue(issue.code());
      this._aggregatedIssuesByCode.set(issue.code(), aggregatedIssue);
    }
    aggregatedIssue.addInstance(issue);
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
    return aggregatedIssue;
  }

  aggregatedIssues(): Iterable<AggregatedIssue> {
    return this._aggregatedIssuesByCode.values();
  }

  numberOfAggregatedIssues(): number {
    return this._aggregatedIssuesByCode.size;
  }
}

export const enum Events {
  AggregatedIssueUpdated = 'AggregatedIssueUpdated',
  FullUpdateRequired = 'FullUpdateRequired',
}
