// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {areOriginsEquivalent, extractContextOrigin, isOpaqueOrigin} from '../AiOrigins.js';

import {MAX_TARGET_ORIGINS, resolveDOMStorages} from './DOMStorageUtils.js';
import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type OriginLockCapability,
  type ServerLoggingCapability,
  ToolAnnotation,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const lockedString = i18n.i18n.lockedString;

export interface ListStorageKeysArgs extends ToolArgs {
  type: 'localStorage'|'sessionStorage';
  origins: string[];
  storageKey?: string;
}

export interface ListStorageKeysResult {
  storageKeysByOrigin: Record<string, {
    partitions: Array<{
      storageKey: string,
      keys: string[],
    }>,
  }>;
}

export class ListStorageKeysTool implements DataTool<ListStorageKeysArgs, ListStorageKeysResult,
                                                     BaseToolCapability&OriginLockCapability&ServerLoggingCapability> {
  readonly name: ToolName = ToolName.LIST_STORAGE_KEYS;
  readonly description: string =
      'Lists all keys for a given storage type for requested origins. Returns keys grouped by storage partition under their origin.';

  readonly annotations: ToolAnnotation[] = [ToolAnnotation.REDACT_FROM_HISTORY];

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ListStorageKeysArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      type: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Storage type: localStorage or sessionStorage',
        nullable: false,
      },
      origins: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description: 'List of origins to list keys for.',
        items: {type: Host.AidaClient.ParametersTypes.STRING, description: 'An origin URL.'},
        nullable: false,
      },
      storageKey: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Optional. Specific storageKey to list keys for. Only applies if single origin is provided.',
        nullable: true,
      },
    },
    required: ['type', 'origins'],
  };

  displayInfoFromArgs(args: ListStorageKeysArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString('Reading storage keys'),
      action: `listStorageKeys('${args.type}', ${JSON.stringify(args.origins)})`,
    };
  }

  async handler(
      args: ListStorageKeysArgs,
      context: BaseToolCapability&OriginLockCapability&ServerLoggingCapability,
      ): Promise<DataHandlerResult<ListStorageKeysResult>> {
    context.disableLogging();

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();

    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return {error: 'No origin available or not allowed.'};
    }

    if (!primaryPageTarget) {
      return {error: 'No origin available or not allowed.'};
    }

    const pageOrigin = Common.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
      return {error: 'No origin available or not allowed.'};
    }

    const rawList = (args.origins && args.origins.length > 0) ? args.origins : [allowedOrigin];
    const validOrigins = rawList.map(origin => extractContextOrigin(origin))
                             .filter(origin => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
      return {error: 'No valid origins found.'};
    }

    const storageKey = (targetOrigins.length === 1 && args.storageKey) ? args.storageKey : undefined;
    const storageKeysByOrigin: ListStorageKeysResult['storageKeysByOrigin'] = {};

    await Promise.all(targetOrigins.map(async origin => {
      const storages = resolveDOMStorages(origin, args.type, targetManager, primaryPageTarget, storageKey);
      const keyAndItems = await Promise.all(storages.map(async storage => {
        // Silently catch CDP errors (e.g. target navigation, detachment, or frame crash)
        // so that transient target loss does not fail the entire batch.
        const items = await storage.getItems().catch(() => null);
        return {storageKey: storage.storageKey, items};
      }));

      const partitions = [];
      for (const {storageKey: partKey, items} of keyAndItems) {
        if (!items || !partKey) {
          continue;
        }
        const keys = items.map(([key]) => key);
        if (keys.length > 0) {
          partitions.push({storageKey: partKey, keys});
        }
      }
      storageKeysByOrigin[origin] = {partitions};
    }));

    return {result: {storageKeysByOrigin}};
  }
}
