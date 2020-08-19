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
  /**
   * @param {string} code
   */
  constructor(code) {
    super(code);
    /** @type {!Map<string, !{cookie: !Protocol.Audits.AffectedCookie, hasRequest: boolean}>} */
    this._cookies = new Map();
    /** @type {!Map<string, !Protocol.Audits.AffectedRequest>} */
    this._requests = new Map();
    /** @type {?SDK.Issue.Issue} */
    this._representative = null;
    /** @type {!Map<string, !Protocol.Audits.MixedContentIssueDetails>} */
    this._mixedContents = new Map();
    /** @type {!Map<string, !Protocol.Audits.HeavyAdIssueDetails>} */
    this._heavyAdIssueDetails = new Map();
    /** @type {!Set<!SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>} */
    this._cspIssues = new Set();
    /** @type {!Map<string, !Protocol.Audits.BlockedByResponseIssueDetails>} */
    this._blockedByResponseDetails = new Map();
    this._aggregatedIssuesCount = 0;
  }

  /**
   * @override
   * @returns {string}
   */
  primaryKey() {
    throw new Error('This should never be called');
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.BlockedByResponseIssueDetails>}
   */
  blockedByResponseDetails() {
    return this._blockedByResponseDetails.values();
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return Array.from(this._cookies.values()).map(x => x.cookie);
  }

  /**
   * @returns {!Iterable<!{cookie: !Protocol.Audits.AffectedCookie, hasRequest: boolean}>}
   */
  cookiesWithRequestIndicator() {
    return this._cookies.values();
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.HeavyAdIssueDetails>}
   */
  heavyAds() {
    return this._heavyAdIssueDetails.values();
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.MixedContentIssueDetails>}
   */
  mixedContents() {
    return this._mixedContents.values();
  }

  /**
   * @returns {!Iterable<!SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>}
   */
  cspIssues() {
    return this._cspIssues;
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return this._requests.values();
  }

  /**
   * @override
   */
  getDescription() {
    if (this._representative) {
      return this._representative.getDescription();
    }
    return null;
  }

  /**
   * @override
   * @return {!SDK.Issue.IssueCategory}
   */
  getCategory() {
    if (this._representative) {
      return this._representative.getCategory();
    }
    return SDK.Issue.IssueCategory.Other;
  }

  /**
   * @return {number}
  */
  getAggregatedIssuesCount() {
    return this._aggregatedIssuesCount;
  }

  /**
   * Produces a primary key for a cookie. Use this instead of `JSON.stringify` in
   * case new fields are added to `AffectedCookie`.
   * @param {!Protocol.Audits.AffectedCookie} cookie
   */
  _keyForCookie(cookie) {
    const {domain, path, name} = cookie;
    return `${domain};${path};${name}`;
  }

  /**
   * @param {!SDK.Issue.Issue} issue
   */
  addInstance(issue) {
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
    if (issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue) {
      this._cspIssues.add(issue);
    }
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!BrowserSDK.IssuesManager.IssuesManager} issuesManager
   */
  constructor(issuesManager) {
    super();
    /** @type {!Map<string, !AggregatedIssue>} */
    this._aggregatedIssuesByCode = new Map();
    /** @type {!BrowserSDK.IssuesManager.IssuesManager} */
    this._issuesManager = issuesManager;
    this._issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssueAdded, this._onIssueAdded, this);
    this._issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.FullUpdateRequired, this._onFullUpdateRequired, this);
    for (const issue of this._issuesManager.issues()) {
      this._aggregateIssue(issue);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onIssueAdded(event) {
    const {issue} =
        /** @type {!{issuesModel: !SDK.IssuesModel.IssuesModel, issue: !SDK.Issue.Issue}} */ (event.data);
    this._aggregateIssue(issue);
  }

  _onFullUpdateRequired() {
    this._aggregatedIssuesByCode.clear();
    for (const issue of this._issuesManager.issues()) {
      this._aggregateIssue(issue);
    }
    this.dispatchEventToListeners(Events.FullUpdateRequired);
  }

  /**
   * @param {!SDK.Issue.Issue} issue
   * @returns {!AggregatedIssue}
   */
  _aggregateIssue(issue) {
    let aggregatedIssue = this._aggregatedIssuesByCode.get(issue.code());
    if (!aggregatedIssue) {
      aggregatedIssue = new AggregatedIssue(issue.code());
      this._aggregatedIssuesByCode.set(issue.code(), aggregatedIssue);
    }
    aggregatedIssue.addInstance(issue);
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
    return aggregatedIssue;
  }

  /**
   * @returns {!Iterable<!AggregatedIssue>}
   */
  aggregatedIssues() {
    return this._aggregatedIssuesByCode.values();
  }

  /**
   * @return {number}
   */
  numberOfAggregatedIssues() {
    return this._aggregatedIssuesByCode.size;
  }
}

/** @enum {symbol} */
export const Events = {
  AggregatedIssueUpdated: Symbol('AggregatedIssueUpdated'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};
