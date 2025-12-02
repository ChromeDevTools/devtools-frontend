import * as Platform from '../../../core/platform/platform.js';
/**
 * A simple icon component to handle external links.
 * Handles both normal links `https://example.com`
 * and chrome links `chrome://flags`.
 *
 * html`
 *   <devtools-link href=""></devtools-link>
 * `;
 * ```
 *
 * @property href - The href to the place the link wants to navigate
 * @property jslogContext - The `"jslogcontext"` attribute is reflected as a property.
 *
 * @attribute href - The href to the place the link wants to navigate
 * @attribute jslogcontext -
 * The context for the `jslog` attribute. A `jslog`
 * attribute is generated automatically with the
 * provided context.
 */
export declare class Link extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    get href(): string | null;
    set href(href: Platform.DevToolsPath.UrlString);
    get jslogContext(): string | null;
    set jslogContext(jslogContext: string);
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-link': Link;
    }
}
