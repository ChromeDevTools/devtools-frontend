/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { debugError } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { interpolateFunction, stringifyFunction } from '../util/Function.js';
import { BidiDeserializer } from './Deserializer.js';
import { BidiSerializer } from './Serializer.js';
/**
 * @internal
 */
export class ExposeableFunction {
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
        const functionDeclaration = stringifyFunction(interpolateFunction((sendArgs, sendResolve, sendReject) => {
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
        assert(args);
        try {
            const result = await this.#apply(...BidiDeserializer.deserialize(args));
            await connection.send('script.callFunction', {
                functionDeclaration: stringifyFunction(([_, resolve], result) => {
                    resolve(result);
                }),
                arguments: [
                    (await callbacks.resolve.valueOrThrow()),
                    BidiSerializer.serialize(result),
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
                        functionDeclaration: stringifyFunction(([_, reject], name, message, stack) => {
                            const error = new Error(message);
                            error.name = name;
                            if (stack) {
                                error.stack = stack;
                            }
                            reject(error);
                        }),
                        arguments: [
                            (await callbacks.reject.valueOrThrow()),
                            BidiSerializer.serialize(error.name),
                            BidiSerializer.serialize(error.message),
                            BidiSerializer.serialize(error.stack),
                        ],
                        awaitPromise: false,
                        target: {
                            realm: params.source.realm,
                        },
                    });
                }
                else {
                    await connection.send('script.callFunction', {
                        functionDeclaration: stringifyFunction(([_, reject], error) => {
                            reject(error);
                        }),
                        arguments: [
                            (await callbacks.reject.valueOrThrow()),
                            BidiSerializer.serialize(error),
                        ],
                        awaitPromise: false,
                        target: {
                            realm: params.source.realm,
                        },
                    });
                }
            }
            catch (error) {
                debugError(error);
            }
        }
    };
    get #connection() {
        return this.#frame.page().browser().connection;
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
        assert(data.type === 'array');
        assert(data.value);
        const callerIdRemote = data.value[0];
        assert(callerIdRemote);
        assert(callerIdRemote.type === 'number');
        assert(typeof callerIdRemote.value === 'number');
        let bindingMap = this.#callerInfos.get(source.realm);
        if (!bindingMap) {
            bindingMap = new Map();
            this.#callerInfos.set(source.realm, bindingMap);
        }
        const callerId = callerIdRemote.value;
        let callbacks = bindingMap.get(callerId);
        if (!callbacks) {
            callbacks = {
                resolve: new Deferred(),
                reject: new Deferred(),
            };
            bindingMap.set(callerId, callbacks);
        }
        return { callbacks, remoteValue: data };
    }
    [Symbol.dispose]() {
        void this[Symbol.asyncDispose]().catch(debugError);
    }
    async [Symbol.asyncDispose]() {
        if (this.#preloadScriptId) {
            await this.#connection.send('script.removePreloadScript', {
                script: this.#preloadScriptId,
            });
        }
    }
}
//# sourceMappingURL=ExposedFunction.js.map