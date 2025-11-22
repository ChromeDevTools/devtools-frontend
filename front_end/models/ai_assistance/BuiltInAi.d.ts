export interface LanguageModel {
    promptStreaming: (arg0: string, opts?: {
        signal?: AbortSignal;
    }) => AsyncGenerator<string>;
    clone: () => Promise<LanguageModel>;
    destroy: () => void;
}
export declare const enum LanguageModelAvailability {
    UNAVAILABLE = "unavailable",
    DOWNLOADABLE = "downloadable",
    DOWNLOADING = "downloading",
    AVAILABLE = "available",
    DISABLED = "disabled"
}
export declare class BuiltInAi {
    #private;
    initDoneForTesting: Promise<void>;
    static instance(): BuiltInAi;
    constructor();
    getLanguageModelAvailability(): Promise<LanguageModelAvailability>;
    hasSession(): boolean;
    initialize(): Promise<void>;
    static removeInstance(): void;
    getConsoleInsight(prompt: string, abortController: AbortController): AsyncGenerator<string>;
}
