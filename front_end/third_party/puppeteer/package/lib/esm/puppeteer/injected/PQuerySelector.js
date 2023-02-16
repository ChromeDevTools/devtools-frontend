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
var _PQueryEngine_instances, _PQueryEngine_input, _PQueryEngine_deepShadowSelectors, _PQueryEngine_shadowSelectors, _PQueryEngine_selectors, _PQueryEngine_selector, _PQueryEngine_next;
import { AsyncIterableUtil } from '../util/AsyncIterableUtil.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { ariaQuerySelectorAll } from './ARIAQuerySelector.js';
import { customQuerySelectors } from './CustomQuerySelector.js';
import { parsePSelectors } from './PSelectorParser.js';
import { textQuerySelectorAll } from './TextQuerySelector.js';
import { deepChildren, deepDescendents } from './util.js';
import { xpathQuerySelectorAll } from './XPathQuerySelector.js';
class SelectorError extends Error {
    constructor(selector, message) {
        super(`${selector} is not a valid selector: ${message}`);
    }
}
class PQueryEngine {
    constructor(element, selector) {
        _PQueryEngine_instances.add(this);
        _PQueryEngine_input.set(this, void 0);
        _PQueryEngine_deepShadowSelectors.set(this, void 0);
        _PQueryEngine_shadowSelectors.set(this, void 0);
        _PQueryEngine_selectors.set(this, void 0);
        _PQueryEngine_selector.set(this, void 0);
        __classPrivateFieldSet(this, _PQueryEngine_input, selector.trim(), "f");
        if (__classPrivateFieldGet(this, _PQueryEngine_input, "f").length === 0) {
            throw new SelectorError(__classPrivateFieldGet(this, _PQueryEngine_input, "f"), 'The provided selector is empty.');
        }
        try {
            __classPrivateFieldSet(this, _PQueryEngine_deepShadowSelectors, parsePSelectors(__classPrivateFieldGet(this, _PQueryEngine_input, "f")), "f");
        }
        catch (error) {
            if (!isErrorLike(error)) {
                throw new SelectorError(__classPrivateFieldGet(this, _PQueryEngine_input, "f"), String(error));
            }
            throw new SelectorError(__classPrivateFieldGet(this, _PQueryEngine_input, "f"), error.message);
        }
        // If there are any empty elements, then this implies the selector has
        // contiguous combinators (e.g. `>>> >>>>`) or starts/ends with one which we
        // treat as illegal, similar to existing behavior.
        if (__classPrivateFieldGet(this, _PQueryEngine_deepShadowSelectors, "f").some(shadowSelectors => {
            return shadowSelectors.some(selectors => {
                return selectors.length === 0;
            });
        })) {
            throw new SelectorError(__classPrivateFieldGet(this, _PQueryEngine_input, "f"), 'Multiple deep combinators found in sequence.');
        }
        __classPrivateFieldSet(this, _PQueryEngine_shadowSelectors, __classPrivateFieldGet(this, _PQueryEngine_deepShadowSelectors, "f").shift(), "f");
        __classPrivateFieldSet(this, _PQueryEngine_selectors, __classPrivateFieldGet(this, _PQueryEngine_shadowSelectors, "f").shift(), "f");
        __classPrivateFieldSet(this, _PQueryEngine_selector, __classPrivateFieldGet(this, _PQueryEngine_selectors, "f").shift(), "f");
        this.elements = [element];
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
                default:
                    /**
                     * We add the space since `.foo` will interpolate incorrectly (see
                     * {@link PQueryAllEngine.query}). This is always equivalent.
                     */
                    __classPrivateFieldSet(this, _PQueryEngine_selector, ` ${__classPrivateFieldGet(this, _PQueryEngine_selector, "f")}`, "f");
                    break;
            }
        }
        for (; __classPrivateFieldGet(this, _PQueryEngine_selector, "f") !== undefined; __classPrivateFieldGet(this, _PQueryEngine_instances, "m", _PQueryEngine_next).call(this)) {
            const selector = __classPrivateFieldGet(this, _PQueryEngine_selector, "f");
            const input = __classPrivateFieldGet(this, _PQueryEngine_input, "f");
            this.elements = AsyncIterableUtil.flatMap(this.elements, async function* (element) {
                if (typeof selector === 'string') {
                    if (!element.parentElement) {
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
                    yield* element.parentElement.querySelectorAll(`:scope > :nth-child(${index})${selector}`);
                    return;
                }
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
_PQueryEngine_input = new WeakMap(), _PQueryEngine_deepShadowSelectors = new WeakMap(), _PQueryEngine_shadowSelectors = new WeakMap(), _PQueryEngine_selectors = new WeakMap(), _PQueryEngine_selector = new WeakMap(), _PQueryEngine_instances = new WeakSet(), _PQueryEngine_next = function _PQueryEngine_next() {
    if (__classPrivateFieldGet(this, _PQueryEngine_selectors, "f").length === 0) {
        if (__classPrivateFieldGet(this, _PQueryEngine_shadowSelectors, "f").length === 0) {
            if (__classPrivateFieldGet(this, _PQueryEngine_deepShadowSelectors, "f").length === 0) {
                __classPrivateFieldSet(this, _PQueryEngine_selector, undefined, "f");
                return;
            }
            this.elements = AsyncIterableUtil.flatMap(this.elements, function* (element) {
                yield* deepDescendents(element);
            });
            __classPrivateFieldSet(this, _PQueryEngine_shadowSelectors, __classPrivateFieldGet(this, _PQueryEngine_deepShadowSelectors, "f").shift(), "f");
        }
        this.elements = AsyncIterableUtil.flatMap(this.elements, function* (element) {
            yield* deepChildren(element);
        });
        __classPrivateFieldSet(this, _PQueryEngine_selectors, __classPrivateFieldGet(this, _PQueryEngine_shadowSelectors, "f").shift(), "f");
    }
    __classPrivateFieldSet(this, _PQueryEngine_selector, __classPrivateFieldGet(this, _PQueryEngine_selectors, "f").shift(), "f");
};
/**
 * Queries the given node for all nodes matching the given text selector.
 *
 * @internal
 */
export const pQuerySelectorAll = async function* (root, selector) {
    const query = new PQueryEngine(root, selector);
    query.run();
    yield* query.elements;
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