import * as Common from '../../core/common/common.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
declare const ConsolePrompt_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.TEXT_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.TEXT_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.TEXT_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.TEXT_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.TEXT_CHANGED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.Widget;
export declare class ConsolePrompt extends ConsolePrompt_base {
    #private;
    private addCompletionsFromHistory;
    private initialText;
    private editor;
    private readonly eagerPreviewElement;
    private textChangeThrottler;
    private requestPreviewBound;
    private requestPreviewCurrent;
    private readonly innerPreviewElement;
    private readonly promptIcon;
    private readonly iconThrottler;
    private readonly eagerEvalSetting;
    protected previewRequestForTest: Promise<void> | null;
    private highlightingNode;
    private aiCodeCompletionConfig?;
    private aiCodeCompletionProvider?;
    constructor(aiCodeCompletionConfig?: TextEditor.AiCodeCompletionProvider.AiCodeCompletionConfig);
    private eagerSettingChanged;
    belowEditorElement(): Element;
    private onTextChanged;
    private requestPreview;
    willHide(): void;
    history(): TextEditor.AutocompleteHistory.AutocompleteHistory;
    clearAutocomplete(): void;
    clearAiCodeCompletionCache(): void;
    moveCaretToEndOfPrompt(): void;
    clear(): void;
    text(): string;
    setAddCompletionsFromHistory(value: boolean): void;
    private editorKeymap;
    private enterWillEvaluate;
    showSelfXssWarning(): void;
    private handleEnter;
    private updatePromptIcon;
    private appendCommand;
    private evaluateCommandInConsole;
    private substituteNames;
    private editorUpdate;
    focus(): void;
    private editorSetForTest;
}
export declare const enum Events {
    TEXT_CHANGED = "TextChanged"
}
export interface EventTypes {
    [Events.TEXT_CHANGED]: void;
}
export {};
