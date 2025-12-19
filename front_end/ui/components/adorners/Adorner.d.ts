export interface AdornerData {
    name: string;
    content?: HTMLElement;
    jslogContext?: string;
}
/**
 * @deprecated Do not add new usages. The custom component will be removed an
 * embedded into the corresponding views.
 */
export declare class Adorner extends HTMLElement {
    #private;
    name: string;
    cloneNode(deep?: boolean): Node;
    connectedCallback(): void;
    static readonly observedAttributes: string[];
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    isActive(): boolean;
    show(): void;
    hide(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-adorner': Adorner;
    }
}
