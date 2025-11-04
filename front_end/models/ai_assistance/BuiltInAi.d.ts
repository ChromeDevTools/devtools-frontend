export interface LanguageModel {
    promptStreaming: (arg0: string, opts?: {
        signal?: AbortSignal;
    }) => AsyncGenerator<string>;
    clone: () => LanguageModel;
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
    static getLanguageModelAvailability(): Promise<LanguageModelAvailability>;
    static cachedIsAvailable(): boolean;
    static isGpuAvailable(): boolean;
    private constructor();
    static instance(): Promise<BuiltInAi | undefined>;
    static removeInstance(): void;
    getConsoleInsight(prompt: string, abortController: AbortController): AsyncGenerator<string>;
}
