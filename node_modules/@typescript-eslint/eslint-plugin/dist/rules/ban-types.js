"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const util = __importStar(require("../util"));
function removeSpaces(str) {
    return str.replace(/ /g, '');
}
function stringifyTypeName(node, sourceCode) {
    return removeSpaces(sourceCode.getText(node));
}
function getCustomMessage(bannedType) {
    if (bannedType === null) {
        return '';
    }
    if (typeof bannedType === 'string') {
        return ` ${bannedType}`;
    }
    if (bannedType.message) {
        return ` ${bannedType.message}`;
    }
    return '';
}
exports.default = util.createRule({
    name: 'ban-types',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Bans specific types from being used',
            category: 'Best Practices',
            recommended: 'error',
        },
        fixable: 'code',
        messages: {
            bannedTypeMessage: "Don't use '{{name}}' as a type.{{customMessage}}",
        },
        schema: [
            {
                type: 'object',
                properties: {
                    types: {
                        type: 'object',
                        additionalProperties: {
                            oneOf: [
                                { type: 'null' },
                                { type: 'string' },
                                {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        fixWith: { type: 'string' },
                                    },
                                    additionalProperties: false,
                                },
                            ],
                        },
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        {
            types: {
                String: {
                    message: 'Use string instead',
                    fixWith: 'string',
                },
                Boolean: {
                    message: 'Use boolean instead',
                    fixWith: 'boolean',
                },
                Number: {
                    message: 'Use number instead',
                    fixWith: 'number',
                },
                Object: {
                    message: 'Use Record<string, any> instead',
                    fixWith: 'Record<string, any>',
                },
                Symbol: {
                    message: 'Use symbol instead',
                    fixWith: 'symbol',
                },
            },
        },
    ],
    create(context, [{ types }]) {
        const bannedTypes = Object.keys(types).reduce((res, type) => (Object.assign(Object.assign({}, res), { [removeSpaces(type)]: types[type] })), {});
        function checkBannedTypes(typeNode) {
            const name = stringifyTypeName(typeNode, context.getSourceCode());
            if (name in bannedTypes) {
                const bannedType = bannedTypes[name];
                const customMessage = getCustomMessage(bannedType);
                const fixWith = bannedType && typeof bannedType === 'object' && bannedType.fixWith;
                context.report({
                    node: typeNode,
                    messageId: 'bannedTypeMessage',
                    data: {
                        name,
                        customMessage,
                    },
                    fix: fixWith
                        ? (fixer) => fixer.replaceText(typeNode, fixWith)
                        : null,
                });
            }
        }
        return {
            TSTypeLiteral(node) {
                if (node.members.length) {
                    return;
                }
                checkBannedTypes(node);
            },
            TSTypeReference({ typeName }) {
                checkBannedTypes(typeName);
            },
        };
    },
});
//# sourceMappingURL=ban-types.js.map