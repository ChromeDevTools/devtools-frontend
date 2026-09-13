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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filters = void 0;
const boolbase = __importStar(require("boolbase"));
const nth_check_1 = __importDefault(require("nth-check"));
const cache_js_1 = require("../helpers/cache.js");
const querying_js_1 = require("../helpers/querying.js");
exports.filters = {
    contains(next, text, options) {
        const { getText } = options.adapter;
        return (0, cache_js_1.cacheParentResults)(next, options, (elem) => getText(elem).includes(text));
    },
    icontains(next, text, options) {
        const itext = text.toLowerCase();
        const { getText } = options.adapter;
        return (0, cache_js_1.cacheParentResults)(next, options, (elem) => getText(elem).toLowerCase().includes(itext));
    },
    // Location specific methods
    "nth-child"(next, rule, { adapter, equals }) {
        const func = (0, nth_check_1.default)(rule);
        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) => (0, querying_js_1.getElementParent)(elem, adapter) !== null && next(elem);
        }
        return function nthChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = 0; i < siblings.length; i++) {
                if (equals(elem, siblings[i])) {
                    break;
                }
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-child"(next, rule, { adapter, equals }) {
        const func = (0, nth_check_1.default)(rule);
        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) => (0, querying_js_1.getElementParent)(elem, adapter) !== null && next(elem);
        }
        return function nthLastChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i])) {
                    break;
                }
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-of-type"(next, rule, { adapter, equals }) {
        const func = (0, nth_check_1.default)(rule);
        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) => (0, querying_js_1.getElementParent)(elem, adapter) !== null && next(elem);
        }
        return function nthOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = 0; i < siblings.length; i++) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) {
                    break;
                }
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-of-type"(next, rule, { adapter, equals }) {
        const func = (0, nth_check_1.default)(rule);
        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) => (0, querying_js_1.getElementParent)(elem, adapter) !== null && next(elem);
        }
        return function nthLastOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;
            for (let i = siblings.length - 1; i >= 0; i--) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) {
                    break;
                }
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    // TODO determine the actual root element
    root(next, _rule, { adapter }) {
        return (elem) => (0, querying_js_1.getElementParent)(elem, adapter) === null && next(elem);
    },
    scope(next, rule, options, context) {
        const { equals } = options;
        if (!context || context.length === 0) {
            // Equivalent to :root
            return exports.filters["root"](next, rule, options);
        }
        if (context.length === 1) {
            // NOTE: can't be unpacked, as :has uses this for side-effects
            return (elem) => equals(context[0], elem) && next(elem);
        }
        return (elem) => context.includes(elem) && next(elem);
    },
    hover: dynamicStatePseudo("isHovered"),
    visited: dynamicStatePseudo("isVisited"),
    active: dynamicStatePseudo("isActive"),
};
/**
 * Dynamic state pseudos. These depend on optional Adapter methods.
 *
 * @param name The name of the adapter method to call.
 * @returns Pseudo for the `filters` object.
 */
function dynamicStatePseudo(name) {
    return function dynamicPseudo(next, _rule, { adapter }) {
        const func = adapter[name];
        if (typeof func !== "function") {
            return boolbase.falseFunc;
        }
        return function active(elem) {
            return func(elem) && next(elem);
        };
    };
}
//# sourceMappingURL=filters.js.map