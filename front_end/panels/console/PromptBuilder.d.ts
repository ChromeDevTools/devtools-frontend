import * as SDK from '../../core/sdk/sdk.js';
import type { ConsoleViewMessage } from './ConsoleViewMessage.js';
export declare enum SourceType {
    MESSAGE = "message",
    STACKTRACE = "stacktrace",
    NETWORK_REQUEST = "networkRequest",
    RELATED_CODE = "relatedCode"
}
export interface Source {
    type: SourceType;
    value: string;
}
export declare class PromptBuilder {
    #private;
    constructor(consoleMessage: ConsoleViewMessage);
    getNetworkRequest(): Promise<SDK.NetworkRequest.NetworkRequest | undefined>;
    /**
     * Gets the source file associated with the top of the message's stacktrace.
     * Returns an empty string if the source is not available for any reasons.
     */
    getMessageSourceCode(): Promise<{
        text: string;
        columnNumber: number;
        lineNumber: number;
    }>;
    buildPrompt(sourcesTypes?: SourceType[]): Promise<{
        prompt: string;
        sources: Source[];
        isPageReloadRecommended: boolean;
    }>;
    formatPrompt({ message, relatedCode, relatedRequest }: {
        message: string;
        relatedCode: string;
        relatedRequest: string;
    }): string;
    getSearchQuery(): string;
}
export declare function allowHeader(header: SDK.NetworkRequest.NameValue): boolean;
export declare function lineWhitespace(line: string): string | null;
export declare function formatRelatedCode({ text, columnNumber, lineNumber }: {
    text: string;
    columnNumber: number;
    lineNumber: number;
}, maxCodeSize?: number): string;
export declare function formatNetworkRequest(request: Pick<SDK.NetworkRequest.NetworkRequest, 'url' | 'requestHeaders' | 'responseHeaders' | 'statusCode' | 'statusText'>): string;
export declare function formatConsoleMessage(message: ConsoleViewMessage): string;
/**
 * This formats the stacktrace from the console message which might or might not
 * match the content of stacktrace(s) in the console message arguments.
 */
export declare function formatStackTrace(message: ConsoleViewMessage): string;
