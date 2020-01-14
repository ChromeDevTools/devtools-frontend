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
exports.default = util.createRule({
    name: 'no-extra-non-null-assertion',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow extra non-null assertion',
            category: 'Stylistic Issues',
            recommended: false,
        },
        schema: [],
        messages: {
            noExtraNonNullAssertion: 'Forbidden extra non-null assertion.',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            'TSNonNullExpression > TSNonNullExpression'(node) {
                context.report({ messageId: 'noExtraNonNullAssertion', node });
            },
        };
    },
});
//# sourceMappingURL=no-extra-non-null-assertion.js.map