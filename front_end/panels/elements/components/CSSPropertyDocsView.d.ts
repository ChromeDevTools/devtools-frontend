import '../../../ui/legacy/legacy.js';
export declare const enum BaselineStatus {
    LIMITED = "false",
    LOW = "low",
    HIGH = "high"
}
/**
 * An object containing Baseline (https://web.dev/baseline,
 * https://web-platform-dx.github.io/web-features/) information about the feature's browser
 * compatibility.
 */
interface Baseline {
    /**
     * The Baseline status of the feature:
     * - `"false"` — limited availability across major browsers
     * - `"low"` — newly available across major browsers
     * - `"high"` — widely available across major browsers
     */
    status: BaselineStatus;
    /**
     * A date in the format `YYYY-MM-DD` representing when the feature became newly available,
     * or `undefined` if it hasn't yet reached that status.
     */
    baseline_low_date?: string;
    /**
     * A date in the format `YYYY-MM-DD` representing when the feature became widely available,
     * or `undefined` if it hasn't yet reached that status.
     *
     * The widely available date is always 30 months after the newly available date.
     */
    baseline_high_date?: string;
}
export interface CSSProperty {
    name: string;
    description?: string;
    baseline?: Baseline;
    browsers?: string[];
    references?: Array<{
        name: string;
        url: string;
    }>;
}
export declare class CSSPropertyDocsView extends HTMLElement {
    #private;
    constructor(cssProperty: CSSProperty);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-property-docs-view': CSSPropertyDocsView;
    }
}
export {};
