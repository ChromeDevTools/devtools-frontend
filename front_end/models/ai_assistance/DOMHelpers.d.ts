export interface GetErrorStackOutput {
    message: string;
    stack?: string;
}
export declare function getErrorStackOnThePage(this: Error): GetErrorStackOutput;
/**
 * Options controlling element handle collection in `stringifyObjectOnThePage`.
 */
export interface StringifyObjectOptions {
    maxElements: number;
    uidPlaceholderPrefix: string;
}
/**
 * Snapshot of a page object serialized to JSON alongside collected DOM element
 * references.
 *
 * When `options` is passed to `stringifyObjectOnThePage`, each collected
 * element's tag in `json` is prefixed with `<uidPlaceholderPrefix><index>__`
 * matching its position in `elements`. For example, for `$0.children`
 * containing `<div id="a">` and `<span>`:
 * - `json`: `'{"0":"<prefix>0__<div id=\"a\"></div>","1":"<prefix>1__<span></span>"}'`
 * - `elements`: `[<div id="a">, <span>]`
 *
 * `elements` is typed as `unknown[]` so DOM types do not leak from
 * `DOMHelpers.d.ts` into the DOM-free `ai_assistance` foundation module.
 */
export interface StringifiedPageObject {
    json: string | undefined;
    elements: unknown[];
}
/**
 * Serializes `this` to JSON inside the inspected page through
 * `RemoteObject#callFunction` with `throwOnSideEffect: true`.
 *
 * `RemoteObject#callFunction` sends `stringifyObjectOnThePage.toString()` to
 * the page, so the function body must remain self-contained (no module-scope
 * imports or helpers) and side-effect-free.
 *
 * When `options` is provided, collects up to `options.maxElements` DOM
 * `Element` handles in `JSON.stringify` traversal order (replacing repeated
 * object references with `"(cycle)"` and skipping numeric `CSSStyleDeclaration`
 * keys) and prefixes each collected element tag with
 * `${options.uidPlaceholderPrefix}${index}__`.
 */
export declare function stringifyObjectOnThePage(this: unknown, options?: StringifyObjectOptions): StringifiedPageObject;
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
 *    property names and invalid property values are omitted, re-checks
 *    serialized CSSOM values against `DISALLOWED_CSS_URL_FUNCTION_REGEX`, and
 *    preserves `!important` priority on valid declarations.
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
