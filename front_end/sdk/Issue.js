// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

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
   * @abstract
   * @returns {string}
   */
  primaryKey() {
  }

  /**
   * @returns {!Iterable<!Protocol.Audits.AffectedCookie>}
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
