
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Label for the link for SameSiteCookies Issues
   */
  samesiteCookiesExplained: 'SameSite cookies explained',
  /**
   *@description Label for the link for Schemeful Same-Site Issues
   */
  howSchemefulSamesiteWorks: 'How Schemeful Same-Site Works',
  /**
   *@description Phrase used to describe the security of a context. Substitued like 'a secure context' or 'a secure origin'.
   */
  aSecure: 'a secure',  // eslint-disable-line rulesdir/l10n_no_unused_message
  /**
   * @description Phrase used to describe the security of a context. Substitued like 'an insecure context' or 'an insecure origin'.
   */
  anInsecure: 'an insecure',  // eslint-disable-line rulesdir/l10n_no_unused_message
  /**
   * @description Label for a link for SameParty Issues. 'Attribute' refers to a cookie attribute.
   */
  firstPartySetsExplained: '`First-Party Sets` and the `SameParty` attribute',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class CookieIssue extends Issue {
  #issueDetails: Protocol.Audits.CookieIssueDetails;

  constructor(
      code: string, issueDetails: Protocol.Audits.CookieIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(code, issuesModel);
    this.#issueDetails = issueDetails;
  }

  #cookieId(): string {
    if (this.#issueDetails.cookie) {
      const {domain, path, name} = this.#issueDetails.cookie;
      const cookieId = `${domain};${path};${name}`;
      return cookieId;
    }
    return this.#issueDetails.rawCookieLine ?? 'no-cookie-info';
  }

  primaryKey(): string {
    const requestId = this.#issueDetails.request ? this.#issueDetails.request.requestId : 'no-request';
    return `${this.code()}-(${this.#cookieId()})-(${requestId})`;
  }

  /**
   * Returns an array of issues from a given CookieIssueDetails.
   */
  static createIssuesFromCookieIssueDetails(
      cookieIssueDetails: Protocol.Audits.CookieIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel): CookieIssue[] {
    const issues: CookieIssue[] = [];

    // Exclusion reasons have priority. It means a cookie was blocked. Create an issue
    // for every exclusion reason but ignore warning reasons if the cookie was blocked.
    // Some exclusion reasons are dependent on warning reasons existing in order to produce an issue.
    if (cookieIssueDetails.cookieExclusionReasons && cookieIssueDetails.cookieExclusionReasons.length > 0) {
      for (const exclusionReason of cookieIssueDetails.cookieExclusionReasons) {
        const code = CookieIssue.codeForCookieIssueDetails(
            exclusionReason, cookieIssueDetails.cookieWarningReasons, cookieIssueDetails.operation,
            cookieIssueDetails.cookieUrl);
        if (code) {
          issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel));
        }
      }
      return issues;
    }

    if (cookieIssueDetails.cookieWarningReasons) {
      for (const warningReason of cookieIssueDetails.cookieWarningReasons) {
        // warningReasons should be an empty array here.
        const code = CookieIssue.codeForCookieIssueDetails(
            warningReason, [], cookieIssueDetails.operation, cookieIssueDetails.cookieUrl);
        if (code) {
          issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel));
        }
      }
    }
    return issues;
  }

  /**
   * Calculates an issue code from a reason, an operation, and an array of warningReasons. All these together
   * can uniquely identify a specific cookie issue.
   * warningReasons is only needed for some CookieExclusionReason in order to determine if an issue should be raised.
   * It is not required if reason is a CookieWarningReason.
   */
  static codeForCookieIssueDetails(
      reason: Protocol.Audits.CookieExclusionReason|Protocol.Audits.CookieWarningReason,
      warningReasons: Protocol.Audits.CookieWarningReason[], operation: Protocol.Audits.CookieOperation,
      cookieUrl?: string): string|null {
    const isURLSecure = cookieUrl && (cookieUrl.startsWith('https://') || cookieUrl.startsWith('wss://'));
    const secure = isURLSecure ? 'Secure' : 'Insecure';

    if (reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteStrict ||
        reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteLax ||
        reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
      if (warningReasons && warningReasons.length > 0) {
        if (warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict)) {
          return [
            Protocol.Audits.InspectorIssueCode.CookieIssue,
            'ExcludeNavigationContextDowngrade',
            secure,
          ].join('::');
        }

        if (warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict) ||
            warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeLax) ||
            warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict) ||
            warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax)) {
          return [
            Protocol.Audits.InspectorIssueCode.CookieIssue,
            'ExcludeContextDowngrade',
            operation,
            secure,
          ].join('::');
        }
      }

      // If we have ExcludeSameSiteUnspecifiedTreatedAsLax but no corresponding warnings, then add just
      // the Issue code for ExcludeSameSiteUnspecifiedTreatedAsLax.
      if (reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
        return [Protocol.Audits.InspectorIssueCode.CookieIssue, reason, operation].join('::');
      }

      // ExcludeSameSiteStrict and ExcludeSameSiteLax require being paired with an appropriate warning. We didn't
      // find one of those warnings so return null to indicate there shouldn't be an issue created.
      return null;
    }

    if (reason === Protocol.Audits.CookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict) {
      return [Protocol.Audits.InspectorIssueCode.CookieIssue, reason, secure].join('::');
    }
    // These have the same message.
    if (reason === Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict ||
        reason === Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeLax ||
        reason === Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax ||
        reason === Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict) {
      return [Protocol.Audits.InspectorIssueCode.CookieIssue, 'WarnCrossDowngrade', operation, secure].join('::');
    }
    return [Protocol.Audits.InspectorIssueCode.CookieIssue, reason, operation].join('::');
  }

  cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    if (this.#issueDetails.cookie) {
      return [this.#issueDetails.cookie];
    }
    return [];
  }

  rawCookieLines(): Iterable<string> {
    if (this.#issueDetails.rawCookieLine) {
      return [this.#issueDetails.rawCookieLine];
    }
    return [];
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    if (this.#issueDetails.request) {
      return [this.#issueDetails.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.Cookie;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  isCausedByThirdParty(): boolean {
    const topFrame = SDK.FrameManager.FrameManager.instance().getTopFrame();
    return isCausedByThirdParty(topFrame, this.#issueDetails.cookieUrl);
  }

  getKind(): IssueKind {
    if (this.#issueDetails.cookieExclusionReasons?.length > 0) {
      return IssueKind.PageError;
    }
    return IssueKind.BreakingChange;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      CookieIssue[] {
    const cookieIssueDetails = inspectorIssue.details.cookieIssueDetails;
    if (!cookieIssueDetails) {
      console.warn('Cookie issue without details received.');
      return [];
    }

    return CookieIssue.createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel);
  }
}

/**
 * Exported for unit test.
 */
export function isCausedByThirdParty(
    topFrame: SDK.ResourceTreeModel.ResourceTreeFrame|null, cookieUrl?: string): boolean {
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
  return !isSubdomainOf(parsedCookieUrl.domain(), topFrame.domainAndRegistry());
}

function isSubdomainOf(subdomain: string, superdomain: string): boolean {
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

const sameSiteUnspecifiedErrorRead: LazyMarkdownIssueDescription = {
  file: 'SameSiteUnspecifiedTreatedAsLaxRead.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteUnspecifiedErrorSet: LazyMarkdownIssueDescription = {
  file: 'SameSiteUnspecifiedTreatedAsLaxSet.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteUnspecifiedWarnRead: LazyMarkdownIssueDescription = {
  file: 'SameSiteUnspecifiedLaxAllowUnsafeRead.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteUnspecifiedWarnSet: LazyMarkdownIssueDescription = {
  file: 'SameSiteUnspecifiedLaxAllowUnsafeSet.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteNoneInsecureErrorRead: LazyMarkdownIssueDescription = {
  file: 'SameSiteNoneInsecureErrorRead.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteNoneInsecureErrorSet: LazyMarkdownIssueDescription = {
  file: 'SameSiteNoneInsecureErrorSet.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteNoneInsecureWarnRead: LazyMarkdownIssueDescription = {
  file: 'SameSiteNoneInsecureWarnRead.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const sameSiteNoneInsecureWarnSet: LazyMarkdownIssueDescription = {
  file: 'SameSiteNoneInsecureWarnSet.md',
  links: [
    {
      link: 'https://web.dev/samesite-cookies-explained/',
      linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
    },
  ],
};

const schemefulSameSiteArticles =
    [{link: 'https://web.dev/schemeful-samesite/', linkTitle: i18nLazyString(UIStrings.howSchemefulSamesiteWorks)}];

function schemefulSameSiteSubstitutions(
    {isDestinationSecure, isOriginSecure}: {isDestinationSecure: boolean, isOriginSecure: boolean}):
    Map<string, () => string> {
  return new Map([
    // TODO(crbug.com/1168438): Use translated phrases once the issue description is localized.
    ['PLACEHOLDER_destination', (): string => isDestinationSecure ? 'a secure' : 'an insecure'],
    ['PLACEHOLDER_origin', (): string => isOriginSecure ? 'a secure' : 'an insecure'],
  ]);
}

function sameSiteWarnStrictLaxDowngradeStrict(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteWarnStrictLaxDowngradeStrict.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: isSecure, isOriginSecure: !isSecure}),
    links: schemefulSameSiteArticles,
  };
}

function sameSiteExcludeNavigationContextDowngrade(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteExcludeNavigationContextDowngrade.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: isSecure, isOriginSecure: !isSecure}),
    links: schemefulSameSiteArticles,
  };
}

function sameSiteWarnCrossDowngradeRead(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteWarnCrossDowngradeRead.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: isSecure, isOriginSecure: !isSecure}),
    links: schemefulSameSiteArticles,
  };
}

function sameSiteExcludeContextDowngradeRead(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteExcludeContextDowngradeRead.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: isSecure, isOriginSecure: !isSecure}),
    links: schemefulSameSiteArticles,
  };
}

function sameSiteWarnCrossDowngradeSet(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteWarnCrossDowngradeSet.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: !isSecure, isOriginSecure: isSecure}),
    links: schemefulSameSiteArticles,
  };
}

function sameSiteExcludeContextDowngradeSet(isSecure: boolean): LazyMarkdownIssueDescription {
  return {
    file: 'SameSiteExcludeContextDowngradeSet.md',
    substitutions: schemefulSameSiteSubstitutions({isDestinationSecure: isSecure, isOriginSecure: !isSecure}),
    links: schemefulSameSiteArticles,
  };
}

const sameSiteInvalidSameParty: LazyMarkdownIssueDescription = {
  file: 'SameSiteInvalidSameParty.md',
  links: [{
    link: 'https://developer.chrome.com/blog/first-party-sets-sameparty/',
    linkTitle: i18nLazyString(UIStrings.firstPartySetsExplained),
  }],
};

const samePartyCrossPartyContextSet: LazyMarkdownIssueDescription = {
  file: 'SameSiteSamePartyCrossPartyContextSet.md',
  links: [{
    link: 'https://developer.chrome.com/blog/first-party-sets-sameparty/',
    linkTitle: i18nLazyString(UIStrings.firstPartySetsExplained),
  }],
};

const attributeValueExceedsMaxSize: LazyMarkdownIssueDescription = {
  file: 'CookieAttributeValueExceedsMaxSize.md',
  links: [],
};

const warnDomainNonAscii: LazyMarkdownIssueDescription = {
  file: 'cookieWarnDomainNonAscii.md',
  links: [],
};

const excludeDomainNonAscii: LazyMarkdownIssueDescription = {
  file: 'cookieExcludeDomainNonAscii.md',
  links: [],
};

const issueDescriptions: Map<string, LazyMarkdownIssueDescription> = new Map([
  ['CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie', sameSiteUnspecifiedErrorRead],
  ['CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie', sameSiteUnspecifiedErrorSet],
  // These two don't have a deprecation date yet, but they need to be fixed eventually.
  ['CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie', sameSiteUnspecifiedWarnSet],
  ['CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie', sameSiteUnspecifiedWarnSet],
  ['CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureErrorRead],
  ['CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureErrorSet],
  ['CookieIssue::WarnSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureWarnRead],
  ['CookieIssue::WarnSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureWarnSet],
  ['CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure', sameSiteWarnStrictLaxDowngradeStrict(true)],
  ['CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure', sameSiteWarnStrictLaxDowngradeStrict(false)],
  ['CookieIssue::WarnCrossDowngrade::ReadCookie::Secure', sameSiteWarnCrossDowngradeRead(true)],
  ['CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure', sameSiteWarnCrossDowngradeRead(false)],
  ['CookieIssue::WarnCrossDowngrade::SetCookie::Secure', sameSiteWarnCrossDowngradeSet(true)],
  ['CookieIssue::WarnCrossDowngrade::SetCookie::Insecure', sameSiteWarnCrossDowngradeSet(false)],
  ['CookieIssue::ExcludeNavigationContextDowngrade::Secure', sameSiteExcludeNavigationContextDowngrade(true)],
  [
    'CookieIssue::ExcludeNavigationContextDowngrade::Insecure',
    sameSiteExcludeNavigationContextDowngrade(false),
  ],
  ['CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure', sameSiteExcludeContextDowngradeRead(true)],
  ['CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure', sameSiteExcludeContextDowngradeRead(false)],
  ['CookieIssue::ExcludeContextDowngrade::SetCookie::Secure', sameSiteExcludeContextDowngradeSet(true)],
  ['CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure', sameSiteExcludeContextDowngradeSet(false)],
  ['CookieIssue::ExcludeInvalidSameParty::SetCookie', sameSiteInvalidSameParty],
  ['CookieIssue::ExcludeSamePartyCrossPartyContext::SetCookie', samePartyCrossPartyContextSet],
  ['CookieIssue::WarnAttributeValueExceedsMaxSize::ReadCookie', attributeValueExceedsMaxSize],
  ['CookieIssue::WarnAttributeValueExceedsMaxSize::SetCookie', attributeValueExceedsMaxSize],
  ['CookieIssue::WarnDomainNonASCII::ReadCookie', warnDomainNonAscii],
  ['CookieIssue::WarnDomainNonASCII::SetCookie', warnDomainNonAscii],
  ['CookieIssue::ExcludeDomainNonASCII::ReadCookie', excludeDomainNonAscii],
  ['CookieIssue::ExcludeDomainNonASCII::SetCookie', excludeDomainNonAscii],
]);
