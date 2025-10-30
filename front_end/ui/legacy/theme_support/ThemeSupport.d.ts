import * as Common from '../../../core/common/common.js';
export declare class ThemeSupport extends EventTarget {
    #private;
    private setting;
    private computedStyleOfHTML;
    private constructor();
    static hasInstance(): boolean;
    static instance(opts?: {
        forceNew: boolean | null;
        setting: Common.Settings.Setting<string> | null;
    }): ThemeSupport;
    /**
     * Adds additional `Document` instances that should be themed besides the default
     * `window.document` in which this ThemeSupport instance was created.
     */
    addDocumentToTheme(document: Document): void;
    getComputedValue(propertyName: string, target?: Element | null): string;
    themeName(): string;
    static clearThemeCache(): void;
    fetchColorsAndApplyHostTheme(): void;
}
export declare class ThemeChangeEvent extends Event {
    static readonly eventName = "themechange";
    constructor();
}
