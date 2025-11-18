/**
 * Opens the given `url` in a new Chrome tab.
 *
 * If the `url` is a Google owned documentation page (currently that includes
 * `web.dev`, `developers.google.com`, and `developer.chrome.com`), the `url`
 * will also be checked for UTM parameters:
 *
 * - If no `utm_source` search parameter is present, this method will add a new
 *   search parameter `utm_source=devtools` to `url`.
 * - If no `utm_campaign` search parameter is present, and DevTools is running
 *   within a branded build, this method will add `utm_campaign=<channel>` to
 *   the search parameters, with `<channel>` being the release channel of
 *   Chrome ("stable", "beta", "dev", or "canary").
 *
 * @param url the URL to open in a new tab.
 * @throws TypeError if `url` is not a valid URL.
 * @see https://en.wikipedia.org/wiki/UTM_parameters
 */
export declare function openInNewTab(url: URL | string): void;
