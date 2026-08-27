import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
export type ContextType = 'NETWORK_REQUEST';
export interface ExternalAIRequestOptions {
    context?: {
        type: ContextType;
        contextIdentifier: string;
    };
    prompts: string[];
}
export interface IndividualPromptRequestResponse {
    prompt: string;
    response: string;
    error?: string;
}
export declare function getMatchingFlavorContext(contextOptions?: ExternalAIRequestOptions['context']): AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
export declare function handleExternalAIRequest(options: ExternalAIRequestOptions): Promise<unknown[]>;
declare global {
    interface Window {
        handleExternalAIRequest?: typeof handleExternalAIRequest;
    }
}
