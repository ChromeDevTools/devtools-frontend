export interface GetErrorStackOutput {
    message: string;
    stack?: string;
}
export declare function getErrorStackOnThePage(this: Error): GetErrorStackOutput;
export declare function stringifyObjectOnThePage(this: unknown): string;
/**
 * Sanitizes a record of CSS property declarations against the browser's CSS
 * parser and rejects URL-referencing values.
 *
 * 1. Converts camelCase property names to kebab-case.
 * 2. Drops empty values and values containing CSS backslash escapes (`\`),
 *    comment openers (`/*`), or external URL functions (`url()`,
 *    `image-set()`, `-webkit-image-set()`, `src()`) so style edits cannot
 *    trigger outbound network requests.
 * 3. Validates the remaining declarations with `CSSStyleSheet` so unknown
 *    property names and invalid property values are omitted, and re-checks
 *    serialized CSSOM values against `DISALLOWED_CSS_URL_FUNCTION_REGEX`.
 */
export declare function sanitizeStyleChanges(selector: string, styles: Record<string, string>): Promise<Record<string, string>>;
/**
 * Removes inline `style` declarations that match the provided CSS properties.
 *
 * Pre-existing inline declarations for modified properties (which have higher
 * CSS specificity than class rules in `ChangeManager`) must be stripped so the
 * class rule takes effect. This mirrors `el.style[key] = null` in the
 * page-injected `setElementStyles` function (`injected.ts`).
 */
export declare function removeInlineStyleProperties(inlineStyle: string, styles: Record<string, string>): string;
/**
 * Adopts a `CSSStyleSheet` containing the `ChangeManager` rules into the
 * target element's enclosing `ShadowRoot`.
 *
 * `ChangeManager` injects rules into the document-level inspector stylesheet,
 * which does not pierce Shadow DOM. This function is evaluated on the target
 * element in the inspected page via `RemoteObject#callFunction` (mirroring the
 * `adoptedStyleSheets` logic in `injected.ts`), so it must remain completely
 * self-contained and cannot reference DevTools frontend state.
 */
export declare function adoptStyleSheetInShadowRoot(this: Object, prefix: string, styleChanges: string): void;
export declare function dispatchAiAssistanceDoneEvent(): void;
