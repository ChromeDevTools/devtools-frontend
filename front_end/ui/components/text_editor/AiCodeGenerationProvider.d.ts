import * as Host from '../../../core/host/host.js';
import type * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import type { TextEditor } from './TextEditor.js';
export declare enum AiCodeGenerationTeaserMode {
    ACTIVE = "active",
    DISMISSED = "dismissed"
}
export declare const setAiCodeGenerationTeaserMode: CodeMirror.StateEffectType<AiCodeGenerationTeaserMode>;
export interface AiCodeGenerationConfig {
    generationContext: {
        inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage;
    };
    onSuggestionAccepted: (citations: Host.AidaClient.Citation[]) => void;
    onRequestTriggered: () => void;
    onResponseReceived: () => void;
    panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}
export declare class AiCodeGenerationProvider {
    #private;
    private constructor();
    static createInstance(aiCodeGenerationConfig: AiCodeGenerationConfig): AiCodeGenerationProvider;
    extension(): CodeMirror.Extension[];
    dispose(): void;
    editorInitialized(editor: TextEditor): void;
}
