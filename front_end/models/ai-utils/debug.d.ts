export declare const DEVTOOLS_AI_DEBUG_STORAGE_KEY = "devToolsAiDebug";
/**
 * Configuration options for enabling DevTools AI debug logging in the console.
 * Passed to `window.setDevToolsAIDebug(config)` and persisted in `localStorage`.
 */
export interface DevToolsAIDebugConfig {
    /**
     * Enables console debug logging and structured log persistence for DevTools AI
     * Assistance (`AiAgent`, `AiAgent2`, `AiUtils`, and `panels/ai_assistance/`).
     */
    assistance?: boolean;
    /**
     * Enables console debug logging for the AIDA and GCA host client and
     * request/response translation layer (`AidaClient`, `GcaClient`, and
     * `AidaGcaTranslation`).
     */
    gca?: boolean;
    /**
     * Enables console debug logging for AI Code Completion and AI Code Generation
     * (`AiCodeCompletion` and `AiCodeGeneration`), replacing the separate
     * `debug.ts` helpers in `models/ai_code_completion/` and
     * `models/ai_code_generation/`.
     */
    codeGenComplete?: boolean;
}
/**
 * Reads the persisted DevTools AI debug configuration from `localStorage`.
 */
export declare function getDevToolsAIDebugConfig(): Required<DevToolsAIDebugConfig>;
/**
 * Merges `config` into the persisted `devToolsAiDebug` object in `localStorage`
 * and logs the resulting state to the console.
 */
export declare function setDevToolsAIDebug(config?: DevToolsAIDebugConfig): Required<DevToolsAIDebugConfig>;
export declare function isDebugMode(): boolean;
export declare function debugLog(...log: unknown[]): void;
export declare function isCodeGenCompleteDebugMode(): boolean;
export declare function debugCodeGenCompleteLog(...log: unknown[]): void;
/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled, gca: enabled})` instead.
 */
export declare function setDebugAiAssistanceEnabled(enabled: boolean): void;
/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled})` instead.
 */
export declare function setAiAssistanceStructuredLogEnabled(enabled: boolean): void;
/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export declare function setDebugAiCodeCompletionEnabled(enabled: boolean): void;
/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export declare function setDebugAiCodeGenerationEnabled(enabled: boolean): void;
declare global {
    var setDevToolsAIDebug: (config?: DevToolsAIDebugConfig) => Required<DevToolsAIDebugConfig>;
    var setDebugAiAssistanceEnabled: (enabled: boolean) => void;
    var setAiAssistanceStructuredLogEnabled: (enabled: boolean) => void;
    var setDebugAiCodeCompletionEnabled: (enabled: boolean) => void;
    var setDebugAiCodeGenerationEnabled: (enabled: boolean) => void;
}
