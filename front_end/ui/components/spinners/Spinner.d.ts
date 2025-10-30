export interface SpinnerProperties {
    active: boolean;
}
export declare class Spinner extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor(props?: SpinnerProperties);
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    /**
     * Returns whether the spinner is active or not.
     */
    get active(): boolean;
    /**
     * Sets the `"active"` attribute for the spinner.
     */
    set active(active: boolean);
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-spinner': Spinner;
    }
}
