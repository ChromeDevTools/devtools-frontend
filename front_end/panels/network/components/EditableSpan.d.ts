export declare class EditableSpan extends HTMLElement {
    #private;
    get value(): string;
    set value(value: string);
    performUpdate(): void;
    focus(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-editable-span': EditableSpan;
    }
}
