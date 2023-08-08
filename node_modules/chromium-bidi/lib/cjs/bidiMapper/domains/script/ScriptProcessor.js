"use strict";
/**
 * Copyright 2023 Google LLC.
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
exports.ScriptProcessor = void 0;
const protocol_1 = require("../../../protocol/protocol");
const bidiPreloadScript_1 = require("./bidiPreloadScript");
class ScriptProcessor {
    #browsingContextStorage;
    #realmStorage;
    #preloadScriptStorage;
    constructor(browsingContextStorage, realmStorage, preloadScriptStorage) {
        this.#browsingContextStorage = browsingContextStorage;
        this.#realmStorage = realmStorage;
        this.#preloadScriptStorage = preloadScriptStorage;
    }
    async addPreloadScript(params) {
        const preloadScript = new bidiPreloadScript_1.BidiPreloadScript(params);
        this.#preloadScriptStorage.addPreloadScript(preloadScript);
        const cdpTargets = new Set(this.#browsingContextStorage
            .getTopLevelContexts()
            .map((context) => context.cdpTarget));
        await preloadScript.initInTargets(cdpTargets, false);
        return {
            script: preloadScript.id,
        };
    }
    async removePreloadScript(params) {
        const bidiId = params.script;
        const scripts = this.#preloadScriptStorage.findPreloadScripts({
            id: bidiId,
        });
        if (scripts.length === 0) {
            throw new protocol_1.NoSuchScriptException(`No preload script with BiDi ID '${bidiId}'`);
        }
        await Promise.all(scripts.map((script) => script.remove()));
        this.#preloadScriptStorage.removeBiDiPreloadScripts({
            id: bidiId,
        });
        return {};
    }
    async callFunction(params) {
        const realm = await this.#getRealm(params.target);
        return realm.callFunction(params.functionDeclaration, params.this ?? {
            type: 'undefined',
        }, // `this` is `undefined` by default.
        params.arguments ?? [], // `arguments` is `[]` by default.
        params.awaitPromise, params.resultOwnership ?? "none" /* Script.ResultOwnership.None */, params.serializationOptions ?? {}, params.userActivation ?? false);
    }
    async evaluate(params) {
        const realm = await this.#getRealm(params.target);
        return realm.evaluate(params.expression, params.awaitPromise, params.resultOwnership ?? "none" /* Script.ResultOwnership.None */, params.serializationOptions ?? {}, params.userActivation ?? false);
    }
    async disown(params) {
        const realm = await this.#getRealm(params.target);
        await Promise.all(params.handles.map(async (handle) => realm.disown(handle)));
        return {};
    }
    getRealms(params) {
        if (params.context !== undefined) {
            // Make sure the context is known.
            this.#browsingContextStorage.getContext(params.context);
        }
        const realms = this.#realmStorage
            .findRealms({
            browsingContextId: params.context,
            type: params.type,
        })
            .map((realm) => realm.realmInfo);
        return { realms };
    }
    async #getRealm(target) {
        if ('realm' in target) {
            return this.#realmStorage.getRealm({
                realmId: target.realm,
            });
        }
        const context = this.#browsingContextStorage.getContext(target.context);
        return context.getOrCreateSandbox(target.sandbox);
    }
}
exports.ScriptProcessor = ScriptProcessor;
//# sourceMappingURL=ScriptProcessor.js.map