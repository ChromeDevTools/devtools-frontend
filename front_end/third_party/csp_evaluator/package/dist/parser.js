"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_ONLY = exports.CspParser = void 0;
const csp = __importStar(require("./csp"));
class CspParser {
    constructor(unparsedCsp) {
        this.csp = new csp.Csp();
        this.parse(unparsedCsp);
    }
    parse(unparsedCsp) {
        this.csp = new csp.Csp();
        const directiveTokens = unparsedCsp.split(';');
        for (let i = 0; i < directiveTokens.length; i++) {
            const directiveToken = directiveTokens[i].trim();
            const directiveParts = directiveToken.match(/\S+/g);
            if (Array.isArray(directiveParts)) {
                const directiveName = directiveParts[0].toLowerCase();
                if (directiveName in this.csp.directives) {
                    continue;
                }
                if (!csp.isDirective(directiveName)) {
                }
                const directiveValues = [];
                for (let directiveValue, j = 1; (directiveValue = directiveParts[j]); j++) {
                    directiveValue = normalizeDirectiveValue(directiveValue);
                    if (!directiveValues.includes(directiveValue)) {
                        directiveValues.push(directiveValue);
                    }
                }
                this.csp.directives[directiveName] = directiveValues;
            }
        }
        return this.csp;
    }
}
exports.CspParser = CspParser;
function normalizeDirectiveValue(directiveValue) {
    directiveValue = directiveValue.trim();
    const directiveValueLower = directiveValue.toLowerCase();
    if (csp.isKeyword(directiveValueLower) || csp.isUrlScheme(directiveValue)) {
        return directiveValueLower;
    }
    return directiveValue;
}
exports.TEST_ONLY = { normalizeDirectiveValue };
//# sourceMappingURL=parser.js.map