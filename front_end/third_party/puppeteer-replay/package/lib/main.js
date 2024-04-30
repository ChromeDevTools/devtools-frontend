/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
var SelectorType;
(function (SelectorType) {
    SelectorType["CSS"] = "css";
    SelectorType["ARIA"] = "aria";
    SelectorType["Text"] = "text";
    SelectorType["XPath"] = "xpath";
    SelectorType["Pierce"] = "pierce";
})(SelectorType || (SelectorType = {}));
var StepType;
(function (StepType) {
    StepType["Change"] = "change";
    StepType["Click"] = "click";
    StepType["Close"] = "close";
    StepType["CustomStep"] = "customStep";
    StepType["DoubleClick"] = "doubleClick";
    StepType["EmulateNetworkConditions"] = "emulateNetworkConditions";
    StepType["Hover"] = "hover";
    StepType["KeyDown"] = "keyDown";
    StepType["KeyUp"] = "keyUp";
    StepType["Navigate"] = "navigate";
    StepType["Scroll"] = "scroll";
    StepType["SetViewport"] = "setViewport";
    StepType["WaitForElement"] = "waitForElement";
    StepType["WaitForExpression"] = "waitForExpression";
})(StepType || (StepType = {}));
var AssertedEventType;
(function (AssertedEventType) {
    AssertedEventType["Navigation"] = "navigation";
})(AssertedEventType || (AssertedEventType = {}));

var Schema = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get AssertedEventType () { return AssertedEventType; },
    get SelectorType () { return SelectorType; },
    get StepType () { return StepType; }
});

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
function assertAllStepTypesAreHandled(s) {
    throw new Error(`Unknown step type: ${s.type}`);
}
const typeableInputTypes = new Set([
    'textarea',
    'text',
    'url',
    'tel',
    'search',
    'password',
    'number',
    'email',
]);
const pointerDeviceTypes = new Set([
    'mouse',
    'pen',
    'touch',
]);
const mouseButtonMap = new Map([
    ['primary', 'left'],
    ['auxiliary', 'middle'],
    ['secondary', 'right'],
    ['back', 'back'],
    ['forward', 'forward'],
]);
function hasProperty(data, prop) {
    // TODO: use Object.hasOwn once types are available https://github.com/microsoft/TypeScript/issues/44253
    if (!Object.prototype.hasOwnProperty.call(data, prop)) {
        return false;
    }
    const keyedData = data;
    return keyedData[prop] !== undefined;
}
function isObject(data) {
    return typeof data === 'object' && data !== null;
}
function isString(data) {
    return typeof data === 'string';
}
function isNumber(data) {
    return typeof data === 'number';
}
function isArray(data) {
    return Array.isArray(data);
}
function isBoolean(data) {
    return typeof data === 'boolean';
}
function isIntegerArray(data) {
    return isArray(data) && data.every((item) => Number.isInteger(item));
}
function isKnownDeviceType(data) {
    return typeof data === 'string' && pointerDeviceTypes.has(data);
}
function isKnownMouseButton(data) {
    return typeof data === 'string' && mouseButtonMap.has(data);
}
function parseTarget(step) {
    if (hasProperty(step, 'target') && isString(step.target)) {
        return step.target;
    }
    return undefined;
}
function parseFrame(step) {
    if (hasProperty(step, 'frame')) {
        if (isIntegerArray(step.frame)) {
            return step.frame;
        }
        throw new Error('Step `frame` is not an integer array');
    }
    return undefined;
}
function parseNumber(step, prop) {
    if (hasProperty(step, prop)) {
        const maybeNumber = step[prop];
        if (isNumber(maybeNumber)) {
            return maybeNumber;
        }
    }
    throw new Error(`Step.${prop} is not a number`);
}
function parseBoolean(step, prop) {
    if (hasProperty(step, prop)) {
        const maybeBoolean = step[prop];
        if (isBoolean(maybeBoolean)) {
            return maybeBoolean;
        }
    }
    throw new Error(`Step.${prop} is not a boolean`);
}
function parseOptionalNumber(step, prop) {
    if (hasProperty(step, prop)) {
        return parseNumber(step, prop);
    }
    return undefined;
}
function parseOptionalString(step, prop) {
    if (hasProperty(step, prop)) {
        return parseString(step, prop);
    }
    return undefined;
}
function parseOptionalBoolean(step, prop) {
    if (hasProperty(step, prop)) {
        return parseBoolean(step, prop);
    }
    return undefined;
}
function parseString(step, prop) {
    if (hasProperty(step, prop)) {
        const maybeString = step[prop];
        if (isString(maybeString)) {
            return maybeString;
        }
    }
    throw new Error(`Step.${prop} is not a string`);
}
function parseSelectors(step) {
    if (!hasProperty(step, 'selectors')) {
        throw new Error('Step does not have required selectors');
    }
    if (!isArray(step.selectors)) {
        throw new Error('Step selectors are not an array');
    }
    if (step.selectors.length === 0) {
        throw new Error('Step does not have required selectors');
    }
    return step.selectors.map((s) => {
        if (!isString(s) && !isArray(s)) {
            throw new Error('Selector is not an array or string');
        }
        if (isArray(s)) {
            return s.map((sub) => {
                if (!isString(sub)) {
                    throw new Error('Selector element is not a string');
                }
                return sub;
            });
        }
        return s;
    });
}
function parseOptionalSelectors(step) {
    if (!hasProperty(step, 'selectors')) {
        return undefined;
    }
    return parseSelectors(step);
}
function parseAssertedEvent(event) {
    if (!isObject(event)) {
        throw new Error('Asserted event is not an object');
    }
    if (!hasProperty(event, 'type')) {
        throw new Error('Asserted event is missing type');
    }
    if (event.type === AssertedEventType.Navigation) {
        return {
            type: AssertedEventType.Navigation,
            url: parseOptionalString(event, 'url'),
            title: parseOptionalString(event, 'title'),
        };
    }
    throw new Error('Unknown assertedEvent type');
}
function parseAssertedEvents(events) {
    if (!isArray(events)) {
        return undefined;
    }
    return events.map(parseAssertedEvent);
}
function parseBaseStep(type, step) {
    if (hasProperty(step, 'timeout') &&
        isNumber(step.timeout) &&
        !validTimeout(step.timeout)) {
        throw new Error(timeoutErrorMessage);
    }
    return {
        type,
        assertedEvents: hasProperty(step, 'assertedEvents')
            ? parseAssertedEvents(step.assertedEvents)
            : undefined,
        timeout: hasProperty(step, 'timeout') && isNumber(step.timeout)
            ? step.timeout
            : undefined,
    };
}
function parseStepWithTarget(type, step) {
    return {
        ...parseBaseStep(type, step),
        target: parseTarget(step),
    };
}
function parseStepWithFrame(type, step) {
    return {
        ...parseStepWithTarget(type, step),
        frame: parseFrame(step),
    };
}
function parseStepWithSelectors(type, step) {
    return {
        ...parseStepWithFrame(type, step),
        selectors: parseSelectors(step),
    };
}
function parseClickAttributes(step) {
    const attributes = {
        offsetX: parseNumber(step, 'offsetX'),
        offsetY: parseNumber(step, 'offsetY'),
        duration: parseOptionalNumber(step, 'duration'),
    };
    const deviceType = parseOptionalString(step, 'deviceType');
    if (deviceType) {
        if (!isKnownDeviceType(deviceType)) {
            throw new Error(`'deviceType' for click steps must be one of the following: ${[
                ...pointerDeviceTypes,
            ].join(', ')}`);
        }
        attributes.deviceType = deviceType;
    }
    const button = parseOptionalString(step, 'button');
    if (button) {
        if (!isKnownMouseButton(button)) {
            throw new Error(`'button' for click steps must be one of the following: ${[
                ...mouseButtonMap.keys(),
            ].join(', ')}`);
        }
        attributes.button = button;
    }
    return attributes;
}
function parseClickStep(step) {
    return {
        ...parseStepWithSelectors(StepType.Click, step),
        ...parseClickAttributes(step),
        type: StepType.Click,
    };
}
function parseDoubleClickStep(step) {
    return {
        ...parseStepWithSelectors(StepType.DoubleClick, step),
        ...parseClickAttributes(step),
        type: StepType.DoubleClick,
    };
}
function parseHoverStep(step) {
    return {
        ...parseStepWithSelectors(StepType.Hover, step),
        type: StepType.Hover,
    };
}
function parseChangeStep(step) {
    return {
        ...parseStepWithSelectors(StepType.Change, step),
        type: StepType.Change,
        value: parseString(step, 'value'),
    };
}
function parseKeyDownStep(step) {
    return {
        ...parseStepWithTarget(StepType.KeyDown, step),
        type: StepType.KeyDown,
        // TODO: type-check keys.
        key: parseString(step, 'key'),
    };
}
function parseKeyUpStep(step) {
    return {
        ...parseStepWithTarget(StepType.KeyUp, step),
        type: StepType.KeyUp,
        // TODO: type-check keys.
        key: parseString(step, 'key'),
    };
}
function parseEmulateNetworkConditionsStep(step) {
    return {
        ...parseStepWithTarget(StepType.EmulateNetworkConditions, step),
        type: StepType.EmulateNetworkConditions,
        download: parseNumber(step, 'download'),
        upload: parseNumber(step, 'upload'),
        latency: parseNumber(step, 'latency'),
    };
}
function parseCloseStep(step) {
    return {
        ...parseStepWithTarget(StepType.Close, step),
        type: StepType.Close,
    };
}
function parseSetViewportStep(step) {
    return {
        ...parseStepWithTarget(StepType.SetViewport, step),
        type: StepType.SetViewport,
        width: parseNumber(step, 'width'),
        height: parseNumber(step, 'height'),
        deviceScaleFactor: parseNumber(step, 'deviceScaleFactor'),
        isMobile: parseBoolean(step, 'isMobile'),
        hasTouch: parseBoolean(step, 'hasTouch'),
        isLandscape: parseBoolean(step, 'isLandscape'),
    };
}
function parseScrollStep(step) {
    return {
        ...parseStepWithFrame(StepType.Scroll, step),
        type: StepType.Scroll,
        x: parseOptionalNumber(step, 'x'),
        y: parseOptionalNumber(step, 'y'),
        selectors: parseOptionalSelectors(step),
    };
}
function parseNavigateStep(step) {
    return {
        ...parseStepWithTarget(StepType.Navigate, step),
        type: StepType.Navigate,
        target: parseTarget(step),
        url: parseString(step, 'url'),
    };
}
function parseWaitForElementStep(step) {
    const operator = parseOptionalString(step, 'operator');
    if (operator && operator !== '>=' && operator !== '==' && operator !== '<=') {
        throw new Error("WaitForElement step's operator is not one of '>=','==','<='");
    }
    if (hasProperty(step, 'attributes')) {
        if (!isObject(step.attributes) ||
            Object.values(step.attributes).some((attribute) => typeof attribute !== 'string')) {
            throw new Error("WaitForElement step's attribute is not a dictionary of strings");
        }
    }
    if (hasProperty(step, 'properties')) {
        if (!isObject(step.properties)) {
            throw new Error("WaitForElement step's attribute is not an object");
        }
    }
    return {
        ...parseStepWithSelectors(StepType.WaitForElement, step),
        type: StepType.WaitForElement,
        operator: operator,
        count: parseOptionalNumber(step, 'count'),
        visible: parseOptionalBoolean(step, 'visible'),
        attributes: hasProperty(step, 'attributes')
            ? step.attributes
            : undefined,
        properties: hasProperty(step, 'properties')
            ? step.properties
            : undefined,
    };
}
function parseWaitForExpressionStep(step) {
    if (!hasProperty(step, 'expression')) {
        throw new Error('waitForExpression step is missing `expression`');
    }
    return {
        ...parseStepWithFrame(StepType.WaitForExpression, step),
        type: StepType.WaitForExpression,
        expression: parseString(step, 'expression'),
    };
}
function parseCustomStep(step) {
    if (!hasProperty(step, 'name')) {
        throw new Error('customStep is missing name');
    }
    if (!isString(step.name)) {
        throw new Error("customStep's name is not a string");
    }
    return {
        ...parseStepWithFrame(StepType.CustomStep, step),
        type: StepType.CustomStep,
        name: step.name,
        parameters: hasProperty(step, 'parameters') ? step.parameters : undefined,
    };
}
function parseStep(step, idx) {
    if (!isObject(step)) {
        throw new Error(idx ? `Step ${idx} is not an object` : 'Step is not an object');
    }
    if (!hasProperty(step, 'type')) {
        throw new Error(idx ? `Step ${idx} does not have a type` : 'Step does not have a type');
    }
    if (!isString(step.type)) {
        throw new Error(idx
            ? `Type of the step ${idx} is not a string`
            : 'Type of the step is not a string');
    }
    switch (step.type) {
        case StepType.Click:
            return parseClickStep(step);
        case StepType.DoubleClick:
            return parseDoubleClickStep(step);
        case StepType.Hover:
            return parseHoverStep(step);
        case StepType.Change:
            return parseChangeStep(step);
        case StepType.KeyDown:
            return parseKeyDownStep(step);
        case StepType.KeyUp:
            return parseKeyUpStep(step);
        case StepType.EmulateNetworkConditions:
            return parseEmulateNetworkConditionsStep(step);
        case StepType.Close:
            return parseCloseStep(step);
        case StepType.SetViewport:
            return parseSetViewportStep(step);
        case StepType.Scroll:
            return parseScrollStep(step);
        case StepType.Navigate:
            return parseNavigateStep(step);
        case StepType.CustomStep:
            return parseCustomStep(step);
        case StepType.WaitForElement:
            return parseWaitForElementStep(step);
        case StepType.WaitForExpression:
            return parseWaitForExpressionStep(step);
        default:
            throw new Error(`Step type ${step.type} is not supported`);
    }
}
function parseSteps(steps) {
    const result = [];
    if (!isArray(steps)) {
        throw new Error('Recording `steps` is not an array');
    }
    for (const [idx, step] of steps.entries()) {
        result.push(parseStep(step, idx));
    }
    return result;
}
function cleanUndefined(json) {
    return JSON.parse(JSON.stringify(json));
}
const minTimeout = 1;
const maxTimeout = 30000;
const timeoutErrorMessage = `Timeout is not between ${minTimeout} and ${maxTimeout} milliseconds`;
function validTimeout(timeout) {
    return timeout >= minTimeout && timeout <= maxTimeout;
}
function parse(data) {
    if (!isObject(data)) {
        throw new Error('Recording is not an object');
    }
    if (!hasProperty(data, 'title')) {
        throw new Error('Recording is missing `title`');
    }
    if (!isString(data.title)) {
        throw new Error('Recording `title` is not a string');
    }
    if (hasProperty(data, 'timeout') && !isNumber(data.timeout)) {
        throw new Error('Recording `timeout` is not a number');
    }
    if (!hasProperty(data, 'steps')) {
        throw new Error('Recording is missing `steps`');
    }
    if (hasProperty(data, 'timeout') &&
        isNumber(data.timeout) &&
        !validTimeout(data.timeout)) {
        throw new Error(timeoutErrorMessage);
    }
    return cleanUndefined({
        title: data.title,
        timeout: hasProperty(data, 'timeout') && isNumber(data.timeout)
            ? data.timeout
            : undefined,
        selectorAttribute: hasProperty(data, 'selectorAttribute') && isString(data.selectorAttribute)
            ? data.selectorAttribute
            : undefined,
        steps: parseSteps(data.steps),
    });
}
/**
 * Detects what type of a selector the string contains. For example,
 * `aria/Label` is a SelectorType.ARIA.
 *
 * Note that CSS selectors are special and usually don't require a prefix,
 * therefore, SelectorType.CSS is the default type if other types didn't match.
 */
function getSelectorType(selector) {
    for (const value of Object.values(SelectorType)) {
        if (selector.startsWith(`${value}/`)) {
            return value;
        }
    }
    return SelectorType.CSS;
}
/**
 * Converts a selector or an array of selector parts into a Puppeteer selector.
 *
 * @see https://pptr.dev/guides/query-selectors#p-elements
 */
function selectorToPElementSelector(selector) {
    if (!Array.isArray(selector)) {
        selector = [selector];
    }
    function escape(input) {
        return input.replace(/['"()]/g, `\\$&`);
    }
    const result = selector.map((s) => {
        switch (getSelectorType(s)) {
            case SelectorType.ARIA:
                return `::-p-aria(${escape(s.substring(SelectorType.ARIA.length + 1))})`;
            case SelectorType.CSS:
                return s;
            case SelectorType.XPath:
                return `::-p-xpath(${escape(s.substring(SelectorType.XPath.length + 1))})`;
            case SelectorType.Pierce:
                return `:scope >>> ${s.substring(SelectorType.Pierce.length + 1)}`;
            case SelectorType.Text:
                return `::-p-text(${escape(s.substring(SelectorType.Text.length + 1))})`;
        }
    });
    return result.join(' >>>> ');
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class StringifyExtension {
    async beforeAllSteps(out, flow) { }
    async afterAllSteps(out, flow) { }
    async beforeEachStep(out, step, flow) { }
    async stringifyStep(out, step, flow) { }
    async afterEachStep(out, step, flow) { }
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
/**
 * Stringifies a user flow to JSON with source maps.
 *
 * You probably want to strip the source map because not all
 * parsers support comments in JSON.
 */
class JSONStringifyExtension extends StringifyExtension {
    async beforeAllSteps(out, flow) {
        const copy = {
            ...flow,
            steps: undefined,
        };
        // Stringify top-level attributes.
        const text = JSON.stringify(copy, null, out.getIndent());
        const lines = text.split('\n');
        lines.pop();
        lines[lines.length - 1] += ',';
        lines.push(out.getIndent() + `"steps": [`);
        out.appendLine(lines.join('\n')).startBlock().startBlock();
    }
    async afterAllSteps(out) {
        out
            .endBlock()
            .endBlock()
            .appendLine(out.getIndent() + `]`)
            .appendLine('}');
    }
    async stringifyStep(out, step, flow) {
        const stepText = JSON.stringify(step, null, out.getIndent());
        if (!flow) {
            out.appendLine(stepText);
            return;
        }
        const separator = flow.steps.lastIndexOf(step) === flow.steps.length - 1 ? '' : ',';
        out.appendLine(stepText + separator);
    }
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class InMemoryLineWriter {
    #indentation;
    #currentIndentation = 0;
    #lines = [];
    constructor(indentation) {
        this.#indentation = indentation;
    }
    appendLine(line) {
        const lines = line.split('\n').map((line) => {
            const indentedLine = line
                ? this.#indentation.repeat(this.#currentIndentation) + line.trimEnd()
                : '';
            return indentedLine;
        });
        this.#lines.push(...lines);
        return this;
    }
    startBlock() {
        this.#currentIndentation++;
        return this;
    }
    endBlock() {
        this.#currentIndentation--;
        if (this.#currentIndentation < 0) {
            throw new Error('Extra endBlock');
        }
        return this;
    }
    toString() {
        // Scripts should end with a final blank line.
        return this.#lines.join('\n') + '\n';
    }
    getIndent() {
        return this.#indentation;
    }
    getSize() {
        return this.#lines.length;
    }
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
/**
 * Copyright (c) 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
function formatJSONAsJS(json, indent) {
    const buffer = [];
    format(json, buffer, 1, indent);
    return buffer.join('');
}
function format(json, buffer = [], level = 1, indent = '  ') {
    switch (typeof json) {
        case 'bigint':
        case 'symbol':
        case 'function':
        case 'undefined':
            throw new Error('Invalid JSON');
        case 'number':
        case 'boolean':
            buffer.push(String(json));
            break;
        case 'string':
            buffer.push(formatAsJSLiteral(json));
            break;
        case 'object': {
            if (json === null) {
                buffer.push('null');
            }
            else if (Array.isArray(json)) {
                buffer.push('[\n');
                for (let i = 0; i < json.length; i++) {
                    buffer.push(indent.repeat(level));
                    format(json[i], buffer, level + 1, indent);
                    if (i !== json.length - 1) {
                        buffer.push(',');
                    }
                    buffer.push('\n');
                }
                buffer.push(indent.repeat(level - 1) + ']');
            }
            else {
                buffer.push('{\n');
                const keys = Object.keys(json);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const value = json[key];
                    if (value === undefined) {
                        continue;
                    }
                    buffer.push(indent.repeat(level));
                    buffer.push(key);
                    buffer.push(': ');
                    format(value, buffer, level + 1, indent);
                    if (i !== keys.length - 1) {
                        buffer.push(',');
                    }
                    buffer.push('\n');
                }
                buffer.push(indent.repeat(level - 1) + '}');
            }
            break;
        }
        default:
            throw new Error('Unknown object type');
    }
    return buffer;
}
// Taken from https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/platform/string-utilities.ts;l=29;drc=111134437ee51d74433829bed0088f7239e18867.
const toHexadecimal = (charCode, padToLength) => {
    return charCode.toString(16).toUpperCase().padStart(padToLength, '0');
};
// Remember to update the third group in the regexps patternsToEscape and
// patternsToEscapePlusSingleQuote when adding new entries in this map.
const escapedReplacements = new Map([
    ['\b', '\\b'],
    ['\f', '\\f'],
    ['\n', '\\n'],
    ['\r', '\\r'],
    ['\t', '\\t'],
    ['\v', '\\v'],
    ["'", "\\'"],
    ['\\', '\\\\'],
    ['<!--', '\\x3C!--'],
    ['<script', '\\x3Cscript'],
    ['</script', '\\x3C/script'],
]);
const formatAsJSLiteral = (content) => {
    const patternsToEscape = /(\\|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
    const patternsToEscapePlusSingleQuote = /(\\|'|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
    const escapePattern = (match, pattern, controlChar, loneSurrogate) => {
        if (controlChar) {
            if (escapedReplacements.has(controlChar)) {
                // @ts-ignore https://github.com/microsoft/TypeScript/issues/13086
                return escapedReplacements.get(controlChar);
            }
            const twoDigitHex = toHexadecimal(controlChar.charCodeAt(0), 2);
            return '\\x' + twoDigitHex;
        }
        if (loneSurrogate) {
            const fourDigitHex = toHexadecimal(loneSurrogate.charCodeAt(0), 4);
            return '\\u' + fourDigitHex;
        }
        if (pattern) {
            return escapedReplacements.get(pattern) || '';
        }
        return match;
    };
    let escapedContent = '';
    let quote = '';
    if (!content.includes("'")) {
        quote = "'";
        escapedContent = content.replace(patternsToEscape, escapePattern);
    }
    else if (!content.includes('"')) {
        quote = '"';
        escapedContent = content.replace(patternsToEscape, escapePattern);
    }
    else if (!content.includes('`') && !content.includes('${')) {
        quote = '`';
        escapedContent = content.replace(patternsToEscape, escapePattern);
    }
    else {
        quote = "'";
        escapedContent = content.replace(patternsToEscapePlusSingleQuote, escapePattern);
    }
    return `${quote}${escapedContent}${quote}`;
};

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class PuppeteerStringifyExtension extends StringifyExtension {
    #shouldAppendWaitForElementHelper = false;
    async beforeAllSteps(out, flow) {
        out.appendLine("const puppeteer = require('puppeteer'); // v22.0.0 or later");
        out.appendLine('');
        out.appendLine('(async () => {').startBlock();
        out.appendLine('const browser = await puppeteer.launch();');
        out.appendLine('const page = await browser.newPage();');
        out.appendLine(`const timeout = ${flow.timeout || defaultTimeout};`);
        out.appendLine('page.setDefaultTimeout(timeout);');
        out.appendLine('');
        this.#shouldAppendWaitForElementHelper = false;
    }
    async afterAllSteps(out, flow) {
        out.appendLine('');
        out.appendLine('await browser.close();');
        out.appendLine('');
        if (this.#shouldAppendWaitForElementHelper) {
            for (const line of waitForElementHelper.split('\n')) {
                out.appendLine(line);
            }
        }
        out.endBlock().appendLine('})().catch(err => {').startBlock();
        out.appendLine('console.error(err);');
        out.appendLine('process.exit(1);');
        out.endBlock().appendLine('});');
    }
    async stringifyStep(out, step, flow) {
        out.appendLine('{').startBlock();
        if (step.timeout !== undefined) {
            out.appendLine(`const timeout = ${step.timeout};`);
        }
        this.#appendContext(out, step);
        if (step.assertedEvents) {
            out.appendLine('const promises = [];');
            out.appendLine('const startWaitingForEvents = () => {').startBlock();
            for (const event of step.assertedEvents) {
                switch (event.type) {
                    case AssertedEventType.Navigation: {
                        out.appendLine(`promises.push(${'frame' in step && step.frame ? 'frame' : 'targetPage'}.waitForNavigation());`);
                        break;
                    }
                    default:
                        throw new Error(`Event type ${event.type} is not supported`);
                }
            }
            out.endBlock().appendLine('}');
        }
        this.#appendStepType(out, step);
        if (step.assertedEvents) {
            out.appendLine('await Promise.all(promises);');
        }
        out.endBlock().appendLine('}');
    }
    #appendTarget(out, target) {
        if (target === 'main') {
            out.appendLine('const targetPage = page;');
        }
        else {
            out.appendLine(`const target = await browser.waitForTarget(t => t.url() === ${formatJSONAsJS(target, out.getIndent())}, { timeout });`);
            out.appendLine('const targetPage = await target.page();');
            out.appendLine('targetPage.setDefaultTimeout(timeout);');
        }
    }
    #appendFrame(out, path) {
        out.appendLine('let frame = targetPage.mainFrame();');
        for (const index of path) {
            out.appendLine(`frame = frame.childFrames()[${index}];`);
        }
    }
    #appendContext(out, step) {
        // TODO fix optional target: should it be main?
        this.#appendTarget(out, step.target || 'main');
        // TODO fix optional frame: should it be required?
        if (step.frame) {
            this.#appendFrame(out, step.frame);
        }
    }
    #appendLocators(out, step, action) {
        out.appendLine('await puppeteer.Locator.race([').startBlock();
        out.appendLine(step.selectors
            .map((s) => {
            return `${step.frame ? 'frame' : 'targetPage'}.locator(${formatJSONAsJS(selectorToPElementSelector(s), out.getIndent())})`;
        })
            .join(',\n'));
        out.endBlock().appendLine('])');
        out.startBlock().appendLine('.setTimeout(timeout)');
        if (step.assertedEvents?.length) {
            out.appendLine(`.on('action', () => startWaitingForEvents())`);
        }
        action();
        out.endBlock();
    }
    #appendClickStep(out, step) {
        this.#appendLocators(out, step, () => {
            out.appendLine('.click({');
            if (step.duration) {
                out.appendLine(`  delay: ${step.duration},`);
            }
            if (step.button) {
                out.appendLine(`  button: '${mouseButtonMap.get(step.button)}',`);
            }
            out.appendLine('  offset: {');
            out.appendLine(`    x: ${step.offsetX},`);
            out.appendLine(`    y: ${step.offsetY},`);
            out.appendLine('  },');
            out.appendLine('});');
        });
    }
    #appendDoubleClickStep(out, step) {
        this.#appendLocators(out, step, () => {
            out.appendLine('.click({');
            out.appendLine(`  count: 2,`);
            if (step.duration) {
                out.appendLine(`  delay: ${step.duration},`);
            }
            if (step.button) {
                out.appendLine(`  button: '${mouseButtonMap.get(step.button)}',`);
            }
            out.appendLine('  offset: {');
            out.appendLine(`    x: ${step.offsetX},`);
            out.appendLine(`    y: ${step.offsetY},`);
            out.appendLine('  },');
            out.appendLine('});');
        });
    }
    #appendHoverStep(out, step) {
        this.#appendLocators(out, step, () => {
            out.appendLine('.hover();');
        });
    }
    #appendChangeStep(out, step) {
        this.#appendLocators(out, step, () => {
            out.appendLine(`.fill(${formatJSONAsJS(step.value, out.getIndent())});`);
        });
    }
    #appendEmulateNetworkConditionsStep(out, step) {
        out.appendLine('await targetPage.emulateNetworkConditions({');
        out.appendLine(`  offline: ${!step.download && !step.upload},`);
        out.appendLine(`  downloadThroughput: ${step.download},`);
        out.appendLine(`  uploadThroughput: ${step.upload},`);
        out.appendLine(`  latency: ${step.latency},`);
        out.appendLine('});');
    }
    #appendKeyDownStep(out, step) {
        out.appendLine(`await targetPage.keyboard.down(${formatJSONAsJS(step.key, out.getIndent())});`);
    }
    #appendKeyUpStep(out, step) {
        out.appendLine(`await targetPage.keyboard.up(${formatJSONAsJS(step.key, out.getIndent())});`);
    }
    #appendCloseStep(out, step) {
        out.appendLine('await targetPage.close()');
    }
    #appendViewportStep(out, step) {
        out.appendLine(`await targetPage.setViewport(${formatJSONAsJS({
            width: step.width,
            height: step.height,
        }, out.getIndent())})`);
    }
    #appendScrollStep(out, step) {
        if ('selectors' in step) {
            this.#appendLocators(out, step, () => {
                out.appendLine(`.scroll({ scrollTop: ${step.y}, scrollLeft: ${step.x}});`);
            });
        }
        else {
            out.appendLine(`await targetPage.evaluate((x, y) => { window.scroll(x, y); }, ${step.x}, ${step.y})`);
        }
    }
    #appendStepType(out, step) {
        switch (step.type) {
            case StepType.Click:
                return this.#appendClickStep(out, step);
            case StepType.DoubleClick:
                return this.#appendDoubleClickStep(out, step);
            case StepType.Hover:
                return this.#appendHoverStep(out, step);
            case StepType.Change:
                return this.#appendChangeStep(out, step);
            case StepType.EmulateNetworkConditions:
                return this.#appendEmulateNetworkConditionsStep(out, step);
            case StepType.KeyDown:
                return this.#appendKeyDownStep(out, step);
            case StepType.KeyUp:
                return this.#appendKeyUpStep(out, step);
            case StepType.Close:
                return this.#appendCloseStep(out, step);
            case StepType.SetViewport:
                return this.#appendViewportStep(out, step);
            case StepType.Scroll:
                return this.#appendScrollStep(out, step);
            case StepType.Navigate:
                return this.#appendNavigationStep(out, step);
            case StepType.WaitForElement:
                return this.#appendWaitForElementStep(out, step);
            case StepType.WaitForExpression:
                return this.#appendWaitExpressionStep(out, step);
            case StepType.CustomStep:
                return; // TODO: implement these
            default:
                return assertAllStepTypesAreHandled(step);
        }
    }
    #appendNavigationStep(out, step) {
        if (step.assertedEvents?.length) {
            out.appendLine(`startWaitingForEvents();`);
        }
        out.appendLine(`await targetPage.goto(${formatJSONAsJS(step.url, out.getIndent())});`);
    }
    #appendWaitExpressionStep(out, step) {
        out.appendLine(`await ${step.frame ? 'frame' : 'targetPage'}.waitForFunction(${formatJSONAsJS(step.expression, out.getIndent())}, { timeout });`);
    }
    #appendWaitForElementStep(out, step) {
        this.#shouldAppendWaitForElementHelper = true;
        out.appendLine(`await waitForElement(${formatJSONAsJS(step, out.getIndent())}, ${step.frame ? 'frame' : 'targetPage'}, timeout);`);
    }
}
const defaultTimeout = 5000;
const waitForElementHelper = `async function waitForElement(step, frame, timeout) {
  const {
    count = 1,
    operator = '>=',
    visible = true,
    properties,
    attributes,
  } = step;
  const compFn = {
    '==': (a, b) => a === b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
  }[operator];
  await waitForFunction(async () => {
    const elements = await querySelectorsAll(step.selectors, frame);
    let result = compFn(elements.length, count);
    const elementsHandle = await frame.evaluateHandle((...elements) => {
      return elements;
    }, ...elements);
    await Promise.all(elements.map((element) => element.dispose()));
    if (result && (properties || attributes)) {
      result = await elementsHandle.evaluate(
        (elements, properties, attributes) => {
          for (const element of elements) {
            if (attributes) {
              for (const [name, value] of Object.entries(attributes)) {
                if (element.getAttribute(name) !== value) {
                  return false;
                }
              }
            }
            if (properties) {
              if (!isDeepMatch(properties, element)) {
                return false;
              }
            }
          }
          return true;

          function isDeepMatch(a, b) {
            if (a === b) {
              return true;
            }
            if ((a && !b) || (!a && b)) {
              return false;
            }
            if (!(a instanceof Object) || !(b instanceof Object)) {
              return false;
            }
            for (const [key, value] of Object.entries(a)) {
              if (!isDeepMatch(value, b[key])) {
                return false;
              }
            }
            return true;
          }
        },
        properties,
        attributes
      );
    }
    await elementsHandle.dispose();
    return result === visible;
  }, timeout);
}

async function querySelectorsAll(selectors, frame) {
  for (const selector of selectors) {
    const result = await querySelectorAll(selector, frame);
    if (result.length) {
      return result;
    }
  }
  return [];
}

async function querySelectorAll(selector, frame) {
  if (!Array.isArray(selector)) {
    selector = [selector];
  }
  if (!selector.length) {
    throw new Error('Empty selector provided to querySelectorAll');
  }
  let elements = [];
  for (let i = 0; i < selector.length; i++) {
    const part = selector[i];
    if (i === 0) {
      elements = await frame.$$(part);
    } else {
      const tmpElements = elements;
      elements = [];
      for (const el of tmpElements) {
        elements.push(...(await el.$$(part)));
      }
    }
    if (elements.length === 0) {
      return [];
    }
    if (i < selector.length - 1) {
      const tmpElements = [];
      for (const el of elements) {
        const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
        if (newEl) {
          tmpElements.push(newEl);
        }
      }
      elements = tmpElements;
    }
  }
  return elements;
}

async function waitForFunction(fn, timeout) {
  let isActive = true;
  const timeoutId = setTimeout(() => {
    isActive = false;
  }, timeout);
  while (isActive) {
    const result = await fn();
    if (result) {
      clearTimeout(timeoutId);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out');
}`;

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const charToIdx = alpha.split('').reduce((acc, char, idx) => {
    acc.set(char, idx);
    return acc;
}, new Map());
const LEAST_5_BIT_MASK = 0b011111;
const CONTINUATION_BIT_MASK = 0b100000;
const MAX_INT = 2147483647;
/**
 * Encoding variable length integer into base64 (6-bit):
 *
 * 1 N N N N N | 0 N N N N N
 *
 * The first bit indicates if there is more data for the int.
 */
function encodeInt(num) {
    if (num < 0) {
        throw new Error('Only postive integers and zero are supported');
    }
    if (num > MAX_INT) {
        throw new Error('Only integers between 0 and ' + MAX_INT + ' are supported');
    }
    const result = [];
    do {
        let payload = num & LEAST_5_BIT_MASK;
        num >>>= 5;
        if (num > 0)
            payload |= CONTINUATION_BIT_MASK;
        result.push(alpha[payload]);
    } while (num !== 0);
    return result.join('');
}
function encode(nums) {
    const parts = [];
    for (const num of nums) {
        parts.push(encodeInt(num));
    }
    return parts.join('');
}
function decode(str) {
    const results = [];
    const chrs = str.split('');
    let result = 0;
    let shift = 0;
    for (const ch of chrs) {
        const num = charToIdx.get(ch);
        result |= (num & LEAST_5_BIT_MASK) << shift;
        shift += 5;
        const hasMore = num & CONTINUATION_BIT_MASK;
        if (!hasMore) {
            results.push(result);
            result = 0;
            shift = 0;
        }
    }
    return results;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
const SOURCE_MAP_PREFIX = '//# recorderSourceMap=';
/**
 * Stringifes an entire recording. The following hooks are invoked with the `flow` parameter containing the entire flow:
 * - `beforeAllSteps` (once)
 * - `beforeEachStep` (per step)
 * - `stringifyStep` (per step)
 * - `afterEachStep` (per step)
 * - `afterAllSteps` (once)
 */
async function stringify(flow, opts) {
    if (!opts) {
        opts = {};
    }
    const ext = opts.extension ?? new PuppeteerStringifyExtension();
    const out = opts.writer ?? new InMemoryLineWriter(opts.indentation ?? '  ');
    await ext.beforeAllSteps?.(out, flow);
    const sourceMap = [1]; // The first int indicates the version.
    for (const step of flow.steps) {
        const firstLine = out.getSize();
        await ext.beforeEachStep?.(out, step, flow);
        await ext.stringifyStep(out, step, flow);
        await ext.afterEachStep?.(out, step, flow);
        const lastLine = out.getSize();
        sourceMap.push(...[firstLine, lastLine - firstLine]);
    }
    await ext.afterAllSteps?.(out, flow);
    out.appendLine(SOURCE_MAP_PREFIX + encode(sourceMap));
    return out.toString();
}
/**
 * Stringifes a single step. Only the following hooks are invoked with the `flow` parameter as undefined:
 * - `beforeEachStep`
 * - `stringifyStep`
 * - `afterEachStep`
 */
async function stringifyStep(step, opts) {
    if (!opts) {
        opts = {};
    }
    let ext = opts.extension;
    if (!ext) {
        ext = new PuppeteerStringifyExtension();
    }
    if (!opts.indentation) {
        opts.indentation = '  ';
    }
    const out = opts.writer ?? new InMemoryLineWriter(opts.indentation ?? '  ');
    await ext.beforeEachStep?.(out, step);
    await ext.stringifyStep(out, step);
    await ext.afterEachStep?.(out, step);
    return out.toString();
}
function isSourceMapLine(line) {
    return line.trim().startsWith(SOURCE_MAP_PREFIX);
}
/**
 * Extracts a source map from a text.
 */
function parseSourceMap(text) {
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (isSourceMapLine(line)) {
            return decode(line.trim().substring(SOURCE_MAP_PREFIX.length));
        }
    }
    return;
}
function stripSourceMap(text) {
    const lines = text.split('\n');
    return lines.filter((line) => !isSourceMapLine(line)).join('\n');
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class RunnerExtension {
    async beforeAllSteps(flow) { }
    async afterAllSteps(flow) { }
    async beforeEachStep(step, flow) { }
    async runStep(step, flow) { }
    async afterEachStep(step, flow) { }
}

const comparators = {
    '==': (a, b) => a === b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
};
function waitForTimeout(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
class PuppeteerRunnerExtension extends RunnerExtension {
    browser;
    page;
    timeout;
    constructor(browser, page, opts) {
        super();
        this.browser = browser;
        this.page = page;
        this.timeout = opts?.timeout || 5000;
    }
    async #ensureAutomationEmulatation(pageOrFrame) {
        try {
            await pageOrFrame
                ._client()
                .send('Emulation.setAutomationOverride', { enabled: true });
        }
        catch {
            // ignore errors as not all versions support this command.
        }
    }
    #getTimeoutForStep(step, flow) {
        return step.timeout || flow?.timeout || this.timeout;
    }
    async runStep(step, flow) {
        const timeout = this.#getTimeoutForStep(step, flow);
        const page = this.page;
        const browser = this.browser;
        const targetPage = await getTargetPageForStep(browser, page, step, timeout);
        let targetFrame = null;
        if (!targetPage && step.target) {
            const frames = page.frames();
            for (const f of frames) {
                if (f.isOOPFrame() && f.url() === step.target) {
                    targetFrame = f;
                    break;
                }
            }
            if (!targetFrame) {
                targetFrame = await page.waitForFrame(step.target, { timeout });
            }
        }
        const targetPageOrFrame = targetFrame || targetPage;
        if (!targetPageOrFrame) {
            throw new Error('Target is not found for step: ' + JSON.stringify(step));
        }
        await this.#ensureAutomationEmulatation(targetPageOrFrame);
        const localFrame = await getFrame(targetPageOrFrame, step);
        await this.runStepInFrame(step, page, targetPageOrFrame, localFrame, timeout);
    }
    /**
     * @internal
     */
    async runStepInFrame(step, mainPage, targetPageOrFrame, localFrame, timeout) {
        let assertedEventsPromise = null;
        const startWaitingForEvents = () => {
            assertedEventsPromise = waitForEvents(localFrame, step, timeout);
        };
        const locatorRace = this.page.locatorRace;
        switch (step.type) {
            case StepType.DoubleClick:
                await locatorRace(step.selectors.map((selector) => {
                    return localFrame.locator(selectorToPElementSelector(selector));
                }))
                    .setTimeout(timeout)
                    .on('action', () => startWaitingForEvents())
                    .click({
                    count: 2,
                    button: step.button && mouseButtonMap.get(step.button),
                    delay: step.duration,
                    offset: {
                        x: step.offsetX,
                        y: step.offsetY,
                    },
                });
                break;
            case StepType.Click:
                await locatorRace(step.selectors.map((selector) => {
                    return localFrame.locator(selectorToPElementSelector(selector));
                }))
                    .setTimeout(timeout)
                    .on('action', () => startWaitingForEvents())
                    .click({
                    delay: step.duration,
                    button: step.button && mouseButtonMap.get(step.button),
                    offset: {
                        x: step.offsetX,
                        y: step.offsetY,
                    },
                });
                break;
            case StepType.Hover:
                await locatorRace(step.selectors.map((selector) => {
                    return localFrame.locator(selectorToPElementSelector(selector));
                }))
                    .setTimeout(timeout)
                    .on('action', () => startWaitingForEvents())
                    .hover();
                break;
            case StepType.EmulateNetworkConditions:
                {
                    startWaitingForEvents();
                    await mainPage.emulateNetworkConditions(step);
                }
                break;
            case StepType.KeyDown:
                {
                    startWaitingForEvents();
                    await mainPage.keyboard.down(step.key);
                    await waitForTimeout(100);
                }
                break;
            case StepType.KeyUp:
                {
                    startWaitingForEvents();
                    await mainPage.keyboard.up(step.key);
                    await waitForTimeout(100);
                }
                break;
            case StepType.Close:
                {
                    if ('close' in targetPageOrFrame) {
                        startWaitingForEvents();
                        await targetPageOrFrame.close();
                    }
                }
                break;
            case StepType.Change:
                await locatorRace(step.selectors.map((selector) => {
                    return localFrame.locator(selectorToPElementSelector(selector));
                }))
                    .on('action', () => startWaitingForEvents())
                    .setTimeout(timeout)
                    .fill(step.value);
                break;
            case StepType.SetViewport: {
                if ('setViewport' in targetPageOrFrame) {
                    startWaitingForEvents();
                    await targetPageOrFrame.setViewport(step);
                }
                break;
            }
            case StepType.Scroll: {
                if ('selectors' in step) {
                    await locatorRace(step.selectors.map((selector) => {
                        return localFrame.locator(selectorToPElementSelector(selector));
                    }))
                        .on('action', () => startWaitingForEvents())
                        .setTimeout(timeout)
                        .scroll({
                        scrollLeft: step.x || 0,
                        scrollTop: step.y || 0,
                    });
                }
                else {
                    startWaitingForEvents();
                    await localFrame.evaluate((x, y) => {
                        /* c8 ignore start */
                        window.scroll(x, y);
                        /* c8 ignore stop */
                    }, step.x || 0, step.y || 0);
                }
                break;
            }
            case StepType.Navigate: {
                startWaitingForEvents();
                await localFrame.goto(step.url);
                break;
            }
            case StepType.WaitForElement: {
                try {
                    startWaitingForEvents();
                    await waitForElement(step, localFrame, timeout);
                }
                catch (err) {
                    if (err.message === 'Timed out') {
                        throw new Error('waitForElement timed out. The element(s) could not be found.');
                    }
                    else {
                        throw err;
                    }
                }
                break;
            }
            case StepType.WaitForExpression: {
                startWaitingForEvents();
                await localFrame.waitForFunction(step.expression, {
                    timeout,
                });
                break;
            }
            case StepType.CustomStep: {
                // TODO implement these steps
                break;
            }
            default:
                assertAllStepTypesAreHandled(step);
        }
        await assertedEventsPromise;
    }
}
class PuppeteerRunnerOwningBrowserExtension extends PuppeteerRunnerExtension {
    async afterAllSteps() {
        await this.browser.close();
    }
}
async function getFrame(pageOrFrame, step) {
    let frame = 'mainFrame' in pageOrFrame ? pageOrFrame.mainFrame() : pageOrFrame;
    if ('frame' in step && step.frame) {
        for (const index of step.frame) {
            frame = frame.childFrames()[index];
        }
    }
    return frame;
}
async function getTargetPageForStep(browser, page, step, timeout) {
    if (!step.target || step.target === 'main') {
        return page;
    }
    const target = await browser.waitForTarget((t) => t.url() === step.target, {
        timeout,
    });
    const targetPage = await target.page();
    if (!targetPage) {
        return null;
    }
    targetPage.setDefaultTimeout(timeout);
    return targetPage;
}
async function waitForEvents(pageOrFrame, step, timeout) {
    const promises = [];
    if (step.assertedEvents) {
        for (const event of step.assertedEvents) {
            switch (event.type) {
                case AssertedEventType.Navigation: {
                    promises.push(pageOrFrame.waitForNavigation({
                        timeout,
                    }));
                    continue;
                }
                default:
                    throw new Error(`Event type ${event.type} is not supported`);
            }
        }
    }
    await Promise.all(promises);
}
async function waitForElement(step, frame, timeout) {
    const { count = 1, operator = '>=', visible = true, properties, attributes, } = step;
    const compFn = comparators[operator];
    await waitForFunction(async () => {
        const elements = await querySelectorsAll(step.selectors, frame);
        let result = compFn(elements.length, count);
        const elementsHandle = await frame.evaluateHandle((...elements) => {
            return elements;
        }, ...elements);
        await Promise.all(elements.map((element) => element.dispose()));
        if (result && (properties || attributes)) {
            result = await elementsHandle.evaluate((elements, properties, attributes) => {
                if (attributes) {
                    for (const element of elements) {
                        for (const [name, value] of Object.entries(attributes)) {
                            if (element.getAttribute(name) !== value) {
                                return false;
                            }
                        }
                    }
                }
                if (properties) {
                    for (const element of elements) {
                        if (!isDeepMatch(properties, element)) {
                            return false;
                        }
                    }
                }
                return true;
                function isDeepMatch(a, b) {
                    if (a === b) {
                        return true;
                    }
                    if ((a && !b) || (!a && b)) {
                        return false;
                    }
                    if (!(a instanceof Object) || !(b instanceof Object)) {
                        return false;
                    }
                    for (const [key, value] of Object.entries(a)) {
                        if (!isDeepMatch(value, b[key])) {
                            return false;
                        }
                    }
                    return true;
                }
            }, properties, attributes);
        }
        await elementsHandle.dispose();
        return result === visible;
    }, timeout);
}
async function querySelectorsAll(selectors, frame) {
    for (const selector of selectors) {
        const result = await querySelectorAll(selector, frame);
        if (result.length) {
            return result;
        }
    }
    return [];
}
async function querySelectorAll(selector, frame) {
    if (!Array.isArray(selector)) {
        selector = [selector];
    }
    if (!selector.length) {
        throw new Error('Empty selector provided to querySelectorAll');
    }
    let elementHandles = await frame.$$(selector[0]);
    if (!elementHandles.length) {
        return [];
    }
    for (const part of selector.slice(1, selector.length)) {
        elementHandles = (await Promise.all(elementHandles.map(async (handle) => {
            const innerHandle = await handle.evaluateHandle((el) => el.shadowRoot ? el.shadowRoot : el);
            const elementHandles = await innerHandle.$$(part);
            innerHandle.dispose();
            handle.dispose();
            return elementHandles;
        }))).flat();
        if (!elementHandles.length) {
            return [];
        }
    }
    return elementHandles;
}
async function waitForFunction(fn, timeout) {
    let isActive = true;
    const timeoutId = setTimeout(() => {
        isActive = false;
    }, timeout);
    while (isActive) {
        const result = await fn();
        if (result) {
            clearTimeout(timeoutId);
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timed out');
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
async function _runStepWithHooks(extension, step, flow) {
    await extension.beforeEachStep?.(step, flow);
    await extension.runStep(step, flow);
    await extension.afterEachStep?.(step, flow);
}
class Runner {
    #flow;
    #extension;
    #aborted = false;
    /**
     * @internal
     */
    constructor(extension) {
        this.#extension = extension;
    }
    abort() {
        this.#aborted = true;
    }
    set flow(flow) {
        this.#flow = flow;
    }
    async runBeforeAllSteps(flow) {
        await this.#extension.beforeAllSteps?.(flow);
    }
    async runAfterAllSteps(flow) {
        await this.#extension.afterAllSteps?.(flow);
    }
    /**
     * Runs the provided `step` with `beforeEachStep` and `afterEachStep` hooks.
     * Parameters from the `flow` apply if the `flow` is set.
     */
    async runStep(step) {
        await _runStepWithHooks(this.#extension, step);
    }
    /**
     * Run all the steps in the flow
     * @returns whether all the steps are run or the execution is aborted
     */
    async run() {
        if (!this.#flow) {
            throw new Error('Set the flow on the runner instance before calling `run`.');
        }
        const flow = this.#flow;
        this.#aborted = false;
        await this.#extension.beforeAllSteps?.(flow);
        if (this.#aborted) {
            return false;
        }
        for (const step of flow.steps) {
            if (this.#aborted) {
                await this.#extension.afterAllSteps?.(flow);
                return false;
            }
            await _runStepWithHooks(this.#extension, step, flow);
        }
        await this.#extension.afterAllSteps?.(flow);
        return true;
    }
}
async function createRunner(flowOrExtension, maybeExtension) {
    const extension = flowOrExtension instanceof RunnerExtension
        ? flowOrExtension
        : maybeExtension;
    const flow = !(flowOrExtension instanceof RunnerExtension)
        ? flowOrExtension
        : undefined;
    const runner = new Runner(extension ?? (await createPuppeteerRunnerOwningBrowserExtension()));
    if (flow) {
        runner.flow = flow;
    }
    return runner;
}
async function createPuppeteerRunnerOwningBrowserExtension() {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    return new PuppeteerRunnerOwningBrowserExtension(browser, page);
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
/**
 * Stringifies a user flow to a script that uses \@puppeteer/replay's own API.
 */
class PuppeteerReplayStringifyExtension extends StringifyExtension {
    async beforeAllSteps(out) {
        out.appendLine("import url from 'url';");
        out.appendLine("import { createRunner } from '@puppeteer/replay';");
        out.appendLine('');
        out.appendLine('export async function run(extension) {').startBlock();
        out.appendLine('const runner = await createRunner(extension);');
        out.appendLine('');
        out.appendLine('await runner.runBeforeAllSteps();');
        out.appendLine('');
    }
    async afterAllSteps(out) {
        out.appendLine('');
        out
            .appendLine('await runner.runAfterAllSteps();')
            .endBlock()
            .appendLine('}');
        out.appendLine('');
        out
            .appendLine('if (process && import.meta.url === url.pathToFileURL(process.argv[1]).href) {')
            .startBlock()
            .appendLine('run()')
            .endBlock()
            .appendLine('}');
    }
    async stringifyStep(out, step) {
        out.appendLine(`await runner.runStep(${formatJSONAsJS(step, out.getIndent())});`);
    }
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
function isNavigationStep(step) {
    return Boolean(step.type === StepType.Navigate ||
        step.assertedEvents?.some((event) => event.type === AssertedEventType.Navigation));
}
function isMobileFlow(flow) {
    for (const step of flow.steps) {
        if (step.type === StepType.SetViewport) {
            return step.isMobile;
        }
    }
    return false;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class LighthouseStringifyExtension extends PuppeteerStringifyExtension {
    #isProcessingTimespan = false;
    async beforeAllSteps(out, flow) {
        out.appendLine(`const fs = require('fs');`);
        await super.beforeAllSteps(out, flow);
        out.appendLine(`const lhApi = await import('lighthouse'); // v10.0.0 or later`);
        const flags = {
            screenEmulation: {
                disabled: true,
            },
        };
        out.appendLine(`const flags = ${formatJSONAsJS(flags, out.getIndent())}`);
        if (isMobileFlow(flow)) {
            out.appendLine(`const config = undefined;`);
        }
        else {
            out.appendLine('const config = lhApi.desktopConfig;');
        }
        out.appendLine(`const lhFlow = await lhApi.startFlow(page, {name: ${formatJSONAsJS(flow.title, out.getIndent())}, config, flags});`);
    }
    async stringifyStep(out, step, flow) {
        if (step.type === StepType.SetViewport) {
            await super.stringifyStep(out, step, flow);
            return;
        }
        const isNavigation = isNavigationStep(step);
        if (isNavigation) {
            if (this.#isProcessingTimespan) {
                out.appendLine(`await lhFlow.endTimespan();`);
                this.#isProcessingTimespan = false;
            }
            out.appendLine(`await lhFlow.startNavigation();`);
        }
        else if (!this.#isProcessingTimespan) {
            out.appendLine(`await lhFlow.startTimespan();`);
            this.#isProcessingTimespan = true;
        }
        await super.stringifyStep(out, step, flow);
        if (isNavigation) {
            out.appendLine(`await lhFlow.endNavigation();`);
        }
    }
    async afterAllSteps(out, flow) {
        if (this.#isProcessingTimespan) {
            out.appendLine(`await lhFlow.endTimespan();`);
        }
        out.appendLine(`const lhFlowReport = await lhFlow.generateReport();`);
        out.appendLine(`fs.writeFileSync(__dirname + '/flow.report.html', lhFlowReport)`);
        await super.afterAllSteps(out, flow);
    }
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
class LighthouseRunnerExtension extends PuppeteerRunnerExtension {
    #isTimespanRunning = false;
    #isNavigationRunning = false;
    #lhFlow;
    async createFlowResult() {
        if (!this.#lhFlow) {
            throw new Error('Cannot get flow result before running the flow');
        }
        return this.#lhFlow.createFlowResult();
    }
    async beforeAllSteps(flow) {
        await super.beforeAllSteps?.(flow);
        const { startFlow, desktopConfig } = await import('lighthouse');
        let config = undefined;
        if (!isMobileFlow(flow)) {
            config = desktopConfig;
        }
        this.#lhFlow = await startFlow(this.page, {
            config,
            flags: { screenEmulation: { disabled: true } },
            name: flow.title,
        });
    }
    async beforeEachStep(step, flow) {
        await super.beforeEachStep?.(step, flow);
        if (step.type === StepType.SetViewport)
            return;
        if (isNavigationStep(step)) {
            if (this.#isTimespanRunning) {
                await this.#lhFlow.endTimespan();
                this.#isTimespanRunning = false;
            }
            await this.#lhFlow.startNavigation();
            this.#isNavigationRunning = true;
        }
        else if (!this.#isTimespanRunning) {
            await this.#lhFlow.startTimespan();
            this.#isTimespanRunning = true;
        }
    }
    async afterEachStep(step, flow) {
        if (this.#isNavigationRunning) {
            await this.#lhFlow.endNavigation();
            this.#isNavigationRunning = false;
        }
        await super.afterEachStep?.(step, flow);
    }
    async afterAllSteps(flow) {
        if (this.#isTimespanRunning) {
            await this.#lhFlow.endTimespan();
        }
        await super.afterAllSteps?.(flow);
    }
}

export { AssertedEventType, JSONStringifyExtension, LighthouseRunnerExtension, LighthouseStringifyExtension, PuppeteerReplayStringifyExtension, PuppeteerRunnerExtension, PuppeteerRunnerOwningBrowserExtension, PuppeteerStringifyExtension, Runner, RunnerExtension, Schema, SelectorType, StepType, StringifyExtension, assertAllStepTypesAreHandled, createRunner, formatAsJSLiteral, formatJSONAsJS, getSelectorType, maxTimeout, minTimeout, mouseButtonMap, parse, parseSourceMap, parseStep, pointerDeviceTypes, selectorToPElementSelector, stringify, stringifyStep, stripSourceMap, typeableInputTypes, validTimeout };
//# sourceMappingURL=main.js.map
