export declare class GreenDevAgentAntigravityCliSocketClient {
    #private;
    sessionReady: Promise<void>;
    constructor();
    sendPrompt(promptText: string, onChunk: (chunk: string) => void): Promise<void>;
}
