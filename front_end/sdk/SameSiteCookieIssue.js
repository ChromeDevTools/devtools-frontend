
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';

import {FrameManager} from './FrameManager.js';
import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';                                  // eslint-disable-line no-unused-vars
import {ResourceTreeFrame} from './ResourceTreeModel.js';                      // eslint-disable-line no-unused-vars

export class SameSiteCookieIssue extends Issue {
  /**
   * @param {string} code
   * @param {!Protocol.Audits.SameSiteCookieIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(code, issueDetails, issuesModel) {
    super(code, issuesModel);
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
   * @param {!IssuesModel} issuesModel
   * @return {!Array<!Issue>}
   */
  static createIssuesFromSameSiteDetails(sameSiteDetails, issuesModel) {
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
          issues.push(new SameSiteCookieIssue(code, sameSiteDetails, issuesModel));
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
          issues.push(new SameSiteCookieIssue(code, sameSiteDetails, issuesModel));
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
   * @returns {?MarkdownIssueDescription}
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

const sameSiteUnspecifiedErrorRead = {
  file: 'issues/descriptions/SameSiteUnspecifiedTreatedAsLaxRead.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedErrorSet = {
  file: 'issues/descriptions/SameSiteUnspecifiedTreatedAsLaxSet.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnRead = {
  file: 'issues/descriptions/SameSiteUnspecifiedLaxAllowUnsafeRead.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteUnspecifiedWarnSet = {
  file: 'issues/descriptions/SameSiteUnspecifiedLaxAllowUnsafeSet.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorRead = {
  file: 'issues/descriptions/SameSiteNoneInsecureErrorRead.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureErrorSet = {
  file: 'issues/descriptions/SameSiteNoneInsecureErrorSet.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnRead = {
  file: 'issues/descriptions/SameSiteNoneInsecureWarnRead.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

const sameSiteNoneInsecureWarnSet = {
  file: 'issues/descriptions/SameSiteNoneInsecureWarnSet.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/samesite-cookies-explained/', linkTitle: ls`SameSite cookies explained`}],
};

/**
 * @type {!Array<!{link: string, linkTitle: string}>}
 */
const schemefulSameSiteArticles =
    [{link: 'https://web.dev/schemeful-samesite/', linkTitle: ls`How Schemeful Same-Site Works`}];

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnStrictLaxDowngradeStrict(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_destination', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_origin', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteWarnStrictLaxDowngradeStrict.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteExcludeNavigationContextDowngrade(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_destination', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_origin', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteExcludeNavigationContextDowngrade.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnCrossDowngradeRead(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_destination', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_origin', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteWarnCrossDowngradeRead.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteExcludeContextDowngradeRead(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_destination', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_origin', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteExcludeContextDowngradeRead.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 */
function sameSiteWarnCrossDowngradeSet(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_ORIGIN', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_DESTINATION', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteWarnCrossDowngradeSet.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/**
 * @param {boolean} isSecure
 * @return {!MarkdownIssueDescription}
 */
function sameSiteExcludeContextDowngradeSet(isSecure) {
  const substitutions = new Map([
    ['PLACEHOLDER_destination', isSecure ? ls`a secure` : ls`an insecure`],
    ['PLACEHOLDER_origin', !isSecure ? ls`a secure` : ls`an insecure`],
  ]);
  return {
    file: 'issues/descriptions/SameSiteExcludeContextDowngradeSet.md',
    substitutions,
    issueKind: IssueKind.BreakingChange,
    links: schemefulSameSiteArticles,
  };
}

/** @type {!Map<string, !MarkdownIssueDescription>} */
const issueDescriptions = new Map([
  ['SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie', sameSiteUnspecifiedErrorRead],
  ['SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie', sameSiteUnspecifiedErrorSet],
  // These two don't have a deprecation date yet, but they need to be fixed eventually.
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie', sameSiteUnspecifiedWarnSet],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie', sameSiteUnspecifiedWarnSet],
  ['SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureErrorRead],
  ['SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureErrorSet],
  ['SameSiteCookieIssue::WarnSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureWarnRead],
  ['SameSiteCookieIssue::WarnSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureWarnSet],
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
  ['SameSiteCookieIssue::ExcludeContextDowngrade::SetCookie::Insecure', sameSiteExcludeContextDowngradeSet(false)],
]);
