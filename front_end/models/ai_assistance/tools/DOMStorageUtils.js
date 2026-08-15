// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../core/sdk/sdk.js';
import { areOriginsEquivalent, extractContextOrigin } from '../AiOrigins.js';
export const MAX_TARGET_ORIGINS = 100;
/**
 * Resolves and filters active DOM storage partitions from the Target Manager matching the given context constraints.
 *
 * @param origin The partition origin to match.
 * @param type The DOM storage type ('localStorage' or 'sessionStorage') to filter for.
 * @param targetManager The TargetManager instance to query for DOMStorageModels.
 * @param primaryPageTarget The primary page target to ensure target-tree containment.
 * @param storageKey Optional. If specified, resolves only the partition matching this unique key and the target origin.
 */
export function resolveDOMStorages(origin, type, targetManager, primaryPageTarget, storageKey) {
    const resolvedStorages = [];
    const isLocalStorage = type === 'localStorage';
    const targetOrigin = extractContextOrigin(origin);
    const domStorageModels = targetManager.models(SDK.DOMStorageModel.DOMStorageModel);
    for (const domStorageModel of domStorageModels) {
        if (domStorageModel.target().outermostTarget() !== primaryPageTarget) {
            // Skip DOMStorageModels that don't point to the same outermost target.
            continue;
        }
        // DOMStorageModel has autostart: false and only populates its storages map when enabled.
        // Ensure the model is enabled on-demand at the moment storage access is requested.
        domStorageModel.enable();
        for (const storage of domStorageModel.storages()) {
            if (storage.isLocalStorage !== isLocalStorage) {
                continue;
            }
            const currentStorageKey = storage.storageKey;
            if (!currentStorageKey) {
                continue;
            }
            // If storageKey is specified, only match that exact partition key.
            if (storageKey && storageKey !== currentStorageKey) {
                continue;
            }
            const parsedKey = SDK.StorageKeyManager.parseStorageKey(currentStorageKey);
            if (areOriginsEquivalent(parsedKey.origin, targetOrigin)) {
                resolvedStorages.push(storage);
            }
        }
    }
    return resolvedStorages;
}
//# sourceMappingURL=DOMStorageUtils.js.map