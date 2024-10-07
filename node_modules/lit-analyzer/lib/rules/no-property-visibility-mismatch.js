"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var ast_util_js_1 = require("../analyze/util/ast-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * Returns the identifier of the decorator used on the member if any
 * @param member
 * @param context
 */
var getDecoratorIdentifier = function (member, context) {
    var _a, _b;
    var decorator = (_b = (_a = member.meta) === null || _a === void 0 ? void 0 : _a.node) === null || _b === void 0 ? void 0 : _b.decorator;
    if (decorator == null) {
        return undefined;
    }
    return (0, ast_util_js_1.getNodeIdentifier)(decorator, context.ts);
};
/**
 * This rule detects mismatches with property visibilities and the decorators
 * they were defined with.
 */
var rule = {
    id: "no-property-visibility-mismatch",
    meta: {
        priority: "medium"
    },
    visitComponentMember: function (member, context) {
        // Only run this rule on members of "property" kind
        if (member.kind !== "property") {
            return;
        }
        // Get the decorator of the property if any
        var decoratorIdentifier = getDecoratorIdentifier(member, context);
        if (decoratorIdentifier == null || decoratorIdentifier.getSourceFile() !== context.file) {
            return;
        }
        // Get the decorator of interest
        var decoratorName = decoratorIdentifier.text;
        var hasInternalDecorator = decoratorName === "internalProperty";
        var hasPropertyDecorator = decoratorName === "property";
        // Handle cases where @internalProperty decorator is used, but the property is public
        if (hasInternalDecorator && (member.visibility === "public" || member.visibility == null)) {
            var inJsFile = context.file.fileName.endsWith(".js");
            context.report(__assign({ location: (0, range_util_js_1.rangeFromNode)(decoratorIdentifier), message: "'".concat(member.propName, "' is marked as an internal property (@internalProperty) but is publicly accessible.") }, (inJsFile
                ? {
                // We are in Javascript context. Add "@properted" or "@private" JSDoc
                }
                : {
                    // We are in Typescript context. Add "protected" or "private" keyword
                    fixMessage: "Change the property access to 'private' or 'protected'?",
                    fix: function () {
                        var _a;
                        // Make sure we operate on a property declaration
                        var propertyDeclaration = member.node;
                        if (!context.ts.isPropertyDeclaration(propertyDeclaration)) {
                            return [];
                        }
                        // The modifiers the user can choose to add to fix this warning/error
                        var modifiers = ["protected", "private"];
                        // Get the public modifier if any. If one exists, we want to change that one.
                        var publicModifier = (_a = propertyDeclaration.modifiers) === null || _a === void 0 ? void 0 : _a.find(function (modifier) { return modifier.kind === context.ts.SyntaxKind.PublicKeyword; });
                        if (publicModifier != null) {
                            // Return actions that can replace the modifier
                            return modifiers.map(function (keyword) { return ({
                                message: "Change to '".concat(keyword, "'"),
                                actions: [
                                    {
                                        kind: "changeRange",
                                        range: (0, range_util_js_1.rangeFromNode)(publicModifier),
                                        newText: keyword
                                    }
                                ]
                            }); });
                        }
                        // If there is no existing visibility modifier, add a new modifier right in front of the property name (identifier)
                        var propertyIdentifier = propertyDeclaration.name;
                        if (propertyIdentifier != null) {
                            // Return actions that can add a modifier in front of the identifier
                            return modifiers.map(function (keyword) { return ({
                                message: "Add '".concat(keyword, "' modifier"),
                                actions: [
                                    {
                                        kind: "changeRange",
                                        range: (0, range_util_js_1.makeSourceFileRange)({
                                            start: propertyIdentifier.getStart(),
                                            end: propertyIdentifier.getStart()
                                        }),
                                        newText: "".concat(keyword, " ")
                                    }
                                ]
                            }); });
                        }
                        return [];
                    }
                })));
        }
        // Handle cases where @property decorator is used, but the property is not public
        else if (hasPropertyDecorator && member.visibility !== "public") {
            context.report({
                location: (0, range_util_js_1.rangeFromNode)(decoratorIdentifier),
                message: "'".concat(member.propName, "' is not publicly accessible but is marked as a public property (@property)."),
                fixMessage: "Use the '@internalProperty' decorator instead?",
                fix: function () {
                    var _a;
                    // Return a code action that can replace the identifier of the decorator
                    var newText = "internalProperty";
                    // Change identifier to "internal property"
                    var actions = [
                        {
                            kind: "changeIdentifier",
                            identifier: decoratorIdentifier,
                            newText: newText
                        }
                    ];
                    // Find the object literal node (the config of the "@property" decorator)
                    var objectLiteralNode = (0, ast_util_js_1.findChild)(decoratorIdentifier.parent, function (node) {
                        return context.ts.isObjectLiteralExpression(node);
                    });
                    if (objectLiteralNode != null) {
                        // Remove the configuration if the config doesn't have any shared properties with the "internalProperty" config
                        var internalPropertyConfigProperties_1 = ["hasChanged"];
                        if (!((_a = objectLiteralNode.properties) === null || _a === void 0 ? void 0 : _a.some(function (propertyNode) { var _a; return internalPropertyConfigProperties_1.includes(((_a = propertyNode.name) === null || _a === void 0 ? void 0 : _a.getText()) || ""); }))) {
                            actions.push({
                                kind: "changeRange",
                                range: (0, range_util_js_1.rangeFromNode)(objectLiteralNode),
                                newText: ""
                            });
                        }
                    }
                    return {
                        message: "Change to '".concat(newText, "'"),
                        actions: actions
                    };
                }
            });
        }
    }
};
exports.default = rule;
