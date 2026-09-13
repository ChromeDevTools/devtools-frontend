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
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileToken = compileToken;
const boolbase = __importStar(require("boolbase"));
const css_what_1 = require("css-what");
const general_js_1 = require("./general.js");
const querying_js_1 = require("./helpers/querying.js");
const selectors_js_1 = require("./helpers/selectors.js");
const subselects_js_1 = require("./pseudo-selectors/subselects.js");
const DESCENDANT_TOKEN = { type: css_what_1.SelectorType.Descendant };
const FLEXIBLE_DESCENDANT_TOKEN = {
    type: "_flexibleDescendant",
};
const SCOPE_TOKEN = {
    type: css_what_1.SelectorType.Pseudo,
    name: "scope",
    data: null,
};
/*
 * CSS 4 Spec (Draft): 3.4.1. Absolutizing a Relative Selector
 * http://www.w3.org/TR/selectors4/#absolutizing
 */
function absolutize(token, { adapter }, context) {
    // TODO Use better check if the context is a document
    const hasContext = !!context?.every((e) => e === subselects_js_1.PLACEHOLDER_ELEMENT ||
        (adapter.isTag(e) && (0, querying_js_1.getElementParent)(e, adapter) !== null));
    for (const t of token) {
        if (t.length > 0 &&
            (0, selectors_js_1.isTraversal)(t[0]) &&
            t[0].type !== css_what_1.SelectorType.Descendant) {
            // Don't continue in else branch
        }
        else if (hasContext && !t.some(selectors_js_1.includesScopePseudo)) {
            t.unshift(DESCENDANT_TOKEN);
        }
        else {
            continue;
        }
        t.unshift(SCOPE_TOKEN);
    }
}
function compileToken(token, options, ctx) {
    token.forEach(selectors_js_1.sortRules);
    const { context = ctx, rootFunc = boolbase.trueFunc } = options;
    const isArrayContext = Array.isArray(context);
    const finalContext = context && (Array.isArray(context) ? context : [context]);
    // Check if the selector is relative
    if (options.relativeSelector !== false) {
        absolutize(token, options, finalContext);
    }
    else if (token.some((t) => t.length > 0 && (0, selectors_js_1.isTraversal)(t[0]))) {
        throw new Error("Relative selectors are not allowed when the `relativeSelector` option is disabled");
    }
    let shouldTestNextSiblings = false;
    let query = boolbase.falseFunc;
    combineLoop: for (const rules of token) {
        if (rules.length >= 2) {
            const [first, second] = rules;
            if (first.type !== css_what_1.SelectorType.Pseudo || first.name !== "scope") {
                // Ignore
            }
            else if (isArrayContext &&
                second.type === css_what_1.SelectorType.Descendant) {
                rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
            }
            else if (second.type === css_what_1.SelectorType.Adjacent ||
                second.type === css_what_1.SelectorType.Sibling) {
                shouldTestNextSiblings = true;
            }
        }
        let next = rootFunc;
        let hasExpensiveSubselector = false;
        for (const rule of rules) {
            next = (0, general_js_1.compileGeneralSelector)(next, rule, options, finalContext, compileToken, hasExpensiveSubselector);
            const quality = (0, selectors_js_1.getQuality)(rule);
            if (quality === 0) {
                hasExpensiveSubselector = true;
            }
            // If the sub-selector won't match any elements, skip it.
            if (next === boolbase.falseFunc) {
                continue combineLoop;
            }
        }
        // If we have a function that always returns true, we can stop here.
        if (next === rootFunc) {
            return rootFunc;
        }
        query = query === boolbase.falseFunc ? next : or(query, next);
    }
    query.shouldTestNextSiblings = shouldTestNextSiblings;
    return query;
}
function or(a, b) {
    return (elem) => a(elem) || b(elem);
}
//# sourceMappingURL=compile.js.map