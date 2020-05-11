
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

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
   */
  primaryKey() {
    const {domain, path, name} = this._issueDetails.cookie;
    const cookieId = `${domain};${path};${name}`;
    const requestId = this._issueDetails.request ? this._issueDetails.request.requestId : 'no-request';
    return `${this.code()}-(${cookieId})-(${requestId})`;
  }

  /**
   * Calculates an issue code from a reason and an operation. All these together
   * can uniquely identify a specific SameSite cookie issue.
   *
   * @param {!Protocol.Audits.SameSiteCookieExclusionReason|!Protocol.Audits.SameSiteCookieWarningReason} reason
   * @param {!Protocol.Audits.SameSiteCookieOperation} operation
   */
  static codeForSameSiteDetails(reason, operation) {
    return [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, reason, operation].join('::');
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.AffectedCookie>}
   */
  cookies() {
    return [this._issueDetails.cookie];
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.AffectedRequest>}
   */
  requests() {
    if (this._issueDetails.request) {
      return [this._issueDetails.request];
    }
    return [];
  }

  /**
   * @override
   * @return {!IssueCategory}
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
 * @param {!Array<string>} resolutions
 * @return {!Element}
 */
function textMessageWithResolutions(text, resolutions) {
  const message = document.createElement('div');
  message.classList.add('message');
  const messageContent = document.createElement('p');
  messageContent.textContent = text;
  message.append(messageContent);

  if (resolutions.length > 0) {
    const resolutionParagraph = document.createElement('p');
    message.append(resolutionParagraph);

    const resolutionParagraphTextContent = document.createElement('span');
    resolutionParagraphTextContent.classList.add('resolutions-label');
    resolutionParagraphTextContent.textContent = ls`Resolve by`;
    resolutionParagraph.append(resolutionParagraphTextContent);

    const resolutionList = document.createElement('ul');
    resolutionList.classList.add('resolutions-list');
    resolutionParagraph.append(resolutionList);

    for (const resolution of resolutions) {
      const listItem = document.createElement('li');
      listItem.textContent = resolution;
      resolutionList.append(listItem);
    }
  }

  return message;
}

/** @type {!Map<string, !IssueDescription>} */
const issueDescriptions = new Map([
  [
    'SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie', {
      title: ls`A cookie was not sent because the cookie's 'SameSite' attribute was defaulted to 'SameSite=Lax'`,
      message: () => textMessageWithResolutions(
          ls
          `A cookie was defaulted to 'SameSite=Lax' because the cookie's 'SameSite' attribute was not set or invalid. The cookie was not sent because the default behavior for 'SameSite=Lax' prevents this cookie from being sent in cross-site requests.`,
          [
            ls`If the cookie is intended for third parties, mark the cookie as 'SameSite=None; Secure'.`,
            ls
            `If the cookie is not intended for third parties, consider explicitly marking the cookie as 'SameSite=Strict' or 'SameSite=Lax' to make your intent clear and provide a consistent experience across browsers.`,
          ]),
      issueKind: IssueKind.BreakingChange,
      links: [{link: ls`https://web.dev/samesite-cookies-explained/`,
      linkTitle: ls`SameSite cookies explained`}],
    }
  ],
  [
    'SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie', {
      title: ls `A cookie was blocked, because the cookie's 'SameSite' attribute was defaulted to 'SameSite=Lax'`,
      message: () => textMessageWithResolutions(
        ls`A cookie was defaulted to 'SameSite=Lax' because the cookie's SameSite attribute was not set or invalid. The cookie was not set because the default behavior for 'SameSite=Lax' prevents this cookie from being set in a cross-site response. This issue can only be resolved if you can change the cross-site page from which this cookie originated.`, [ls`If the cookie is intended for third parties, mark the cookie as 'SameSite=None; Secure'.`,
        ls
        `If the cookie is not intended for third parties, consider explicitly marking the cookie as 'SameSite=Strict' or 'SameSite=Lax' to make your intent clear and provide a consistent experience across browsers.`,]),
      issueKind: IssueKind.BreakingChange,
      links: [{link: ls`https://web.dev/samesite-cookies-explained/`,
      linkTitle: ls`SameSite cookies explained`}],
    }
  ],
  [
    'SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::SetCookie', {
      title: ls`A cookie was blocked, because the cookie specified 'SameSite=None' without 'Secure'`,
      message: () => textMessageWithResolutions(
          ls
          `A cookie was received with the 'SameSite=None' attribute, marking it as available for third-party use, but did not have the 'Secure' attribute. Cookies with 'SameSite=None' are not set unless they also have the 'Secure' attribute.`,
          [
            ls`If the cookie is intended for third parties, mark the cookie as 'Secure'.`,
            ls
            `If the cookie is not intended for third parties, consider explicitly marking the cookie as 'SameSite=Strict' or 'SameSite=Lax' to make your intent clear and provide a consistent experience across browsers.`,
          ]),
      issueKind: IssueKind.BreakingChange,
      links: [{link: ls`https://web.dev/samesite-cookies-explained/`,
      linkTitle: ls`SameSite cookies explained`}],
    }
  ],
  [
    'SameSiteCookieIssue::WarnSameSiteNoneInsecure::SetCookie', {
      title: ls
      `A cookie will be blocked in the future, because the cookie specified 'SameSite=None' without 'Secure'`,
      message: () => textMessageWithResolutions(
          ls
          `A cookie was received with the 'SameSite=None' attribute, marking it as available for third-party use, but did not have the 'Secure' attribute. Cookies with 'SameSite=None' will not be set unless they also have the 'Secure' attribute.`,
          [
            ls`If the cookie is intended for third parties, mark the cookie as 'Secure'.`,
            ls
            `If the cookie is not intended for third parties, consider explicitly marking the cookie as 'SameSite=Strict' or 'SameSite=Lax' to make your intent clear and provide a consistent experience across browsers.`,
          ]),
      issueKind: IssueKind.BreakingChange,
      links: [{link: ls`https://web.dev/samesite-cookies-explained/`,
      linkTitle: ls`SameSite cookies explained`}],
    }
  ],
  [
    'SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie', {
      title: ls `A cookie will not be sent in the future, because the cookie was set without the 'SameSite' attribute`,
      message: () => textMessageWithResolutions(
        ls`A cookie without a valid SameSite attribute was sent in a cross-site request. In the future, a cookie will only be sent in a cross-site request if the cookie has both the 'SameSite=None and 'Secure' attributes.`, [ls`If the cookie is intended for third parties, mark the cookie as 'SameSite=None; Secure'.`,
        ls
        `If the cookie is not intended for third parties, consider explicitly marking the cookie as 'SameSite=Strict' or 'SameSite=Lax' to make your intent clear and provide a consistent experience across browsers.`,]),
      issueKind: IssueKind.BreakingChange,
      links: [{link: ls`https://web.dev/samesite-cookies-explained/`,
      linkTitle: ls`SameSite cookies explained`}],
    }
  ]
]);
