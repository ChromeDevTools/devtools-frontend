// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
    /** @type {!Map<string, !Protocol.Audits.AffectedCookie>} */
    this._cookies = new Map();
    /** @type {!Map<string, !Protocol.Audits.AffectedRequest>} */
    this._requests = new Map();
    /** @type {?SDK.Issue.Issue} */
    this._representative = null;
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
   * @returns {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return this._cookies.values();
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
   * @param {!SDK.Issue.Issue} issue
   */
  addInstance(issue) {
    if (!this._representative) {
      this._representative = issue;
    }
    for (const cookie of issue.cookies()) {
      const key = JSON.stringify(cookie);
      if (!this._cookies.has(key)) {
        this._cookies.set(key, cookie);
      }
    }
    for (const request of issue.requests()) {
      if (!this._requests.has(request.requestId)) {
        this._requests.set(request.requestId, request);
      }
    }
  }
}

export class IssueAggregator extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!SDK.IssuesModel.IssuesModel} issuesModel
   */
  constructor(issuesModel) {
    super();
    /** @type {!Map<string, !AggregatedIssue>} */
    this._aggregatedIssuesByCode = new Map();
    /** @type {!SDK.IssuesModel.IssuesModel} */
    this._issuesModel = issuesModel;
    this._issuesModel.addEventListener(SDK.IssuesModel.Events.IssueAdded, this._onIssueAdded, this);
    this._issuesModel.addEventListener(SDK.IssuesModel.Events.FullUpdateRequired, this._onFullUpdateRequired, this);
    for (const issue of this._issuesModel.issues()) {
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
    for (const issue of this._issuesModel.issues()) {
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
