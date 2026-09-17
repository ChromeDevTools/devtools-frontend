
// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Label for the link for SameSite cookie issues.
   */
  samesiteCookiesExplained: 'SameSite cookies explained',
  /**
   * @description Label for a link for cross-site redirect issues.
   */
  fileCrosSiteRedirectBug: 'File a bug',
  /**
   * @description Text to show in Console panel when a third-party cookie is blocked in Chrome.
   */
  consoleTpcdErrorMessage: 'Third-party cookie blocked in Chrome due to Chrome flags or browser settings',

} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

/** The enum string values need to match the IssueExpanded enum values in UserMetrics.ts. **/
export const enum CookieIssueSubCategory {
  GENERIC_COOKIE = 'GenericCookie',
  SAME_SITE_COOKIE = 'SameSiteCookie',
}

/** Enum to show cookie status from the security panel's third-party cookie report tool **/
export const enum CookieStatus {
  BLOCKED = 0,
  ALLOWED = 1,
  ALLOWED_BY_GRACE_PERIOD = 2,
  ALLOWED_BY_HEURISTICS = 3,
}

export class CookieIssue extends Issue<Protocol.Audits.CookieIssueDetails> {
  readonly #frameManager: SDK.FrameManager.FrameManager;

  constructor(code: string, issueDetails: Protocol.Audits.CookieIssueDetails,
              issuesModel: SDK.IssuesModel.IssuesModel|null, issueId: Protocol.Audits.IssueId|undefined,
              frameManager: SDK.FrameManager.FrameManager) {
    super(code, issueDetails, issuesModel, issueId);
    this.#frameManager = frameManager;
  }

  cookieId(): string {
    const details = this.details();
    if (details.cookie) {
      const {domain, path, name} = details.cookie;
      const cookieId = `${domain};${path};${name}`;
      return cookieId;
    }
    return this.details().rawCookieLine ?? 'no-cookie-info';
  }

  primaryKey(): string {
    const details = this.details();
    const requestId = details.request ? details.request.requestId : 'no-request';
    return `${this.code()}-(${this.cookieId()})-(${requestId})`;
  }

  /**
   * Returns an array of issues from a given CookieIssueDetails.
   */
  static createIssuesFromCookieIssueDetails(cookieIssueDetails: Protocol.Audits.CookieIssueDetails,
                                            issuesModel: SDK.IssuesModel.IssuesModel|null,
                                            issueId: Protocol.Audits.IssueId|undefined,
                                            frameManager: SDK.FrameManager.FrameManager): CookieIssue[] {
    const issues: CookieIssue[] = [];

    // Exclusion reasons have priority. It means a cookie was blocked. Create an issue
    // for every exclusion reason but ignore warning reasons if the cookie was blocked.
    // Some exclusion reasons are dependent on warning reasons existing in order to produce an issue.
    if (cookieIssueDetails.cookieExclusionReasons && cookieIssueDetails.cookieExclusionReasons.length > 0) {
      for (const exclusionReason of cookieIssueDetails.cookieExclusionReasons) {
        const code = CookieIssue.codeForCookieIssueDetails(exclusionReason, cookieIssueDetails.cookieWarningReasons,
                                                           cookieIssueDetails.operation);
        if (code) {
          issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel, issueId, frameManager));
        }
      }
      return issues;
    }

    if (cookieIssueDetails.cookieWarningReasons) {
      for (const warningReason of cookieIssueDetails.cookieWarningReasons) {
        // warningReasons should be an empty array here.
        const code = CookieIssue.codeForCookieIssueDetails(warningReason, [], cookieIssueDetails.operation);
        if (code) {
          issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel, issueId, frameManager));
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
   *
   * The issue code will be mapped to a CookieIssueSubCategory enum for metric purpose.
   */
  static codeForCookieIssueDetails(reason: Protocol.Audits.CookieExclusionReason|Protocol.Audits.CookieWarningReason,
                                   warningReasons: Protocol.Audits.CookieWarningReason[],
                                   operation: Protocol.Audits.CookieOperation): string|null {
    if (reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteStrict ||
        reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteLax ||
        reason === Protocol.Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax) {
      if (warningReasons.includes(Protocol.Audits.CookieWarningReason.WarnCrossSiteRedirectDowngradeChangesInclusion)) {
        return [
          Protocol.Audits.InspectorIssueCode.CookieIssue,
          'CrossSiteRedirectDowngradeChangesInclusion',
        ].join('::');
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

    if (reason === Protocol.Audits.CookieExclusionReason.ExcludePortMismatch) {
      return [Protocol.Audits.InspectorIssueCode.CookieIssue, 'ExcludePortMismatch'].join('::');
    }

    if (reason === Protocol.Audits.CookieExclusionReason.ExcludeSchemeMismatch) {
      return [Protocol.Audits.InspectorIssueCode.CookieIssue, 'ExcludeSchemeMismatch'].join('::');
    }
    return [Protocol.Audits.InspectorIssueCode.CookieIssue, reason, operation].join('::');
  }

  override cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    const details = this.details();
    if (details.cookie) {
      return [details.cookie];
    }
    return [];
  }

  override rawCookieLines(): Iterable<string> {
    const details = this.details();
    if (details.rawCookieLine) {
      return [details.rawCookieLine];
    }
    return [];
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.COOKIE;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  override isCausedByThirdParty(): boolean {
    const outermostFrame = this.#frameManager.getOutermostFrame();
    return isCausedByThirdParty(outermostFrame, this.details().cookieUrl, this.details().siteForCookies);
  }

  getKind(): IssueKind {
    if (this.details().cookieExclusionReasons?.length > 0) {
      return IssueKind.PAGE_ERROR;
    }
    return IssueKind.BREAKING_CHANGE;
  }

  static getCookieStatus(cookieIssueDetails: Protocol.Audits.CookieIssueDetails): CookieStatus|undefined {
    if (cookieIssueDetails.cookieExclusionReasons.includes(
            Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout)) {
      return CookieStatus.BLOCKED;
    }

    if (cookieIssueDetails.cookieWarningReasons.includes(
            Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata)) {
      return CookieStatus.ALLOWED_BY_GRACE_PERIOD;
    }

    if (cookieIssueDetails.cookieWarningReasons.includes(
            Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic)) {
      return CookieStatus.ALLOWED_BY_HEURISTICS;
    }

    if (cookieIssueDetails.cookieWarningReasons.includes(Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout)) {
      return CookieStatus.ALLOWED;
    }

    return;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel|null,
                            inspectorIssue: Protocol.Audits.InspectorIssue,
                            frameManager: SDK.FrameManager.FrameManager): CookieIssue[] {
    const cookieIssueDetails = inspectorIssue.details.cookieIssueDetails;
    if (!cookieIssueDetails) {
      console.warn('Cookie issue without details received.');
      return [];
    }

    return CookieIssue.createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, inspectorIssue.issueId,
                                                          frameManager);
  }

  static getSubCategory(code: string): CookieIssueSubCategory {
    if (code.includes('SameSite') || code.includes('Downgrade')) {
      return CookieIssueSubCategory.SAME_SITE_COOKIE;
    }
    return CookieIssueSubCategory.GENERIC_COOKIE;
  }

  static isThirdPartyCookiePhaseoutRelatedIssue(issue: Issue): boolean {
    const excludeFromAggregate = [
      Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic,
      Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata,
      Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout,
      Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout,
    ];

    return (excludeFromAggregate.some(exclude => issue.code().includes(exclude)));
  }

  override maybeCreateConsoleMessage(): SDK.ConsoleModel.ConsoleMessage|undefined {
    const issuesModel = this.model();
    if (issuesModel && this.code().includes(Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout)) {
      return new SDK.ConsoleModel.ConsoleMessage(
          issuesModel.target().model(SDK.RuntimeModel.RuntimeModel), Common.Console.FrontendMessageSource.ISSUE_PANEL,
          Protocol.Log.LogEntryLevel.Warning, UIStrings.consoleTpcdErrorMessage, {
            url: this.details().request?.url as Platform.DevToolsPath.UrlString | undefined,
            affectedResources: {requestId: this.details().request?.requestId, issueId: this.issueId},
          });
    }
    return;
  }
}

/**
 * Exported for unit test.
 */
export function isCausedByThirdParty(
    outermostFrame: SDK.ResourceTreeModel.ResourceTreeFrame|null, cookieUrl?: string,
    siteForCookies?: string): boolean {
  if (!outermostFrame) {
    // The outermost frame is not yet available. Consider this issue as a third-party issue
    // until the outermost frame is available. This will prevent the issue from being visible
    // for only just a split second.
    return true;
  }
  // The value that should be consulted for the third-partiness as defined in
  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cookie-same-site#section-2.1.1
  if (!siteForCookies) {
    return true;
  }

  // In the case of no domain and registry, we assume its an IP address or localhost
  // during development, in this case we classify the issue as first-party.
  if (!cookieUrl || outermostFrame.domainAndRegistry() === '') {
    return false;
  }

  const parsedCookieUrl = Common.ParsedURL.ParsedURL.fromString(cookieUrl);
  if (!parsedCookieUrl) {
    return false;
  }

  // For both operation types we compare the cookieUrl's domain  with the outermost frames
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
  return !isSubdomainOf(parsedCookieUrl.domain(), outermostFrame.domainAndRegistry());
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

const cookieCrossSiteRedirectDowngrade: LazyMarkdownIssueDescription = {
  file: 'cookieCrossSiteRedirectDowngrade.md',
  links: [{
    link:
        'https://bugs.chromium.org/p/chromium/issues/entry?template=Defect%20report%20from%20user&summary=[Cross-Site Redirect Chain] <INSERT BUG SUMMARY HERE>&comment=Chrome Version: (copy from chrome://version)%0AChannel: (e.g. Canary, Dev, Beta, Stable)%0A%0AAffected URLs:%0A%0AWhat is the expected result?%0A%0AWhat happens instead?%0A%0AWhat is the purpose of the cross-site redirect?:%0A%0AWhat steps will reproduce the problem?:%0A(1)%0A(2)%0A(3)%0A%0APlease provide any additional information below.&components=Internals%3ENetwork%3ECookies',
    linkTitle: i18nLazyString(UIStrings.fileCrosSiteRedirectBug),
  }],
};

const ExcludePortMismatch: LazyMarkdownIssueDescription = {
  file: 'cookieExcludePortMismatch.md',
  links: [],
};

const ExcludeSchemeMismatch: LazyMarkdownIssueDescription = {
  file: 'cookieExcludeSchemeMismatch.md',
  links: [],
};

// This description will be used by cookie issues that need to be added to the
// issueManager, but aren't intended to be surfaced in the issues pane. This
// is why they are using a placeholder description
const placeholderDescriptionForInvisibleIssues: LazyMarkdownIssueDescription = {
  file: 'placeholderDescriptionForInvisibleIssues.md',
  links: [],
};

const issueDescriptions = new Map<string, LazyMarkdownIssueDescription>([
  // These two don't have a deprecation date yet, but they need to be fixed eventually.
  ['CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie', sameSiteUnspecifiedWarnSet],
  ['CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie', sameSiteUnspecifiedWarnRead],
  ['CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie', sameSiteUnspecifiedWarnSet],
  ['CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureErrorRead],
  ['CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureErrorSet],
  ['CookieIssue::WarnSameSiteNoneInsecure::ReadCookie', sameSiteNoneInsecureWarnRead],
  ['CookieIssue::WarnSameSiteNoneInsecure::SetCookie', sameSiteNoneInsecureWarnSet],
  ['CookieIssue::WarnAttributeValueExceedsMaxSize::ReadCookie', attributeValueExceedsMaxSize],
  ['CookieIssue::WarnAttributeValueExceedsMaxSize::SetCookie', attributeValueExceedsMaxSize],
  ['CookieIssue::WarnDomainNonASCII::ReadCookie', warnDomainNonAscii],
  ['CookieIssue::WarnDomainNonASCII::SetCookie', warnDomainNonAscii],
  ['CookieIssue::ExcludeDomainNonASCII::ReadCookie', excludeDomainNonAscii],
  ['CookieIssue::ExcludeDomainNonASCII::SetCookie', excludeDomainNonAscii],
  ['CookieIssue::WarnThirdPartyPhaseout::ReadCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::WarnThirdPartyPhaseout::SetCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::WarnDeprecationTrialMetadata::ReadCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::WarnDeprecationTrialMetadata::SetCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::WarnThirdPartyCookieHeuristic::ReadCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::WarnThirdPartyCookieHeuristic::SetCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::ExcludeThirdPartyPhaseout::SetCookie', placeholderDescriptionForInvisibleIssues],
  ['CookieIssue::CrossSiteRedirectDowngradeChangesInclusion', cookieCrossSiteRedirectDowngrade],
  ['CookieIssue::ExcludePortMismatch', ExcludePortMismatch],
  ['CookieIssue::ExcludeSchemeMismatch', ExcludeSchemeMismatch],
]);
