/**
 * Defines a pattern for commenting out forbidden headers in a fetch command string.
 *
 * @property pattern - Regex to match against the header field name.
 * @property comment - Lazily computed explanatory comment text.
 * @property style - 'append' puts the comment on the same line; 'prefix' adds a
 *   standalone comment line before the first match in a consecutive group.
 * @property isForbidden - Optional predicate for rules whose status depends on
 *   the header value.
 */
export interface ForbiddenHeaderRule {
    pattern: RegExp;
    comment: () => string;
    style: 'append' | 'prefix';
    isForbidden?: (value: string) => boolean;
}
/**
 * Rules for request headers that the browser will ignore or override.
 * https://fetch.spec.whatwg.org/#forbidden-request-header
 */
export declare const FORBIDDEN_HEADER_RULES: ForbiddenHeaderRule[];
export declare function isForbiddenHeader(name: string, value: string, rules?: ForbiddenHeaderRule[]): boolean;
/**
 * Given serialized fetch options, comments out header lines that match any of
 * the forbidden header rules.
 *
 * The format of the serializedOptions is well constrained.
 * HTTP headers are, by spec, single-line. Multi-value headers will be
 * joined by commas into one string. Then, JSON.stringify will always render
 * each field on its own line.
 *
 * The function operates line-by-line with a simple 3-mode state machine:
 *   Mode 1: Before the headers block
 *   Mode 2: Inside the headers block
 *   Mode 3: After the headers block (or after bailing on anomaly)
 *
 * If an anomalous line is encountered inside the headers block (one that doesn't
 * look like a simple `"key": value,` entry), processing stops immediately and
 * remaining lines pass through unchanged.
 */
export declare function commentForbiddenHeaders(serializedOptions: string, rules?: ForbiddenHeaderRule[]): string;
