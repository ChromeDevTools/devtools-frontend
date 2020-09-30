
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';

import {FrameManager} from './FrameManager.js';
import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars
import {ResourceTreeFrame} from './ResourceTreeModel.js';                      // eslint-disable-line no-unused-vars

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
   * Returns an array of issues from a given SameSiteCookieIssueDetails.
   *
   * @param {!Protocol.Audits.SameSiteCookieIssueDetails} sameSiteDetails
   * @return {!Array<!Issue>}
   */
  static createIssuesFromSameSiteDetails(sameSiteDetails) {
    /** @type {!Array<!Issue>} */
    const issues = [];

    // Exclusion reasons have priority. It means a cookie was blocked. Create an issue
    // for every exclusion reason but ignore warning reasons if the cookie was blocked.
    // Some exclusion reasons are dependent on warning reasons existing in order to produce an issue.
    if (sameSiteDetails.cookieExclusionReasons && sameSiteDetails.cookieExclusionReasons.length > 0) {
      for (const exclusionReason of sameSiteDetails.cookieExclusionReasons) {
        const code = SameSiteCookieIssue.codeForSameSiteDetails(
            exclusionReason, sameSiteDetails.cookieWarningReasons, sameSiteDetails.operation,
            sameSiteDetails.cookieUrl);
        if (code) {
          issues.push(new SameSiteCookieIssue(code, sameSiteDetails));
        }
      }
      return issues;
    }

    if (sameSiteDetails.cookieWarningReasons) {
      for (const warningReason of sameSiteDetails.cookieWarningReasons) {
        // warningReasons should be an empty array here.
        const code = SameSiteCookieIssue.codeForSameSiteDetails(
            warningReason, [], sameSiteDetails.operation, sameSiteDetails.cookieUrl);
        if (code) {
          issues.push(new SameSiteCookieIssue(code, sameSiteDetails));
        }
      }
    }
    return issues;
  }

  /**
   * Calculates an issue code from a reason, an operation, and an array of warningReasons. All these together
   * can uniquely identify a specific SameSite cookie issue.
   * warningReasons is only needed for some SameSiteCookieExclusionReason in order to determine if an issue should be raised.
   * It is not required if reason is a SameSiteCookieWarningReason.
   *
   * @param {!Protocol.Audits.SameSiteCookieExclusionReason|!Protocol.Audits.SameSiteCookieWarningReason} reason
   * @param {!Array<!Protocol.Audits.SameSiteCookieWarningReason>} warningReasons
   * @param {!Protocol.Audits.SameSiteCookieOperation} operation
   * @param {string|undefined} cookieUrl
   * @returns {?string}
   */
  static codeForSameSiteDetails(reason, warningReasons, operation, cookieUrl) {
    const isURLSecure = cookieUrl && (cookieUrl.startsWith('https://') || cookieUrl.startsWith('wss://'));
    const secure = isURLSecure ? 'Secure' : 'Insecure';

    if (reason === Protocol.Audits.SameSiteCookieExclusionReason.ExcludeSameSiteStrict ||
        reason === Protocol.Audits.SameSiteCookieExclusionReason.ExcludeSameSiteLax ||
        reason === Protocol.Audits.SameSiteCookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
      if (warningReasons && warningReasons.length > 0) {
        if (warningReasons.includes(Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict)) {
          return [
            Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, 'ExcludeNavigationContextDowngrade', secure
          ].join('::');
        }

        if (warningReasons.includes(
                Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict) ||
            warningReasons.includes(Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteStrictCrossDowngradeLax) ||
            warningReasons.includes(Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict) ||
            warningReasons.includes(Protocol.Audits.SameSiteCookieWarningReason.WarnSameSiteLaxCrossDowngradeLax)) {
          return [
            Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, 'ExcludeContextDowngrade', operation, secure
          ].join('::');
        }
      }

      // If we have ExcludeSameSiteUnspecifiedTreatedAsLax but no corresponding warnings, then add just
      // the Issue code for ExcludeSameSiteUnspecifiedTreatedAsLax.
      if (reason === Protocol.Audits.SameSiteCookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
        return [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, reason, operation].join('::');
      }

      // ExcludeSameSiteStrict and ExcludeSameSiteLax require being paired with an appropriate warning. We didn't
      // find one of those warnings so return null to indicate there shouldn't be an issue created.
      return null;
    }

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

  /**
   * @override
   * @return {boolean}
   */
  isCausedByThirdParty() {
    const topFrame = FrameManager.instance().getTopFrame();
    return isCausedByThirdParty(topFrame, this._issueDetails.cookieUrl);
  }
}

/**
 * @param {?ResourceTreeFrame} topFrame
 * @param {(string|undefined)} cookieUrl
 * @return {boolean}
 *
 * Exported for unit test.
 */
export function isCausedByThirdParty(topFrame, cookieUrl) {
  if (!topFrame) {
    // The top frame is not yet available. Consider this issue as a third-party issue
    // until the top frame is available. This will prevent the issue from being visible
    // for only just a split second.
    return true;
  }

  // In the case of no domain and registry, we assume its an IP address or localhost
  // during development, in this case we classify the issue as first-party.
  if (!cookieUrl || topFrame.domainAndRegistry() === '') {
    return false;
  }

  const parsedCookieUrl = Common.ParsedURL.ParsedURL.fromString(cookieUrl);
  if (!parsedCookieUrl) {
    return false;
  }

  // For both operation types we compare the cookieUrl's domain  with the top frames
  // registered domain to determine first-party vs third-party. If they don't match
  // then we consider this issue a third-party issue.
  //
  // For a Set operation: The Set-Cookie response is part of a request to a third-party.
  //
  // For a Read operation: The cookie was included in a request to a third-party
  //     site. Only cookies that have their domain also set to this third-party
  //     are included in the request. We assume that the cookie was set by the same
  //     third-party at some point, so we treat this as a third-party issue.
  //
  // TODO(crbug.com/1080589): Use "First-Party sets" instead of the sites registered domain.
  return !IsSubdomainOf(parsedCookieUrl.domain(), topFrame.domainAndRegistry());
}

/**
 * @param {string} subdomain
 * @param {string} superdomain
 * @return {boolean}
 */
function IsSubdomainOf(subdomain, superdomain) {
  // Subdomain must be identical or have strictly more labels than the
  // superdomain.
  if (subdomain.length <= superdomain.length) {
    return subdomain === superdomain;
  }

  // Superdomain must be suffix of subdomain, and the last character not
  // included in the matching substring must be a dot.
  if (!subdomain.endsWith(superdomain)) {
    return false;
  }

  const subdomainWithoutSuperdomian = subdomain.substr(0, subdomain.length - superdomain.length);
  return subdomainWithoutSuperdomian.endsWith('.');
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
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedErrorSet = {
  title:
      ls`Indicate whether a cookie is intended to be set in a cross-site context by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute  was not set or is invalid, it defaults to |SameSite=Lax|, which prevents the cookie from being set in a cross-site context.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnRead = {
  title: ls`Indicate whether to send a cookie in a cross-site request by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute was not set or is invalid, it defaults to |SameSite=Lax|, which will prevent the cookie from being sent in a cross-site request in a future version of the browser.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnSet = {
  title: ls`Indicate whether a cookie is intended to be set in cross-site context by specifying its SameSite attribute`,
  message: () => textMessageWithResolutions(
      ls`Because a cookie's |SameSite| attribute was not set or is invalid, it defaults to |SameSite=Lax|, which will prevents the cookie from being set in a cross-site context in a future version of the browser.
       This behavior protects user data from accidentally leaking to third parties and cross-site request forgery.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorRead = {
  title: ls`Mark cross-site cookies as Secure to allow them to be sent in cross-site requests`,
  message: () => textMessageWithResolutions(
      ls`Cookies marked with |SameSite=None| must also be marked with |Secure| to get sent in cross-site requests.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorSet = {
  title: ls`Mark cross-site cookies as Secure to allow setting them in cross-site contexts`,
  message: () => textMessageWithResolutions(
      ls`Cookies marked with |SameSite=None| must also be marked with |Secure| to allow setting them in a cross-site context.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnRead = {
  title: ls`Mark cross-site cookies as Secure to allow them to be sent in cross-site requests`,
  message: () => textMessageWithResolutions(
      ls`In a future version of the browser, cookies marked with |SameSite=None| must also be marked with |Secure| to get sent in cross-site requests.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsRead),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnSet = {
  title: ls`Mark cross-site cookies as Secure to allow setting them in cross-site contexts`,
  message: () => textMessageWithResolutions(
      ls`In a future version of the browser, cookies marked with |SameSite=None| must also be marked with |Secure| to allow setting them in a cross-site context.
       This behavior protects user data from being sent over an insecure connection.`,
      resolveBySentence, resolutionsSet),
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

/**
 * @type {!Array<!{link: string, linkTitle: string}>}
 */
const schemefulSameSiteArticles = [{
  link: 'https://www.chromium.org/updates/schemeful-same-site/schemeful-same-site-devtools-issues',
  linkTitle: ls`How Schemeful Same-Site Works`
}];

const resolveBySentenceForDowngrade =
    ls`Resolve this issue by migrating your site (as defined by the eTLD+1) entirely to HTTPS. It is also recommended to mark the cookie with the |Secure| attribute if that is not already the case.`;

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnStrictLaxDowngradeStrict(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to continue having cookies sent on same-site requests`,
    message: () => textMessageWithResolutions(
        ls`A cookie is being sent to ${destination} origin from ${origin} context on a navigation.
        Because this cookie is being sent across schemes on the same site, it will not be sent in a future version of Chrome.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteExcludeNavigationContextDowngrade(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to have cookies sent on same-site requests`,
    message: () => textMessageWithResolutions(
        ls`A cookie was not sent to ${destination} origin from ${origin} context on a navigation.
        Because this cookie would have been sent across schemes on the same site, it was not sent.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
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
        ls`A cookie is being sent to ${destination} origin from ${origin} context.
        Because this cookie is being sent across schemes on the same site, it will not be sent in a future version of Chrome.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteExcludeContextDowngradeRead(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to have cookies sent to same-site subresources`,
    message: () => textMessageWithResolutions(
        ls`A cookie was not sent to ${destination} origin from ${origin} context.
        Because this cookie would have been sent across schemes on the same site, it was not sent.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
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
        ls`A cookie is being set by ${origin} origin in ${destination} context.
        Because this cookie is being set across schemes on the same site, it will be blocked in a future version of Chrome.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
        resolveBySentenceForDowngrade, []),
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteExcludeContextDowngradeSet(isSecure) {
  const destination = isSecure ? ls`a secure` : ls`an insecure`;
  const origin = !isSecure ? ls`a secure` : ls`an insecure`;
  return {
    title: ls`Migrate entirely to HTTPS to allow cookies to be set by same-site subresources`,
    message: () => textMessageWithResolutions(
        ls`A cookie was not set by ${origin} origin in ${destination} context.
        Because this cookie would have been set across schemes on the same site, it was blocked.
        This behavior enhances the |SameSite| attribute’s protection of user data from request forgery by network attackers.`,
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
  ['SameSiteCookieIssue::WarnCrossDowngrade::SetCookie::Insecure', sameSiteWarnCrossDowngradeSet(false)],
  ['SameSiteCookieIssue::ExcludeNavigationContextDowngrade::Secure', sameSiteExcludeNavigationContextDowngrade(true)],
  [
    'SameSiteCookieIssue::ExcludeNavigationContextDowngrade::Insecure', sameSiteExcludeNavigationContextDowngrade(false)
  ],
  ['SameSiteCookieIssue::ExcludeContextDowngrade::ReadCookie::Secure', sameSiteExcludeContextDowngradeRead(true)],
  ['SameSiteCookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure', sameSiteExcludeContextDowngradeRead(false)],
  ['SameSiteCookieIssue::ExcludeContextDowngrade::SetCookie::Secure', sameSiteExcludeContextDowngradeSet(true)],
  ['SameSiteCookieIssue::ExcludeContextDowngrade::SetCookie::Insecure', sameSiteExcludeContextDowngradeSet(false)]
]);
