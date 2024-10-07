"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.findBestStringMatch = exports.findBestMatch = void 0;
var didyoumean2_1 = __importStar(require("didyoumean2")), dym = didyoumean2_1;
/**
 * Finds the best match between a string and elements in a list.
 * @param find
 * @param elements
 * @param options
 */
function findBestMatch(find, elements, options) {
    options.caseSensitive = "caseSensitive" in options ? options.caseSensitive : false;
    options.threshold = "threshold" in options ? options.threshold : 0.5;
    return ((0, didyoumean2_1.default)(find, elements, {
        caseSensitive: options.caseSensitive,
        threshold: options.threshold,
        matchPath: [options.matchKey],
        returnType: dym.ReturnTypeEnums.FIRST_CLOSEST_MATCH,
        trimSpaces: false
    }) || undefined);
}
exports.findBestMatch = findBestMatch;
function findBestStringMatch(find, elements, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.caseSensitive, caseSensitive = _c === void 0 ? true : _c, _d = _b.threshold, threshold = _d === void 0 ? 0.5 : _d;
    var matches = (0, didyoumean2_1.default)(find, elements, { caseSensitive: caseSensitive, threshold: threshold });
    return typeof matches === "string" ? matches : Array.isArray(matches) ? matches[0] : undefined;
}
exports.findBestStringMatch = findBestStringMatch;
