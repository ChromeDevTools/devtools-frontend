import * as SDK from '../../../core/sdk/sdk.js';
/**
 * Maximum number of target origins allowed in a single batch query to bound
 * model iteration, memory usage, and CDP traffic.
 */
export declare const MAX_TARGET_ORIGINS = 100;
/**
 * Resolves active DOM storage partitions from all DOMStorageModel instances
 * matching origin constraints under the primary page target tree.
 *
 * In Chromium, storage is partitioned by StorageKey (origin + top-level site
 * context). A single origin can have multiple distinct storage partitions
 * (e.g. first-party page vs embedded third-party iframe). Furthermore, DevTools
 * creates a separate DOMStorageModel per frame subtarget.
 *
 * This function:
 * 1. Enables DOMStorageModel on-demand for subtargets in the primary page tree.
 * 2. Deduplicates partitions across multiple subtargets sharing the same storageKey.
 * 3. Preserves distinct partition keys for the same origin unless a specific storageKey is requested.
 *
 * @param origin The partition origin to match.
 * @param type The DOM storage type ('localStorage' or 'sessionStorage') to filter for.
 * @param targetManager The TargetManager instance to query for DOMStorageModels.
 * @param primaryPageTarget The primary page target to ensure target-tree containment.
 * @param storageKey Optional. If specified, resolves only the partition matching this unique key.
 * @returns Array of unique DOMStorage partition handles matching constraints.
 */
export declare function resolveDOMStorages(origin: string, type: 'localStorage' | 'sessionStorage', targetManager: SDK.TargetManager.TargetManager, primaryPageTarget: SDK.Target.Target, storageKey?: string): SDK.DOMStorageModel.DOMStorage[];
/**
 * Calculates the total size in bytes of all key-value entries across the provided
 * DOMStorage partitions.
 *
 * Transient CDP failures (e.g. target detachment during frame navigation) are caught
 * gracefully to prevent failing the entire storage calculation.
 *
 * @param storages Array of DOMStorage partition handles to inspect.
 * @returns Total storage size in bytes.
 */
export declare function calculateDOMStoragesUsage(storages: SDK.DOMStorageModel.DOMStorage[]): Promise<number>;
