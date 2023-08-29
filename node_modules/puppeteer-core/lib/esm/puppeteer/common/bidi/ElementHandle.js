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
import { ElementHandle as BaseElementHandle, } from '../../api/ElementHandle.js';
import { debugError } from '../util.js';
import { JSHandle } from './JSHandle.js';
/**
 * @internal
 */
export class ElementHandle extends BaseElementHandle {
    #frame;
    constructor(realm, remoteValue, frame) {
        super(new JSHandle(realm, remoteValue));
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
        void handle.dispose().catch(debugError);
        void adoptedThis.dispose().catch(debugError);
        const value = handle.remoteValue();
        if (value.type === 'window') {
            return this.frame.page().frame(value.value.context);
        }
        return null;
    }
}
//# sourceMappingURL=ElementHandle.js.map