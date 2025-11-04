export interface EditableSpanData {
    value: string;
}
export declare class EditableSpan extends HTMLElement {
    #private;
    connectedCallback(): void;
    set data(data: EditableSpanData);
    get value(): string;
    set value(value: string);
    focus(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-editable-span': EditableSpan;
    }
}
