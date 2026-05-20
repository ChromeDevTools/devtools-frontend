// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
const lockedString = i18n.i18n.lockedString;
// TODO(kimanh): Replace temporary preamble as soon as functions are implemented
const preamble = `You are a Senior Software Engineer specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in LocalStorage and SessionStorage.

You have access to the site's storage using tools like \`listStorageKeys\` and \`getStorageValues\` to analyze storage state.

# Goals

1.  **Explain Purpose**: Identify what specific storage entries are for.
2.  **Understand Application State**: Help users inspect, understand, and audit the state stored in their browser storage, and how it relates to their application's behavior or potential issues (such as state mismatch or drift).

# Tools & Workflow

-   Use \`listStorageKeys\` to survey the keys available for Local or Session storage.
-   Use \`getStorageValues\` to access the values of specific Local or Session storage keys.
-   **CRITICAL**: Only access storage values when the keys/names are not enough, and if you have a good reason to access them.

If the user asks a question that requires an investigation of a problem, use this structure for answering:

-   If available, point out the root cause(s) of the problem.
    -   Example: "**Root Cause**: The UI theme is resetting because the 'uiTheme' local storage key is set to an invalid value."
-   If applicable, list actionable solution suggestion(s) in order of impact:
    -   Example: "**Suggestion**: Clear the 'uiTheme' local storage key or set it to 'light' or 'dark'."

# Considerations

-   **Raw Evidence**: Treat storage data as "raw evidence". Do not make assumptions.
-   **Dynamic State**: Storage values may change over time as the user interacts with the page. ALWAYS re-request values using the \`getStorageValues\` tool when you need to inspect them, even if you have already requested them in the past. Do NOT rely on previously cached values in your memory.
-   **Brevity**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Keep answers short and actionable.
-   **CRITICAL**: You are a storage debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.
`;
export class StorageContext extends ConversationContext {
    #item;
    constructor(item) {
        super();
        this.#item = item;
    }
    getOrigin() {
        return this.#item.origin;
    }
    getItem() {
        return this.#item;
    }
    getTitle() {
        if (this.#item.key) {
            return `${this.#item.storageType}: ${this.#item.key}`;
        }
        return `Storage for ${this.#item.origin}`;
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
        this.declareFunction('listStorageKeys', {
            description: 'Lists all keys for a given storage type for the current origin.',
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
                },
                required: ['type'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading storage keys'),
                    action: `listStorageKeys('${args.type}')`,
                };
            },
            handler: async (args) => {
                const storageOrError = this.getDOMStorage(args.type);
                if ('error' in storageOrError) {
                    return storageOrError;
                }
                const items = await storageOrError.storage.getItems();
                if (!items) {
                    return { result: JSON.stringify({ keys: [] }) };
                }
                const keys = items.map(item => item[0]);
                return { result: JSON.stringify({ keys }) };
            },
        });
        this.declareFunction('getStorageValues', {
            description: 'Retrieve specific string values from storage for requested keys.',
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
                },
                required: ['type', 'keys'],
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Reading storage values'),
                    action: `getStorageValues('${args.type}', ${JSON.stringify(args.keys)})`,
                };
            },
            handler: async (args, options) => {
                if (options?.approved !== true) {
                    const keyString = args.keys.map(k => `\`${k}\``).join(', ');
                    return {
                        requiresApproval: true,
                        description: lockedString(`The AI wants to access the value(s) of ${args.type} keys ${keyString}.`),
                    };
                }
                const storageOrError = this.getDOMStorage(args.type);
                if ('error' in storageOrError) {
                    return storageOrError;
                }
                const items = await storageOrError.storage.getItems();
                if (!items) {
                    return { result: JSON.stringify({ items: {} }) };
                }
                const itemMap = new Map(items);
                const resultRecord = {};
                for (const key of args.keys) {
                    resultRecord[key] = itemMap.get(key) ?? null;
                }
                return { result: JSON.stringify({ items: resultRecord }) };
            },
        });
    }
    getDOMStorage(type) {
        const origin = this.context?.getOrigin();
        if (!origin) {
            return { error: 'No origin available.' };
        }
        const storageKey = this.context?.getItem().storageKey;
        const isLocalStorage = type === 'localStorage';
        // If a storage key is defined, restrict access to that one.
        if (storageKey) {
            const domStorageModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMStorageModel.DOMStorageModel);
            for (const domStorageModel of domStorageModels) {
                domStorageModel.enable();
                const storage = domStorageModel.storageForId({ storageKey, isLocalStorage });
                if (storage) {
                    return { storage };
                }
            }
            return { error: `Storage not found for key ${storageKey} and type ${type}` };
        }
        // If no storage key is defined, take the primary target's local/session storage.
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            return { error: 'No primary page target found.' };
        }
        const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
        if (!domStorageModel) {
            return { error: 'DOMStorageModel not found.' };
        }
        domStorageModel.enable();
        const storages = domStorageModel.storages();
        const storage = storages.find(s => {
            const storageKey = s.storageKey;
            if (!storageKey) {
                return false;
            }
            const parsedKey = SDK.StorageKeyManager.parseStorageKey(storageKey);
            return parsedKey.origin === origin && s.isLocalStorage === isLocalStorage;
        });
        if (!storage) {
            return { error: `Storage not found for origin ${origin} and type ${type}` };
        }
        return { storage };
    }
    static #formatContext(origin, item) {
        if (item.storageType && item.key) {
            return `Storage Type: ${item.storageType}\nOrigin: ${origin}\nKey: ${item.key}`;
        }
        return `Origin: ${origin}`;
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
                    text: StorageAgent.#formatContext(context.getOrigin(), context.getItem()),
                },
            ],
        };
    }
    async enhanceQuery(query, context) {
        if (!context) {
            return query;
        }
        return `# Active Context\n${StorageAgent.#formatContext(context.getOrigin(), context.getItem())}\n\n${query}`;
    }
}
//# sourceMappingURL=StorageAgent.js.map