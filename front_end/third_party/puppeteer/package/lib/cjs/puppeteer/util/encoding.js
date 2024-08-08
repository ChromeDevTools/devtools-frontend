"use strict";
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeUint8Arrays = exports.typedArrayToBase64 = exports.stringToBase64 = exports.stringToTypedArray = void 0;
/**
 * @internal
 */
function stringToTypedArray(string, base64Encoded = false) {
    if (base64Encoded) {
        const binaryString = atob(string);
        // @ts-expect-error There are non-proper overloads
        return Uint8Array.from(binaryString, m => {
            return m.codePointAt(0);
        });
    }
    return new TextEncoder().encode(string);
}
exports.stringToTypedArray = stringToTypedArray;
/**
 * @internal
 */
function stringToBase64(str) {
    return typedArrayToBase64(new TextEncoder().encode(str));
}
exports.stringToBase64 = stringToBase64;
/**
 * @internal
 */
function typedArrayToBase64(typedArray) {
    const binaryString = Array.from(typedArray, byte => {
        return String.fromCodePoint(byte);
    }).join('');
    return btoa(binaryString);
}
exports.typedArrayToBase64 = typedArrayToBase64;
/**
 * @internal
 */
function mergeUint8Arrays(items) {
    let length = 0;
    for (const item of items) {
        length += item.length;
    }
    // Create a new array with total length and merge all source arrays.
    const result = new Uint8Array(length);
    let offset = 0;
    for (const item of items) {
        result.set(item, offset);
        offset += item.length;
    }
    return result;
}
exports.mergeUint8Arrays = mergeUint8Arrays;
//# sourceMappingURL=encoding.js.map