// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Protocol from '../../generated/protocol.js';

type AggregationKeyTag = {
  aggregationKeyTag: undefined,
};

/**
 * An opaque type for the key which we use to aggregate issues. The key must be
 * chosen such that if two aggregated issues have the same aggregation key, then
 * they also have the same issue code.
 */
export type AggregationKey = {
  toString(): string,
}&AggregationKeyTag;

/**
 * An `AggregatedIssue` representes a number of `IssuesManager.Issue.Issue` objects that are displayed together.
 * Currently only grouping by issue code, is supported. The class provides helpers to support displaying
 * of all resources that are affected by the aggregated issues.
 */
export class AggregatedIssue extends IssuesManager.Issue.Issue {
  #affectedCookies = new Map<string, {
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }>();
  #affectedRawCookieLines = new Map<string, {rawCookieLine: string, hasRequest: boolean}>();
  #affectedRequests = new Map<string, Protocol.Audits.AffectedRequest>();
  #affectedLocations = new Map<string, Protocol.Audits.SourceCodeLocation>();
  #heavyAdIssues = new Set<IssuesManager.HeavyAdIssue.HeavyAdIssue>();
  #blockedByResponseDetails = new Map<string, Protocol.Audits.BlockedByResponseIssueDetails>();
  #bounceTrackingSites = new Set<string>();
  #corsIssues = new Set<IssuesManager.CorsIssue.CorsIssue>();
  #cspIssues = new Set<IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>();
  #deprecationIssues = new Set<IssuesManager.DeprecationIssue.DeprecationIssue>();
  #issueKind = IssuesManager.Issue.IssueKind.IMPROVEMENT;
  #lowContrastIssues = new Set<IssuesManager.LowTextContrastIssue.LowTextContrastIssue>();
  #cookieDeprecationMetadataIssues =
      new Set<IssuesManager.CookieDeprecationMetadataIssue.CookieDeprecationMetadataIssue>();
  #mixedContentIssues = new Set<IssuesManager.MixedContentIssue.MixedContentIssue>();
  #sharedArrayBufferIssues = new Set<IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue>();
  #quirksModeIssues = new Set<IssuesManager.QuirksModeIssue.QuirksModeIssue>();
  #attributionReportingIssues = new Set<IssuesManager.AttributionReportingIssue.AttributionReportingIssue>();
  #genericIssues = new Set<IssuesManager.GenericIssue.GenericIssue>();
  #representative?: IssuesManager.Issue.Issue;
  #aggregatedIssuesCount = 0;
  #key: AggregationKey;

  constructor(code: string, aggregationKey: AggregationKey) {
    super(code);
    this.#key = aggregationKey;
  }

  override primaryKey(): string {
    throw new Error('This should never be called');
  }

  aggregationKey(): AggregationKey {
    return this.#key;
  }

  override getBlockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return this.#blockedByResponseDetails.values();
  }

  override cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    return Array.from(this.#affectedCookies.values()).map(x => x.cookie);
  }

  getRawCookieLines(): Iterable<{rawCookieLine: string, hasRequest: boolean}> {
    return this.#affectedRawCookieLines.values();
  }

  override sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    return this.#affectedLocations.values();
  }

  getBounceTrackingSites(): Iterable<string> {
    return this.#bounceTrackingSites.values();
  }

  cookiesWithRequestIndicator(): Iterable<{
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }> {
    return this.#affectedCookies.values();
  }

  getHeavyAdIssues(): Iterable<IssuesManager.HeavyAdIssue.HeavyAdIssue> {
    return this.#heavyAdIssues;
  }

  getCookieDeprecationMetadataIssues():
      Iterable<IssuesManager.CookieDeprecationMetadataIssue.CookieDeprecationMetadataIssue> {
    return this.#cookieDeprecationMetadataIssues;
  }

  getMixedContentIssues(): Iterable<IssuesManager.MixedContentIssue.MixedContentIssue> {
    return this.#mixedContentIssues;
  }

  getCorsIssues(): Set<IssuesManager.CorsIssue.CorsIssue> {
    return this.#corsIssues;
  }

  getCspIssues(): Iterable<IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue> {
    return this.#cspIssues;
  }

  getDeprecationIssues(): Iterable<IssuesManager.DeprecationIssue.DeprecationIssue> {
    return this.#deprecationIssues;
  }

  getLowContrastIssues(): Iterable<IssuesManager.LowTextContrastIssue.LowTextContrastIssue> {
    return this.#lowContrastIssues;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.#affectedRequests.values();
  }

  getSharedArrayBufferIssues(): Iterable<IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue> {
    return this.#sharedArrayBufferIssues;
  }

  getQuirksModeIssues(): Iterable<IssuesManager.QuirksModeIssue.QuirksModeIssue> {
    return this.#quirksModeIssues;
  }

  getAttributionReportingIssues(): ReadonlySet<IssuesManager.AttributionReportingIssue.AttributionReportingIssue> {
    return this.#attributionReportingIssues;
  }

  getGenericIssues(): ReadonlySet<IssuesManager.GenericIssue.GenericIssue> {
    return this.#genericIssues;
  }

  getDescription(): IssuesManager.MarkdownIssueDescription.MarkdownIssueDescription|null {
    if (this.#representative) {
      return this.#representative.getDescription();
    }
    return null;
  }

  getCategory(): IssuesManager.Issue.IssueCategory {
    if (this.#representative) {
      return this.#representative.getCategory();
    }
    return IssuesManager.Issue.IssueCategory.OTHER;
  }

  getAggregatedIssuesCount(): number {
    return this.#aggregatedIssuesCount;
  }

  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   */
  #keyForCookie(cookie: Protocol.Audits.AffectedCookie): string {
    const {domain, path, name} = cookie;
    return `${domain};${path};${name}`;
  }

  addInstance(issue: IssuesManager.Issue.Issue): void {
    this.#aggregatedIssuesCount++;
    if (!this.#representative) {
      this.#representative = issue;
    }
    this.#issueKind = IssuesManager.Issue.unionIssueKind(this.#issueKind, issue.getKind());
    let hasRequest = false;
    for (const request of issue.requests()) {
      hasRequest = true;
      if (!this.#affectedRequests.has(request.requestId)) {
        this.#affectedRequests.set(request.requestId, request);
      }
    }
    for (const cookie of issue.cookies()) {
      const key = this.#keyForCookie(cookie);
      if (!this.#affectedCookies.has(key)) {
        this.#affectedCookies.set(key, {cookie, hasRequest});
      }
    }
    for (const rawCookieLine of issue.rawCookieLines()) {
      if (!this.#affectedRawCookieLines.has(rawCookieLine)) {
        this.#affectedRawCookieLines.set(rawCookieLine, {rawCookieLine, hasRequest});
      }
    }
    for (const site of issue.trackingSites()) {
      if (!this.#bounceTrackingSites.has(site)) {
        this.#bounceTrackingSites.add(site);
      }
    }
    for (const location of issue.sources()) {
      const key = JSON.stringify(location);
      if (!this.#affectedLocations.has(key)) {
        this.#affectedLocations.set(key, location);
      }
    }
    if (issue instanceof IssuesManager.CookieDeprecationMetadataIssue.CookieDeprecationMetadataIssue) {
      this.#cookieDeprecationMetadataIssues.add(issue);
    }
    if (issue instanceof IssuesManager.MixedContentIssue.MixedContentIssue) {
      this.#mixedContentIssues.add(issue);
    }
    if (issue instanceof IssuesManager.HeavyAdIssue.HeavyAdIssue) {
      this.#heavyAdIssues.add(issue);
    }
    for (const details of issue.getBlockedByResponseDetails()) {
      const key = JSON.stringify(details, ['parentFrame', 'blockedFrame', 'requestId', 'frameId', 'reason', 'request']);
      this.#blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this.#cspIssues.add(issue);
    }
    if (issue instanceof IssuesManager.DeprecationIssue.DeprecationIssue) {
      this.#deprecationIssues.add(issue);
    }
    if (issue instanceof IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue) {
      this.#sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof IssuesManager.LowTextContrastIssue.LowTextContrastIssue) {
      this.#lowContrastIssues.add(issue);
    }
    if (issue instanceof IssuesManager.CorsIssue.CorsIssue) {
      this.#corsIssues.add(issue);
    }
    if (issue instanceof IssuesManager.QuirksModeIssue.QuirksModeIssue) {
      this.#quirksModeIssues.add(issue);
    }
    if (issue instanceof IssuesManager.AttributionReportingIssue.AttributionReportingIssue) {
      this.#attributionReportingIssues.add(issue);
    }
    if (issue instanceof IssuesManager.GenericIssue.GenericIssue) {
      this.#genericIssues.add(issue);
    }
  }

  getKind(): IssuesManager.Issue.IssueKind {
    return this.#issueKind;
  }

  override isHidden(): boolean {
    return this.#representative?.isHidden() || false;
  }

  override setHidden(_value: boolean): void {
    throw new Error('Should not call setHidden on aggregatedIssue');
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #aggregatedIssuesByKey = new Map<AggregationKey, AggregatedIssue>();
  readonly #hiddenAggregatedIssuesByKey = new Map<AggregationKey, AggregatedIssue>();
  constructor(private readonly issuesManager: IssuesManager.IssuesManager.IssuesManager) {
    super();
    this.issuesManager.addEventListener(IssuesManager.IssuesManager.Events.ISSUE_ADDED, this.#onIssueAdded, this);
    this.issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.FULL_UPDATE_REQUIRED, this.#onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssuesManager.IssuesManager.IssueAddedEvent>): void {
    this.#aggregateIssue(event.data.issue);
  }

  #onFullUpdateRequired(): void {
    this.#aggregatedIssuesByKey.clear();
    this.#hiddenAggregatedIssuesByKey.clear();
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
    this.dispatchEventToListeners(Events.FULL_UPDATE_REQUIRED);
  }

  #aggregateIssue(issue: IssuesManager.Issue.Issue): AggregatedIssue {
    const map = issue.isHidden() ? this.#hiddenAggregatedIssuesByKey : this.#aggregatedIssuesByKey;
    const aggregatedIssue = this.#aggregateIssueByStatus(map, issue);
    this.dispatchEventToListeners(Events.AGGREGATED_ISSUE_UPDATED, aggregatedIssue);
    return aggregatedIssue;
  }

  #aggregateIssueByStatus(aggregatedIssuesMap: Map<AggregationKey, AggregatedIssue>, issue: IssuesManager.Issue.Issue):
      AggregatedIssue {
    const key = issue.code() as unknown as AggregationKey;
    let aggregatedIssue = aggregatedIssuesMap.get(key);
    if (!aggregatedIssue) {
      aggregatedIssue = new AggregatedIssue(issue.code(), key);
      aggregatedIssuesMap.set(key, aggregatedIssue);
    }
    aggregatedIssue.addInstance(issue);
    return aggregatedIssue;
  }

  aggregatedIssues(): Iterable<AggregatedIssue> {
    return [...this.#aggregatedIssuesByKey.values(), ...this.#hiddenAggregatedIssuesByKey.values()];
  }

  hiddenAggregatedIssues(): Iterable<AggregatedIssue> {
    return this.#hiddenAggregatedIssuesByKey.values();
  }

  aggregatedIssueCodes(): Set<AggregationKey> {
    return new Set([...this.#aggregatedIssuesByKey.keys(), ...this.#hiddenAggregatedIssuesByKey.keys()]);
  }

  aggregatedIssueCategories(): Set<IssuesManager.Issue.IssueCategory> {
    const result = new Set<IssuesManager.Issue.IssueCategory>();
    for (const issue of this.#aggregatedIssuesByKey.values()) {
      result.add(issue.getCategory());
    }
    return result;
  }

  aggregatedIssueKinds(): Set<IssuesManager.Issue.IssueKind> {
    const result = new Set<IssuesManager.Issue.IssueKind>();
    for (const issue of this.#aggregatedIssuesByKey.values()) {
      result.add(issue.getKind());
    }
    return result;
  }

  numberOfAggregatedIssues(): number {
    return this.#aggregatedIssuesByKey.size;
  }

  numberOfHiddenAggregatedIssues(): number {
    return this.#hiddenAggregatedIssuesByKey.size;
  }

  keyForIssue(issue: IssuesManager.Issue.Issue<string>): AggregationKey {
    return issue.code() as unknown as AggregationKey;
  }
}

export const enum Events {
  AGGREGATED_ISSUE_UPDATED = 'AggregatedIssueUpdated',
  FULL_UPDATE_REQUIRED = 'FullUpdateRequired',
}

export type EventTypes = {
  [Events.AGGREGATED_ISSUE_UPDATED]: AggregatedIssue,
  [Events.FULL_UPDATE_REQUIRED]: void,
};
