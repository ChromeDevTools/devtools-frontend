"use strict";
/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Realm = void 0;
const scriptEvaluator_js_1 = require("./scriptEvaluator.js");
class Realm {
    #realmStorage;
    #browsingContextStorage;
    #realmId;
    #browsingContextId;
    #executionContextId;
    #origin;
    #type;
    #cdpClient;
    #eventManager;
    #scriptEvaluator;
    sandbox;
    cdpSessionId;
    constructor(realmStorage, browsingContextStorage, realmId, browsingContextId, executionContextId, origin, type, sandbox, cdpSessionId, cdpClient, eventManager) {
        this.#realmId = realmId;
        this.#browsingContextId = browsingContextId;
        this.#executionContextId = executionContextId;
        this.sandbox = sandbox;
        this.#origin = origin;
        this.#type = type;
        this.cdpSessionId = cdpSessionId;
        this.#cdpClient = cdpClient;
        this.#realmStorage = realmStorage;
        this.#browsingContextStorage = browsingContextStorage;
        this.#eventManager = eventManager;
        this.#scriptEvaluator = new scriptEvaluator_js_1.ScriptEvaluator(this.#eventManager);
        this.#realmStorage.realmMap.set(this.#realmId, this);
    }
    async disown(handle) {
        // Disowning an object from different realm does nothing.
        if (this.#realmStorage.knownHandlesToRealm.get(handle) !== this.realmId) {
            return;
        }
        try {
            await this.cdpClient.sendCommand('Runtime.releaseObject', {
                objectId: handle,
            });
        }
        catch (e) {
            // Heuristic to determine if the problem is in the unknown handler.
            // Ignore the error if so.
            if (!(e.code === -32000 && e.message === 'Invalid remote object id')) {
                throw e;
            }
        }
        this.#realmStorage.knownHandlesToRealm.delete(handle);
    }
    cdpToBidiValue(cdpValue, resultOwnership) {
        const cdpWebDriverValue = cdpValue.result.webDriverValue;
        const bidiValue = this.webDriverValueToBiDi(cdpWebDriverValue);
        if (cdpValue.result.objectId) {
            const objectId = cdpValue.result.objectId;
            if (resultOwnership === 'root') {
                // Extend BiDi value with `handle` based on required `resultOwnership`
                // and  CDP response but not on the actual BiDi type.
                bidiValue.handle = objectId;
                // Remember all the handles sent to client.
                this.#realmStorage.knownHandlesToRealm.set(objectId, this.realmId);
            }
            else {
                // No need in awaiting for the object to be released.
                void this.cdpClient.sendCommand('Runtime.releaseObject', { objectId });
            }
        }
        return bidiValue;
    }
    webDriverValueToBiDi(webDriverValue) {
        // This relies on the CDP to implement proper BiDi serialization, except
        // backendNodeId/sharedId and `platformobject`.
        const result = webDriverValue;
        // Platform object is a special case. It should have only `{type: object}`
        // without `value` field.
        if (result.type === 'platformobject') {
            return { type: 'object' };
        }
        const bidiValue = result.value;
        if (bidiValue === undefined) {
            return result;
        }
        if (result.type === 'node') {
            if (Object.hasOwn(bidiValue, 'backendNodeId')) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                bidiValue.sharedId = `${this.navigableId}${scriptEvaluator_js_1.SHARED_ID_DIVIDER}${bidiValue.backendNodeId}`;
                delete bidiValue['backendNodeId'];
            }
            if (Object.hasOwn(bidiValue, 'children')) {
                for (const i in bidiValue.children) {
                    bidiValue.children[i] = this.webDriverValueToBiDi(bidiValue.children[i]);
                }
            }
        }
        // Recursively update the nested values.
        if (['array', 'set'].includes(webDriverValue.type)) {
            for (const i in bidiValue) {
                bidiValue[i] = this.webDriverValueToBiDi(bidiValue[i]);
            }
        }
        if (['object', 'map'].includes(webDriverValue.type)) {
            for (const i in bidiValue) {
                bidiValue[i] = [
                    this.webDriverValueToBiDi(bidiValue[i][0]),
                    this.webDriverValueToBiDi(bidiValue[i][1]),
                ];
            }
        }
        return result;
    }
    toBiDi() {
        return {
            realm: this.realmId,
            origin: this.origin,
            type: this.type,
            context: this.browsingContextId,
            ...(this.sandbox === undefined ? {} : { sandbox: this.sandbox }),
        };
    }
    get realmId() {
        return this.#realmId;
    }
    get navigableId() {
        return (this.#browsingContextStorage.findContext(this.#browsingContextId)
            ?.navigableId ?? 'UNKNOWN');
    }
    get browsingContextId() {
        return this.#browsingContextId;
    }
    get executionContextId() {
        return this.#executionContextId;
    }
    get origin() {
        return this.#origin;
    }
    get type() {
        return this.#type;
    }
    get cdpClient() {
        return this.#cdpClient;
    }
    async callFunction(functionDeclaration, _this, _arguments, awaitPromise, resultOwnership) {
        const context = this.#browsingContextStorage.getContext(this.browsingContextId);
        await context.awaitUnblocked();
        return {
            result: await this.#scriptEvaluator.callFunction(this, functionDeclaration, _this, _arguments, awaitPromise, resultOwnership),
        };
    }
    async scriptEvaluate(expression, awaitPromise, resultOwnership) {
        const context = this.#browsingContextStorage.getContext(this.browsingContextId);
        await context.awaitUnblocked();
        return {
            result: await this.#scriptEvaluator.scriptEvaluate(this, expression, awaitPromise, resultOwnership),
        };
    }
    /**
     * Serializes a given CDP object into BiDi, keeping references in the
     * target's `globalThis`.
     * @param cdpObject CDP remote object to be serialized.
     * @param resultOwnership Indicates desired ResultOwnership.
     */
    async serializeCdpObject(cdpObject, resultOwnership) {
        return this.#scriptEvaluator.serializeCdpObject(cdpObject, resultOwnership, this);
    }
    /**
     * Gets the string representation of an object. This is equivalent to
     * calling toString() on the object value.
     * @param cdpObject CDP remote object representing an object.
     * @return string The stringified object.
     */
    async stringifyObject(cdpObject) {
        return scriptEvaluator_js_1.ScriptEvaluator.stringifyObject(cdpObject, this);
    }
}
exports.Realm = Realm;
//# sourceMappingURL=realm.js.map