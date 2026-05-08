import * as Host from '../../../core/host/host.js';
import type { StorageItem } from '../StorageItem.js';
import { AiAgent, ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class StorageContext extends ConversationContext<StorageItem> {
    #private;
    constructor(item: StorageItem);
    getOrigin(): string;
    getItem(): StorageItem;
    getTitle(): string;
}
export declare class StorageAgent extends AiAgent<StorageItem> {
    readonly preamble = "You are a Senior Software Engineer, specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in Cookies, LocalStorage, and SessionStorage and connecting it to the application logic in the source code.\n\n# Considerations\n\n-   **Raw Evidence**: Treat storage data as \"raw evidence\". Do not make assumptions without verifying code references.\n-   **Brevity**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Keep answers short and actionable.\n\n **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer \"Sorry, I can't answer that. I'm best at questions about debugging web pages.\" to such questions.\n";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STORAGE_AGENT;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    constructor(opts?: {
        sessionId?: string;
        aidaClient?: Host.AidaClient.AidaClient;
    });
    handleContextDetails(_context: ConversationContext<StorageItem> | null): AsyncGenerator<never, void, void>;
    enhanceQuery(query: string, _context: ConversationContext<StorageItem> | null): Promise<string>;
}
