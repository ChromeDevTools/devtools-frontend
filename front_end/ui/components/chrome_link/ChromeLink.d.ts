import * as Platform from '../../../core/platform/platform.js';
declare global {
    interface HTMLElementTagNameMap {
        'devtools-chrome-link': ChromeLink;
    }
}
/**
 * Use this component to render links to 'chrome://...'-URLs
 * (for which regular <x-link>s do not work).
 **/
export declare class ChromeLink extends HTMLElement {
    #private;
    connectedCallback(): void;
    set href(href: Platform.DevToolsPath.UrlString);
}
