// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';

import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

/** @enum {symbol} */
export const IssueCategory = {
  CrossOriginEmbedderPolicy: Symbol('CrossOriginEmbedderPolicy'),
  MixedContent: Symbol('MixedContent'),
  SameSiteCookie: Symbol('SameSiteCookie'),
  HeavyAd: Symbol('HeavyAd'),
  ContentSecurityPolicy: Symbol('ContentSecurityPolicy'),
  TrustedWebActivity: Symbol('TrustedWebActivity'),
  Other: Symbol('Other')
};

/** @enum {symbol} */
export const IssueKind = {
  BreakingChange: Symbol('BreakingChange'),
};

/** @return {!Common.Settings.Setting<boolean>} */
export function getShowThirdPartyIssuesSetting() {
  return Common.Settings.Settings.instance().createSetting('showThirdPartyIssues', false);
}

/**
 * @typedef {{
  *             file: string,
  *             substitutions: (!Map<string, string>|undefined),
  *             issueKind: !IssueKind,
  *             links: !Array<!{link: string, linkTitle: string}>
  *          }}
  */
// @ts-ignore typedef
export let MarkdownIssueDescription;  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
  *            backendNodeId: number,
  *            nodeName: string
  *          }}
  */
// @ts-ignore typedef
export let AffectedElement;  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *            columnNumber: (number|undefined),
 *            lineNumber: number,
 *            url: string
 *          }}
 */
// @ts-ignore typedef
export let AffectedSource;  // eslint-disable-line no-unused-vars

/**
 * @abstract
 */
export class Issue extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string|{code:string, umaCode:string}} code
   * @param {IssuesModel|null} issuesModel
   */
  constructor(code, issuesModel = null) {
    super();
    /** @type {string} */
    this._code = typeof code === 'string' ? code : code.code;
    this._issuesModel = issuesModel;
    Host.userMetrics.issueCreated(typeof code === 'string' ? code : code.umaCode);
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
   * @return {!Iterable<!Protocol.Audits.BlockedByResponseIssueDetails>}
   */
  blockedByResponseDetails() {
    return [];
  }

  /**
   * @return {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return [];
  }

  /**
   * @return {!Iterable<!AffectedElement>}
   */
  elements() {
    return [];
  }

  /**
   * @returns {!Iterable<!Protocol.Audits.HeavyAdIssueDetails>}
   */
  heavyAds() {
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
   * The model might be unavailable or belong to a target that has already been disposed.
   * @returns {IssuesModel|null}
   */
  model() {
    return this._issuesModel;
  }

  /**
   * @return {?MarkdownIssueDescription}
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

  /**
   * @return {boolean}
   */
  isCausedByThirdParty() {
    return false;
  }
}
