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
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
class ElementHandle extends ElementHandle_js_1.ElementHandle {
    constructor(context, remoteValue) {
        super(new JSHandle_js_1.JSHandle(context, remoteValue));
    }
    context() {
        return this.handle.context();
    }
    get connection() {
        return this.handle.connection;
    }
    get isPrimitiveValue() {
        return this.handle.isPrimitiveValue;
    }
    remoteValue() {
        return this.handle.remoteValue();
    }
}
exports.ElementHandle = ElementHandle;
//# sourceMappingURL=ElementHandle.js.map