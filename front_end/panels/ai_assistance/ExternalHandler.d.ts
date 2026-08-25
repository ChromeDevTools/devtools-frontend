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
export declare function handleExternalAIRequest(options: ExternalAIRequestOptions): Promise<unknown[]>;
declare global {
    interface Window {
        handleExternalAIRequest?: typeof handleExternalAIRequest;
    }
}
