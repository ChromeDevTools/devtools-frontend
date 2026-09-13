"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = stringify;
const types_js_1 = require("./types.js");
const attribValueChars = ["\\", '"'];
const pseudoValueChars = [...attribValueChars, "(", ")"];
const charsToEscapeInAttributeValue = new Set(attribValueChars.map((c) => c.charCodeAt(0)));
const charsToEscapeInPseudoValue = new Set(pseudoValueChars.map((c) => c.charCodeAt(0)));
const charsToEscapeInName = new Set([
    ...pseudoValueChars,
    "~",
    "^",
    "$",
    "*",
    "+",
    "!",
    "|",
    ":",
    "[",
    "]",
    " ",
    ".",
    "%",
].map((c) => c.charCodeAt(0)));
/**
 * Turns `selector` back into a string.
 *
 * @param selector Selector to stringify.
 */
function stringify(selector) {
    return selector
        .map((token) => token
        .map((token, index, array) => stringifyToken(token, index, array))
        .join(""))
        .join(", ");
}
function stringifyToken(token, index, array) {
    switch (token.type) {
        // Simple types
        case types_js_1.SelectorType.Child: {
            return index === 0 ? "> " : " > ";
        }
        case types_js_1.SelectorType.Parent: {
            return index === 0 ? "< " : " < ";
        }
        case types_js_1.SelectorType.Sibling: {
            return index === 0 ? "~ " : " ~ ";
        }
        case types_js_1.SelectorType.Adjacent: {
            return index === 0 ? "+ " : " + ";
        }
        case types_js_1.SelectorType.Descendant: {
            return " ";
        }
        case types_js_1.SelectorType.ColumnCombinator: {
            return index === 0 ? "|| " : " || ";
        }
        case types_js_1.SelectorType.Universal: {
            // Return an empty string if the selector isn't needed.
            return token.namespace === "*" &&
                index + 1 < array.length &&
                "name" in array[index + 1]
                ? ""
                : `${getNamespace(token.namespace)}*`;
        }
        case types_js_1.SelectorType.Tag: {
            return getNamespacedName(token);
        }
        case types_js_1.SelectorType.PseudoElement: {
            return `::${escapeName(token.name, charsToEscapeInName)}${token.data === null
                ? ""
                : `(${escapeName(token.data, charsToEscapeInPseudoValue)})`}`;
        }
        case types_js_1.SelectorType.Pseudo: {
            return `:${escapeName(token.name, charsToEscapeInName)}${token.data === null
                ? ""
                : `(${typeof token.data === "string"
                    ? escapeName(token.data, charsToEscapeInPseudoValue)
                    : stringify(token.data)})`}`;
        }
        case types_js_1.SelectorType.Attribute: {
            if (token.name === "id" &&
                token.action === types_js_1.AttributeAction.Equals &&
                token.ignoreCase === "quirks" &&
                !token.namespace) {
                return `#${escapeName(token.value, charsToEscapeInName)}`;
            }
            if (token.name === "class" &&
                token.action === types_js_1.AttributeAction.Element &&
                token.ignoreCase === "quirks" &&
                !token.namespace) {
                return `.${escapeName(token.value, charsToEscapeInName)}`;
            }
            const name = getNamespacedName(token);
            if (token.action === types_js_1.AttributeAction.Exists) {
                return `[${name}]`;
            }
            return `[${name}${getActionValue(token.action)}="${escapeName(token.value, charsToEscapeInAttributeValue)}"${token.ignoreCase === null ? "" : token.ignoreCase ? " i" : " s"}]`;
        }
    }
}
function getActionValue(action) {
    switch (action) {
        case types_js_1.AttributeAction.Equals: {
            return "";
        }
        case types_js_1.AttributeAction.Element: {
            return "~";
        }
        case types_js_1.AttributeAction.Start: {
            return "^";
        }
        case types_js_1.AttributeAction.End: {
            return "$";
        }
        case types_js_1.AttributeAction.Any: {
            return "*";
        }
        case types_js_1.AttributeAction.Not: {
            return "!";
        }
        case types_js_1.AttributeAction.Hyphen: {
            return "|";
        }
        default: {
            throw new Error("Shouldn't be here");
        }
    }
}
function getNamespacedName(token) {
    return `${getNamespace(token.namespace)}${escapeName(token.name, charsToEscapeInName)}`;
}
function getNamespace(namespace) {
    return namespace === null
        ? ""
        : `${namespace === "*"
            ? "*"
            : escapeName(namespace, charsToEscapeInName)}|`;
}
function escapeName(name, charsToEscape) {
    let lastIndex = 0;
    let escapedName = "";
    for (let index = 0; index < name.length; index++) {
        if (charsToEscape.has(name.charCodeAt(index))) {
            escapedName += `${name.slice(lastIndex, index)}\\${name.charAt(index)}`;
            lastIndex = index + 1;
        }
    }
    return escapedName.length > 0 ? escapedName + name.slice(lastIndex) : name;
}
