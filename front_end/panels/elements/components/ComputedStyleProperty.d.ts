export declare class NavigateToSourceEvent extends Event {
    static readonly eventName = "onnavigatetosource";
    constructor();
}
export declare class ComputedStyleProperty extends HTMLElement {
    #private;
    connectedCallback(): void;
    set inherited(inherited: boolean);
    set traceable(traceable: boolean);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-computed-style-property': ComputedStyleProperty;
    }
}
