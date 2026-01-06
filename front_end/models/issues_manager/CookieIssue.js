// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ThirdPartyWeb from '../../third_party/third-party-web/third-party-web.js';
import { Issue } from './Issue.js';
import { resolveLazyDescription, } from './MarkdownIssueDescription.js';
const UIStrings = {
    /**
     * @description Label for the link for SameSiteCookies Issues
     */
    samesiteCookiesExplained: 'SameSite cookies explained',
    /**
     * @description Label for the link for Schemeful Same-Site Issues
     */
    howSchemefulSamesiteWorks: 'How Schemeful Same-Site Works',
    /**
     * @description Label for a link for cross-site redirect Issues.
     */
    fileCrosSiteRedirectBug: 'File a bug',
    /**
     * @description text to show in Console panel when a third-party cookie is blocked in Chrome.
     */
    consoleTpcdErrorMessage: 'Third-party cookie is blocked in Chrome either because of Chrome flags or browser configuration.',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class CookieIssue extends Issue {
    cookieId() {
        const details = this.details();
        if (details.cookie) {
            const { domain, path, name } = details.cookie;
            const cookieId = `${domain};${path};${name}`;
            return cookieId;
        }
        return this.details().rawCookieLine ?? 'no-cookie-info';
    }
    primaryKey() {
        const details = this.details();
        const requestId = details.request ? details.request.requestId : 'no-request';
        return `${this.code()}-(${this.cookieId()})-(${requestId})`;
    }
    /**
     * Returns an array of issues from a given CookieIssueDetails.
     */
    static createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, issueId) {
        const issues = [];
        // Exclusion reasons have priority. It means a cookie was blocked. Create an issue
        // for every exclusion reason but ignore warning reasons if the cookie was blocked.
        // Some exclusion reasons are dependent on warning reasons existing in order to produce an issue.
        if (cookieIssueDetails.cookieExclusionReasons && cookieIssueDetails.cookieExclusionReasons.length > 0) {
            for (const exclusionReason of cookieIssueDetails.cookieExclusionReasons) {
                const code = CookieIssue.codeForCookieIssueDetails(exclusionReason, cookieIssueDetails.cookieWarningReasons, cookieIssueDetails.operation, cookieIssueDetails.cookieUrl);
                if (code) {
                    issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel, issueId));
                }
            }
            return issues;
        }
        if (cookieIssueDetails.cookieWarningReasons) {
            for (const warningReason of cookieIssueDetails.cookieWarningReasons) {
                // warningReasons should be an empty array here.
                const code = CookieIssue.codeForCookieIssueDetails(warningReason, [], cookieIssueDetails.operation, cookieIssueDetails.cookieUrl);
                if (code) {
                    issues.push(new CookieIssue(code, cookieIssueDetails, issuesModel, issueId));
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
    static codeForCookieIssueDetails(reason, warningReasons, operation, cookieUrl) {
        const isURLSecure = cookieUrl && (Common.ParsedURL.schemeIs(cookieUrl, 'https:') || Common.ParsedURL.schemeIs(cookieUrl, 'wss:'));
        const secure = isURLSecure ? 'Secure' : 'Insecure';
        if (reason === "ExcludeSameSiteStrict" /* Protocol.Audits.CookieExclusionReason.ExcludeSameSiteStrict */ ||
            reason === "ExcludeSameSiteLax" /* Protocol.Audits.CookieExclusionReason.ExcludeSameSiteLax */ ||
            reason === "ExcludeSameSiteUnspecifiedTreatedAsLax" /* Protocol.Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax */) {
            if (warningReasons && warningReasons.length > 0) {
                if (warningReasons.includes("WarnSameSiteStrictLaxDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict */)) {
                    return [
                        "CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */,
                        'ExcludeNavigationContextDowngrade',
                        secure,
                    ].join('::');
                }
                if (warningReasons.includes("WarnSameSiteStrictCrossDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict */) ||
                    warningReasons.includes("WarnSameSiteStrictCrossDowngradeLax" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeLax */) ||
                    warningReasons.includes("WarnSameSiteLaxCrossDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict */) ||
                    warningReasons.includes("WarnSameSiteLaxCrossDowngradeLax" /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax */)) {
                    return [
                        "CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */,
                        'ExcludeContextDowngrade',
                        operation,
                        secure,
                    ].join('::');
                }
            }
            if (warningReasons.includes("WarnCrossSiteRedirectDowngradeChangesInclusion" /* Protocol.Audits.CookieWarningReason.WarnCrossSiteRedirectDowngradeChangesInclusion */)) {
                return [
                    "CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */,
                    'CrossSiteRedirectDowngradeChangesInclusion',
                ].join('::');
            }
            // If we have ExcludeSameSiteUnspecifiedTreatedAsLax but no corresponding warnings, then add just
            // the Issue code for ExcludeSameSiteUnspecifiedTreatedAsLax.
            if (reason === "ExcludeSameSiteUnspecifiedTreatedAsLax" /* Protocol.Audits.CookieExclusionReason.ExcludeSameSiteUnspecifiedTreatedAsLax */) {
                return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, reason, operation].join('::');
            }
            // ExcludeSameSiteStrict and ExcludeSameSiteLax require being paired with an appropriate warning. We didn't
            // find one of those warnings so return null to indicate there shouldn't be an issue created.
            return null;
        }
        if (reason === "WarnSameSiteStrictLaxDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictLaxDowngradeStrict */) {
            return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, reason, secure].join('::');
        }
        // These have the same message.
        if (reason === "WarnSameSiteStrictCrossDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeStrict */ ||
            reason === "WarnSameSiteStrictCrossDowngradeLax" /* Protocol.Audits.CookieWarningReason.WarnSameSiteStrictCrossDowngradeLax */ ||
            reason === "WarnSameSiteLaxCrossDowngradeLax" /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeLax */ ||
            reason === "WarnSameSiteLaxCrossDowngradeStrict" /* Protocol.Audits.CookieWarningReason.WarnSameSiteLaxCrossDowngradeStrict */) {
            return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, 'WarnCrossDowngrade', operation, secure].join('::');
        }
        if (reason === "ExcludePortMismatch" /* Protocol.Audits.CookieExclusionReason.ExcludePortMismatch */) {
            return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, 'ExcludePortMismatch'].join('::');
        }
        if (reason === "ExcludeSchemeMismatch" /* Protocol.Audits.CookieExclusionReason.ExcludeSchemeMismatch */) {
            return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, 'ExcludeSchemeMismatch'].join('::');
        }
        return ["CookieIssue" /* Protocol.Audits.InspectorIssueCode.CookieIssue */, reason, operation].join('::');
    }
    cookies() {
        const details = this.details();
        if (details.cookie) {
            return [details.cookie];
        }
        return [];
    }
    rawCookieLines() {
        const details = this.details();
        if (details.rawCookieLine) {
            return [details.rawCookieLine];
        }
        return [];
    }
    requests() {
        const details = this.details();
        if (details.request) {
            return [details.request];
        }
        return [];
    }
    getCategory() {
        return "Cookie" /* IssueCategory.COOKIE */;
    }
    getDescription() {
        const description = issueDescriptions.get(this.code());
        if (!description) {
            return null;
        }
        return resolveLazyDescription(description);
    }
    isCausedByThirdParty() {
        const outermostFrame = SDK.FrameManager.FrameManager.instance().getOutermostFrame();
        return isCausedByThirdParty(outermostFrame, this.details().cookieUrl, this.details().siteForCookies);
    }
    getKind() {
        if (this.details().cookieExclusionReasons?.length > 0) {
            return "PageError" /* IssueKind.PAGE_ERROR */;
        }
        return "BreakingChange" /* IssueKind.BREAKING_CHANGE */;
    }
    makeCookieReportEntry() {
        const status = CookieIssue.getCookieStatus(this.details());
        const details = this.details();
        if (details.cookie && details.cookieUrl && status !== undefined) {
            const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(details.cookieUrl);
            return {
                name: details.cookie.name,
                domain: details.cookie.domain,
                type: entity?.category,
                platform: entity?.name,
                status,
                insight: this.details().insight,
            };
        }
        return;
    }
    static getCookieStatus(cookieIssueDetails) {
        if (cookieIssueDetails.cookieExclusionReasons.includes("ExcludeThirdPartyPhaseout" /* Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout */)) {
            return 0 /* CookieStatus.BLOCKED */;
        }
        if (cookieIssueDetails.cookieWarningReasons.includes("WarnDeprecationTrialMetadata" /* Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata */)) {
            return 2 /* CookieStatus.ALLOWED_BY_GRACE_PERIOD */;
        }
        if (cookieIssueDetails.cookieWarningReasons.includes("WarnThirdPartyCookieHeuristic" /* Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic */)) {
            return 3 /* CookieStatus.ALLOWED_BY_HEURISTICS */;
        }
        if (cookieIssueDetails.cookieWarningReasons.includes("WarnThirdPartyPhaseout" /* Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout */)) {
            return 1 /* CookieStatus.ALLOWED */;
        }
        return;
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const cookieIssueDetails = inspectorIssue.details.cookieIssueDetails;
        if (!cookieIssueDetails) {
            console.warn('Cookie issue without details received.');
            return [];
        }
        return CookieIssue.createIssuesFromCookieIssueDetails(cookieIssueDetails, issuesModel, inspectorIssue.issueId);
    }
    static getSubCategory(code) {
        if (code.includes('SameSite') || code.includes('Downgrade')) {
            return "SameSiteCookie" /* CookieIssueSubCategory.SAME_SITE_COOKIE */;
        }
        if (code.includes('ThirdPartyPhaseout')) {
            return "ThirdPartyPhaseoutCookie" /* CookieIssueSubCategory.THIRD_PARTY_PHASEOUT_COOKIE */;
        }
        return "GenericCookie" /* CookieIssueSubCategory.GENERIC_COOKIE */;
    }
    static isThirdPartyCookiePhaseoutRelatedIssue(issue) {
        const excludeFromAggregate = [
            "WarnThirdPartyCookieHeuristic" /* Protocol.Audits.CookieWarningReason.WarnThirdPartyCookieHeuristic */,
            "WarnDeprecationTrialMetadata" /* Protocol.Audits.CookieWarningReason.WarnDeprecationTrialMetadata */,
            "WarnThirdPartyPhaseout" /* Protocol.Audits.CookieWarningReason.WarnThirdPartyPhaseout */,
            "ExcludeThirdPartyPhaseout" /* Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout */,
        ];
        return (excludeFromAggregate.some(exclude => issue.code().includes(exclude)));
    }
    maybeCreateConsoleMessage() {
        const issuesModel = this.model();
        if (issuesModel && this.code().includes("ExcludeThirdPartyPhaseout" /* Protocol.Audits.CookieExclusionReason.ExcludeThirdPartyPhaseout */)) {
            return new SDK.ConsoleModel.ConsoleMessage(issuesModel.target().model(SDK.RuntimeModel.RuntimeModel), Common.Console.FrontendMessageSource.ISSUE_PANEL, "warning" /* Protocol.Log.LogEntryLevel.Warning */, UIStrings.consoleTpcdErrorMessage, {
                url: this.details().request?.url,
                affectedResources: { requestId: this.details().request?.requestId, issueId: this.issueId },
                isCookieReportIssue: true
            });
        }
        return;
    }
}
/**
 * Exported for unit test.
 */
export function isCausedByThirdParty(outermostFrame, cookieUrl, siteForCookies) {
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
function isSubdomainOf(subdomain, superdomain) {
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
const sameSiteUnspecifiedWarnRead = {
    file: 'SameSiteUnspecifiedLaxAllowUnsafeRead.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const sameSiteUnspecifiedWarnSet = {
    file: 'SameSiteUnspecifiedLaxAllowUnsafeSet.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const sameSiteNoneInsecureErrorRead = {
    file: 'SameSiteNoneInsecureErrorRead.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const sameSiteNoneInsecureErrorSet = {
    file: 'SameSiteNoneInsecureErrorSet.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const sameSiteNoneInsecureWarnRead = {
    file: 'SameSiteNoneInsecureWarnRead.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const sameSiteNoneInsecureWarnSet = {
    file: 'SameSiteNoneInsecureWarnSet.md',
    links: [
        {
            link: 'https://web.dev/samesite-cookies-explained/',
            linkTitle: i18nLazyString(UIStrings.samesiteCookiesExplained),
        },
    ],
};
const schemefulSameSiteArticles = [{ link: 'https://web.dev/schemeful-samesite/', linkTitle: i18nLazyString(UIStrings.howSchemefulSamesiteWorks) }];
function schemefulSameSiteSubstitutions({ isDestinationSecure, isOriginSecure }) {
    return new Map([
        // TODO(crbug.com/1168438): Use translated phrases once the issue description is localized.
        ['PLACEHOLDER_destination', () => isDestinationSecure ? 'a secure' : 'an insecure'],
        ['PLACEHOLDER_origin', () => isOriginSecure ? 'a secure' : 'an insecure'],
    ]);
}
function sameSiteWarnStrictLaxDowngradeStrict(isSecure) {
    return {
        file: 'SameSiteWarnStrictLaxDowngradeStrict.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
        links: schemefulSameSiteArticles,
    };
}
function sameSiteExcludeNavigationContextDowngrade(isSecure) {
    return {
        file: 'SameSiteExcludeNavigationContextDowngrade.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
        links: schemefulSameSiteArticles,
    };
}
function sameSiteWarnCrossDowngradeRead(isSecure) {
    return {
        file: 'SameSiteWarnCrossDowngradeRead.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
        links: schemefulSameSiteArticles,
    };
}
function sameSiteExcludeContextDowngradeRead(isSecure) {
    return {
        file: 'SameSiteExcludeContextDowngradeRead.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
        links: schemefulSameSiteArticles,
    };
}
function sameSiteWarnCrossDowngradeSet(isSecure) {
    return {
        file: 'SameSiteWarnCrossDowngradeSet.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: !isSecure, isOriginSecure: isSecure }),
        links: schemefulSameSiteArticles,
    };
}
function sameSiteExcludeContextDowngradeSet(isSecure) {
    return {
        file: 'SameSiteExcludeContextDowngradeSet.md',
        substitutions: schemefulSameSiteSubstitutions({ isDestinationSecure: isSecure, isOriginSecure: !isSecure }),
        links: schemefulSameSiteArticles,
    };
}
const attributeValueExceedsMaxSize = {
    file: 'CookieAttributeValueExceedsMaxSize.md',
    links: [],
};
const warnDomainNonAscii = {
    file: 'cookieWarnDomainNonAscii.md',
    links: [],
};
const excludeDomainNonAscii = {
    file: 'cookieExcludeDomainNonAscii.md',
    links: [],
};
const excludeBlockedWithinRelatedWebsiteSet = {
    file: 'cookieExcludeBlockedWithinRelatedWebsiteSet.md',
    links: [],
};
const cookieCrossSiteRedirectDowngrade = {
    file: 'cookieCrossSiteRedirectDowngrade.md',
    links: [{
            link: 'https://bugs.chromium.org/p/chromium/issues/entry?template=Defect%20report%20from%20user&summary=[Cross-Site Redirect Chain] <INSERT BUG SUMMARY HERE>&comment=Chrome Version: (copy from chrome://version)%0AChannel: (e.g. Canary, Dev, Beta, Stable)%0A%0AAffected URLs:%0A%0AWhat is the expected result?%0A%0AWhat happens instead?%0A%0AWhat is the purpose of the cross-site redirect?:%0A%0AWhat steps will reproduce the problem?:%0A(1)%0A(2)%0A(3)%0A%0APlease provide any additional information below.&components=Internals%3ENetwork%3ECookies',
            linkTitle: i18nLazyString(UIStrings.fileCrosSiteRedirectBug),
        }],
};
const ExcludePortMismatch = {
    file: 'cookieExcludePortMismatch.md',
    links: [],
};
const ExcludeSchemeMismatch = {
    file: 'cookieExcludeSchemeMismatch.md',
    links: [],
};
// This description will be used by cookie issues that need to be added to the
// issueManager, but aren't intended to be surfaced in the issues pane. This
// is why they are using a placeholder description
const placeholderDescriptionForInvisibleIssues = {
    file: 'placeholderDescriptionForInvisibleIssues.md',
    links: [],
};
const issueDescriptions = new Map([
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
    ['CookieIssue::WarnAttributeValueExceedsMaxSize::ReadCookie', attributeValueExceedsMaxSize],
    ['CookieIssue::WarnAttributeValueExceedsMaxSize::SetCookie', attributeValueExceedsMaxSize],
    ['CookieIssue::WarnDomainNonASCII::ReadCookie', warnDomainNonAscii],
    ['CookieIssue::WarnDomainNonASCII::SetCookie', warnDomainNonAscii],
    ['CookieIssue::ExcludeDomainNonASCII::ReadCookie', excludeDomainNonAscii],
    ['CookieIssue::ExcludeDomainNonASCII::SetCookie', excludeDomainNonAscii],
    [
        'CookieIssue::ExcludeThirdPartyCookieBlockedInRelatedWebsiteSet::ReadCookie',
        excludeBlockedWithinRelatedWebsiteSet,
    ],
    [
        'CookieIssue::ExcludeThirdPartyCookieBlockedInRelatedWebsiteSet::SetCookie',
        excludeBlockedWithinRelatedWebsiteSet,
    ],
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
//# sourceMappingURL=CookieIssue.js.map