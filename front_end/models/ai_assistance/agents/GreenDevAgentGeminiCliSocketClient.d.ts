export declare class GreenDevAgentGeminiCliSocketClient {
    #private;
    sessionReady: Promise<void>;
    constructor();
    sendPrompt(promptText: string): Promise<string>;
}
