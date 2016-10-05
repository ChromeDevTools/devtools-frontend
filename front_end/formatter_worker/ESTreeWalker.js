// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function(!ESTree.Node):(!Object|undefined)} beforeVisit
 * @param {function(!ESTree.Node)=} afterVisit
 */
WebInspector.ESTreeWalker = function(beforeVisit, afterVisit)
{
    this._beforeVisit = beforeVisit;
    this._afterVisit = afterVisit || new Function();
    this._walkNulls = false;
};

/** @typedef {!Object} WebInspector.ESTreeWalker.SkipSubtree */
WebInspector.ESTreeWalker.SkipSubtree = {};

WebInspector.ESTreeWalker.prototype = {
    /**
     * @param {boolean} value
     */
    setWalkNulls: function(value)
    {
        this._walkNulls = value;
    },

    /**
     * @param {!ESTree.Node} ast
     */
    walk: function(ast)
    {
        this._innerWalk(ast, null);
    },

    /**
     * @param {!ESTree.Node} node
     * @param {?ESTree.Node} parent
     */
    _innerWalk: function(node, parent)
    {
        if (!node && parent && this._walkNulls) {
            node = /** @type {!ESTree.Node} */ ({
                type: "Literal",
                raw: "null",
                value: null
            });
        }

        if (!node)
            return;
        node.parent = parent;

        if (this._beforeVisit.call(null, node) === WebInspector.ESTreeWalker.SkipSubtree) {
            this._afterVisit.call(null, node);
            return;
        }

        var walkOrder = WebInspector.ESTreeWalker._walkOrder[node.type];
        if (!walkOrder) {
            console.error("Walk order not defined for " + node.type);
            return;
        }

        if (node.type === "TemplateLiteral") {
            var templateLiteral = /** @type {!ESTree.TemplateLiteralNode} */ (node);
            var expressionsLength = templateLiteral.expressions.length;
            for (var i = 0; i < expressionsLength; ++i) {
                this._innerWalk(templateLiteral.quasis[i], templateLiteral);
                this._innerWalk(templateLiteral.expressions[i], templateLiteral);
            }
            this._innerWalk(templateLiteral.quasis[expressionsLength], templateLiteral);
        } else {
            for (var i = 0; i < walkOrder.length; ++i) {
                var entity = node[walkOrder[i]];
                if (Array.isArray(entity))
                    this._walkArray(entity, node);
                else
                    this._innerWalk(entity, node);
            }
        }

        this._afterVisit.call(null, node);
    },

    /**
     * @param {!Array.<!ESTree.Node>} nodeArray
     * @param {?ESTree.Node} parentNode
     */
    _walkArray: function(nodeArray, parentNode)
    {
        for (var i = 0; i < nodeArray.length; ++i)
            this._innerWalk(nodeArray[i], parentNode);
    },
};

/** @enum {!Array.<string>} */
WebInspector.ESTreeWalker._walkOrder = {
    "ArrayExpression": ["elements"],
    "ArrowFunctionExpression": ["params", "body"],
    "AssignmentExpression": ["left", "right"],
    "BinaryExpression": ["left", "right"],
    "BlockStatement": ["body"],
    "BreakStatement": ["label"],
    "CallExpression": ["callee", "arguments"],
    "CatchClause": ["param", "body"],
    "ClassBody": ["body"],
    "ClassDeclaration": ["id", "superClass", "body"],
    "ClassExpression": ["id", "superClass", "body"],
    "ConditionalExpression": ["test", "consequent", "alternate"],
    "ContinueStatement": ["label"],
    "DebuggerStatement": [],
    "DoWhileStatement": ["body", "test"],
    "EmptyStatement": [],
    "ExpressionStatement": ["expression"],
    "ForInStatement": ["left", "right", "body"],
    "ForOfStatement": ["left", "right", "body"],
    "ForStatement": ["init", "test", "update", "body"],
    "FunctionDeclaration": ["id", "params", "body"],
    "FunctionExpression": ["id", "params", "body"],
    "Identifier": [],
    "IfStatement": ["test", "consequent", "alternate"],
    "LabeledStatement": ["label", "body"],
    "Literal": [],
    "LogicalExpression": ["left", "right"],
    "MemberExpression": ["object", "property"],
    "MethodDefinition": ["key", "value"],
    "NewExpression": ["callee", "arguments"],
    "ObjectExpression": ["properties"],
    "Program": ["body"],
    "Property": ["key", "value"],
    "ReturnStatement": ["argument"],
    "SequenceExpression": ["expressions"],
    "Super": [],
    "SwitchCase": ["test", "consequent"],
    "SwitchStatement": ["discriminant", "cases"],
    "TaggedTemplateExpression": ["tag", "quasi"],
    "TemplateElement": [],
    "TemplateLiteral": ["quasis", "expressions"],
    "ThisExpression": [],
    "ThrowStatement": ["argument"],
    "TryStatement": ["block", "handler", "finalizer"],
    "UnaryExpression": ["argument"],
    "UpdateExpression": ["argument"],
    "VariableDeclaration": ["declarations"],
    "VariableDeclarator": ["id", "init"],
    "WhileStatement": ["test", "body"],
    "WithStatement": ["object", "body"],
    "YieldExpression": ["argument"]
};
