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
var _PSelectorParser_instances, _PSelectorParser_input, _PSelectorParser_escaped, _PSelectorParser_quoted, _PSelectorParser_selectors, _PSelectorParser_push, _PSelectorParser_parseDeepChild, _PSelectorParser_parseDeepDescendent, _PSelectorParser_scanParameter, _PSelectorParser_scanEscapedValueTill;
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePSelectors = void 0;
const PUPPETEER_PSEUDO_ELEMENT = /^::-p-([-a-zA-Z_]+)\(/;
class PSelectorParser {
    constructor(input) {
        _PSelectorParser_instances.add(this);
        _PSelectorParser_input.set(this, void 0);
        _PSelectorParser_escaped.set(this, false);
        _PSelectorParser_quoted.set(this, false);
        // The first level are deep roots. The second level are shallow roots.
        _PSelectorParser_selectors.set(this, [[[]]]);
        __classPrivateFieldSet(this, _PSelectorParser_input, input, "f");
    }
    get selectors() {
        return __classPrivateFieldGet(this, _PSelectorParser_selectors, "f");
    }
    parse() {
        for (let i = 0; i < __classPrivateFieldGet(this, _PSelectorParser_input, "f").length; ++i) {
            if (__classPrivateFieldGet(this, _PSelectorParser_escaped, "f")) {
                __classPrivateFieldSet(this, _PSelectorParser_escaped, false, "f");
                continue;
            }
            switch (__classPrivateFieldGet(this, _PSelectorParser_input, "f")[i]) {
                case '\\': {
                    __classPrivateFieldSet(this, _PSelectorParser_escaped, true, "f");
                    break;
                }
                case '"': {
                    __classPrivateFieldSet(this, _PSelectorParser_quoted, !__classPrivateFieldGet(this, _PSelectorParser_quoted, "f"), "f");
                    break;
                }
                default: {
                    if (__classPrivateFieldGet(this, _PSelectorParser_quoted, "f")) {
                        break;
                    }
                    const remainder = __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(i);
                    if (remainder.startsWith('>>>>')) {
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_push).call(this, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(0, i));
                        __classPrivateFieldSet(this, _PSelectorParser_input, remainder.slice('>>>>'.length), "f");
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_parseDeepChild).call(this);
                    }
                    else if (remainder.startsWith('>>>')) {
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_push).call(this, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(0, i));
                        __classPrivateFieldSet(this, _PSelectorParser_input, remainder.slice('>>>'.length), "f");
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_parseDeepDescendent).call(this);
                    }
                    else {
                        const result = PUPPETEER_PSEUDO_ELEMENT.exec(remainder);
                        if (!result) {
                            continue;
                        }
                        const [match, name] = result;
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_push).call(this, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(0, i));
                        __classPrivateFieldSet(this, _PSelectorParser_input, remainder.slice(match.length), "f");
                        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_push).call(this, {
                            name: name,
                            value: __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_scanParameter).call(this),
                        });
                    }
                }
            }
        }
        __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_push).call(this, __classPrivateFieldGet(this, _PSelectorParser_input, "f"));
    }
}
_PSelectorParser_input = new WeakMap(), _PSelectorParser_escaped = new WeakMap(), _PSelectorParser_quoted = new WeakMap(), _PSelectorParser_selectors = new WeakMap(), _PSelectorParser_instances = new WeakSet(), _PSelectorParser_push = function _PSelectorParser_push(selector) {
    if (typeof selector === 'string') {
        // We only trim the end only since `.foo` and ` .foo` are different.
        selector = selector.trimEnd();
        if (selector.length === 0) {
            return;
        }
    }
    const roots = __classPrivateFieldGet(this, _PSelectorParser_selectors, "f")[__classPrivateFieldGet(this, _PSelectorParser_selectors, "f").length - 1];
    roots[roots.length - 1].push(selector);
}, _PSelectorParser_parseDeepChild = function _PSelectorParser_parseDeepChild() {
    __classPrivateFieldGet(this, _PSelectorParser_selectors, "f")[__classPrivateFieldGet(this, _PSelectorParser_selectors, "f").length - 1].push([]);
}, _PSelectorParser_parseDeepDescendent = function _PSelectorParser_parseDeepDescendent() {
    __classPrivateFieldGet(this, _PSelectorParser_selectors, "f").push([[]]);
}, _PSelectorParser_scanParameter = function _PSelectorParser_scanParameter() {
    const char = __classPrivateFieldGet(this, _PSelectorParser_input, "f")[0];
    switch (char) {
        case "'":
        case '"':
            __classPrivateFieldSet(this, _PSelectorParser_input, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(1), "f");
            const parameter = __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_scanEscapedValueTill).call(this, char);
            if (!__classPrivateFieldGet(this, _PSelectorParser_input, "f").startsWith(')')) {
                throw new Error("Expected ')'");
            }
            __classPrivateFieldSet(this, _PSelectorParser_input, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(1), "f");
            return parameter;
        default:
            return __classPrivateFieldGet(this, _PSelectorParser_instances, "m", _PSelectorParser_scanEscapedValueTill).call(this, ')');
    }
}, _PSelectorParser_scanEscapedValueTill = function _PSelectorParser_scanEscapedValueTill(end) {
    let string = '';
    for (let i = 0; i < __classPrivateFieldGet(this, _PSelectorParser_input, "f").length; ++i) {
        if (__classPrivateFieldGet(this, _PSelectorParser_escaped, "f")) {
            __classPrivateFieldSet(this, _PSelectorParser_escaped, false, "f");
            string += __classPrivateFieldGet(this, _PSelectorParser_input, "f")[i];
            continue;
        }
        switch (__classPrivateFieldGet(this, _PSelectorParser_input, "f")[i]) {
            case '\\': {
                __classPrivateFieldSet(this, _PSelectorParser_escaped, true, "f");
                break;
            }
            case end: {
                __classPrivateFieldSet(this, _PSelectorParser_input, __classPrivateFieldGet(this, _PSelectorParser_input, "f").slice(i + 1), "f");
                return string;
            }
            default: {
                string += __classPrivateFieldGet(this, _PSelectorParser_input, "f")[i];
            }
        }
    }
    throw new Error(`Expected \`${end}\``);
};
function parsePSelectors(selector) {
    const parser = new PSelectorParser(selector);
    parser.parse();
    return parser.selectors;
}
exports.parsePSelectors = parsePSelectors;
//# sourceMappingURL=PSelectorParser.js.map