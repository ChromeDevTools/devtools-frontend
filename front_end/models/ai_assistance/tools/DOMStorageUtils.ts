// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import {areOriginsEquivalent, extractContextOrigin} from '../AiOrigins.js';

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
export function resolveDOMStorages(
    origin: string,
    type: 'localStorage'|'sessionStorage',
    targetManager: SDK.TargetManager.TargetManager,
    primaryPageTarget: SDK.Target.Target,
    storageKey?: string,
    ): SDK.DOMStorageModel.DOMStorage[] {
  const resolvedStorages: SDK.DOMStorageModel.DOMStorage[] = [];
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

/**
 * Calculates the total size in bytes of key-value string pairs across provided DOMStorage partitions.
 * Uses 2 bytes per character for UTF-16 representation.
 */
export async function calculateDOMStoragesUsage(storages: SDK.DOMStorageModel.DOMStorage[]): Promise<number> {
  const itemBatches = await Promise.all(storages.map(storage => storage.getItems().catch(() => null)));
  let totalBytes = 0;
  for (const items of itemBatches) {
    if (items) {
      for (const [key, value] of items) {
        // UTF-16 encoded strings use 2 bytes per character.
        totalBytes += (key.length + value.length) * 2;
      }
    }
  }
  return totalBytes;
}
