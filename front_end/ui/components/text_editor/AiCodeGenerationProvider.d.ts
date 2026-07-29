import * as Host from '../../../core/host/host.js';
import * as PanelCommon from '../../../panels/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import type { TextEditor } from './TextEditor.js';
export declare enum AiCodeGenerationTeaserMode {
    ACTIVE = "active",
    DISMISSED = "dismissed"
}
export declare const setAiCodeGenerationTeaserMode: CodeMirror.StateEffectType<AiCodeGenerationTeaserMode>;
export interface AiCodeGenerationConfig {
    generationContext: {
        additionalPreambleContext?: string;
        inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage;
    };
    onSuggestionAccepted: (citations: Host.AidaClient.Citation[]) => void;
    onRequestTriggered: () => void;
    onResponseReceived: () => void;
    disclaimerTooltipId: string;
    disclaimerTextVariant: PanelCommon.DisclaimerTextVariant;
}
export declare class AiCodeGenerationProvider {
    #private;
    private constructor();
    static createInstance(aiCodeGenerationConfig: AiCodeGenerationConfig): AiCodeGenerationProvider;
    extension(): CodeMirror.Extension[];
    dispose(): void;
    editorInitialized(editor: TextEditor): void;
}
