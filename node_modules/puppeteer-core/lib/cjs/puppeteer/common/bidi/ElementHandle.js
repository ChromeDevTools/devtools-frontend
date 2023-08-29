"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
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
exports.ElementHandle = void 0;
const ElementHandle_js_1 = require("../../api/ElementHandle.js");
const util_js_1 = require("../util.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
class ElementHandle extends ElementHandle_js_1.ElementHandle {
    #frame;
    constructor(realm, remoteValue, frame) {
        super(new JSHandle_js_1.JSHandle(realm, remoteValue));
        this.#frame = frame;
    }
    get frame() {
        return this.#frame;
    }
    context() {
        return this.handle.context();
    }
    get isPrimitiveValue() {
        return this.handle.isPrimitiveValue;
    }
    remoteValue() {
        return this.handle.remoteValue();
    }
    /**
     * @internal
     */
    assertElementHasWorld() {
        // TODO: Should assert element has a Sandbox
        return;
    }
    async autofill(data) {
        const client = this.#frame.context().cdpSession;
        const nodeInfo = await client.send('DOM.describeNode', {
            objectId: this.handle.id,
        });
        const fieldId = nodeInfo.node.backendNodeId;
        const frameId = this.#frame._id;
        await client.send('Autofill.trigger', {
            fieldId,
            frameId,
            card: data.creditCard,
        });
    }
    async contentFrame() {
        const adoptedThis = await this.frame.isolatedRealm().adoptHandle(this);
        const handle = (await adoptedThis.evaluateHandle(element => {
            if (element instanceof HTMLIFrameElement) {
                return element.contentWindow;
            }
            return;
        }));
        void handle.dispose().catch(util_js_1.debugError);
        void adoptedThis.dispose().catch(util_js_1.debugError);
        const value = handle.remoteValue();
        if (value.type === 'window') {
            return this.frame.page().frame(value.value.context);
        }
        return null;
    }
}
exports.ElementHandle = ElementHandle;
//# sourceMappingURL=ElementHandle.js.map