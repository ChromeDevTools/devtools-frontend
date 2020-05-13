
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
   * @param {string|undefined} cookieUrl
   */
  static codeForSameSiteDetails(reason, operation, cookieUrl) {
    const isURLSecure = cookieUrl && (cookieUrl.startsWith('https://') || cookieUrl.startsWith('wss://'));
    const secure = isURLSecure ? 'Secure' : 'Insecure';
    if (reason === Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict) {
      return [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, reason, secure].join('::');
    }
    // These have the same message.
    if (reason === Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict ||
        reason === Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictCrossDowngradeLax ||
        reason === Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteLaxCrossDowngradeLax ||
        reason === Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict) {
      return [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, 'WarnCrossDowngrade', operation, secure].join(
          '::');
    }
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
 * @param {string} resolveMessage
 * @param {!Array<string>} resolutions
 * @return {!Element}
 */
function textMessageWithResolutions(text, resolveMessage, resolutions) {
  /**
   * Inserts <code> tags for substrings of `message` that are enclosed
   * by |, i.e. "Hello |code|" causes code get enclosed in a <code> tag.
   * This is not an injection risk, as it only use `textContent` and only
   * programmatically creates <span> and <code> elements.
   * @param {!Element} element
   * @param {string} message
   */
  const appendStyled = (element, message) => {
    let lastIndex = 0;
    // Closure doesn't know String.p.matchAll exists.
    /** @suppress {missingProperties} */
    const matches = message.matchAll(/\|(.*?)\|/g);
    for (const match of matches) {  //
      if (match.index !== undefined) {
        const span = document.createElement('span');
        span.textContent = message.substring(lastIndex, match.index);
        element.appendChild(span);
        const code = document.createElement('code');
        code.textContent = match[1];
        lastIndex = match.index + match[0].length;
        element.appendChild(code);
      }
    }
    if (lastIndex < message.length) {
      const span = document.createElement('span');
      span.textContent = message.substring(lastIndex, message.length);
      element.appendChild(span);
    }
  };
  const message = document.createElement('div');
  message.classList.add('message');
  const messageContent = document.createElement('p');
  appendStyled(messageContent, text);
  message.append(messageContent);

  const resolutionParagraph = document.createElement('p');
  message.append(resolutionParagraph);

  const resolutionParagraphTextContent = document.createElement('span');
  appendStyled(resolutionParagraphTextContent, resolveMessage);
  resolutionParagraph.append(resolutionParagraphTextContent);

  if (resolutions.length > 0) {
    const resolutionList = document.createElement('ul');
    resolutionList.classList.add('resolutions-list');
    resolutionParagraph.append(resolutionList);

    for (const resolution of resolutions) {
      const listItem = document.createElement('li');
      appendStyled(listItem, resolution);
      resolutionList.append(listItem);
    }
  }

  return message;
}

const resolutionsRead = [
  ls`Specify |SameSite=None| and |Secure| if the cookie should be sent in cross-site requests. This enables third-party use.`,
  ls`Specify |SameSite=Strict| or |SameSite=Lax| if the cookie should not be sent in cross-site requests`,
];

const resolutionsSet = [
  ls`Specify |SameSite=None| and |Secure| if the cookie is intended to be set in cross-site contexts. Note that only cookies sent over HTTPS may use the |Secure| attribute.`,
  ls`Specify |SameSite=Strict| or |SameSite=Lax| if the cookie should not be set by cross-site requests`,
];

const resolveBySentence = ls`Resolve this issue by updating the attributes of the cookie:`;

const sameSiteUnspecifiedErrorRead = {
  title: ls`Indicate whether to send a cookie in a cross-site request by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute was not set or is invalid, it defaults to |SameSite=Lax|, which prevents the cookie from being sent in a cross-site request.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedErrorSet = {
  title:
      ls`Indicate whether a cookie is intended to be set in a cross-site context by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute  was not set or is invalid, it defaults to |SameSite=Lax|, which prevents the cookie from being set in a cross-site context.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnRead = {
  title: ls`Indicate whether to send a cookie in a cross-site request by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute was not set or is invalid, it defaults to |SameSite=Lax|, which will prevent the cookie from being sent in a cross-site request in a future version of the browser.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnSet = {
  title: ls`Indicate whether a cookie is intended to be set in cross-site context by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute was not set or is invalid, it defaults to |SameSite=Lax|, which will prevents the cookie from being set in a cross-site context in a future version of the browser.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorRead = {
  title: ls`Mark cross-site cookies as Secure to allow them to be sent in cross-site requests`,
  message: () => textMessageWithResolutions(
      ls`Cookies marked with |SameSite=None| must also be marked with |Secure| to get sent in cross-site requests.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorSet = {
  title: ls`Mark cross-site cookies as Secure to allow setting them in cross-site contexts`,
  message: () => textMessageWithResolutions(
      ls`Cookies marked with |SameSite=None| must also be marked with |Secure| to allow setting them in a cross-site context.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnRead = {
  title: ls`Mark cross-site cookies as Secure to allow them to be sent in cross-site requests`,
  message: () => textMessageWithResolutions(
      ls`In a future version of the browser, cookies marked with |SameSite=None| must also be marked with |Secure| to get sent in cross-site requests.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnSet = {
  title: ls`Mark cross-site cookies as Secure to allow setting them in cross-site contexts`,
  message: () => textMessageWithResolutions(
      ls`In a future version of the browser, cookies marked with |SameSite=None| must also be marked with |Secure| to allow setting them in a cross-site context.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: ls`https://web.dev/samesite-cookies-explained/`, linkTitle: ls`SameSite cookies explained`}],
};

/**
 * @type {!Array<!{link: string, linkTitle: string}>}
 */
const schemefulSameSiteArticles = [];

const resolveBySentenceForDowngrade =
    ls`Resolve this issue by migrating your site entirely to HTTPS. It is also recommended to mark the cookie with the |Secure| attribute if that is not already the case.`;

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnStrictLaxDowngradeStrict(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to continue having cookies sent on same-site requests`,
    message: () => textMessageWithResolutions(
        ls`A cookie is being sent from ${origin} context to ${
            destination} origin on a navigation and is specified with |SameSite=Strict|.
        Because this cookie is being sent across schemes on the same site, it will not be sent in a future version of Chrome.
        This behavior protects user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnCrossDowngradeRead(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to continue having cookies sent to same-site subresources`,
    message: () => textMessageWithResolutions(
        ls`A cookie is being sent from ${origin} context to ${
            destination} origin and is specified with |SameSite=Strict| or |SameSite=Lax|.
        Because this cookie is being sent across schemes on the same site, it will not be sent in a future version of Chrome.
        This behavior protects user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnCrossDowngradeSet(isSecure) {
  const origin = isSecure ? ls`a secure` : ls`an insecure`;
  const destination = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to continue allowing cookies to be set by same-site subresources`,
    message: () => textMessageWithResolutions(
        ls`A cookie is being set by ${origin} origin in ${
            destination} context and is specified with |SameSite=Strict| or |SameSite=Lax|.
        Because this cookie is being set across schemes on the same site, it will be blocked in a future version of Chrome.
        This behavior protects user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/** @type {!Map<string, !IssueDescription>} */
const issueDescriptions = new Map([
  ['SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie', sameSiteUnspecifiedErrorRead],
  ['SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie', sameSiteUnspecifiedErrorSet],
  // These two don't have a deprecation date yet, but they need to be fixed eventually.
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie', sameSiteUnspecifiedWarnSet],
  ['SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureErrorRead],
  ['SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureErrorSet],
  ['SameSiteCookieIssue::WarnSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureWarnSet],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie', sameSiteUnspecifiedWarnSet],
  ['SameSiteCookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure', sameSiteWarnStrictLaxDowngradeStrict(true)],
  ['SameSiteCookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure', sameSiteWarnStrictLaxDowngradeStrict(false)],
  ['SameSiteCookieIssue::WarnCrossDowngrade::ReadCookie::Secure', sameSiteWarnCrossDowngradeRead(true)],
  ['SameSiteCookieIssue::WarnCrossDowngrade::ReadCookie::Insecure', sameSiteWarnCrossDowngradeRead(false)],
  ['SameSiteCookieIssue::WarnCrossDowngrade::SetCookie::Secure', sameSiteWarnCrossDowngradeSet(true)],
  ['SameSiteCookieIssue::WarnCrossDowngrade::SetCookie::Insecure', sameSiteWarnCrossDowngradeSet(false)]
]);
