// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { DOMStorageItem } from '../StorageItem.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
const lockedString = i18n.i18n.lockedString;
const preamble = `You are a Senior Software Engineer specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in LocalStorage and SessionStorage.

 You have access to the site's storage using tools like \`listPageOrigins\`, \`listStorageKeys\`, and \`getStorageValues\`.

 # Goals

 1.  **Explain Purpose**: Identify what specific storage entries are for.
 2.  **Understand Application State**: Help users inspect, understand, and audit the state stored in browser storage, and how it relates to application behavior or issues (such as state mismatch/drift).
 3.  **Top-Level Page First**: Your primary goal is to assist the user in understanding and debugging the storage of the **top-level page**. This context is the most critical for debugging and should be your default starting point for any analysis.

 # Tools & Workflow

 -   **Prioritize Top-Level Context**: Always initiate your investigation from the top-level page's storage. Explicitly state if you are analyzing storage from a different context (e.g., an iframe).
 -   **Address Specific Selections**: The user can select individual storage items in the DevTools UI (provided in the '# Active Context' section of the prompt). If the query is about a selected item (e.g., "Why is this key set?"), focus your response on that specific item.
 -   **Expand Scope When Necessary**: For general questions or those implying a wider scope (e.g., "Check all storages," "Are there related cookies on subdomains?"), proactively use your tools to explore other relevant storage contexts, including iframes and different origins.
 -   **Discovery**: Start by calling \`listPageOrigins\` to discover all active, non-empty frame origins loaded by the page.
 -   **Storage Partitioning (LocalStorage / SessionStorage)**:
     -   Use \`listStorageKeys\` to survey keys. The results are grouped into **partitions** characterized by unique \`storageKey\` strings.
     -   Be aware that the same origin can have multiple storage partitions depending on frame ancestry.
     -   Use \`getStorageValues\` to inspect specific keys. The results are grouped into an array of partition \`items\` matching the requested keys under their unique \`storageKey\`.
 -   **Active Context**: Start by inspecting the active context's origin (provided in the '# Active Context' section of the prompt).
 -   **Value Minimization**: Only request values using \`getStorageValues\` when key names and metadata alone are insufficient, and you have a clear hypothesis.

 # Considerations

 -   **Strictly Read-Only**: You cannot write, clear, delete, or edit storage.
 -   **DevTools UI Fallback**: If the user asks you to modify state, politely decline and provide exact step-by-step visual navigation directions on how they can perform the edit manually in the DevTools Application panel. Do NOT supply Console scripts.
 -   **Raw Evidence**: Treat storage data as raw evidence. Do not make assumptions about values without reading them first.
 -   **Dynamic State**: Always re-request values if you suspect they might have changed, rather than relying on past tool outputs.
 -   **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
 -   **CRITICAL**: You are a storage debugging assistant. NEVER answer unrelated topics (legal, financial, race, sexuality medical, religion, politics). If asked, respond: "Sorry, I can't answer that. I'm best at questions about debugging web pages."
 `;
function isSamePrimaryPageOrigin(context) {
    const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    return isSamePageOrigin(primaryPageTarget, context);
}
function isSamePageOrigin(target, context) {
    if (!target || !context) {
        return false;
    }
    const pageOrigin = Common.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL());
    return pageOrigin !== '' && context.isOriginAllowed(pageOrigin);
}
export class StorageContext extends ConversationContext {
    #item;
    constructor(item) {
        super();
        this.#item = item;
    }
    getURL() {
        return this.#item.primaryTargetOrigin;
    }
    getItem() {
        return this.#item;
    }
    getTitle() {
        if (this.#item instanceof DOMStorageItem) {
            return `${this.#item.key ? `entry: ${this.#item.key}` : 'storage:'} ${this.#item.origin}`;
        }
        return `Storage: ${this.getOrigin()}`;
    }
}
export class StorageAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_STORAGE_AGENT;
    get userTier() {
        return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
    }
    get options() {
        const temperature = Root.Runtime.hostConfig.devToolsFreestyler?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsFreestyler?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    constructor(opts) {
        super(opts);
        this.declareFunction('listPageOrigins', {
            description: 'Lists all active, non-empty frame origins loaded by the page. Use this first to discover what other targets/iframes exist on the page for querying their storage.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: lockedString('Listing page origins'),
                    action: 'listPageOrigins()',
                };
            },
            handler: async () => {
                if (!isSamePrimaryPageOrigin(this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const origins = new Set();
                for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames()) {
                    if (!isSamePageOrigin(frame.resourceTreeModel().target().outermostTarget(), this.context)) {
                        continue;
                    }
                    const origin = frame.securityOrigin;
                    if (!origin || origins.has(origin)) {
                        continue;
                    }
                    origins.add(origin);
                }
                return { result: { origins: Array.from(origins) } };
            },
        });
        this.declareFunction('listStorageKeys', {
            description: 'Lists all keys for a given storage type for the requested origin. Returns keys grouped by storage partition.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    type: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Storage type: localStorage or sessionStorage',
                        nullable: false,
                    },
                    origin: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Specific origin to list keys for.',
                        nullable: false,
                    },
                    storageKey: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Optional. Specific storageKey to to list keys for.',
                        nullable: true,
                    }
                },
                required: ['type', 'origin'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading storage keys'),
                    action: `listStorageKeys('${args.type}', '${args.origin}')`,
                };
            },
            handler: async (args) => {
                if (!isSamePrimaryPageOrigin(this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const storages = resolveDOMStorages(this.context, args.type, args.origin, args.storageKey);
                const keyAndItems = await Promise.all(storages.map(async (storage) => {
                    const items = await storage.getItems();
                    return { storageKey: storage.storageKey, items };
                }));
                const partitionsResult = [];
                for (const { storageKey, items } of keyAndItems) {
                    if (!items) {
                        continue;
                    }
                    const keys = items.map(([key]) => key);
                    if (keys.length > 0) {
                        partitionsResult.push({ storageKey, keys });
                    }
                }
                return { result: { partitions: partitionsResult } };
            },
        });
        this.declareFunction('getStorageValues', {
            description: 'Retrieve specific string values from storage partitions for requested keys.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    type: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Storage type: localStorage or sessionStorage',
                        nullable: false,
                    },
                    keys: {
                        type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                        description: 'A list of keys to retrieve values for.',
                        items: { type: 1 /* Host.AidaClient.ParametersTypes.STRING */, description: 'A storage key.' },
                        nullable: false,
                    },
                    origin: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Specific origin to get values for.',
                        nullable: false,
                    },
                    storageKey: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Optional. Specific storageKey partition to get values for.',
                        nullable: true,
                    }
                },
                required: ['type', 'keys', 'origin'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading storage values'),
                    action: `getStorageValues('${args.type}', ${JSON.stringify(args.keys)}, '${args.origin}'${args.storageKey ? `, '${args.storageKey}'` : ''})`,
                };
            },
            handler: async (args, options) => {
                if (!isSamePrimaryPageOrigin(this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const storages = resolveDOMStorages(this.context, args.type, args.origin, args.storageKey);
                if (storages.length === 0) {
                    return { error: 'No matching storage partitions found.' };
                }
                if (options?.approved !== true) {
                    const keyString = args.keys.map(k => `\`${k}\``).join(', ');
                    const uniqueTargetOrigins = Array.from(new Set(storages.map(storage => {
                        const parsed = SDK.StorageKeyManager.parseStorageKey(storage.storageKey || '');
                        return parsed.origin;
                    })));
                    const targetsDesc = uniqueTargetOrigins.join(', ');
                    return {
                        requiresApproval: true,
                        description: lockedString(`The AI wants to access the value(s) of ${args.type} keys ${keyString} on ${targetsDesc}.`),
                    };
                }
                const itemsResult = [];
                const MAX_VALUE_SIZE = 10000;
                const keyAndItems = await Promise.all(storages.map(async (storage) => {
                    const items = await storage.getItems();
                    return { storageKey: storage.storageKey, items };
                }));
                for (const { storageKey, items } of keyAndItems) {
                    if (!items) {
                        continue;
                    }
                    const itemMap = new Map(items);
                    const storageValues = {};
                    for (const key of args.keys) {
                        const value = itemMap.get(key);
                        if (value === undefined) {
                            continue;
                        }
                        const truncatedValue = value.length > MAX_VALUE_SIZE ? value.substring(0, MAX_VALUE_SIZE) + '... <truncated>' : value;
                        storageValues[key] = truncatedValue;
                    }
                    itemsResult.push({ storageKey, values: storageValues });
                }
                return { result: { items: itemsResult } };
            },
        });
    }
    static #formatContext(item) {
        const primaryTargetOrigin = `Primary target: ${item.primaryTargetOrigin}`;
        if (item instanceof DOMStorageItem) {
            return `${primaryTargetOrigin}\nUser-selected Context: DOM Storage\n Type: ${item.type}\nStorageKey: ${item.storageKey}\nOrigin: ${item.origin}${item.key ? `\nKey: ${item.key}` : ''}`;
        }
        return primaryTargetOrigin;
    }
    async *handleContextDetails(context) {
        if (!context) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            details: [
                {
                    title: 'Selected Storage Context',
                    text: StorageAgent.#formatContext(context.getItem()),
                },
            ],
        };
    }
    async enhanceQuery(query, context) {
        if (!context) {
            return query;
        }
        return `# Active Context\n${StorageAgent.#formatContext(context.getItem())}\n\n${query}`;
    }
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
export function resolveDOMStorages(context, type, origin, storageKey) {
    const resolvedStorages = [];
    const isLocalStorage = type === 'localStorage';
    const domStorageModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMStorageModel.DOMStorageModel);
    for (const domStorageModel of domStorageModels) {
        if (!isSamePageOrigin(domStorageModel.target().outermostTarget(), context)) {
            // Skip DOMStorageModels that don't point to the same outermost target.
            continue;
        }
        for (const storage of domStorageModel.storages()) {
            if (storage.isLocalStorage !== isLocalStorage) {
                continue;
            }
            const currentStorageKey = storage.storageKey;
            if (!currentStorageKey) {
                continue;
            }
            // If we search by storageKey, verify the storage key matches AND the underlying origin matches the request origin.
            if (storageKey) {
                if (storageKey === currentStorageKey) {
                    const parsedKey = SDK.StorageKeyManager.parseStorageKey(currentStorageKey);
                    if (parsedKey.origin === origin) {
                        resolvedStorages.push(storage);
                    }
                }
                continue;
            }
            const parsedKey = SDK.StorageKeyManager.parseStorageKey(currentStorageKey);
            if (parsedKey.origin === origin) {
                resolvedStorages.push(storage);
            }
        }
    }
    return resolvedStorages;
}
//# sourceMappingURL=StorageAgent.js.map