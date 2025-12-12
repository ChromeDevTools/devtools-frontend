import * as Host from '../../../core/host/host.js';
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
    onSuggestionAccepted: () => void;
    onRequestTriggered: () => void;
    onResponseReceived: (citations: Host.AidaClient.Citation[]) => void;
}
export declare class AiCodeGenerationProvider {
    #private;
    private constructor();
    static createInstance(aiCodeGenerationConfig: AiCodeGenerationConfig): AiCodeGenerationProvider;
    extension(): CodeMirror.Extension[];
    dispose(): void;
    editorInitialized(editor: TextEditor): void;
    activateTeaser(update: CodeMirror.ViewUpdate): Promise<void>;
}
