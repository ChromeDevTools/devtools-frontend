// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * To use links in markdown, add key here with the link and
 * use the added key in markdown.
 * @example markdown
 * Find more information about web development at [Learn more](exampleLink)
 */
/**
 * This is only exported for tests, and it should not be
 * imported in any component, instead add link in map and
 * use getMarkdownLink to get the appropriate link.
 **/
export const markdownLinks = new Map([
    ['issuesContrastWCAG21AA', 'https://www.w3.org/TR/WCAG21/#contrast-minimum'],
    ['issuesContrastWCAG21AAA', 'https://www.w3.org/TR/WCAG21/#contrast-enhanced'],
    ['issuesContrastSuggestColor', 'https://developers.google.com/web/updates/2020/08/devtools#accessible-color'],
    ['issuesCSPSetStrict', 'https://web.dev/strict-csp'],
    [
        'issuesCSPWhyStrictOverAllowlist',
        'https://web.dev/strict-csp/#why-a-strict-csp-is-recommended-over-allowlist-csps',
    ],
    [
        'issueCorsPreflightRequest',
        'https://web.dev/cross-origin-resource-sharing/#preflight-requests-for-complex-http-calls',
    ],
    ['issueQuirksModeDoctype', 'https://web.dev/doctype/'],
    ['sameSiteAndSameOrigin', 'https://web.dev/same-site-same-origin/'],
    ['punycodeReference', 'https://wikipedia.org/wiki/Punycode'],
    // Link URLs for deprecation issues (see blink::Deprecation)
    ['https://xhr.spec.whatwg.org/', 'https://xhr.spec.whatwg.org/'],
    ['https://goo.gle/chrome-insecure-origins', 'https://goo.gle/chrome-insecure-origins'],
    ['https://webrtc.org/web-apis/chrome/unified-plan/', 'https://webrtc.org/web-apis/chrome/unified-plan/'],
    [
        'https://developer.chrome.com/blog/enabling-shared-array-buffer/',
        'https://developer.chrome.com/blog/enabling-shared-array-buffer/',
    ],
    ['https://developer.chrome.com/docs/extensions/mv3/', 'https://developer.chrome.com/docs/extensions/mv3/'],
    [
        'https://developer.chrome.com/blog/immutable-document-domain/',
        'https://developer.chrome.com/blog/immutable-document-domain/',
    ],
    [
        'https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md',
        'https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md',
    ],
    [
        'https://developer.chrome.com/docs/extensions/reference/privacy/#property-websites-privacySandboxEnabled',
        'https://developer.chrome.com/docs/extensions/reference/privacy/#property-websites-privacySandboxEnabled',
    ],
    ['PNASecureContextRestrictionFeatureStatus', 'https://chromestatus.com/feature/5954091755241472'],
    ['https://w3c.github.io/uievents/#legacy-event-types', 'https://w3c.github.io/uievents/#legacy-event-types'],
    ['manageCookiesHelpPage', 'https://support.google.com/chrome/answer/95647'],
    ['gracePeriodStagedControlExplainer', 'https://developers.google.com/privacy-sandbox/blog/grace-period-opt-out'],
    ['signatureHeader', 'https://www.rfc-editor.org/rfc/rfc9421.html#name-the-signature-http-field'],
    ['signatureInputHeader', 'https://www.rfc-editor.org/rfc/rfc9421.html#name-the-signature-input-http-fi'],
    ['signatureParameters', 'https://www.rfc-editor.org/rfc/rfc9421.html#name-signature-parameters'],
    ['sfDictionary', 'https://www.rfc-editor.org/rfc/rfc8941.html#name-dictionaries'],
    ['sfByteSequence', 'https://www.rfc-editor.org/rfc/rfc8941.html#name-byte-sequences'],
    ['sfInnerList', 'https://www.rfc-editor.org/rfc/rfc8941.html#name-inner-lists'],
    ['componentParameterSf', 'https://www.rfc-editor.org/rfc/rfc9421.html#name-strict-serialization-of-htt'],
    ['componentParameterReq', 'https://www.rfc-editor.org/rfc/rfc9421.html#content-request-response'],
    [
        'unencodedDigestHeader',
        'https://lpardue.github.io/draft-pardue-http-identity-digest/draft-pardue-httpbis-identity-digest.html'
    ],
    ['storagePartitioningExplainer', 'https://developers.google.com/privacy-sandbox/cookies/storage-partitioning'],
    ['storageAccessAPI', 'https://developer.mozilla.org/en-US/docs/Web/API/StorageAccessHandle/createObjectURL'],
]);
export const getMarkdownLink = (key) => {
    if (/^https:\/\/www\.chromestatus\.com\//.test(key)) {
        return key;
    }
    if (/^https:\/\/developer\.chrome\.com\//.test(key)) {
        return key;
    }
    if (/^https:\/\/developers\.google\.com\//.test(key)) {
        return key;
    }
    if (/^https:\/\/web\.dev\//.test(key)) {
        return key;
    }
    if (/^https:\/\/developer\.mozilla\.org\//.test(key)) {
        return key;
    }
    if (key === 'https://philipwalton.com/articles/the-state-of-es5-on-the-web/') {
        return key;
    }
    const link = markdownLinks.get(key);
    if (!link) {
        throw new Error(`Markdown link with key '${key}' is not available, please check MarkdownLinksMap.ts`);
    }
    return link;
};
//# sourceMappingURL=MarkdownLinksMap.js.map