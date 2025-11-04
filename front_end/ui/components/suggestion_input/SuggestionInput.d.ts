import * as Lit from '../../../ui/lit/lit.js';
declare const LitElement: typeof Lit.LitElement;
declare global {
    interface HTMLElementTagNameMap {
        'devtools-suggestion-input': SuggestionInput;
        'devtools-editable-content': EditableContent;
        'devtools-suggestion-box': SuggestionBox;
    }
}
declare class EditableContent extends HTMLElement {
    #private;
    static get observedAttributes(): string[];
    set disabled(disabled: boolean);
    get disabled(): boolean;
    set value(value: string);
    get value(): string;
    set mimeType(type: string);
    get mimeType(): string;
    constructor();
    attributeChangedCallback(name: string, _: string | null, value: string | null): void;
}
type SuggestionFilter = (option: string, query: string) => boolean;
/**
 * @fires SuggestionInitEvent#suggestioninit
 * @fires SuggestEvent#suggest
 */
declare class SuggestionBox extends LitElement {
    #private;
    options: readonly string[];
    expression: string;
    suggestionFilter?: SuggestionFilter;
    private cursor;
    constructor();
    connectedCallback(): void;
    willUpdate(changedProperties: Lit.PropertyValues<this>): void;
    protected render(): Lit.TemplateResult | undefined;
}
export declare class SuggestionInput extends LitElement {
    #private;
    static shadowRootOptions: {
        readonly delegatesFocus: true;
        readonly clonable?: boolean;
        readonly customElementRegistry?: CustomElementRegistry;
        readonly mode: ShadowRootMode;
        readonly serializable?: boolean;
        readonly slotAssignment?: SlotAssignmentMode;
    };
    /**
     * State passed to devtools-suggestion-box.
     */
    options: readonly string[];
    autocomplete?: boolean;
    suggestionFilter?: SuggestionFilter;
    expression: string;
    /**
     * State passed to devtools-editable-content.
     */
    placeholder: string;
    value: string;
    disabled: boolean;
    strikethrough: boolean;
    mimeType: string;
    jslogContext?: string;
    constructor();
    protected willUpdate(properties: Lit.PropertyValues<this>): void;
    protected render(): Lit.TemplateResult;
}
export {};
