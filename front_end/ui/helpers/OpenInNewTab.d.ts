/**
 * Opens the given `url` in a new Chrome tab.
 *
 * If the `url` is a Google owned documentation page (currently that includes
 * `web.dev`, `developers.google.com`, and `developer.chrome.com`) or an MDN
 * documentation page (`developer.mozilla.org`), the `url` will also be checked
 * for UTM parameters:
 *
 * - For MDN links (`developer.mozilla.org`), if neither `utm_source` nor `utm_medium` is present,
 *   this method will add `utm_source=chrome-devtools` and `utm_medium=referral`.
 * - For Google documentation links, if no `utm_source` search parameter is present, this method
 *   will add a new search parameter `utm_source=devtools` to `url`.
 * - If no `utm_campaign` search parameter is present on Google documentation links, and DevTools
 *   is running within a branded build, this method will add `utm_campaign=<channel>` to
 *   the search parameters, with `<channel>` being the release channel of
 *   Chrome ("stable", "beta", "dev", or "canary").
 *
 * @param url the URL to open in a new tab.
 * @param allowPrivileged whether to also open URLs with privileged or other non-web-safe schemes. By default,
 *     only URLs with web-safe schemes (see `Common.ParsedURL.hasWebSafeScheme`) are opened.
 * @param initiatorId the DevTools frame id or target id of the frame or worker that `url` came from, if any. The
 *     browser attributes the navigation to it; without it, the navigation is treated as cross-site. See
 *     `InspectorFrontendHostAPI.openInNewTab()`.
 * @throws TypeError if `url` is not a valid URL.
 * @see https://en.wikipedia.org/wiki/UTM_parameters
 */
export declare function openInNewTab(url: URL | string, allowPrivileged?: boolean, initiatorId?: string): void;
