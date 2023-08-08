"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputProcessor = void 0;
/*
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
const protocol_js_1 = require("../../../protocol/protocol.js");
const InputStateManager_js_1 = require("../input/InputStateManager.js");
const ActionDispatcher_js_1 = require("../input/ActionDispatcher.js");
class InputProcessor {
    #browsingContextStorage;
    #inputStateManager = new InputStateManager_js_1.InputStateManager();
    constructor(browsingContextStorage) {
        this.#browsingContextStorage = browsingContextStorage;
    }
    static create(browsingContextStorage) {
        return new InputProcessor(browsingContextStorage);
    }
    async performActions(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        const inputState = this.#inputStateManager.get(context.top);
        const actionsByTick = this.#getActionsByTick(params, inputState);
        const dispatcher = new ActionDispatcher_js_1.ActionDispatcher(inputState, context, await ActionDispatcher_js_1.ActionDispatcher.isMacOS(context).catch(() => false));
        await dispatcher.dispatchActions(actionsByTick);
        return {};
    }
    async releaseActions(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        const topContext = context.top;
        const inputState = this.#inputStateManager.get(topContext);
        const dispatcher = new ActionDispatcher_js_1.ActionDispatcher(inputState, context, await ActionDispatcher_js_1.ActionDispatcher.isMacOS(context).catch(() => false));
        await dispatcher.dispatchTickActions(inputState.cancelList.reverse());
        this.#inputStateManager.delete(topContext);
        return {};
    }
    #getActionsByTick(params, inputState) {
        const actionsByTick = [];
        for (const action of params.actions) {
            switch (action.type) {
                case "pointer" /* SourceType.Pointer */: {
                    action.parameters ??= { pointerType: "mouse" /* Input.PointerType.Mouse */ };
                    action.parameters.pointerType ??= "mouse" /* Input.PointerType.Mouse */;
                    const source = inputState.getOrCreate(action.id, "pointer" /* SourceType.Pointer */, action.parameters.pointerType);
                    if (source.subtype !== action.parameters.pointerType) {
                        throw new protocol_js_1.InvalidArgumentException(`Expected input source ${action.id} to be ${source.subtype}; got ${action.parameters.pointerType}.`);
                    }
                    break;
                }
                default:
                    inputState.getOrCreate(action.id, action.type);
            }
            const actions = action.actions.map((item) => ({
                id: action.id,
                action: item,
            }));
            for (let i = 0; i < actions.length; i++) {
                if (actionsByTick.length === i) {
                    actionsByTick.push([]);
                }
                actionsByTick[i].push(actions[i]);
            }
        }
        return actionsByTick;
    }
}
exports.InputProcessor = InputProcessor;
//# sourceMappingURL=InputProcessor.js.map