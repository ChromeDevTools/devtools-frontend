import { type TemplateResult } from '../../lit/lit.js';
export interface ListItemEventDetail {
    index: number;
}
export declare class ItemEditEvent extends CustomEvent<ListItemEventDetail> {
    constructor(detail: ListItemEventDetail);
}
export declare class ItemRemoveEvent extends CustomEvent<ListItemEventDetail> {
    constructor(detail: ListItemEventDetail);
}
export declare class List extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    set editable(isEditable: boolean);
    set deletable(isDeletable: boolean);
    set disableListItemFocus(disableFocus: boolean);
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    createSlottedListItem(index: number): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-list': List;
    }
}
declare global {
    interface HTMLElementEventMap extends Record<'delete', ItemRemoveEvent>, Record<'edit', ItemEditEvent> {
    }
}
