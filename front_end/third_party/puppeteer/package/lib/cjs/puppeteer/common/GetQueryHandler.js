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
exports.getQueryHandlerAndSelector = void 0;
const AriaQueryHandler_js_1 = require("../cdp/AriaQueryHandler.js");
const CustomQueryHandler_js_1 = require("./CustomQueryHandler.js");
const PierceQueryHandler_js_1 = require("./PierceQueryHandler.js");
const PQueryHandler_js_1 = require("./PQueryHandler.js");
const TextQueryHandler_js_1 = require("./TextQueryHandler.js");
const XPathQueryHandler_js_1 = require("./XPathQueryHandler.js");
const BUILTIN_QUERY_HANDLERS = {
    aria: AriaQueryHandler_js_1.ARIAQueryHandler,
    pierce: PierceQueryHandler_js_1.PierceQueryHandler,
    xpath: XPathQueryHandler_js_1.XPathQueryHandler,
    text: TextQueryHandler_js_1.TextQueryHandler,
};
const QUERY_SEPARATORS = ['=', '/'];
/**
 * @internal
 */
function getQueryHandlerAndSelector(selector) {
    for (const handlerMap of [
        CustomQueryHandler_js_1.customQueryHandlers.names().map(name => {
            return [name, CustomQueryHandler_js_1.customQueryHandlers.get(name)];
        }),
        Object.entries(BUILTIN_QUERY_HANDLERS),
    ]) {
        for (const [name, QueryHandler] of handlerMap) {
            for (const separator of QUERY_SEPARATORS) {
                const prefix = `${name}${separator}`;
                if (selector.startsWith(prefix)) {
                    selector = selector.slice(prefix.length);
                    return { updatedSelector: selector, QueryHandler };
                }
            }
        }
    }
    return { updatedSelector: selector, QueryHandler: PQueryHandler_js_1.PQueryHandler };
}
exports.getQueryHandlerAndSelector = getQueryHandlerAndSelector;
//# sourceMappingURL=GetQueryHandler.js.map