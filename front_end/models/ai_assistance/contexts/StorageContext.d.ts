import { ConversationContext, type ConversationSuggestions } from '../agents/AiAgent.js';
import { type StorageItem } from '../StorageItem.js';
export declare class StorageContext extends ConversationContext<StorageItem> {
    #private;
    constructor(item: StorageItem);
    getURL(): string;
    getItem(): StorageItem;
    getTitle(): string;
    /**
     * @override
     */
    isLoggingEnabled(): boolean;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
}
