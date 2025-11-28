import type * as Platform from '../../../core/platform/platform.js';
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
    static readonly observedAttributes: string[];
    name: string;
    set data(data: AdornerData);
    cloneNode(deep?: boolean): Node;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    isActive(): boolean;
    /**
     * Toggle the active state of the adorner. Optionally pass `true` to force-set
     * an active state; pass `false` to force-set an inactive state.
     */
    toggle(forceActiveState?: boolean): void;
    show(): void;
    hide(): void;
    /**
     * Make adorner interactive by responding to click events with the provided action
     * and simulating ARIA-capable toggle button behavior.
     */
    addInteraction(action: EventListener, options: {
        ariaLabelDefault: Platform.UIString.LocalizedString;
        ariaLabelActive: Platform.UIString.LocalizedString;
        isToggle?: boolean;
        shouldPropagateOnKeydown?: boolean;
    }): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-adorner': Adorner;
    }
}
