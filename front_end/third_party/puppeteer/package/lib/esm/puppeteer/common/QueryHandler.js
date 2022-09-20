/**
 * Copyright 2020 Google Inc. All rights reserved.
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
import { ariaHandler } from './AriaQueryHandler.js';
import { ElementHandle } from './ElementHandle.js';
import { Frame } from './Frame.js';
import { MAIN_WORLD, PUPPETEER_WORLD, } from './IsolatedWorld.js';
function createPuppeteerQueryHandler(handler) {
    const internalHandler = {};
    if (handler.queryOne) {
        const queryOne = handler.queryOne;
        internalHandler.queryOne = async (element, selector) => {
            const jsHandle = await element.evaluateHandle(queryOne, selector, await element.executionContext()._world.puppeteerUtil);
            const elementHandle = jsHandle.asElement();
            if (elementHandle) {
                return elementHandle;
            }
            await jsHandle.dispose();
            return null;
        };
        internalHandler.waitFor = async (elementOrFrame, selector, options) => {
            let frame;
            let element;
            if (elementOrFrame instanceof Frame) {
                frame = elementOrFrame;
            }
            else {
                frame = elementOrFrame.frame;
                element = await frame.worlds[PUPPETEER_WORLD].adoptHandle(elementOrFrame);
            }
            const result = await frame.worlds[PUPPETEER_WORLD]._waitForSelectorInPage(queryOne, element, selector, options);
            if (element) {
                await element.dispose();
            }
            if (!result) {
                return null;
            }
            if (!(result instanceof ElementHandle)) {
                await result.dispose();
                return null;
            }
            return frame.worlds[MAIN_WORLD].transferHandle(result);
        };
    }
    if (handler.queryAll) {
        const queryAll = handler.queryAll;
        internalHandler.queryAll = async (element, selector) => {
            const jsHandle = await element.evaluateHandle(queryAll, selector, await element.executionContext()._world.puppeteerUtil);
            const properties = await jsHandle.getProperties();
            await jsHandle.dispose();
            const result = [];
            for (const property of properties.values()) {
                const elementHandle = property.asElement();
                if (elementHandle) {
                    result.push(elementHandle);
                }
            }
            return result;
        };
    }
    return internalHandler;
}
const defaultHandler = createPuppeteerQueryHandler({
    queryOne: (element, selector) => {
        if (!('querySelector' in element)) {
            throw new Error(`Could not invoke \`querySelector\` on node of type ${element.nodeName}.`);
        }
        return element.querySelector(selector);
    },
    queryAll: (element, selector) => {
        if (!('querySelectorAll' in element)) {
            throw new Error(`Could not invoke \`querySelectorAll\` on node of type ${element.nodeName}.`);
        }
        return [
            ...element.querySelectorAll(selector),
        ];
    },
});
const pierceHandler = createPuppeteerQueryHandler({
    queryOne: (element, selector, { pierceQuerySelector }) => {
        return pierceQuerySelector(element, selector);
    },
    queryAll: (element, selector, { pierceQuerySelectorAll }) => {
        return pierceQuerySelectorAll(element, selector);
    },
});
const xpathHandler = createPuppeteerQueryHandler({
    queryOne: (element, selector, { xpathQuerySelector }) => {
        return xpathQuerySelector(element, selector);
    },
    queryAll: (element, selector, { xpathQuerySelectorAll }) => {
        return xpathQuerySelectorAll(element, selector);
    },
});
const textQueryHandler = createPuppeteerQueryHandler({
    queryOne: (element, selector, { textQuerySelector }) => {
        return textQuerySelector(element, selector);
    },
    queryAll: (element, selector, { textQuerySelectorAll }) => {
        return textQuerySelectorAll(element, selector);
    },
});
const INTERNAL_QUERY_HANDLERS = new Map([
    ['aria', { handler: ariaHandler }],
    ['pierce', { handler: pierceHandler }],
    ['xpath', { handler: xpathHandler }],
    ['text', { handler: textQueryHandler }],
]);
const QUERY_HANDLERS = new Map();
/**
 * Registers a {@link CustomQueryHandler | custom query handler}.
 *
 * @remarks
 * After registration, the handler can be used everywhere where a selector is
 * expected by prepending the selection string with `<name>/`. The name is only
 * allowed to consist of lower- and upper case latin letters.
 *
 * @example
 *
 * ```
 * puppeteer.registerCustomQueryHandler('text', { … });
 * const aHandle = await page.$('text/…');
 * ```
 *
 * @param name - The name that the custom query handler will be registered
 * under.
 * @param queryHandler - The {@link CustomQueryHandler | custom query handler}
 * to register.
 *
 * @public
 */
export function registerCustomQueryHandler(name, handler) {
    if (INTERNAL_QUERY_HANDLERS.has(name)) {
        throw new Error(`A query handler named "${name}" already exists`);
    }
    if (QUERY_HANDLERS.has(name)) {
        throw new Error(`A custom query handler named "${name}" already exists`);
    }
    const isValidName = /^[a-zA-Z]+$/.test(name);
    if (!isValidName) {
        throw new Error(`Custom query handler names may only contain [a-zA-Z]`);
    }
    QUERY_HANDLERS.set(name, { handler: createPuppeteerQueryHandler(handler) });
}
/**
 * @param name - The name of the query handler to unregistered.
 *
 * @public
 */
export function unregisterCustomQueryHandler(name) {
    QUERY_HANDLERS.delete(name);
}
/**
 * @returns a list with the names of all registered custom query handlers.
 *
 * @public
 */
export function customQueryHandlerNames() {
    return [...QUERY_HANDLERS.keys()];
}
/**
 * Clears all registered handlers.
 *
 * @public
 */
export function clearCustomQueryHandlers() {
    QUERY_HANDLERS.clear();
}
const CUSTOM_QUERY_SEPARATORS = ['=', '/'];
/**
 * @internal
 */
export function getQueryHandlerAndSelector(selector) {
    for (const handlerMap of [QUERY_HANDLERS, INTERNAL_QUERY_HANDLERS]) {
        for (const [name, { handler: queryHandler, transformSelector },] of handlerMap) {
            for (const separator of CUSTOM_QUERY_SEPARATORS) {
                const prefix = `${name}${separator}`;
                if (selector.startsWith(prefix)) {
                    selector = selector.slice(prefix.length);
                    if (transformSelector) {
                        selector = transformSelector(selector);
                    }
                    return { updatedSelector: selector, queryHandler };
                }
            }
        }
    }
    return { updatedSelector: selector, queryHandler: defaultHandler };
}
//# sourceMappingURL=QueryHandler.js.map