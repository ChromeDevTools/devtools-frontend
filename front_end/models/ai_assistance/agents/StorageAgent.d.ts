import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { type StorageItem } from '../StorageItem.js';
import { type AgentOptions, AiAgent, type ContextResponse, type ConversationContext, type RequestOptions } from './AiAgent.js';
export declare function isSamePageOrigin(target: SDK.Target.Target | null, context?: ConversationContext<unknown>): boolean;
export declare class StorageAgent extends AiAgent<StorageItem> {
    #private;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    constructor(opts: AgentOptions);
    protected preRun(): Promise<void>;
    handleContextDetails(context: ConversationContext<StorageItem> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, context: ConversationContext<StorageItem> | null): Promise<string>;
}
/**
 * Resolves and filters active DOM storage partitions from the Target Manager matching the given context constraints.
 *
 * @param context The conversation context containing origin permissions. Only storage partitions under targets allowed
 * by this context will be returned.
 * @param type The DOM storage type ('localStorage' or 'sessionStorage') to filter for.
 * @param origin The partition origin to match.
 * @param storageKey Optional. If specified, resolves only the partition exactly matching this unique key, bypassing origin comparison.
 */
export declare function getCookiesForDomain(target: SDK.Target.Target, origin: string): Promise<SDK.Cookie.Cookie[] | null>;
export declare function findFrameForOrigin(context: ConversationContext<StorageItem> | undefined, origin: string, targetManager: SDK.TargetManager.TargetManager): SDK.ResourceTreeModel.ResourceTreeFrame | null;
export declare function resolveDOMStorages(context: ConversationContext<StorageItem> | undefined, type: 'localStorage' | 'sessionStorage', origin: string, targetManager: SDK.TargetManager.TargetManager, storageKey?: string): SDK.DOMStorageModel.DOMStorage[];
