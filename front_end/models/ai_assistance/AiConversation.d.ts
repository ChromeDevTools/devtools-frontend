import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import { type ContextDetail, type ConversationContext, type MultimodalInput, type ResponseData } from './agents/AiAgent.js';
import { ConversationType, type SerializedConversation } from './AiHistoryStorage.js';
import type { ChangeManager } from './ChangeManager.js';
export declare const NOT_FOUND_IMAGE_DATA = "";
export declare function generateContextDetailsMarkdown(details: ContextDetail[]): string;
export declare class AiConversation {
    #private;
    static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation;
    readonly id: string;
    readonly history: ResponseData[];
    constructor(type: ConversationType, data?: ResponseData[], id?: string, isReadOnly?: boolean, aidaClient?: Host.AidaClient.AidaClient, changeManager?: ChangeManager, isExternal?: boolean);
    get isReadOnly(): boolean;
    get title(): string | undefined;
    get isEmpty(): boolean;
    setContext(updateContext: ConversationContext<unknown> | null): void;
    get selectedContext(): ConversationContext<unknown> | undefined;
    getConversationMarkdown(): string;
    archiveConversation(): void;
    addHistoryItem(item: ResponseData): Promise<void>;
    serialize(): SerializedConversation;
    run(initialQuery: string, options?: {
        signal?: AbortSignal;
        extraContext?: ExtraContext[];
        multimodalInput?: MultimodalInput;
    }): AsyncGenerator<ResponseData, void, void>;
    /**
     * Indicates whether the new conversation context is blocked due to cross-origin restrictions.
     * This happens when the conversation's context has a different
     * origin than the selected context.
     */
    get isBlockedByOrigin(): boolean;
    get origin(): string | undefined;
    get type(): ConversationType;
}
type ExtraContext = SDK.DOMModel.DOMNode | SDK.NetworkRequest.NetworkRequest | {
    event: Trace.Types.Events.Event;
    traceStartTime: Trace.Types.Timing.Micro;
} | {
    insight: Trace.Insights.Types.InsightModel;
    trace: Trace.TraceModel.ParsedTrace;
};
export {};
