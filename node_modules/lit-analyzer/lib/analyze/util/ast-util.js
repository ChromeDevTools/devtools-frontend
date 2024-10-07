"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeIdentifier = exports.leadingCommentsIncludes = exports.nodeIntersects = exports.getNodeAtPosition = exports.findChild = exports.findParent = void 0;
var ts_module_js_1 = require("../ts-module.js");
var range_util_js_1 = require("./range-util.js");
/**
 * Tests nodes recursively walking up the tree using parent nodes.
 * @param node
 * @param test
 */
function findParent(node, test) {
    if (node == null)
        return;
    return test(node) ? node : findParent(node.parent, test);
}
exports.findParent = findParent;
function findChild(node, test) {
    if (!node)
        return;
    if (test(node))
        return node;
    return node.forEachChild(function (child) { return findChild(child, test); });
}
exports.findChild = findChild;
/**
 * Returns a node at a specific position.
 * @param node
 * @param position
 */
function getNodeAtPosition(node, position) {
    if (!(0, range_util_js_1.intersects)(position, { start: node.pos, end: node.end })) {
        return;
    }
    return node.forEachChild(function (child) { return getNodeAtPosition(child, position); }) || node;
}
exports.getNodeAtPosition = getNodeAtPosition;
function nodeIntersects(nodeA, nodeB) {
    return (0, range_util_js_1.intersects)({
        start: nodeA.getStart(),
        end: nodeA.getEnd()
    }, {
        start: nodeB.getStart(),
        end: nodeB.getEnd()
    });
}
exports.nodeIntersects = nodeIntersects;
/**
 * Checks whether a leading comment includes a given search string.
 * @param text
 * @param pos
 * @param needle
 */
function leadingCommentsIncludes(text, pos, needle) {
    var e_1, _a;
    // Get the leading comments to the position.
    var leadingComments = ts_module_js_1.tsModule.ts.getLeadingCommentRanges(text, pos);
    // If any leading comments exists, we check whether the needle matches the context of the comment.
    if (leadingComments != null) {
        try {
            for (var leadingComments_1 = __values(leadingComments), leadingComments_1_1 = leadingComments_1.next(); !leadingComments_1_1.done; leadingComments_1_1 = leadingComments_1.next()) {
                var comment = leadingComments_1_1.value;
                var commentText = text.substring(comment.pos, comment.end);
                if (commentText.includes(needle)) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (leadingComments_1_1 && !leadingComments_1_1.done && (_a = leadingComments_1.return)) _a.call(leadingComments_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return false;
}
exports.leadingCommentsIncludes = leadingCommentsIncludes;
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param ts
 */
function getNodeIdentifier(node, ts) {
    if (ts.isIdentifier(node)) {
        return node;
    }
    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        return node.expression;
    }
    else if ((ts.isClassLike(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isFunctionDeclaration(node)) &&
        node.name != null &&
        ts.isIdentifier(node.name)) {
        return node.name;
    }
    return undefined;
}
exports.getNodeIdentifier = getNodeIdentifier;
