"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomElementTagName = exports.isValidCustomElementName = exports.isValidAttributeName = void 0;
/**
 * According to {@link https://html.spec.whatwg.org/multipage/syntax.html#attributes-2}, the following Unicode characters are illegal in an attribute name
 * @type {RegExp}
 */
var ILLEGAL_UNICODE_CHARACTERS = /[\u0020\u0022\u0027\u003E\u002F\u003D]/g;
/**
 * According to {@link https://infra.spec.whatwg.org/#noncharacter},
 * a noncharacter is a codepoint that matches any of the given unicode characters
 * @type {RegExp}
 */
var NONCHARACTERS = /[\uFFFF\uFFFE\uFDD1\uFDD2\uFDD3\uFDD4\uFDD5\uFDD6\uFDD7\uFDD8\uFDD9\uFDDA\uFDDB\uFDDC\uFDDD\uFDDE\uFDDF\uFDE0\uFDE1\uFDE2\uFDE3\uFDE4\uFDE5\uFDE6\uFDE7\uFDE8\uFDE9\uFDEA\uFDEB\uFDEC\uFDED\uFDEE\uFDEF]/g;
function hasOnlyValidCharacters(name) {
    return name.match(ILLEGAL_UNICODE_CHARACTERS) == null && name.match(NONCHARACTERS) == null;
}
/**
 * Returns true if the given input is a valid attribute name
 * @param {string} input
 * @return {boolean}
 */
function isValidAttributeName(input) {
    return hasOnlyValidCharacters(input);
}
exports.isValidAttributeName = isValidAttributeName;
/**
 * Returns true if the given input is a valid custom element name.
 * @param {string} input
 * @return {boolean}
 */
function isValidCustomElementName(input) {
    return input.includes("-") && input.toLowerCase() === input && hasOnlyValidCharacters(input);
}
exports.isValidCustomElementName = isValidCustomElementName;
function isCustomElementTagName(tagName) {
    return tagName.includes("-");
}
exports.isCustomElementTagName = isCustomElementTagName;
