/**
 * Declarative wrapper around `StackLocation`. Lit owns the real views, which
 * are children of this element. `StackLocation` manages only `SlotView`s.
 */
export declare class StackPaneElement extends HTMLElement {
    #private;
    set isVisible(isVisible: boolean);
    connectedCallback(): void;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-stack-pane': StackPaneElement;
    }
}
