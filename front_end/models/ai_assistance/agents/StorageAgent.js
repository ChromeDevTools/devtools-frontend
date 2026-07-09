// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { bytes } from '../data_formatters/UnitFormatters.js';
import { CookieItem, DOMStorageItem } from '../StorageItem.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
const lockedString = i18n.i18n.lockedString;
const preamble = `You are a Senior Software Engineer specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in LocalStorage, SessionStorage, and Cookies.

 You have access to the site's storage using tools like \`getStorageBreakdown\`, \`listPageOrigins\`, \`listStorageKeys\`, \`getStorageValues\`, \`listCookies\`, and \`getCookieValues\`.

 # Goals

 1.  **Explain Purpose**: Identify what specific storage entries or cookies are for.
 2.  **Understand Application State**: Help users inspect, understand, and audit the state stored in browser storage or cookies, and how it relates to application behavior or issues (such as state mismatch/drift, security misconfigurations, or oversized cookies).
 3.  **Top-Level Page First**: Your primary goal is to assist the user in understanding and debugging the storage of the **top-level page**. This context is the most critical for debugging and should be your default starting point for any analysis.

 # Tools & Workflow

 -   **Prioritize Top-Level Context**: Always initiate your investigation from the top-level page's storage. Explicitly state if you are analyzing storage from a different context (e.g., an iframe).
 -   **Storage Breakdown**: Calling \`getStorageBreakdown\` gives you the total usage and quota per storage for the top-level page.
 -   **Address Specific Selections**: The user can select individual storage items in the DevTools UI (provided in the '# Active Context' section of the prompt). If the query is about a selected item (e.g., "Why is this cookie set?"), focus your response on that specific item.
 -   **Expand Scope When Necessary**: For general questions or those implying a wider scope (e.g., "Check all storages," "Are there related cookies on subdomains?"), proactively use your tools to explore other relevant storage contexts, including iframes and different origins.
 -   **Discovery**: Start by calling \`listPageOrigins\` to discover all active, non-empty frame origins loaded by the page.
 -   **Storage Partitioning (LocalStorage / SessionStorage)**:
     -   Use \`listStorageKeys\` to survey keys. The results are grouped into **partitions** characterized by unique \`storageKey\` strings.
     -   Be aware that the same origin can have multiple storage partitions depending on frame ancestry.
     -   Use \`getStorageValues\` to inspect specific keys. The results are grouped into an array of partition \`items\` matching the requested keys under their unique \`storageKey\`.
 -   **Cookies**:
     -   Use \`listCookies\` to discover active cookies for an origin. Note that cookies are visible by domain scopes, paths, and partition status.
     -   Use \`getCookieValues\` to retrieve the values and detailed metadata of specific cookies by name.
     -   **HttpOnly Protection**: You don't have access to \`HttpOnly\` cookies. They are filtered out from both discovery and retrieval tools for security reasons.
 -   **Active Context**: Start by inspecting the active context's origin (provided in the '# Active Context' section of the prompt).
 -   **Value Minimization**: Only request values using \`getStorageValues\` or \`getCookieValues\` when key names/cookie names alone are insufficient.

 # Considerations

 -   **Strictly Read-Only**: You cannot write, clear, delete, or edit storage or cookies.
 -   **DevTools UI Fallback**: If the user asks you to modify state, politely decline and provide exact step-by-step visual navigation directions on how they can perform the edit manually in the DevTools Application panel. Do NOT supply Console scripts.
 -   **Raw Evidence**: Treat storage data as raw evidence. Do not make assumptions about values without reading them first.
 -   **Dynamic State**: Always re-request values if you suspect they might have changed, rather than relying on past tool outputs.
 -   **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
 -   **CRITICAL**: You are a storage debugging assistant. NEVER answer unrelated topics (legal, financial, race, sexuality, medical, religion, politics). If asked, respond: "Sorry, I can't answer that. I'm best at questions about debugging web pages."
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
        if (this.#item instanceof CookieItem) {
            return `${this.#item.name ? `cookie: ${this.#item.name}` : 'cookies:'} ${this.#item.origin}`;
        }
        if (this.#item instanceof DOMStorageItem) {
            return `${this.#item.key ? `entry: ${this.#item.key}` : 'storage:'} ${this.#item.origin}`;
        }
        return `Storage: ${this.getOrigin()}`;
    }
    async getSuggestions() {
        if (this.#item instanceof CookieItem) {
            if (this.#item.name) {
                return [
                    {
                        title: 'Why is this cookie set?',
                        jslogContext: 'storage-cookie',
                    },
                    {
                        title: 'Explain the value of this cookie',
                        jslogContext: 'storage-cookie',
                    },
                ];
            }
            return [
                {
                    title: 'Explain the cookies set by this page',
                    jslogContext: 'storage-cookie',
                },
            ];
        }
        if (this.#item instanceof DOMStorageItem) {
            if (this.#item.key) {
                return [
                    {
                        title: 'What is the purpose of this storage entry?',
                        jslogContext: 'storage-domstorage',
                    },
                    {
                        title: 'Explain the value of this storage entry',
                        jslogContext: 'storage-domstorage',
                    },
                ];
            }
            return [
                {
                    title: 'Explain these storage items',
                    jslogContext: 'storage-domstorage',
                },
            ];
        }
        return undefined;
    }
}
// Maximum character length of values allowed.
const MAX_NUM_CHAR_LENGTH = 10000;
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
                this.disableServerSideLogging();
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
                this.disableServerSideLogging();
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
                        const truncatedValue = value.length > MAX_NUM_CHAR_LENGTH ?
                            value.substring(0, MAX_NUM_CHAR_LENGTH) + '... <truncated>' :
                            value;
                        storageValues[key] = truncatedValue;
                    }
                    itemsResult.push({ storageKey, values: storageValues });
                }
                return { result: { items: itemsResult } };
            },
        });
        this.declareFunction('listCookies', {
            description: 'Lists all cookies for the requested origin, strictly excluding their values.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    origin: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Origin to list cookies for.',
                        nullable: false,
                    }
                },
                required: ['origin'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading cookies'),
                    action: `listCookies('${args.origin}')`,
                };
            },
            handler: async (args) => {
                this.disableServerSideLogging();
                if (!isSamePrimaryPageOrigin(this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const frame = findFrameForOrigin(this.context, args.origin);
                if (!frame) {
                    return { result: { cookies: [] } };
                }
                const target = frame.resourceTreeModel().target();
                const cookies = await getCookiesForDomain(target, args.origin);
                const uniqueNames = Array.from(new Set(cookies?.map(c => c.name())));
                return { result: { cookies: uniqueNames } };
            },
        });
        this.declareFunction('getCookieValues', {
            description: 'Retrieve the values and detailed metadata of specific cookies by their names.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    cookieNames: {
                        type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                        description: 'A list of cookie names to retrieve values and metadata for.',
                        items: { type: 1 /* Host.AidaClient.ParametersTypes.STRING */, description: 'A cookie name.' },
                        nullable: false,
                    },
                    origin: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The specific origin the cookies belong to.',
                        nullable: false,
                    }
                },
                required: ['cookieNames', 'origin'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading cookie values and metadata'),
                    action: `getCookieValues(${JSON.stringify(args.cookieNames)}, '${args.origin}')`,
                };
            },
            handler: async (args, options) => {
                this.disableServerSideLogging();
                if (!isSamePrimaryPageOrigin(this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const frame = findFrameForOrigin(this.context, args.origin);
                if (!frame) {
                    return { result: { cookies: [] } };
                }
                const target = frame.resourceTreeModel().target();
                if (options?.approved !== true) {
                    return {
                        requiresApproval: true,
                        description: lockedString(`The AI wants to access the value(s) and metadata of cookie(s) ${args.cookieNames.map(name => `\`${name}\``).join(', ')} on ${args.origin}.`),
                    };
                }
                const cookies = await getCookiesForDomain(target, args.origin);
                if (!cookies) {
                    return { result: { cookies: [] } };
                }
                const matchingCookies = cookies.filter(c => args.cookieNames.includes(c.name()));
                const cookieData = matchingCookies.map(cookie => {
                    const value = cookie.value();
                    const truncatedValue = value.length > MAX_NUM_CHAR_LENGTH ? value.substring(0, MAX_NUM_CHAR_LENGTH) + '... <truncated>' : value;
                    return {
                        value: truncatedValue,
                        domain: cookie.domain(),
                        path: cookie.path(),
                        expires: cookie.expires(),
                        size: cookie.size(),
                        secure: cookie.secure(),
                        sameSite: cookie.sameSite(),
                        partitioned: cookie.partitioned(),
                        priority: cookie.priority(),
                        sourcePort: cookie.sourcePort(),
                        sourceScheme: cookie.sourceScheme(),
                    };
                });
                return { result: { cookies: cookieData } };
            },
        });
        this.declareFunction('getStorageBreakdown', {
            description: 'Retrieves the total storage usage, total storage quota, and a breakdown of active storage usage per storage type for the top-level page.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: lockedString('Retrieving storage breakdown'),
                    action: 'getStorageBreakdown()',
                };
            },
            handler: async () => {
                const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
                if (!target || !this.context || !isSamePageOrigin(target, this.context)) {
                    return { error: 'No origin available or not allowed.' };
                }
                const origin = this.context.getOrigin();
                const response = await target.storageAgent().invoke_getUsageAndQuota({ origin });
                if (response.getError()) {
                    return { error: response.getError() || 'Unknown CDP error' };
                }
                const usageBreakdown = response.usageBreakdown.filter(entry => entry.usage > 0)
                    .sort((a, b) => b.usage - a.usage)
                    .map(entry => ({
                    storageType: entry.storageType,
                    usage: bytes(entry.usage),
                }));
                return {
                    result: {
                        totalUsage: bytes(response.usage),
                        totalQuota: bytes(response.quota),
                        usageBreakdown,
                    },
                };
            },
        });
    }
    static #formatContext(item) {
        const primaryTargetOrigin = `Primary target: ${item.primaryTargetOrigin}`;
        if (item instanceof CookieItem) {
            const parsedURL = Common.ParsedURL.ParsedURL.fromString(item.origin);
            const domain = parsedURL ? parsedURL.host : item.origin;
            return `${primaryTargetOrigin}\nUser-selected Context: Cookies\nDomain: ${domain}${item.name ? `\nCookie Name: ${item.name}` : ''}`;
        }
        if (item instanceof DOMStorageItem) {
            return `${primaryTargetOrigin}\nUser-selected Context: DOM Storage\n Type: ${item.type}\nStorageKey: ${item.storageKey}\nOrigin: ${item.origin}${item.key ? `\nKey: ${item.key}` : ''}`;
        }
        return primaryTargetOrigin;
    }
    async preRun() {
        const item = this.context?.getItem();
        if (item instanceof CookieItem && Boolean(item.name)) {
            this.disableServerSideLogging();
        }
        else if (item instanceof DOMStorageItem && Boolean(item.key)) {
            this.disableServerSideLogging();
        }
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
export async function getCookiesForDomain(target, origin) {
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    if (!cookieModel) {
        return null;
    }
    const allCookies = await cookieModel.getCookiesForDomain(origin);
    if (!allCookies) {
        return null;
    }
    return allCookies.filter(cookie => !cookie.httpOnly());
}
export function findFrameForOrigin(context, origin) {
    for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames()) {
        if (frame.securityOrigin === origin) {
            const target = frame.resourceTreeModel().target();
            if (isSamePageOrigin(target.outermostTarget(), context)) {
                return frame;
            }
        }
    }
    return null;
}
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