import * as Host from '../../core/host/host.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
export declare class StylesAiCodeCompletionProvider {
    #private;
    getCompletionHint?: () => string | null;
    setAiAutoCompletion?: (args: {
        text: string;
        from: number;
        startTime: number;
        onImpression: (rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number) => void;
        clearCachedRequest: () => void;
        citations: Host.AidaClient.Citation[];
        rpcGlobalId?: Host.AidaClient.RpcGlobalId;
        sampleId?: number;
    } | null) => void;
    private constructor();
    static createInstance(aiCodeCompletionConfig: TextEditor.AiCodeCompletionProvider.AiCodeCompletionConfig): StylesAiCodeCompletionProvider;
    triggerAiCodeCompletion(text: string, cursorPosition: number, isEditingName: boolean, cssProperty: SDK.CSSProperty.CSSProperty, cssModel: SDK.CSSModel.CSSModel): Promise<void>;
    clearCache(): void;
    onSuggestionAccepted(citations: Host.AidaClient.Citation[], rpcGlobalId?: Host.AidaClient.RpcGlobalId, sampleId?: number): void;
}
