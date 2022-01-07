"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTokenOfTypeWithConditions = exports.isNodeOfTypeWithConditions = exports.isNodeOfTypes = exports.isNodeOfType = void 0;
const isNodeOfType = (nodeType) => (node) => (node === null || node === void 0 ? void 0 : node.type) === nodeType;
exports.isNodeOfType = isNodeOfType;
const isNodeOfTypes = (nodeTypes) => (node) => !!node && nodeTypes.includes(node.type);
exports.isNodeOfTypes = isNodeOfTypes;
const isNodeOfTypeWithConditions = (nodeType, conditions) => {
    const entries = Object.entries(conditions);
    return (node) => (node === null || node === void 0 ? void 0 : node.type) === nodeType &&
        entries.every(([key, value]) => node[key] === value);
};
exports.isNodeOfTypeWithConditions = isNodeOfTypeWithConditions;
const isTokenOfTypeWithConditions = (tokenType, conditions) => {
    const entries = Object.entries(conditions);
    return (token) => (token === null || token === void 0 ? void 0 : token.type) === tokenType &&
        entries.every(([key, value]) => token[key] === value);
};
exports.isTokenOfTypeWithConditions = isTokenOfTypeWithConditions;
//# sourceMappingURL=helpers.js.map