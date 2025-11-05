// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';

import {AttributionReportingIssue} from './AttributionReportingIssue.js';
import {ContentSecurityPolicyIssue} from './ContentSecurityPolicyIssue.js';
import {CookieDeprecationMetadataIssue} from './CookieDeprecationMetadataIssue.js';
import {CookieIssue} from './CookieIssue.js';
import {CorsIssue} from './CorsIssue.js';
import {DeprecationIssue} from './DeprecationIssue.js';
import {ElementAccessibilityIssue} from './ElementAccessibilityIssue.js';
import {GenericIssue} from './GenericIssue.js';
import {HeavyAdIssue} from './HeavyAdIssue.js';
import {Issue, IssueCategory, IssueKind, unionIssueKind} from './Issue.js';
import type {EventTypes as IssuesManagerEventsTypes, IssueAddedEvent} from './IssuesManager.js';
import {Events as IssuesManagerEvents} from './IssuesManagerEvents.js';
import {LowTextContrastIssue} from './LowTextContrastIssue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';
import {MixedContentIssue} from './MixedContentIssue.js';
import {PartitioningBlobURLIssue} from './PartitioningBlobURLIssue.js';
import {QuirksModeIssue} from './QuirksModeIssue.js';
import {SharedArrayBufferIssue} from './SharedArrayBufferIssue.js';

export interface IssuesProvider extends Common.EventTarget.EventTarget<IssuesManagerEventsTypes> {
  issues(): Iterable<Issue>;
}

interface AggregationKeyTag {
  aggregationKeyTag: undefined;
}

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
export class AggregatedIssue extends Issue {
  #affectedCookies = new Map<string, {
    cookie: Protocol.Audits.AffectedCookie,
    hasRequest: boolean,
  }>();
  #affectedRawCookieLines = new Map<string, {rawCookieLine: string, hasRequest: boolean}>();
  #affectedRequests: Protocol.Audits.AffectedRequest[] = [];
  #affectedRequestIds = new Set<Protocol.Network.RequestId>();
  #affectedLocations = new Map<string, Protocol.Audits.SourceCodeLocation>();
  #heavyAdIssues = new Set<HeavyAdIssue>();
  #blockedByResponseDetails = new Map<string, Protocol.Audits.BlockedByResponseIssueDetails>();
  #bounceTrackingSites = new Set<string>();
  #corsIssues = new Set<CorsIssue>();
  #cspIssues = new Set<ContentSecurityPolicyIssue>();
  #deprecationIssues = new Set<DeprecationIssue>();
  #issueKind = IssueKind.IMPROVEMENT;
  #lowContrastIssues = new Set<LowTextContrastIssue>();
  #cookieDeprecationMetadataIssues = new Set<CookieDeprecationMetadataIssue>();
  #mixedContentIssues = new Set<MixedContentIssue>();
  #partitioningBlobURLIssues = new Set<PartitioningBlobURLIssue>();
  #sharedArrayBufferIssues = new Set<SharedArrayBufferIssue>();
  #quirksModeIssues = new Set<QuirksModeIssue>();
  #attributionReportingIssues = new Set<AttributionReportingIssue>();
  #genericIssues = new Set<GenericIssue>();
  #elementAccessibilityIssues = new Set<ElementAccessibilityIssue>();
  #representative?: Issue;
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

  getHeavyAdIssues(): Iterable<HeavyAdIssue> {
    return this.#heavyAdIssues;
  }

  getCookieDeprecationMetadataIssues(): Iterable<CookieDeprecationMetadataIssue> {
    return this.#cookieDeprecationMetadataIssues;
  }

  getMixedContentIssues(): Iterable<MixedContentIssue> {
    return this.#mixedContentIssues;
  }

  getCorsIssues(): Set<CorsIssue> {
    return this.#corsIssues;
  }

  getCspIssues(): Iterable<ContentSecurityPolicyIssue> {
    return this.#cspIssues;
  }

  getDeprecationIssues(): Iterable<DeprecationIssue> {
    return this.#deprecationIssues;
  }

  getLowContrastIssues(): Iterable<LowTextContrastIssue> {
    return this.#lowContrastIssues;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.#affectedRequests.values();
  }

  getSharedArrayBufferIssues(): Iterable<SharedArrayBufferIssue> {
    return this.#sharedArrayBufferIssues;
  }

  getQuirksModeIssues(): Iterable<QuirksModeIssue> {
    return this.#quirksModeIssues;
  }

  getAttributionReportingIssues(): ReadonlySet<AttributionReportingIssue> {
    return this.#attributionReportingIssues;
  }

  getGenericIssues(): ReadonlySet<GenericIssue> {
    return this.#genericIssues;
  }

  getElementAccessibilityIssues(): Iterable<ElementAccessibilityIssue> {
    return this.#elementAccessibilityIssues;
  }

  getDescription(): MarkdownIssueDescription|null {
    if (this.#representative) {
      return this.#representative.getDescription();
    }
    return null;
  }

  getCategory(): IssueCategory {
    if (this.#representative) {
      return this.#representative.getCategory();
    }
    return IssueCategory.OTHER;
  }

  getAggregatedIssuesCount(): number {
    return this.#aggregatedIssuesCount;
  }

  getPartitioningBlobURLIssues(): Iterable<PartitioningBlobURLIssue> {
    return this.#partitioningBlobURLIssues;
  }

  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   */
  #keyForCookie(cookie: Protocol.Audits.AffectedCookie): string {
    const {domain, path, name} = cookie;
    return `${domain};${path};${name}`;
  }

  addInstance(issue: Issue): void {
    this.#aggregatedIssuesCount++;
    if (!this.#representative) {
      this.#representative = issue;
    }
    this.#issueKind = unionIssueKind(this.#issueKind, issue.getKind());
    let hasRequest = false;
    for (const request of issue.requests()) {
      const {requestId} = request;
      hasRequest = true;
      if (requestId === undefined) {
        this.#affectedRequests.push(request);
      } else if (!this.#affectedRequestIds.has(requestId)) {
        this.#affectedRequests.push(request);
        this.#affectedRequestIds.add(requestId);
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
    if (issue instanceof CookieDeprecationMetadataIssue) {
      this.#cookieDeprecationMetadataIssues.add(issue);
    }
    if (issue instanceof MixedContentIssue) {
      this.#mixedContentIssues.add(issue);
    }
    if (issue instanceof HeavyAdIssue) {
      this.#heavyAdIssues.add(issue);
    }
    for (const details of issue.getBlockedByResponseDetails()) {
      const key = JSON.stringify(details, ['parentFrame', 'blockedFrame', 'requestId', 'frameId', 'reason', 'request']);
      this.#blockedByResponseDetails.set(key, details);
    }
    if (issue instanceof ContentSecurityPolicyIssue) {
      this.#cspIssues.add(issue);
    }
    if (issue instanceof DeprecationIssue) {
      this.#deprecationIssues.add(issue);
    }
    if (issue instanceof SharedArrayBufferIssue) {
      this.#sharedArrayBufferIssues.add(issue);
    }
    if (issue instanceof LowTextContrastIssue) {
      this.#lowContrastIssues.add(issue);
    }
    if (issue instanceof CorsIssue) {
      this.#corsIssues.add(issue);
    }
    if (issue instanceof QuirksModeIssue) {
      this.#quirksModeIssues.add(issue);
    }
    if (issue instanceof AttributionReportingIssue) {
      this.#attributionReportingIssues.add(issue);
    }
    if (issue instanceof GenericIssue) {
      this.#genericIssues.add(issue);
    }
    if (issue instanceof ElementAccessibilityIssue) {
      this.#elementAccessibilityIssues.add(issue);
    }
    if (issue instanceof PartitioningBlobURLIssue) {
      this.#partitioningBlobURLIssues.add(issue);
    }
  }

  getKind(): IssueKind {
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
  constructor(private readonly issuesManager: IssuesProvider) {
    super();
    this.issuesManager.addEventListener(IssuesManagerEvents.ISSUE_ADDED, this.#onIssueAdded, this);
    this.issuesManager.addEventListener(IssuesManagerEvents.FULL_UPDATE_REQUIRED, this.#onFullUpdateRequired, this);
    for (const issue of this.issuesManager.issues()) {
      this.#aggregateIssue(issue);
    }
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssueAddedEvent>): void {
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

  #aggregateIssue(issue: Issue): AggregatedIssue|undefined {
    if (CookieIssue.isThirdPartyCookiePhaseoutRelatedIssue(issue)) {
      return;
    }

    const map = issue.isHidden() ? this.#hiddenAggregatedIssuesByKey : this.#aggregatedIssuesByKey;
    const aggregatedIssue = this.#aggregateIssueByStatus(map, issue);
    this.dispatchEventToListeners(Events.AGGREGATED_ISSUE_UPDATED, aggregatedIssue);
    return aggregatedIssue;
  }

  #aggregateIssueByStatus(aggregatedIssuesMap: Map<AggregationKey, AggregatedIssue>, issue: Issue): AggregatedIssue {
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

  aggregatedIssueCodes(): Set<AggregationKey> {
    return new Set([...this.#aggregatedIssuesByKey.keys(), ...this.#hiddenAggregatedIssuesByKey.keys()]);
  }

  aggregatedIssueCategories(): Set<IssueCategory> {
    const result = new Set<IssueCategory>();
    for (const issue of this.#aggregatedIssuesByKey.values()) {
      result.add(issue.getCategory());
    }
    return result;
  }

  aggregatedIssueKinds(): Set<IssueKind> {
    const result = new Set<IssueKind>();
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

  keyForIssue(issue: Issue<string>): AggregationKey {
    return issue.code() as unknown as AggregationKey;
  }
}

export const enum Events {
  AGGREGATED_ISSUE_UPDATED = 'AggregatedIssueUpdated',
  FULL_UPDATE_REQUIRED = 'FullUpdateRequired',
}

export interface EventTypes {
  [Events.AGGREGATED_ISSUE_UPDATED]: AggregatedIssue;
  [Events.FULL_UPDATE_REQUIRED]: void;
}
