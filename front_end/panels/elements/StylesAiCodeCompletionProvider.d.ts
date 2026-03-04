import type * as SDK from '../../core/sdk/sdk.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
export declare class StylesAiCodeCompletionProvider {
    #private;
    private constructor();
    static createInstance(aiCodeCompletionConfig: TextEditor.AiCodeCompletionProvider.AiCodeCompletionConfig): StylesAiCodeCompletionProvider;
    triggerAiCodeCompletion(text: string, cursorPosition: number, isEditingName: boolean, cssProperty: SDK.CSSProperty.CSSProperty, cssModel: SDK.CSSModel.CSSModel): Promise<void>;
    clearCache(): void;
}
