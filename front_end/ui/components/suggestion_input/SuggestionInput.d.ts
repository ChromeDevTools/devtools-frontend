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
/**
 * Contains a suggestion emitted due to action by the user.
 */
declare class SuggestEvent extends Event {
    static readonly eventName = "suggest";
    suggestion: string;
    constructor(suggestion: string);
}
/**
 * Parents should listen for this event and register the listeners provided by
 * this event.
 */
declare class SuggestionInitEvent extends Event {
    static readonly eventName = "suggestioninit";
    listeners: Array<[string, (event: Event) => void]>;
    constructor(listeners: Array<[string, (event: Event) => void]>);
}
export type SuggestionFilter = (option: string, query: string) => boolean;
interface SuggestionBoxViewInput {
    suggestions: readonly string[];
    cursor: number;
    hasVisibleSuggestions: boolean;
    onSuggest: (suggestion: string) => void;
}
declare const SUGGESTION_BOX_VIEW: (input: SuggestionBoxViewInput, _output: undefined, target: ShadowRoot) => void;
/**
 * @fires SuggestionInitEvent#suggestioninit
 * @fires SuggestEvent#suggest
 */
declare class SuggestionBox extends HTMLElement {
    #private;
    constructor(view?: typeof SUGGESTION_BOX_VIEW);
    get renderRoot(): ShadowRoot;
    get updateComplete(): Promise<boolean>;
    get options(): readonly string[];
    set options(options: readonly string[]);
    get expression(): string;
    set expression(expression: string);
    get suggestionFilter(): SuggestionFilter | undefined;
    set suggestionFilter(suggestionFilter: SuggestionFilter | undefined);
    get hideExactMatch(): boolean;
    set hideExactMatch(hideExactMatch: boolean);
    connectedCallback(): void;
}
export interface SuggestionInputViewInput {
    disabled: boolean;
    strikethrough: boolean;
    value: string;
    mimeType: string;
    placeholder: string;
    options: readonly string[];
    suggestionFilter?: SuggestionFilter;
    hideExactMatch: boolean;
    expression: string;
    onFocus: (event: FocusEvent) => void;
    onInput: (event: {
        target: EditableContent;
    }) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    onSuggestionInit: (event: SuggestionInitEvent) => void;
    onSuggest: (event: SuggestEvent) => void;
}
export declare const SUGGESTION_INPUT_VIEW: (input: SuggestionInputViewInput, _output: undefined, target: ShadowRoot) => void;
export declare class SuggestionInput extends HTMLElement {
    #private;
    constructor(view?: typeof SUGGESTION_INPUT_VIEW);
    get renderRoot(): ShadowRoot;
    get updateComplete(): Promise<boolean>;
    get options(): readonly string[];
    set options(options: readonly string[]);
    get autocomplete(): boolean | undefined;
    set autocomplete(autocomplete: boolean | undefined);
    get suggestionFilter(): SuggestionFilter | undefined;
    set suggestionFilter(suggestionFilter: SuggestionFilter | undefined);
    get hideExactMatch(): boolean;
    set hideExactMatch(hideExactMatch: boolean);
    get expression(): string;
    set expression(expression: string);
    get placeholder(): string;
    set placeholder(placeholder: string);
    get value(): string;
    set value(value: string);
    get disabled(): boolean;
    set disabled(disabled: boolean);
    get strikethrough(): boolean;
    set strikethrough(strikethrough: boolean);
    get mimeType(): string;
    set mimeType(mimeType: string);
    get jslogContext(): string | undefined;
    set jslogContext(jslogContext: string | undefined);
    connectedCallback(): void;
}
export {};
