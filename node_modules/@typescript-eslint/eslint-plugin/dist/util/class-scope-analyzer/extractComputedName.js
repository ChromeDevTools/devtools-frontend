"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNameForMember = extractNameForMember;
exports.extractNameForMemberExpression = extractNameForMemberExpression;
const utils_1 = require("@typescript-eslint/utils");
const types_1 = require("./types");
function extractComputedName(computedName) {
    if (computedName.type === utils_1.AST_NODE_TYPES.Literal) {
        const name = computedName.value?.toString() ?? 'null';
        return {
            codeName: name,
            key: (0, types_1.publicKey)(name),
            nameNode: computedName,
        };
    }
    if (computedName.type === utils_1.AST_NODE_TYPES.TemplateLiteral &&
        computedName.expressions.length === 0) {
        const name = computedName.quasis[0].value.raw;
        return {
            codeName: name,
            key: (0, types_1.publicKey)(name),
            nameNode: computedName,
        };
    }
    return null;
}
function extractNonComputedName(nonComputedName) {
    const name = nonComputedName.name;
    if (nonComputedName.type === utils_1.AST_NODE_TYPES.PrivateIdentifier) {
        return {
            codeName: `#${name}`,
            key: (0, types_1.privateKey)(nonComputedName),
            nameNode: nonComputedName,
        };
    }
    return {
        codeName: name,
        key: (0, types_1.publicKey)(name),
        nameNode: nonComputedName,
    };
}
/**
 * Extracts the string name for a member.
 * @returns `null` if the name cannot be extracted due to it being computed.
 */
function extractNameForMember(node) {
    if (node.type === utils_1.AST_NODE_TYPES.TSParameterProperty) {
        switch (node.parameter.type) {
            case utils_1.AST_NODE_TYPES.ArrayPattern:
            case utils_1.AST_NODE_TYPES.ObjectPattern:
            case utils_1.AST_NODE_TYPES.RestElement:
                // Nonsensical properties -- see https://github.com/typescript-eslint/typescript-eslint/issues/11708
                return null;
            case utils_1.AST_NODE_TYPES.AssignmentPattern:
                if (node.parameter.left.type !== utils_1.AST_NODE_TYPES.Identifier) {
                    return null;
                }
                return extractNonComputedName(node.parameter.left);
            case utils_1.AST_NODE_TYPES.Identifier:
                return extractNonComputedName(node.parameter);
        }
    }
    if (node.computed) {
        return extractComputedName(node.key);
    }
    if (node.key.type === utils_1.AST_NODE_TYPES.Literal) {
        return extractComputedName(node.key);
    }
    return extractNonComputedName(node.key);
}
/**
 * Extracts the string property name for a member.
 * @returns `null` if the name cannot be extracted due to it being a computed.
 */
function extractNameForMemberExpression(node) {
    if (node.computed) {
        return extractComputedName(node.property);
    }
    return extractNonComputedName(node.property);
}
