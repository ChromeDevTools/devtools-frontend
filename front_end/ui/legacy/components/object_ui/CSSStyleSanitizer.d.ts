/**
 * Builds a regex fragment that matches a CSS identifier even when written
 * with hex escapes (e.g. `\75\72\6c` for `url`).
 */
export declare function cssEscapeRegex(cssString: string): string;
/**
 * Parses `styleToAdd` as a CSS style string and populates `currentStyle`
 * with only the properties that pass safety checks:
 *   - Property name must start with one of the allowed prefixes.
 *   - `url()` values must use `data:` scheme only.
 *   - `image-set()` values must use properly formed `url()`s.
 *
 * The map is cleared before being populated.
 */
export declare function sanitizeStyle(currentStyle: Map<string, {
    value: string;
    priority: string;
}>, styleToAdd: string): void;
