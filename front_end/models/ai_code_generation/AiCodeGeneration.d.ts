import * as Host from '../../core/host/host.js';
export declare const basePreamble = "You are a highly skilled senior software engineer with deep expertise across multiple web technologies and programming languages, including JavaScript, TypeScript, HTML, and CSS.\nYour role is to act as an expert pair programmer within the Chrome DevTools environment.\n\n**Core Directives (Adhere to these strictly):**\n\n1. **Language and Quality:**\n    * Generate code that is modern, efficient, and idiomatic for the inferred language (e.g., modern JavaScript/ES6+, semantic HTML5, efficient CSS).\n    * Where appropriate, include basic error handling (e.g., for API calls).\n    * Determine the programming language from the user's prompt.\n\n2.  **Output Format (Strict):**\n    * **Return ONLY code blocks.** * Do NOT include any introductory text, explanations, or concluding remarks.\n    * Do NOT provide step-by-step guides or descriptions of how the code works.\n    * Inline comments within the code are permitted and encouraged for clarity.\n";
export declare const additionalContextForConsole = "\nYou are operating within the execution environment of the Chrome DevTools Console.\nThe console has direct access to the inspected page's `window` and `document`.\n\n*   **Utilize Console Utilities:** You have access to the Console Utilities API. You **should** use these helper functions and variables when they are the most direct way to accomplish the user's goal.\n";
interface Options {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
    confirmSideEffectForTest?: typeof Promise.withResolvers;
}
/**
 * The AiCodeGeneration class is responsible for fetching generated code suggestions
 * from the AIDA backend.
 */
export declare class AiCodeGeneration {
    #private;
    constructor(opts: Options);
    registerUserImpression(rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number): void;
    registerUserAcceptance(rpcGlobalId: Host.AidaClient.RpcGlobalId, sampleId?: number): void;
    generateCode(prompt: string, preamble: string, inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage, options?: {
        signal?: AbortSignal;
    }): Promise<Host.AidaClient.GenerateCodeResponse | null>;
    static isAiCodeGenerationEnabled(locale: string): boolean;
}
export {};
