"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectFromEntries = void 0;
// polyfill for Node.js < 12
// reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries
exports.objectFromEntries = Object.fromEntries ||
    function fromEntries(entries) {
        const obj = {};
        for (const [key, value] of entries) {
            obj[key] = value;
        }
        return obj;
    };
