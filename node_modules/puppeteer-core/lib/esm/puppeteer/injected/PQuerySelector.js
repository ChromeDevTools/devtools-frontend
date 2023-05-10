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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PQueryEngine_instances, _PQueryEngine_input, _PQueryEngine_complexSelector, _PQueryEngine_compoundSelector, _PQueryEngine_selector, _PQueryEngine_next, _DepthCalculator_cache;
import { AsyncIterableUtil } from '../util/AsyncIterableUtil.js';
import { ariaQuerySelectorAll } from './ARIAQuerySelector.js';
import { customQuerySelectors } from './CustomQuerySelector.js';
import { parsePSelectors, } from './PSelectorParser.js';
import { textQuerySelectorAll } from './TextQuerySelector.js';
import { pierce, pierceAll } from './util.js';
import { xpathQuerySelectorAll } from './XPathQuerySelector.js';
const IDENT_TOKEN_START = /[-\w\P{ASCII}*]/;
const isQueryableNode = (node) => {
    return 'querySelectorAll' in node;
};
class SelectorError extends Error {
    constructor(selector, message) {
        super(`${selector} is not a valid selector: ${message}`);
    }
}
class PQueryEngine {
    constructor(element, input, complexSelector) {
        _PQueryEngine_instances.add(this);
        _PQueryEngine_input.set(this, void 0);
        _PQueryEngine_complexSelector.set(this, void 0);
        _PQueryEngine_compoundSelector.set(this, []);
        _PQueryEngine_selector.set(this, undefined);
        this.elements = [element];
        __classPrivateFieldSet(this, _PQueryEngine_input, input, "f");
        __classPrivateFieldSet(this, _PQueryEngine_complexSelector, complexSelector, "f");
        __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this);
    }
    async run() {
        if (typeof __classPrivateFieldGet(this, _PQueryEngine_selector, "f") === 'string') {
            switch (__classPrivateFieldGet(this, _PQueryEngine_selector, "f").trimStart()) {
                case ':scope':
                    // `:scope` has some special behavior depending on the node. It always
                    // represents the current node within a compound selector, but by
                    // itself, it depends on the node. For example, Document is
                    // represented by `<html>`, but any HTMLElement is not represented by
                    // itself (i.e. `null`). This can be troublesome if our combinators
                    // are used right after so we treat this selector specially.
                    __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this);
                    break;
            }
        }
        for (; __classPrivateFieldGet(this, _PQueryEngine_selector, "f") !== undefined; __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this)) {
            const selector = __classPrivateFieldGet(this, _PQueryEngine_selector, "f");
            const input = __classPrivateFieldGet(this, _PQueryEngine_input, "f");
            if (typeof selector === 'string') {
                // The regular expression tests if the selector is a type/universal
                // selector. Any other case means we want to apply the selector onto
                // the element itself (e.g. `element.class`, `element>div`,
                // `element:hover`, etc.).
                if (selector[0] && IDENT_TOKEN_START.test(selector[0])) {
                    this.elements = AsyncIterableUtil.flatMap(this.elements, async function* (element) {
                        if (isQueryableNode(element)) {
                            yield* element.querySelectorAll(selector);
                        }
                    });
                }
                else {
                    this.elements = AsyncIterableUtil.flatMap(this.elements, async function* (element) {
                        if (!element.parentElement) {
                            if (!isQueryableNode(element)) {
                                return;
                            }
                            yield* element.querySelectorAll(selector);
                            return;
                        }
                        let index = 0;
                        for (const child of element.parentElement.children) {
                            ++index;
                            if (child === element) {
                                break;
                            }
                        }
                        yield* element.parentElement.querySelectorAll(`:scope>:nth-child(${index})${selector}`);
                    });
                }
            }
            else {
                this.elements = AsyncIterableUtil.flatMap(this.elements, async function* (element) {
                    switch (selector.name) {
                        case 'text':
                            yield* textQuerySelectorAll(element, selector.value);
                            break;
                        case 'xpath':
                            yield* xpathQuerySelectorAll(element, selector.value);
                            break;
                        case 'aria':
                            yield* ariaQuerySelectorAll(element, selector.value);
                            break;
                        default:
                            const querySelector = customQuerySelectors.get(selector.name);
                            if (!querySelector) {
                                throw new SelectorError(input, `Unknown selector type: ${selector.name}`);
                            }
                            yield* querySelector.querySelectorAll(element, selector.value);
                    }
                });
            }
        }
    }
}
_PQueryEngine_input = new WeakMap(), _PQueryEngine_complexSelector = new WeakMap(), _PQueryEngine_compoundSelector = new WeakMap(), _PQueryEngine_selector = new WeakMap(), _PQueryEngine_instances = new WeakSet(), _PQueryEngine_next = function _PQueryEngine_next() {
    if (__classPrivateFieldGet(this, _PQueryEngine_compoundSelector, "f").length !== 0) {
        __classPrivateFieldSet(this, _PQueryEngine_selector, __classPrivateFieldGet(this, _PQueryEngine_compoundSelector, "f").shift(), "f");
        return;
    }
    if (__classPrivateFieldGet(this, _PQueryEngine_complexSelector, "f").length === 0) {
        __classPrivateFieldSet(this, _PQueryEngine_selector, undefined, "f");
        return;
    }
    const selector = __classPrivateFieldGet(this, _PQueryEngine_complexSelector, "f").shift();
    switch (selector) {
        case ">>>>" /* PCombinator.Child */: {
            this.elements = AsyncIterableUtil.flatMap(this.elements, pierce);
            __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this);
            break;
        }
        case ">>>" /* PCombinator.Descendent */: {
            this.elements = AsyncIterableUtil.flatMap(this.elements, pierceAll);
            __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this);
            break;
        }
        default:
            __classPrivateFieldSet(this, _PQueryEngine_compoundSelector, selector, "f");
            __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this);
            break;
    }
};
class DepthCalculator {
    constructor() {
        _DepthCalculator_cache.set(this, new WeakMap());
    }
    calculate(node, depth = []) {
        if (node === null) {
            return depth;
        }
        if (node instanceof ShadowRoot) {
            node = node.host;
        }
        const cachedDepth = __classPrivateFieldGet(this, _DepthCalculator_cache, "f").get(node);
        if (cachedDepth) {
            return [...cachedDepth, ...depth];
        }
        let index = 0;
        for (let prevSibling = node.previousSibling; prevSibling; prevSibling = prevSibling.previousSibling) {
            ++index;
        }
        const value = this.calculate(node.parentNode, [index]);
        __classPrivateFieldGet(this, _DepthCalculator_cache, "f").set(node, value);
        return [...value, ...depth];
    }
}
_DepthCalculator_cache = new WeakMap();
const compareDepths = (a, b) => {
    if (a.length + b.length === 0) {
        return 0;
    }
    const [i = -1, ...otherA] = a;
    const [j = -1, ...otherB] = b;
    if (i === j) {
        return compareDepths(otherA, otherB);
    }
    return i < j ? -1 : 1;
};
const domSort = async function* (elements) {
    const results = new Set();
    for await (const element of elements) {
        results.add(element);
    }
    const calculator = new DepthCalculator();
    yield* [...results.values()]
        .map(result => {
        return [result, calculator.calculate(result)];
    })
        .sort(([, a], [, b]) => {
        return compareDepths(a, b);
    })
        .map(([result]) => {
        return result;
    });
};
/**
 * Queries the given node for all nodes matching the given text selector.
 *
 * @internal
 */
export const pQuerySelectorAll = function (root, selector) {
    let selectors;
    let isPureCSS;
    try {
        [selectors, isPureCSS] = parsePSelectors(selector);
    }
    catch (error) {
        return root.querySelectorAll(selector);
    }
    if (isPureCSS) {
        return root.querySelectorAll(selector);
    }
    // If there are any empty elements, then this implies the selector has
    // contiguous combinators (e.g. `>>> >>>>`) or starts/ends with one which we
    // treat as illegal, similar to existing behavior.
    if (selectors.some(parts => {
        let i = 0;
        return parts.some(parts => {
            if (typeof parts === 'string') {
                ++i;
            }
            else {
                i = 0;
            }
            return i > 1;
        });
    })) {
        throw new SelectorError(selector, 'Multiple deep combinators found in sequence.');
    }
    return domSort(AsyncIterableUtil.flatMap(selectors, selectorParts => {
        const query = new PQueryEngine(root, selector, selectorParts);
        void query.run();
        return query.elements;
    }));
};
/**
 * Queries the given node for all nodes matching the given text selector.
 *
 * @internal
 */
export const pQuerySelector = async function (root, selector) {
    for await (const element of pQuerySelectorAll(root, selector)) {
        return element;
    }
    return null;
};
//# sourceMappingURL=PQuerySelector.js.map