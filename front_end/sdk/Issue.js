// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

/** @enum {symbol} */
export const IssueCategory = {
  CrossOriginEmbedderPolicy: Symbol('CrossOriginEmbedderPolicy'),
  SameSiteCookie: Symbol('SameSiteCookie'),
  Other: Symbol('Other')
};

/** @enum {symbol} */
export const IssueKind = {
  BreakingChange: Symbol('BreakingChange'),
};

/**
 * @typedef {{
  *            title:string,
  *            message: (function():!Element),
  *            issueKind: !IssueKind,
  *            link: string,
  *            linkTitle: string
  *          }}
  */
export let IssueDescription;  // eslint-disable-line no-unused-vars

/**
 * @abstract
 */
export class Issue extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} code
   */
  constructor(code) {
    super();
    /** @type {string} */
    this._code = code;
  }

  /**
   * @returns {string}
   */
  code() {
    return this._code;
  }

  /**
   * @returns {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return [];
  }

  /**
   * @returns {!Iterable<!Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return [];
  }

  /**
   * @param {string} requestId
   * @returns {boolean}
   */
  isAssociatedWithRequestId(requestId) {
    for (const request of this.requests()) {
      if (request.requestId === requestId) {
        return true;
      }
    }
    return false;
  }

  /**
   * @abstract
   * @returns {?IssueDescription}
   */
  getDescription() {
  }

  /**
   * @abstract
   * @return {!IssueCategory}
   */
  getCategory() {
  }
}

/**
 * An `AggregatedIssue` representes a number of `Issue` objects that is displayed together. Currently only grouping by
 * issue code, is supported. The class provides helpers to support displaying of all resources that are affected by
 * the aggregated issues.
 */
export class AggregatedIssue extends Issue {
  /**
   * @param {string} code
   */
  constructor(code) {
    super(code);
    /** @type {!Map<string, !Protocol.Audits.AffectedCookie>} */
    this._cookies = new Map();
    /** @type {!Set<!Protocol.Audits.AffectedRequest>} */
    this._requests = new Set();
    /** @type {?Issue} */
    this._representative = null;
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
    return this._requests;
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
   * @return {!IssueCategory}
   */
  getCategory() {
    if (this._representative) {
      return this._representative.getCategory();
    }
    return IssueCategory.Other;
  }

  /**
   * @param {!Issue} issue
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
      this._requests.add(request);
    }
  }
}
