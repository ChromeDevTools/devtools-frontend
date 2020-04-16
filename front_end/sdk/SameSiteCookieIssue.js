
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssueCategory} from './RelatedIssue.js';

export class SameSiteCookieIssue extends Issue {
  /**
   * @param {string} code
   * @param {!Protocol.Audits.SameSiteCookieIssueDetails} issueDetails
   */
  constructor(code, issueDetails) {
    super(code);
    this._issueDetails = issueDetails;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return [this._issueDetails.cookie];
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    if (this._issueDetails.request) {
      return [this._issueDetails.request];
    }
    return [];
  }

  /**
   * @override
   * @return {symbol}
   */
  getCategory() {
    return IssueCategory.SameSiteCookie;
  }

  /**
   * @override
   * @returns {?IssueDescription}
   */
  getDescription() {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return description;
  }
}

/**
  * @param {string} text
  * @return {!Element}
  */
function textOnlyMessage(text) {
  const message = createElementWithClass('div', 'message');
  message.textContent = text;
  return message;
}

/** @type {!Map<string, !IssueDescription>} */
const issueDescriptions = new Map([
  ['SameSiteCookies::SameSiteNoneWithoutSecure',
      {title: ls`A Cookie has been set with SameSite=None but without Secure`, message:
        () => textOnlyMessage(ls
    `In a future version of Chrome, third-party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man-in-the-middle scenario.`),
    issueKind: IssueKind.BreakingChange,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  }],
  ['SameSiteCookies::SameSiteNoneMissingForThirdParty', {
    title: ls`A Cookie in a third-party context has been set without SameSite=None`,
    message: () => textOnlyMessage(ls
    `In a future version of Chrome, third-party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man-in-the-middle scenario.`),
    issueKind: IssueKind.BreakingChange,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  }],
  ['SameSiteCookieIssue', {
    title: ls`A Cookie in a third-party context has been set without SameSite=None`,
    message: () => textOnlyMessage(ls
    `In a future version of Chrome, third-party cookies will only be sent when marked as SameSite=None and Secure to prevent them from being accessed in a man-in-the-middle scenario.`),
    issueKind: IssueKind.BreakingChange,
    link: ls`https://web.dev/samesite-cookies-explained/`,
    linkTitle: ls`SameSite cookies explained`,
  }],
]);
