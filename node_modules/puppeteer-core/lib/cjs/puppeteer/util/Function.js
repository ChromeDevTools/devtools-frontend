"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolateFunction = exports.stringifyFunction = exports.createFunction = void 0;
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
const createdFunctions = new Map();
/**
 * Creates a function from a string.
 *
 * @internal
 */
const createFunction = (functionValue) => {
    let fn = createdFunctions.get(functionValue);
    if (fn) {
        return fn;
    }
    fn = new Function(`return ${functionValue}`)();
    createdFunctions.set(functionValue, fn);
    return fn;
};
exports.createFunction = createFunction;
/**
 * @internal
 */
function stringifyFunction(fn) {
    let value = fn.toString();
    try {
        new Function(`(${value})`);
    }
    catch {
        // This means we might have a function shorthand (e.g. `test(){}`). Let's
        // try prefixing.
        let prefix = 'function ';
        if (value.startsWith('async ')) {
            prefix = `async ${prefix}`;
            value = value.substring('async '.length);
        }
        value = `${prefix}${value}`;
        try {
            new Function(`(${value})`);
        }
        catch {
            // We tried hard to serialize, but there's a weird beast here.
            throw new Error('Passed function cannot be serialized!');
        }
    }
    return value;
}
exports.stringifyFunction = stringifyFunction;
/**
 * Replaces `PLACEHOLDER`s with the given replacements.
 *
 * All replacements must be valid JS code.
 *
 * @example
 *
 * ```ts
 * interpolateFunction(() => PLACEHOLDER('test'), {test: 'void 0'});
 * // Equivalent to () => void 0
 * ```
 *
 * @internal
 */
const interpolateFunction = (fn, replacements) => {
    let value = stringifyFunction(fn);
    for (const [name, jsValue] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`PLACEHOLDER\\(\\s*(?:'${name}'|"${name}")\\s*\\)`, 'g'), jsValue);
    }
    return (0, exports.createFunction)(value);
};
exports.interpolateFunction = interpolateFunction;
//# sourceMappingURL=Function.js.map