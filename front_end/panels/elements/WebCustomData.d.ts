/**
 * Lazily loads the vscode.web-custom-data/browser.css-data.json and allows
 * lookup by property name.
 *
 * The class intentionally doesn't return any promise to the loaded data.
 * Otherwise clients would need to Promise.race against a timeout to handle
 * the case where the data is not yet available.
 */
export declare class WebCustomData {
    #private;
    /** The test actually needs to wait for the result */
    readonly fetchPromiseForTest: Promise<unknown>;
    constructor(remoteBase: string);
    /**
     * Creates a fresh `WebCustomData` instance using the standard
     * DevTools remote base.
     * Throws if no valid remoteBase was found.
     */
    static create(): WebCustomData;
    /**
     * Returns the documentation for the CSS property `name` or `undefined` if
     * no such property is documented. Also returns `undefined` if data hasn't
     * finished loading or failed to load.
     */
    findCssProperty(name: string): CSSProperty | undefined;
}
export interface CSSProperty {
    name: string;
    description?: string;
    references?: Array<{
        name: string;
        url: string;
    }>;
}
