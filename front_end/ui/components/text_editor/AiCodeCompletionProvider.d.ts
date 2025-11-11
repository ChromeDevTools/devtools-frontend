import * as Host from '../../../core/host/host.js';
import * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import type { TextEditor } from './TextEditor.js';
export declare enum AiCodeCompletionTeaserMode {
    OFF = "off",
    ON = "on",
    ONLY_SHOW_ON_EMPTY = "onlyShowOnEmpty"
}
export declare const setAiCodeCompletionTeaserMode: CodeMirror.StateEffectType<AiCodeCompletionTeaserMode>;
export declare const aiCodeCompletionTeaserModeState: CodeMirror.StateField<AiCodeCompletionTeaserMode>;
export interface AiCodeCompletionConfig {
    completionContext: {
        additionalFiles?: Host.AidaClient.AdditionalFile[];
        inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage;
        getPrefix?: () => string;
        stopSequences?: string[];
    };
    onFeatureEnabled: () => void;
    onFeatureDisabled: () => void;
    onSuggestionAccepted: () => void;
    onRequestTriggered: () => void;
    onResponseReceived: (citations: Host.AidaClient.Citation[]) => void;
    panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}
export declare const DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
export declare const AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;
export declare class AiCodeCompletionProvider {
    #private;
    constructor(aiCodeCompletionConfig: AiCodeCompletionConfig);
    extension(): CodeMirror.Extension[];
    dispose(): void;
    editorInitialized(editor: TextEditor): void;
    clearCache(): void;
}
