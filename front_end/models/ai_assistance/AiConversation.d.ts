import { type ContextDetail, type ResponseData } from './agents/AiAgent.js';
import { type ConversationType, type SerializedConversation } from './AiHistoryStorage.js';
export declare const NOT_FOUND_IMAGE_DATA = "";
export declare class AiConversation {
    #private;
    readonly id: string;
    type: ConversationType;
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
    static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation;
}
