import * as SDK from '../../../core/sdk/sdk.js';
export declare const MAX_TARGET_ORIGINS = 100;
/**
 * Resolves and filters active DOM storage partitions from the Target Manager matching the given context constraints.
 *
 * @param origin The partition origin to match.
 * @param type The DOM storage type ('localStorage' or 'sessionStorage') to filter for.
 * @param targetManager The TargetManager instance to query for DOMStorageModels.
 * @param primaryPageTarget The primary page target to ensure target-tree containment.
 * @param storageKey Optional. If specified, resolves only the partition matching this unique key and the target origin.
 */
export declare function resolveDOMStorages(origin: string, type: 'localStorage' | 'sessionStorage', targetManager: SDK.TargetManager.TargetManager, primaryPageTarget: SDK.Target.Target, storageKey?: string): SDK.DOMStorageModel.DOMStorage[];
