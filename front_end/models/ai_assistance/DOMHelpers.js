// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file This file includes DOM helpers and page-evaluated serialization helpers
 * used by AI assistance that require DOM types. They are isolated in a separate
 * target so DOM types do not leak into the rest of models/ai_assistance.
 */
import * as Platform from '../../core/platform/platform.js';
/* istanbul ignore next */
export function getErrorStackOnThePage() {
    // Using this.stack causes side effect checks to throw.
    return { stack: '', message: this.message };
}
/* istanbul ignore next */
export function stringifyObjectOnThePage() {
    const seenBefore = new Map();
    return JSON.stringify(this, function replacer(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (seenBefore.has(value)) {
                return '(cycle)';
            }
            seenBefore.set(value, true);
        }
        if (value instanceof HTMLElement) {
            const idAttribute = value.id ? ` id="${value.id}"` : '';
            const classAttribute = value.classList.value ? ` class="${value.classList.value}"` : '';
            return `<${value.nodeName.toLowerCase()}${idAttribute}${classAttribute}>${value.hasChildNodes() ? '...' : ''}</${value.nodeName.toLowerCase()}>`;
        }
        if (this instanceof CSSStyleDeclaration) {
            // Do not add number keys to the output.
            if (!isNaN(Number(key))) {
                return undefined;
            }
        }
        return value;
    });
}
const DISALLOWED_CSS_URL_FUNCTION_REGEX = /(?:^|[^a-zA-Z0-9_-])(?:-webkit-image-set|image-set|url|src)\s*\(/i;
function isDisallowedCssValue(value) {
    // Reject CSS backslash escapes (`\`) and comment openers (`/*`) outright.
    // Unparsed declarations (`var()`, `if()`) preserve raw escapes in CSSOM
    // serialization, and stripping `/*...*/` with a regex can join adjacent
    // tokens or delete text across quoted strings.
    return value.includes('\\') || value.includes('/*') || DISALLOWED_CSS_URL_FUNCTION_REGEX.test(value);
}
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
export async function sanitizeStyleChanges(selector, styles) {
    const cssStyleValue = [];
    const changedStyles = [];
    const kebabStyles = Platform.StringUtilities.toKebabCaseKeys(styles);
    for (const [style, value] of Object.entries(kebabStyles)) {
        // Reject values that reference external URLs or use CSS escapes/comments
        // so style changes cannot trigger outbound network requests.
        if (!value.trim() || isDisallowedCssValue(value)) {
            continue;
        }
        // Build up the CSS style.
        cssStyleValue.push(`${style}: ${value};`);
        // Keep track of what style changed to query later.
        changedStyles.push(style);
    }
    // CSSStyleSheet is unavailable when foundation_unittests run in Node.js;
    // fall back to returning the filtered kebab-case styles without browser CSS
    // validation.
    if (typeof CSSStyleSheet === 'undefined' || typeof CSSStyleRule === 'undefined') {
        return Object.fromEntries(changedStyles.map(style => [style, kebabStyles[style]]));
    }
    const styleSheet = new CSSStyleSheet({ disabled: true });
    // Build up the CSS stylesheet value.
    await styleSheet.replace(`${selector} { ${cssStyleValue.join(' ')} }`);
    const sanitizedStyles = {};
    for (const cssRule of styleSheet.cssRules) {
        if (!(cssRule instanceof CSSStyleRule)) {
            continue;
        }
        for (const style of changedStyles) {
            const value = cssRule.style.getPropertyValue(style);
            // Re-check Blink's serialized CSSOM value against URL functions only;
            // Pass 1 already blocked raw `\` and `/*`, while CSSOM legitimately
            // inserts `\"` when canonicalizing quoted strings (such as `'"AI"'`).
            if (value && !DISALLOWED_CSS_URL_FUNCTION_REGEX.test(value)) {
                sanitizedStyles[style] = value;
            }
        }
    }
    return sanitizedStyles;
}
/**
 * Removes inline `style` declarations that match the provided CSS properties.
 *
 * Pre-existing inline declarations for modified properties (which have higher
 * CSS specificity than class rules in `ChangeManager`) must be stripped so the
 * class rule takes effect. This mirrors `el.style[key] = null` in the
 * page-injected `setElementStyles` function (`injected.ts`).
 */
export function removeInlineStyleProperties(inlineStyle, styles) {
    // Normalize property names (e.g. `backgroundColor` -> `background-color`)
    // because CSSStyleDeclaration#removeProperty requires kebab-case names.
    const kebabStyles = Platform.StringUtilities.toKebabCaseKeys(styles);
    // CSSStyleSheet is only undefined when foundation_unittests run in bare
    // Node.js (`--node-unit-tests`); fall back to string-splitting in that
    // test runner. In Chrome, execution always continues to CSSStyleSheet below.
    if (typeof CSSStyleSheet === 'undefined' || typeof CSSStyleRule === 'undefined') {
        const declarations = inlineStyle.split(';').map(decl => decl.trim()).filter(Boolean).filter(decl => {
            const colonIndex = decl.indexOf(':');
            return colonIndex !== -1 && !(decl.slice(0, colonIndex).trim() in kebabStyles);
        });
        return declarations.length > 0 ? `${declarations.join('; ')};` : '';
    }
    // CSSStyleDeclaration cannot be constructed directly (`new CSSStyleDeclaration()`
    // throws). Create a detached CSSStyleSheet with a dummy `* {}` rule so we can
    // use `cssRule.style` as an off-DOM CSSStyleDeclaration parser.
    const styleSheet = new CSSStyleSheet({ disabled: true });
    styleSheet.replaceSync('* {}');
    const cssRule = styleSheet.cssRules[0];
    if (!(cssRule instanceof CSSStyleRule)) {
        return '';
    }
    // Parse the element's raw `style="..."` attribute string into the dummy rule,
    // remove each property being modified by the AI (matching `el.style[key] = null`
    // in V1), and serialize the remaining inline declarations back to a string.
    cssRule.style.cssText = inlineStyle;
    for (const key of Object.keys(kebabStyles)) {
        cssRule.style.removeProperty(key);
    }
    return cssRule.style.cssText;
}
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
export function adoptStyleSheetInShadowRoot(prefix, styleChanges) {
    if (!(this instanceof Element)) {
        return;
    }
    const rootNode = this.getRootNode();
    if (!(rootNode instanceof ShadowRoot)) {
        return;
    }
    // eslint-disable-next-line @devtools/no-adopted-style-sheets
    const stylesheets = rootNode.adoptedStyleSheets;
    for (const sheet of stylesheets) {
        for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && rule.selectorText.startsWith(`.${prefix}`)) {
                sheet.replaceSync(styleChanges);
                return;
            }
        }
    }
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(styleChanges);
    // eslint-disable-next-line @devtools/no-adopted-style-sheets
    rootNode.adoptedStyleSheets = [...stylesheets, stylesheet];
}
export function dispatchAiAssistanceDoneEvent() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aiassistancedone'));
    }
}
//# sourceMappingURL=DOMHelpers.js.map