import * as Common from '../../core/common/common.js';
import { type ContextDetail, type ResponseData, type SerializedResponseData } from './agents/AiAgent.js';
export declare const enum ConversationType {
    STYLING = "freestyler",
    FILE = "drjones-file",
    NETWORK = "drjones-network-request",
    PERFORMANCE = "drjones-performance-full"
}
export declare const NOT_FOUND_IMAGE_DATA = "";
export interface SerializedConversation {
    id: string;
    type: ConversationType;
    history: SerializedResponseData[];
    isExternal: boolean;
}
export interface SerializedImage {
    id: string;
    mimeType: string;
    data: string;
}
export declare class Conversation {
    #private;
    readonly id: string;
    readonly type: ConversationType;
    readonly history: ResponseData[];
    static generateContextDetailsMarkdown(details: ContextDetail[]): string;
    constructor(type: ConversationType, data?: ResponseData[], id?: string, isReadOnly?: boolean, isExternal?: boolean);
    get isReadOnly(): boolean;
    get title(): string | undefined;
    get isEmpty(): boolean;
    getConversationMarkdown(): string;
    archiveConversation(): void;
    addHistoryItem(item: ResponseData): Promise<void>;
    serialize(): SerializedConversation;
    static fromSerializedConversation(serializedConversation: SerializedConversation): Conversation;
}
export declare const enum Events {
    HISTORY_DELETED = "AiHistoryDeleted"
}
export interface EventTypes {
    [Events.HISTORY_DELETED]: void;
}
export declare class AiHistoryStorage extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor(maxStorageSize?: number);
    clearForTest(): void;
    upsertHistoryEntry(agentEntry: SerializedConversation): Promise<void>;
    upsertImage(image: SerializedImage): Promise<void>;
    deleteHistoryEntry(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    getHistory(): SerializedConversation[];
    getImageHistory(): SerializedImage[];
    static instance(opts?: {
        forceNew: boolean;
        maxStorageSize?: number;
    }): AiHistoryStorage;
}
