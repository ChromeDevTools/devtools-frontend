import * as Host from '../../core/host/host.js';
import { type ContextDetail, type ConversationContext, type MultimodalInput, type ResponseData } from './agents/AiAgent.js';
import { ConversationType, type SerializedConversation } from './AiHistoryStorage.js';
import type { ChangeManager } from './ChangeManager.js';
export declare const NOT_FOUND_IMAGE_DATA = "";
export declare function generateContextDetailsMarkdown(details: ContextDetail[]): string;
export declare class AiConversation {
    #private;
    static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation;
    readonly id: string;
    type: ConversationType;
    readonly history: ResponseData[];
    constructor(type: ConversationType, data?: ResponseData[], id?: string, isReadOnly?: boolean, aidaClient?: Host.AidaClient.AidaClient, changeManager?: ChangeManager, isExternal?: boolean);
    get isReadOnly(): boolean;
    get title(): string | undefined;
    get isEmpty(): boolean;
    getConversationMarkdown(): string;
    archiveConversation(): void;
    addHistoryItem(item: ResponseData): Promise<void>;
    serialize(): SerializedConversation;
    run(initialQuery: string, options: {
        selected: ConversationContext<unknown> | null;
        signal?: AbortSignal;
    }, multimodalInput?: MultimodalInput): AsyncGenerator<ResponseData, void, void>;
    get origin(): string | undefined;
}
