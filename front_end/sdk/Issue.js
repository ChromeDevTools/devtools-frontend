// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

/** @enum {symbol} */
export const IssueCategory = {
  CrossOriginEmbedderPolicy: Symbol('CrossOriginEmbedderPolicy'),
  MixedContent: Symbol('MixedContent'),
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
// @ts-ignore typedef
export let IssueDescription;  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *            columnNumber: (number|undefined),
 *            lineNumber: number,
 *            url:string
 *          }}
 */
// @ts-ignore typedef
export let AffectedSource;  // eslint-disable-line no-unused-vars

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
   * @return {string}
   */
  code() {
    return this._code;
  }

  /**
   * @return {string}
   */
  primaryKey() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return [];
  }

  /**
   * @returns {!Iterable<!Protocol.Audits.MixedContentIssueDetails>}
   */
  mixedContents() {
    return [];
  }

  /**
   * @return {!Iterable<!Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return [];
  }

  /**
   * @returns {!Iterable<!AffectedSource>}
   */
  sources() {
    return [];
  }

  /**
   * @param {string} requestId
   * @return {boolean}
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
   * @return {?IssueDescription}
   */
  getDescription() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!IssueCategory}
   */
  getCategory() {
    throw new Error('Not implemented');
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
    /** @type {!Map<string, !Protocol.Audits.AffectedRequest>} */
    this._requests = new Map();
    /** @type {?Issue} */
    this._representative = null;
  }

  /**
   * @override
   */
  primaryKey() {
    // There should only be one aggregated issue per code.
    return this.code();
  }

  /**
   * @override
   * @return {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return this._cookies.values();
  }

  /**
   * @override
   * @return {!Iterable<!Protocol.Audits.AffectedRequest>}
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
      if (!this._requests.has(request.requestId)) {
        this._requests.set(request.requestId, request);
      }
    }
  }
}
