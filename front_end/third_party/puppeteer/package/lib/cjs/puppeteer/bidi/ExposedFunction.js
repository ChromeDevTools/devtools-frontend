"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExposeableFunction = void 0;
const Bidi = __importStar(require("chromium-bidi/lib/cjs/protocol/protocol.js"));
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const Function_js_1 = require("../util/Function.js");
const Deserializer_js_1 = require("./Deserializer.js");
const Serializer_js_1 = require("./Serializer.js");
/**
 * @internal
 */
class ExposeableFunction {
    #frame;
    name;
    #apply;
    #channels;
    #callerInfos = new Map();
    #preloadScriptId;
    constructor(frame, name, apply) {
        this.#frame = frame;
        this.name = name;
        this.#apply = apply;
        this.#channels = {
            args: `__puppeteer__${this.#frame._id}_page_exposeFunction_${this.name}_args`,
            resolve: `__puppeteer__${this.#frame._id}_page_exposeFunction_${this.name}_resolve`,
            reject: `__puppeteer__${this.#frame._id}_page_exposeFunction_${this.name}_reject`,
        };
    }
    async expose() {
        const connection = this.#connection;
        const channelArguments = this.#channelArguments;
        // TODO(jrandolf): Implement cleanup with removePreloadScript.
        connection.on(Bidi.ChromiumBidi.Script.EventNames.Message, this.#handleArgumentsMessage);
        connection.on(Bidi.ChromiumBidi.Script.EventNames.Message, this.#handleResolveMessage);
        connection.on(Bidi.ChromiumBidi.Script.EventNames.Message, this.#handleRejectMessage);
        const functionDeclaration = (0, Function_js_1.stringifyFunction)((0, Function_js_1.interpolateFunction)((sendArgs, sendResolve, sendReject) => {
            let id = 0;
            Object.assign(globalThis, {
                [PLACEHOLDER('name')]: function (...args) {
                    return new Promise((resolve, reject) => {
                        sendArgs([id, args]);
                        sendResolve([id, resolve]);
                        sendReject([id, reject]);
                        ++id;
                    });
                },
            });
        }, { name: JSON.stringify(this.name) }));
        const { result } = await connection.send('script.addPreloadScript', {
            functionDeclaration,
            arguments: channelArguments,
            contexts: [this.#frame.page().mainFrame()._id],
        });
        this.#preloadScriptId = result.script;
        await Promise.all(this.#frame
            .page()
            .frames()
            .map(async (frame) => {
            return await connection.send('script.callFunction', {
                functionDeclaration,
                arguments: channelArguments,
                awaitPromise: false,
                target: frame.mainRealm().realm.target,
            });
        }));
    }
    #handleArgumentsMessage = async (params) => {
        if (params.channel !== this.#channels.args) {
            return;
        }
        const connection = this.#connection;
        const { callbacks, remoteValue } = this.#getCallbacksAndRemoteValue(params);
        const args = remoteValue.value?.[1];
        (0, assert_js_1.assert)(args);
        try {
            const result = await this.#apply(...Deserializer_js_1.BidiDeserializer.deserialize(args));
            await connection.send('script.callFunction', {
                functionDeclaration: (0, Function_js_1.stringifyFunction)(([_, resolve], result) => {
                    resolve(result);
                }),
                arguments: [
                    (await callbacks.resolve.valueOrThrow()),
                    Serializer_js_1.BidiSerializer.serializeRemoteValue(result),
                ],
                awaitPromise: false,
                target: {
                    realm: params.source.realm,
                },
            });
        }
        catch (error) {
            try {
                if (error instanceof Error) {
                    await connection.send('script.callFunction', {
                        functionDeclaration: (0, Function_js_1.stringifyFunction)(([_, reject], name, message, stack) => {
                            const error = new Error(message);
                            error.name = name;
                            if (stack) {
                                error.stack = stack;
                            }
                            reject(error);
                        }),
                        arguments: [
                            (await callbacks.reject.valueOrThrow()),
                            Serializer_js_1.BidiSerializer.serializeRemoteValue(error.name),
                            Serializer_js_1.BidiSerializer.serializeRemoteValue(error.message),
                            Serializer_js_1.BidiSerializer.serializeRemoteValue(error.stack),
                        ],
                        awaitPromise: false,
                        target: {
                            realm: params.source.realm,
                        },
                    });
                }
                else {
                    await connection.send('script.callFunction', {
                        functionDeclaration: (0, Function_js_1.stringifyFunction)(([_, reject], error) => {
                            reject(error);
                        }),
                        arguments: [
                            (await callbacks.reject.valueOrThrow()),
                            Serializer_js_1.BidiSerializer.serializeRemoteValue(error),
                        ],
                        awaitPromise: false,
                        target: {
                            realm: params.source.realm,
                        },
                    });
                }
            }
            catch (error) {
                (0, util_js_1.debugError)(error);
            }
        }
    };
    get #connection() {
        return this.#frame.context().connection;
    }
    get #channelArguments() {
        return [
            {
                type: 'channel',
                value: {
                    channel: this.#channels.args,
                    ownership: "root" /* Bidi.Script.ResultOwnership.Root */,
                },
            },
            {
                type: 'channel',
                value: {
                    channel: this.#channels.resolve,
                    ownership: "root" /* Bidi.Script.ResultOwnership.Root */,
                },
            },
            {
                type: 'channel',
                value: {
                    channel: this.#channels.reject,
                    ownership: "root" /* Bidi.Script.ResultOwnership.Root */,
                },
            },
        ];
    }
    #handleResolveMessage = (params) => {
        if (params.channel !== this.#channels.resolve) {
            return;
        }
        const { callbacks, remoteValue } = this.#getCallbacksAndRemoteValue(params);
        callbacks.resolve.resolve(remoteValue);
    };
    #handleRejectMessage = (params) => {
        if (params.channel !== this.#channels.reject) {
            return;
        }
        const { callbacks, remoteValue } = this.#getCallbacksAndRemoteValue(params);
        callbacks.reject.resolve(remoteValue);
    };
    #getCallbacksAndRemoteValue(params) {
        const { data, source } = params;
        (0, assert_js_1.assert)(data.type === 'array');
        (0, assert_js_1.assert)(data.value);
        const callerIdRemote = data.value[0];
        (0, assert_js_1.assert)(callerIdRemote);
        (0, assert_js_1.assert)(callerIdRemote.type === 'number');
        (0, assert_js_1.assert)(typeof callerIdRemote.value === 'number');
        let bindingMap = this.#callerInfos.get(source.realm);
        if (!bindingMap) {
            bindingMap = new Map();
            this.#callerInfos.set(source.realm, bindingMap);
        }
        const callerId = callerIdRemote.value;
        let callbacks = bindingMap.get(callerId);
        if (!callbacks) {
            callbacks = {
                resolve: new Deferred_js_1.Deferred(),
                reject: new Deferred_js_1.Deferred(),
            };
            bindingMap.set(callerId, callbacks);
        }
        return { callbacks, remoteValue: data };
    }
    [Symbol.dispose]() {
        void this[Symbol.asyncDispose]().catch(util_js_1.debugError);
    }
    async [Symbol.asyncDispose]() {
        if (this.#preloadScriptId) {
            await this.#connection.send('script.removePreloadScript', {
                script: this.#preloadScriptId,
            });
        }
    }
}
exports.ExposeableFunction = ExposeableFunction;
//# sourceMappingURL=ExposedFunction.js.map