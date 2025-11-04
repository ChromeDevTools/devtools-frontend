import type * as Platform from '../../core/platform/platform.js';
/**
 * HostUrlPatterns define permissions in for extensions in the form of "<protocol>://<sub-domain>.example.com:<port>/".
 * Where the respected parts can be patters like "*".
 * Since these aren't valid {@link Common.ParsedURL.ParsedURL}
 * can't handle them and we need a separate implementation.
 *
 * More information in the Chromium code base -
 * {@link https://crsrc.org/c/chrome/browser/extensions/extension_management_internal.h;l=137 | here}.
 */
export declare class HostUrlPattern {
    readonly pattern: {
        matchesAll: true;
    } | {
        readonly scheme: string;
        readonly host: string;
        readonly port: string;
        matchesAll: false;
    };
    static parse(pattern: string): HostUrlPattern | undefined;
    private constructor();
    get scheme(): string;
    get host(): string;
    get port(): string;
    matchesAllUrls(): boolean;
    matchesUrl(url: Platform.DevToolsPath.UrlString): boolean;
    matchesScheme(scheme: string): boolean;
    matchesHost(host: string): boolean;
    matchesPort(port: string): boolean;
}
