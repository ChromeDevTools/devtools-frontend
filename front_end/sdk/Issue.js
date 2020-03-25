// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {IssueCategory} from './RelatedIssue.js';

/**
 * @unrestricted
 */
export class Issue extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} code
   * @param {*} resources
   */
  constructor(code, resources) {
    super();
    /** @type {string} */
    this._code = code;
    /** @type {*} */
    this._resources = resources;
  }

  /**
   * @returns {string}
   */
  code() {
    return this._code;
  }

  /**
   * @returns {*}
   */
  resources() {
    return this._resources;
  }

  /**
   * @param {string} requestId
   * @returns {boolean}
   */
  isAssociatedWithRequestId(requestId) {
    if (!this._resources) {
      return false;
    }
    if (this._resources.requests) {
      for (const request of this._resources.requests) {
        if (request.requestId === requestId) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @return {symbol}
   */
  getCategory() {
    const code = this.code();
    if (code === 'SameSiteCookieIssue') {
      return IssueCategory.SameSiteCookie;
    }
    if (code.startsWith('CrossOriginEmbedderPolicy')) {
      return IssueCategory.CrossOriginEmbedderPolicy;
    }
    return IssueCategory.Other;
  }
}

/**
 * An `AggregatedIssue` representes a number of `Issue` objects that is displayed together. Currently only grouping by
 * issue code, is supported. The class provides helpers to support displaying of all resources that are affected by
 * the aggregated issues.
 */
export class AggregatedIssue extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} code
   */
  constructor(code) {
    super();
    this._code = code;
    // TODO(chromium:1063765): Strengthen types.
    /** @type {!Array<*>} */
    this._resources = [];
    /** @type {!Map<string, *>} */
    this._cookies = new Map();
    /** @type {!Map<string, !NetworkRequest>} */
    this._requests = new Map();
  }

  /**
   * @returns {string}
   */
  code() {
    return this._code;
  }

  /**
   * TODO(chromium:1063765): Strengthen types.
   * @returns {!Iterable<*>}
   */
  cookies() {
    return this._cookies.values();
  }

  /**
   * @returns {!Iterable<!NetworkRequest>}
   */
  requests() {
    return this._requests.values();
  }

  /**
   * @param {!Issue} issue
   */
  addInstance(issue) {
    const resources = issue.resources();
    if (!resources) {
      return;
    }
    if (resources.cookies) {
      for (const cookie of resources.cookies) {
        const key = JSON.stringify(cookie);
        if (!this._cookies.has(key)) {
          this._cookies.set(key, cookie);
        }
      }
    }

    if (resources.requests) {
      for (const request of resources.requests) {
        this._requests.set(request.requestId, request.request);
      }
    }
  }
}
