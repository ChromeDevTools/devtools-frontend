import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as LHModel from '../../models/lighthouse/lighthouse.js';
import type * as Trace from '../../models/trace/trace.js';
import type * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';
import { type AllowedOriginResult, type ContextDetail, type ConversationContext, type MultimodalInput, type ResponseData } from './agents/AiAgent.js';
import { ConversationType, type SerializedConversation } from './AiHistoryStorage.js';
import type { ChangeManager } from './ChangeManager.js';
export declare const NOT_FOUND_IMAGE_DATA = "";
export declare const CONTEXT_TITLE = "Analyzing data";
/**
 * List of page navigations that are allowed during an AI agent run.
 * These are page navigations triggered by agents themselves:
 * - `about://` : Navigated to before initiating a trace recording to ensure a clean state.
 * - `chrome://terms`: Navigated to by Lighthouse during its Back-Forward Cache
 *    audit.
 */
export declare const ALLOWED_PAGE_NAVIGATIONS: Platform.DevToolsPath.UrlString[];
export declare function generateContextDetailsMarkdown(details: ContextDetail[]): string;
export interface AiConversationOptions {
    type: ConversationType;
    data?: ResponseData[];
    id?: string;
    isReadOnly?: boolean;
    aidaClient?: Host.AidaClient.AidaClient;
    changeManager?: ChangeManager;
    performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
    onInspectElement?: () => Promise<SDK.DOMModel.DOMNode | null>;
    networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;
    lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON | null>;
}
export declare class AiConversation {
    #private;
    static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation;
    readonly id: string;
    readonly history: ResponseData[];
    constructor(options: AiConversationOptions);
    get isReadOnly(): boolean;
    static titleForSerialized(serialized: SerializedConversation): string | undefined;
    static title(query: string): string;
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
    allowedOrigin: () => AllowedOriginResult;
}
