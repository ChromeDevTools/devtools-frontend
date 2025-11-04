export interface TextPromptData {
    ariaLabel: string;
    prefix: string;
    suggestion: string;
}
export declare class PromptInputEvent extends Event {
    static readonly eventName = "promptinputchanged";
    data: string;
    constructor(value: string);
}
export declare class TextPrompt extends HTMLElement {
    #private;
    set data(data: TextPromptData);
    get data(): TextPromptData;
    focus(): void;
    moveCaretToEndOfInput(): void;
    onKeyDown(event: KeyboardEvent): void;
    setSelectedRange(startIndex: number, endIndex: number): void;
    setPrefix(prefix: string): void;
    setSuggestion(suggestion: string): void;
    setText(text: string): void;
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-text-prompt': TextPrompt;
    }
    interface HTMLElementEventMap {
        promptinputchanged: PromptInputEvent;
    }
}
