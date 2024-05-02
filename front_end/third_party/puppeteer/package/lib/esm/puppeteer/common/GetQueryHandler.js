/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ARIAQueryHandler } from '../cdp/AriaQueryHandler.js';
import { customQueryHandlers } from './CustomQueryHandler.js';
import { PierceQueryHandler } from './PierceQueryHandler.js';
import { PQueryHandler } from './PQueryHandler.js';
import { TextQueryHandler } from './TextQueryHandler.js';
import { XPathQueryHandler } from './XPathQueryHandler.js';
const BUILTIN_QUERY_HANDLERS = {
    aria: ARIAQueryHandler,
    pierce: PierceQueryHandler,
    xpath: XPathQueryHandler,
    text: TextQueryHandler,
};
const QUERY_SEPARATORS = ['=', '/'];
/**
 * @internal
 */
export function getQueryHandlerAndSelector(selector) {
    for (const handlerMap of [
        customQueryHandlers.names().map(name => {
            return [name, customQueryHandlers.get(name)];
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
    return { updatedSelector: selector, QueryHandler: PQueryHandler };
}
//# sourceMappingURL=GetQueryHandler.js.map