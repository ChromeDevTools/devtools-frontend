import * as SDK from '../../../core/sdk/sdk.js';
import { ConversationContext, type ConversationSuggestions } from '../agents/AiAgent.js';
import { type StorageItem } from '../StorageItem.js';
export declare class StorageContext extends ConversationContext<StorageItem> {
    #private;
    constructor(item: StorageItem);
    /**
     * Returns the security origin of the primary inspected page target.
     *
     * The storage context binds to `primaryTargetOrigin` rather than the specific
     * item origin (`this.#item.origin`). This allows generic storage views
     * (which have an empty origin) and third-party storage items to be inspected
     * within the current page conversation.
     *
     * @returns The security origin of the primary page target.
     */
    getOrigin(): SDK.SecurityOrigin.SecurityOrigin;
    getItem(): StorageItem;
    getTitle(): string;
    /**
     * @override
     */
    isLoggingEnabled(): boolean;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
}
