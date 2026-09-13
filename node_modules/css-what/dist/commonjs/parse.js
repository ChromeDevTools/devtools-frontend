"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTraversal = isTraversal;
exports.parse = parse;
const types_js_1 = require("./types.js");
const reName = /^[^#\\]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\u00B0-\uFFFF-])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
var CharCode;
(function (CharCode) {
    CharCode[CharCode["LeftParenthesis"] = 40] = "LeftParenthesis";
    CharCode[CharCode["RightParenthesis"] = 41] = "RightParenthesis";
    CharCode[CharCode["LeftSquareBracket"] = 91] = "LeftSquareBracket";
    CharCode[CharCode["RightSquareBracket"] = 93] = "RightSquareBracket";
    CharCode[CharCode["Comma"] = 44] = "Comma";
    CharCode[CharCode["Period"] = 46] = "Period";
    CharCode[CharCode["Colon"] = 58] = "Colon";
    CharCode[CharCode["SingleQuote"] = 39] = "SingleQuote";
    CharCode[CharCode["DoubleQuote"] = 34] = "DoubleQuote";
    CharCode[CharCode["Plus"] = 43] = "Plus";
    CharCode[CharCode["Tilde"] = 126] = "Tilde";
    CharCode[CharCode["QuestionMark"] = 63] = "QuestionMark";
    CharCode[CharCode["ExclamationMark"] = 33] = "ExclamationMark";
    CharCode[CharCode["Slash"] = 47] = "Slash";
    CharCode[CharCode["Equal"] = 61] = "Equal";
    CharCode[CharCode["Dollar"] = 36] = "Dollar";
    CharCode[CharCode["Pipe"] = 124] = "Pipe";
    CharCode[CharCode["Circumflex"] = 94] = "Circumflex";
    CharCode[CharCode["Asterisk"] = 42] = "Asterisk";
    CharCode[CharCode["GreaterThan"] = 62] = "GreaterThan";
    CharCode[CharCode["LessThan"] = 60] = "LessThan";
    CharCode[CharCode["Hash"] = 35] = "Hash";
    CharCode[CharCode["LowerI"] = 105] = "LowerI";
    CharCode[CharCode["LowerS"] = 115] = "LowerS";
    CharCode[CharCode["BackSlash"] = 92] = "BackSlash";
    // Whitespace
    CharCode[CharCode["Space"] = 32] = "Space";
    CharCode[CharCode["Tab"] = 9] = "Tab";
    CharCode[CharCode["NewLine"] = 10] = "NewLine";
    CharCode[CharCode["FormFeed"] = 12] = "FormFeed";
    CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
})(CharCode || (CharCode = {}));
const actionTypes = new Map([
    [CharCode.Tilde, types_js_1.AttributeAction.Element],
    [CharCode.Circumflex, types_js_1.AttributeAction.Start],
    [CharCode.Dollar, types_js_1.AttributeAction.End],
    [CharCode.Asterisk, types_js_1.AttributeAction.Any],
    [CharCode.ExclamationMark, types_js_1.AttributeAction.Not],
    [CharCode.Pipe, types_js_1.AttributeAction.Hyphen],
]);
// Pseudos, whose data property is parsed as well.
const unpackPseudos = new Set([
    "has",
    "not",
    "matches",
    "is",
    "where",
    "host",
    "host-context",
]);
/**
 * Pseudo elements defined in CSS Level 1 and CSS Level 2 can be written with
 * a single colon; eg. :before will turn into ::before.
 *
 * @see {@link https://www.w3.org/TR/2018/WD-selectors-4-20181121/#pseudo-element-syntax}
 */
const pseudosToPseudoElements = new Set([
    "before",
    "after",
    "first-line",
    "first-letter",
]);
/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 *
 * @param selector Selector to check.
 */
function isTraversal(selector) {
    switch (selector.type) {
        case types_js_1.SelectorType.Adjacent:
        case types_js_1.SelectorType.Child:
        case types_js_1.SelectorType.Descendant:
        case types_js_1.SelectorType.Parent:
        case types_js_1.SelectorType.Sibling:
        case types_js_1.SelectorType.ColumnCombinator: {
            return true;
        }
        default: {
            return false;
        }
    }
}
const stripQuotesFromPseudos = new Set(["contains", "icontains"]);
// Unescape function taken from https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L152
function funescape(_, escaped, escapedWhitespace) {
    const high = Number.parseInt(escaped, 16) - 65536;
    // NaN means non-codepoint
    return high !== high || escapedWhitespace
        ? escaped
        : high < 0
            ? // BMP codepoint
                String.fromCharCode(high + 65536)
            : // Supplemental Plane codepoint (surrogate pair)
                String.fromCharCode((high >> 10) | 55296, (high & 1023) | 56320);
}
function unescapeCSS(cssString) {
    return cssString.replace(reEscape, funescape);
}
function isQuote(c) {
    return c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
}
function isWhitespace(c) {
    return (c === CharCode.Space ||
        c === CharCode.Tab ||
        c === CharCode.NewLine ||
        c === CharCode.FormFeed ||
        c === CharCode.CarriageReturn);
}
/**
 * Parses `selector`.
 *
 * @param selector Selector to parse.
 * @returns Returns a two-dimensional array.
 * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
 * the second contains the relevant tokens for that selector.
 */
function parse(selector) {
    const subselects = [];
    const endIndex = parseSelector(subselects, `${selector}`, 0);
    if (endIndex < selector.length) {
        throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
    }
    return subselects;
}
function parseSelector(subselects, selector, selectorIndex) {
    let tokens = [];
    function getName(offset) {
        const match = selector.slice(selectorIndex + offset).match(reName);
        if (!match) {
            throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
        }
        const [name] = match;
        selectorIndex += offset + name.length;
        return unescapeCSS(name);
    }
    function stripWhitespace(offset) {
        selectorIndex += offset;
        while (selectorIndex < selector.length &&
            isWhitespace(selector.charCodeAt(selectorIndex))) {
            selectorIndex++;
        }
    }
    function readValueWithParenthesis() {
        selectorIndex += 1;
        const start = selectorIndex;
        for (let counter = 1; selectorIndex < selector.length; selectorIndex++) {
            switch (selector.charCodeAt(selectorIndex)) {
                case CharCode.BackSlash: {
                    // Skip next character
                    selectorIndex += 1;
                    break;
                }
                case CharCode.LeftParenthesis: {
                    counter += 1;
                    break;
                }
                case CharCode.RightParenthesis: {
                    counter -= 1;
                    if (counter === 0) {
                        return unescapeCSS(selector.slice(start, selectorIndex++));
                    }
                    break;
                }
            }
        }
        throw new Error("Parenthesis not matched");
    }
    function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
            throw new Error("Did not expect successive traversals.");
        }
    }
    function addTraversal(type) {
        if (tokens.length > 0 &&
            tokens[tokens.length - 1].type === types_js_1.SelectorType.Descendant) {
            tokens[tokens.length - 1].type = type;
            return;
        }
        ensureNotTraversal();
        tokens.push({ type });
    }
    function addSpecialAttribute(name, action) {
        tokens.push({
            type: types_js_1.SelectorType.Attribute,
            name,
            action,
            value: getName(1),
            namespace: null,
            ignoreCase: "quirks",
        });
    }
    /**
     * We have finished parsing the current part of the selector.
     *
     * Remove descendant tokens at the end if they exist,
     * and return the last index, so that parsing can be
     * picked up from here.
     */
    function finalizeSubselector() {
        if (tokens.length > 0 &&
            tokens[tokens.length - 1].type === types_js_1.SelectorType.Descendant) {
            tokens.pop();
        }
        if (tokens.length === 0) {
            throw new Error("Empty sub-selector");
        }
        subselects.push(tokens);
    }
    stripWhitespace(0);
    if (selector.length === selectorIndex) {
        return selectorIndex;
    }
    loop: while (selectorIndex < selector.length) {
        const firstChar = selector.charCodeAt(selectorIndex);
        switch (firstChar) {
            // Whitespace
            case CharCode.Space:
            case CharCode.Tab:
            case CharCode.NewLine:
            case CharCode.FormFeed:
            case CharCode.CarriageReturn: {
                if (tokens.length === 0 ||
                    tokens[0].type !== types_js_1.SelectorType.Descendant) {
                    ensureNotTraversal();
                    tokens.push({ type: types_js_1.SelectorType.Descendant });
                }
                stripWhitespace(1);
                break;
            }
            // Traversals
            case CharCode.GreaterThan: {
                addTraversal(types_js_1.SelectorType.Child);
                stripWhitespace(1);
                break;
            }
            case CharCode.LessThan: {
                addTraversal(types_js_1.SelectorType.Parent);
                stripWhitespace(1);
                break;
            }
            case CharCode.Tilde: {
                addTraversal(types_js_1.SelectorType.Sibling);
                stripWhitespace(1);
                break;
            }
            case CharCode.Plus: {
                addTraversal(types_js_1.SelectorType.Adjacent);
                stripWhitespace(1);
                break;
            }
            // Special attribute selectors: .class, #id
            case CharCode.Period: {
                addSpecialAttribute("class", types_js_1.AttributeAction.Element);
                break;
            }
            case CharCode.Hash: {
                addSpecialAttribute("id", types_js_1.AttributeAction.Equals);
                break;
            }
            case CharCode.LeftSquareBracket: {
                stripWhitespace(1);
                // Determine attribute name and namespace
                let name;
                let namespace = null;
                if (selector.charCodeAt(selectorIndex) === CharCode.Pipe) {
                    // Equivalent to no namespace
                    name = getName(1);
                }
                else if (selector.startsWith("*|", selectorIndex)) {
                    namespace = "*";
                    name = getName(2);
                }
                else {
                    name = getName(0);
                    if (selector.charCodeAt(selectorIndex) === CharCode.Pipe &&
                        selector.charCodeAt(selectorIndex + 1) !==
                            CharCode.Equal) {
                        namespace = name;
                        name = getName(1);
                    }
                }
                stripWhitespace(0);
                // Determine comparison operation
                let action = types_js_1.AttributeAction.Exists;
                const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
                if (possibleAction) {
                    action = possibleAction;
                    if (selector.charCodeAt(selectorIndex + 1) !==
                        CharCode.Equal) {
                        throw new Error("Expected `=`");
                    }
                    stripWhitespace(2);
                }
                else if (selector.charCodeAt(selectorIndex) === CharCode.Equal) {
                    action = types_js_1.AttributeAction.Equals;
                    stripWhitespace(1);
                }
                // Determine value
                let value = "";
                let ignoreCase = null;
                if (action !== "exists") {
                    if (isQuote(selector.charCodeAt(selectorIndex))) {
                        const quote = selector.charCodeAt(selectorIndex);
                        selectorIndex += 1;
                        const sectionStart = selectorIndex;
                        while (selectorIndex < selector.length &&
                            selector.charCodeAt(selectorIndex) !== quote) {
                            selectorIndex +=
                                // Skip next character if it is escaped
                                selector.charCodeAt(selectorIndex) ===
                                    CharCode.BackSlash
                                    ? 2
                                    : 1;
                        }
                        if (selector.charCodeAt(selectorIndex) !== quote) {
                            throw new Error("Attribute value didn't end");
                        }
                        value = unescapeCSS(selector.slice(sectionStart, selectorIndex));
                        selectorIndex += 1;
                    }
                    else {
                        const valueStart = selectorIndex;
                        while (selectorIndex < selector.length &&
                            !isWhitespace(selector.charCodeAt(selectorIndex)) &&
                            selector.charCodeAt(selectorIndex) !==
                                CharCode.RightSquareBracket) {
                            selectorIndex +=
                                // Skip next character if it is escaped
                                selector.charCodeAt(selectorIndex) ===
                                    CharCode.BackSlash
                                    ? 2
                                    : 1;
                        }
                        value = unescapeCSS(selector.slice(valueStart, selectorIndex));
                    }
                    stripWhitespace(0);
                    // See if we have a force ignore flag
                    switch (selector.charCodeAt(selectorIndex) | 0x20) {
                        // If the forceIgnore flag is set (either `i` or `s`), use that value
                        case CharCode.LowerI: {
                            ignoreCase = true;
                            stripWhitespace(1);
                            break;
                        }
                        case CharCode.LowerS: {
                            ignoreCase = false;
                            stripWhitespace(1);
                            break;
                        }
                    }
                }
                if (selector.charCodeAt(selectorIndex) !==
                    CharCode.RightSquareBracket) {
                    throw new Error("Attribute selector didn't terminate");
                }
                selectorIndex += 1;
                const attributeSelector = {
                    type: types_js_1.SelectorType.Attribute,
                    name,
                    action,
                    value,
                    namespace,
                    ignoreCase,
                };
                tokens.push(attributeSelector);
                break;
            }
            case CharCode.Colon: {
                if (selector.charCodeAt(selectorIndex + 1) === CharCode.Colon) {
                    tokens.push({
                        type: types_js_1.SelectorType.PseudoElement,
                        name: getName(2).toLowerCase(),
                        data: selector.charCodeAt(selectorIndex) ===
                            CharCode.LeftParenthesis
                            ? readValueWithParenthesis()
                            : null,
                    });
                    break;
                }
                const name = getName(1).toLowerCase();
                if (pseudosToPseudoElements.has(name)) {
                    tokens.push({
                        type: types_js_1.SelectorType.PseudoElement,
                        name,
                        data: null,
                    });
                    break;
                }
                let data = null;
                if (selector.charCodeAt(selectorIndex) ===
                    CharCode.LeftParenthesis) {
                    if (unpackPseudos.has(name)) {
                        if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                            throw new Error(`Pseudo-selector ${name} cannot be quoted`);
                        }
                        data = [];
                        selectorIndex = parseSelector(data, selector, selectorIndex + 1);
                        if (selector.charCodeAt(selectorIndex) !==
                            CharCode.RightParenthesis) {
                            throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
                        }
                        selectorIndex += 1;
                    }
                    else {
                        data = readValueWithParenthesis();
                        if (stripQuotesFromPseudos.has(name)) {
                            const quot = data.charCodeAt(0);
                            if (quot === data.charCodeAt(data.length - 1) &&
                                isQuote(quot)) {
                                data = data.slice(1, -1);
                            }
                        }
                        data = unescapeCSS(data);
                    }
                }
                tokens.push({ type: types_js_1.SelectorType.Pseudo, name, data });
                break;
            }
            case CharCode.Comma: {
                finalizeSubselector();
                tokens = [];
                stripWhitespace(1);
                break;
            }
            default: {
                if (selector.startsWith("/*", selectorIndex)) {
                    const endIndex = selector.indexOf("*/", selectorIndex + 2);
                    if (endIndex < 0) {
                        throw new Error("Comment was not terminated");
                    }
                    selectorIndex = endIndex + 2;
                    // Remove leading whitespace
                    if (tokens.length === 0) {
                        stripWhitespace(0);
                    }
                    break;
                }
                let namespace = null;
                let name;
                if (firstChar === CharCode.Asterisk) {
                    selectorIndex += 1;
                    name = "*";
                }
                else if (firstChar === CharCode.Pipe) {
                    name = "";
                    if (selector.charCodeAt(selectorIndex + 1) === CharCode.Pipe) {
                        addTraversal(types_js_1.SelectorType.ColumnCombinator);
                        stripWhitespace(2);
                        break;
                    }
                }
                else if (reName.test(selector.slice(selectorIndex))) {
                    name = getName(0);
                }
                else {
                    break loop;
                }
                if (selector.charCodeAt(selectorIndex) === CharCode.Pipe &&
                    selector.charCodeAt(selectorIndex + 1) !== CharCode.Pipe) {
                    namespace = name;
                    if (selector.charCodeAt(selectorIndex + 1) ===
                        CharCode.Asterisk) {
                        name = "*";
                        selectorIndex += 2;
                    }
                    else {
                        name = getName(1);
                    }
                }
                tokens.push(name === "*"
                    ? { type: types_js_1.SelectorType.Universal, namespace }
                    : { type: types_js_1.SelectorType.Tag, name, namespace });
            }
        }
    }
    finalizeSubselector();
    return selectorIndex;
}
