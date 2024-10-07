'use strict';

var tsModule = require('typescript');
var tsSimpleType = require('ts-simple-type');
var fs = require('fs');
var path = require('path');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var tsModule__namespace = /*#__PURE__*/_interopNamespaceDefault(tsModule);

/**
 * Takes a node and tries to resolve a constant value from it.
 * Returns undefined if no constant value can be resolved.
 * @param node
 * @param context
 */
function resolveNodeValue(node, context) {
    var _a, _b;
    if (node == null)
        return undefined;
    const { ts, checker } = context;
    const depth = (context.depth || 0) + 1;
    // Always break when depth is larger than 10.
    // This ensures we cannot run into infinite recursion.
    if (depth > 10)
        return undefined;
    if (ts.isStringLiteralLike(node)) {
        return { value: node.text, node };
    }
    else if (ts.isNumericLiteral(node)) {
        return { value: Number(node.text), node };
    }
    else if (ts.isPrefixUnaryExpression(node)) {
        const value = (_a = resolveNodeValue(node.operand, { ...context, depth })) === null || _a === void 0 ? void 0 : _a.value;
        return { value: applyPrefixUnaryOperatorToValue(value, node.operator, ts), node };
    }
    else if (ts.isObjectLiteralExpression(node)) {
        const object = {};
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop)) {
                // Resolve the "key"
                const name = ((_b = resolveNodeValue(prop.name, { ...context, depth })) === null || _b === void 0 ? void 0 : _b.value) || prop.name.getText();
                // Resolve the "value
                const resolvedValue = resolveNodeValue(prop.initializer, { ...context, depth });
                if (resolvedValue != null && typeof name === "string") {
                    object[name] = resolvedValue.value;
                }
            }
        }
        return {
            value: object,
            node
        };
    }
    else if (node.kind === ts.SyntaxKind.TrueKeyword) {
        return { value: true, node };
    }
    else if (node.kind === ts.SyntaxKind.FalseKeyword) {
        return { value: false, node };
    }
    else if (node.kind === ts.SyntaxKind.NullKeyword) {
        return { value: null, node };
    }
    else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
        return { value: undefined, node };
    }
    // Resolve initializers for variable declarations
    if (ts.isVariableDeclaration(node)) {
        return resolveNodeValue(node.initializer, { ...context, depth });
    }
    // Resolve value of a property access expression. For example: MyEnum.RED
    else if (ts.isPropertyAccessExpression(node)) {
        return resolveNodeValue(node.name, { ...context, depth });
    }
    // Resolve [expression] parts of {[expression]: "value"}
    else if (ts.isComputedPropertyName(node)) {
        return resolveNodeValue(node.expression, { ...context, depth });
    }
    // Resolve initializer value of enum members.
    else if (ts.isEnumMember(node)) {
        if (node.initializer != null) {
            return resolveNodeValue(node.initializer, { ...context, depth });
        }
        else {
            return { value: `${node.parent.name.text}.${node.name.getText()}`, node };
        }
    }
    // Resolve values of variables.
    else if (ts.isIdentifier(node) && checker != null) {
        const declarations = resolveDeclarations(node, { checker, ts });
        if (declarations.length > 0) {
            const resolved = resolveNodeValue(declarations[0], { ...context, depth });
            if (context.strict || resolved != null) {
                return resolved;
            }
        }
        if (context.strict) {
            return undefined;
        }
        return { value: node.getText(), node };
    }
    // Fallthrough
    //  - "my-value" as string
    //  - <any>"my-value"
    //  - ("my-value")
    else if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node)) {
        return resolveNodeValue(node.expression, { ...context, depth });
    }
    // static get is() {
    //    return "my-element";
    // }
    else if ((ts.isGetAccessor(node) || ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.body != null) {
        for (const stm of node.body.statements) {
            if (ts.isReturnStatement(stm)) {
                return resolveNodeValue(stm.expression, { ...context, depth });
            }
        }
    }
    // [1, 2]
    else if (ts.isArrayLiteralExpression(node)) {
        return {
            node,
            value: node.elements.map(el => { var _a; return (_a = resolveNodeValue(el, { ...context, depth })) === null || _a === void 0 ? void 0 : _a.value; })
        };
    }
    if (ts.isTypeAliasDeclaration(node)) {
        return resolveNodeValue(node.type, { ...context, depth });
    }
    if (ts.isLiteralTypeNode(node)) {
        return resolveNodeValue(node.literal, { ...context, depth });
    }
    if (ts.isTypeReferenceNode(node)) {
        return resolveNodeValue(node.typeName, { ...context, depth });
    }
    return undefined;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPrefixUnaryOperatorToValue(value, operator, ts) {
    if (typeof value === "object" && value != null) {
        return value;
    }
    switch (operator) {
        case ts.SyntaxKind.MinusToken:
            return -value;
        case ts.SyntaxKind.ExclamationToken:
            return !value;
        case ts.SyntaxKind.PlusToken:
            return +value;
    }
    return value;
}

/**
 * Converts from snake case to camel case
 * @param str
 */
/**
 * Converts from camel case to snake case
 * @param str
 */
function camelToDashCase(str) {
    return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}
/**
 * Returns if a name is private (starts with "_" or "#");
 * @param name	 * @param name
 */
function isNamePrivate(name) {
    return name.startsWith("_") || name.startsWith("#");
}

/**
 * Resolves all relevant declarations of a specific node.
 * @param node
 * @param context
 */
function resolveDeclarations(node, context) {
    if (node == null)
        return [];
    const symbol = getSymbol(node, context);
    if (symbol == null)
        return [];
    return resolveSymbolDeclarations(symbol);
}
/**
 * Returns the symbol of a node.
 * This function follows aliased symbols.
 * @param node
 * @param context
 */
function getSymbol(node, context) {
    if (node == null)
        return undefined;
    const { checker, ts } = context;
    // Get the symbol
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol == null) {
        const identifier = getNodeIdentifier(node, context);
        symbol = identifier != null ? checker.getSymbolAtLocation(identifier) : undefined;
    }
    // Resolve aliased symbols
    if (symbol != null && isAliasSymbol(symbol, ts)) {
        symbol = checker.getAliasedSymbol(symbol);
        if (symbol == null)
            return undefined;
    }
    return symbol;
}
/**
 * Resolves the declarations of a symbol. A valueDeclaration is always the first entry in the array
 * @param symbol
 */
function resolveSymbolDeclarations(symbol) {
    // Filters all declarations
    const valueDeclaration = symbol.valueDeclaration;
    const declarations = symbol.getDeclarations() || [];
    if (valueDeclaration == null) {
        return declarations;
    }
    else {
        // Make sure that "valueDeclaration" is always the first entry
        return [valueDeclaration, ...declarations.filter(decl => decl !== valueDeclaration)];
    }
}
/**
 * Resolve a declaration by trying to find the real value by following assignments.
 * @param node
 * @param context
 */
function resolveDeclarationsDeep(node, context) {
    const declarations = [];
    const allDeclarations = resolveDeclarations(node, context);
    for (const declaration of allDeclarations) {
        if (context.ts.isVariableDeclaration(declaration) && declaration.initializer != null && context.ts.isIdentifier(declaration.initializer)) {
            declarations.push(...resolveDeclarationsDeep(declaration.initializer, context));
        }
        else if (context.ts.isTypeAliasDeclaration(declaration) && declaration.type != null && context.ts.isIdentifier(declaration.type)) {
            declarations.push(...resolveDeclarationsDeep(declaration.type, context));
        }
        else {
            declarations.push(declaration);
        }
    }
    return declarations;
}
/**
 * Returns if the symbol has "alias" flag
 * @param symbol
 * @param ts
 */
function isAliasSymbol(symbol, ts) {
    return hasFlag(symbol.flags, ts.SymbolFlags.Alias);
}
/**
 * Returns a set of modifiers on a node
 * @param node
 * @param ts
 */
function getModifiersFromNode(node, ts) {
    const modifiers = new Set();
    if (hasModifier(node, ts.SyntaxKind.ReadonlyKeyword, ts)) {
        modifiers.add("readonly");
    }
    if (hasModifier(node, ts.SyntaxKind.StaticKeyword, ts)) {
        modifiers.add("static");
    }
    if (ts.isGetAccessor(node)) {
        modifiers.add("readonly");
    }
    return modifiers.size > 0 ? modifiers : undefined;
}
/**
 * Returns if a number has a flag
 * @param num
 * @param flag
 */
function hasFlag(num, flag) {
    return (num & flag) !== 0;
}
/**
 * Returns if a node has a specific modifier.
 * @param node
 * @param modifierKind
 */
function hasModifier(node, modifierKind, ts) {
    if (!ts.canHaveModifiers(node)) {
        return false;
    }
    const modifiers = ts.getModifiers(node);
    if (modifiers == null)
        return false;
    return (node.modifiers || []).find(modifier => modifier.kind === modifierKind) != null;
}
/**
 * Returns the visibility of a node
 */
function getMemberVisibilityFromNode(node, ts) {
    if (hasModifier(node, ts.SyntaxKind.PrivateKeyword, ts) || ("name" in node && ts.isIdentifier(node.name) && isNamePrivate(node.name.text))) {
        return "private";
    }
    else if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword, ts)) {
        return "protected";
    }
    else if (getNodeSourceFileLang(node) === "ts") {
        // Only return "public" in typescript land
        return "public";
    }
    return undefined;
}
/**
 * Returns all keys and corresponding interface/class declarations for keys in an interface.
 * @param interfaceDeclaration
 * @param context
 */
function getInterfaceKeys(interfaceDeclaration, context) {
    const extensions = [];
    const { ts } = context;
    for (const member of interfaceDeclaration.members) {
        // { "my-button": MyButton; }
        if (ts.isPropertySignature(member) && member.type != null) {
            const resolvedKey = resolveNodeValue(member.name, context);
            if (resolvedKey == null) {
                continue;
            }
            let identifier;
            let declaration;
            if (ts.isTypeReferenceNode(member.type)) {
                // { ____: MyButton; } or { ____: namespace.MyButton; }
                identifier = member.type.typeName;
            }
            else if (ts.isTypeLiteralNode(member.type)) {
                identifier = undefined;
                declaration = member.type;
            }
            else {
                continue;
            }
            if (declaration != null || identifier != null) {
                extensions.push({ key: String(resolvedKey.value), keyNode: resolvedKey.node, declaration, identifier });
            }
        }
    }
    return extensions;
}
/**
 * Find a node recursively walking up the tree using parent nodes.
 * @param node
 * @param test
 */
function findParent(node, test) {
    if (node == null)
        return;
    return test(node) ? node : findParent(node.parent, test);
}
/**
 * Find a node recursively walking down the children of the tree. Depth first search.
 * @param node
 * @param test
 */
function findChild(node, test) {
    if (!node)
        return;
    if (test(node))
        return node;
    return node.forEachChild(child => findChild(child, test));
}
/**
 * Find multiple children by walking down the children of the tree. Depth first search.
 * @param node
 * @param test
 * @param emit
 */
function findChildren(node, test, emit) {
    if (!node)
        return;
    if (test(node)) {
        emit(node);
    }
    node.forEachChild(child => findChildren(child, test, emit));
}
/**
 * Returns the language of the node's source file
 * @param node
 */
function getNodeSourceFileLang(node) {
    return node.getSourceFile().fileName.endsWith("ts") ? "ts" : "js";
}
/**
 * Returns the leading comment for a given node
 * @param node
 * @param ts
 */
function getLeadingCommentForNode(node, ts) {
    const sourceFileText = node.getSourceFile().text;
    const leadingComments = ts.getLeadingCommentRanges(sourceFileText, node.pos);
    if (leadingComments != null && leadingComments.length > 0) {
        return sourceFileText.substring(leadingComments[0].pos, leadingComments[0].end);
    }
    return undefined;
}
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param context
 */
function getNodeName(node, context) {
    var _a;
    return (_a = getNodeIdentifier(node, context)) === null || _a === void 0 ? void 0 : _a.getText();
}
/**
 * Returns the declaration name of a given node if possible.
 * @param node
 * @param context
 */
function getNodeIdentifier(node, context) {
    if (context.ts.isIdentifier(node)) {
        return node;
    }
    else if ((context.ts.isClassLike(node) ||
        context.ts.isInterfaceDeclaration(node) ||
        context.ts.isVariableDeclaration(node) ||
        context.ts.isMethodDeclaration(node) ||
        context.ts.isPropertyDeclaration(node) ||
        context.ts.isFunctionDeclaration(node)) &&
        node.name != null &&
        context.ts.isIdentifier(node.name)) {
        return node.name;
    }
    return undefined;
}
/**
 * Returns all decorators in either the node's `decorators` or `modifiers`.
 * @param node
 * @param context
 */
function getDecorators(node, context) {
    var _a;
    const { ts } = context;
    return ts.canHaveDecorators(node) ? (_a = ts.getDecorators(node)) !== null && _a !== void 0 ? _a : [] : [];
}

/**
 * Visits custom element definitions.
 * @param node
 * @param ts
 * @param checker
 */
function discoverDefinitions$5(node, { ts, checker }) {
    // customElements.define("my-element", MyElement)
    if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.escapedText === "define") {
            let leftExpression = node.expression.expression;
            // Take "window.customElements" into account and return the "customElements" part
            if (ts.isPropertyAccessExpression(leftExpression) &&
                ts.isIdentifier(leftExpression.expression) &&
                leftExpression.expression.escapedText === "window") {
                leftExpression = leftExpression.name;
            }
            // Check if the "left expression" is called "customElements"
            if (ts.isIdentifier(leftExpression) &&
                leftExpression.escapedText === "customElements" &&
                node.expression.name != null &&
                ts.isIdentifier(node.expression.name)) {
                // Find the arguments of: define("my-element", MyElement)
                const [unresolvedTagNameNode, identifierNode] = node.arguments;
                // Resolve the tag name node
                // ("my-element", MyElement)
                const resolvedTagNameNode = resolveNodeValue(unresolvedTagNameNode, { ts, checker, strict: true });
                if (resolvedTagNameNode != null && identifierNode != null && typeof resolvedTagNameNode.value === "string") {
                    const tagName = resolvedTagNameNode.value;
                    const tagNameNode = resolvedTagNameNode.node;
                    // (___, MyElement)
                    if (ts.isIdentifier(identifierNode)) {
                        return [
                            {
                                tagName,
                                identifierNode,
                                tagNameNode
                            }
                        ];
                    }
                    // (___, class { ... })
                    else if (ts.isClassLike(identifierNode) || ts.isInterfaceDeclaration(identifierNode)) {
                        return [
                            {
                                tagName,
                                tagNameNode,
                                declarationNode: identifierNode
                            }
                        ];
                    }
                }
            }
        }
        return undefined;
    }
    // interface HTMLElementTagNameMap { "my-button": MyButton; }
    if (ts.isInterfaceDeclaration(node) && ["HTMLElementTagNameMap", "ElementTagNameMap"].includes(node.name.text)) {
        const extensions = getInterfaceKeys(node, { ts, checker });
        return extensions.map(({ key, keyNode, identifier, declaration }) => ({
            tagName: key,
            tagNameNode: keyNode,
            identifierNode: identifier,
            declarationNode: declaration
        }));
    }
    return undefined;
}

/**
 * Flattens an array.
 * Use this function to keep support for node 10
 * @param items
 */
function arrayFlat(items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("flat" in items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return items.flat();
    }
    const flattenArray = [];
    for (const item of items) {
        if (Array.isArray(item)) {
            flattenArray.push(...item);
        }
        else {
            flattenArray.push(item);
        }
    }
    return flattenArray;
}
/**
 * Filters an array returning only defined items
 * @param array
 */
function arrayDefined(array) {
    return array.filter((item) => item != null);
}
/**
 * Filters an array returning only unique itesm
 * @param array
 */
function arrayDedupe(array) {
    const uniqueItems = [];
    for (const item of array) {
        if (uniqueItems.indexOf(item) === -1) {
            uniqueItems.push(item);
        }
    }
    return uniqueItems;
}

const NOTHING = Symbol();
/**
 * This function wraps a callback returning a value and cahced the value.
 * @param callback
 */
function lazy(callback) {
    let value = NOTHING;
    return () => {
        if (value === NOTHING) {
            value = callback();
        }
        return value;
    };
}

/**
 * Relax the type so that for example "string literal" become "string" and "function" become "any"
 * This is used for javascript files to provide type checking with Typescript type inferring
 * @param type
 */
function relaxType(type) {
    switch (type.kind) {
        case "INTERSECTION":
        case "UNION":
            return {
                ...type,
                types: type.types.map(t => relaxType(t))
            };
        case "ENUM":
            return {
                ...type,
                types: type.types.map(t => relaxType(t))
            };
        case "ARRAY":
            return {
                ...type,
                type: relaxType(type.type)
            };
        case "PROMISE":
            return {
                ...type,
                type: relaxType(type.type)
            };
        case "OBJECT":
            return {
                name: type.name,
                kind: "OBJECT"
            };
        case "INTERFACE":
        case "FUNCTION":
        case "CLASS":
            return {
                name: type.name,
                kind: "ANY"
            };
        case "NUMBER_LITERAL":
            return { kind: "NUMBER" };
        case "STRING_LITERAL":
            return { kind: "STRING" };
        case "BOOLEAN_LITERAL":
            return { kind: "BOOLEAN" };
        case "BIG_INT_LITERAL":
            return { kind: "BIG_INT" };
        case "ENUM_MEMBER":
            return {
                ...type,
                type: relaxType(type.type)
            };
        case "ALIAS":
            return {
                ...type,
                target: relaxType(type.target)
            };
        case "NULL":
        case "UNDEFINED":
            return { kind: "ANY" };
        default:
            return type;
    }
}
// Only search in "lib.dom.d.ts" performance reasons for now
const LIB_FILE_NAMES = ["lib.dom.d.ts"];
// Map "tsModule => name => SimpleType"
const LIB_TYPE_CACHE = new Map();
/**
 * Return a Typescript library type with a specific name
 * @param name
 * @param ts
 * @param program
 */
function getLibTypeWithName(name, { ts, program }) {
    var _a;
    const nameTypeCache = LIB_TYPE_CACHE.get(ts) || new Map();
    if (nameTypeCache.has(name)) {
        return nameTypeCache.get(name);
    }
    else {
        LIB_TYPE_CACHE.set(ts, nameTypeCache);
    }
    let node;
    for (const libFileName of LIB_FILE_NAMES) {
        const sourceFile = program.getSourceFile(libFileName) || program.getSourceFiles().find(f => f.fileName.endsWith(libFileName));
        if (sourceFile == null) {
            continue;
        }
        for (const statement of sourceFile.statements) {
            if (ts.isInterfaceDeclaration(statement) && ((_a = statement.name) === null || _a === void 0 ? void 0 : _a.text) === name) {
                node = statement;
                break;
            }
        }
        if (node != null) {
            break;
        }
    }
    const checker = program.getTypeChecker();
    let type = node == null ? undefined : tsSimpleType.toSimpleType(node, checker);
    if (type != null) {
        // Apparently Typescript wraps the type in "generic arguments" when take the type from the interface declaration
        // Remove "generic arguments" here
        if (type.kind === "GENERIC_ARGUMENTS") {
            type = type.target;
        }
    }
    nameTypeCache.set(name, type);
    return type;
}

/**
 * Returns typescript jsdoc node for a given node
 * @param node
 * @param ts
 */
function getJSDocNode(node, ts) {
    var _a, _b, _c;
    const parent = (_b = (_a = ts.getJSDocTags(node)) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.parent;
    if (parent != null && ts.isJSDoc(parent)) {
        return parent;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_c = node.jsDoc) === null || _c === void 0 ? void 0 : _c.find((n) => ts.isJSDoc(n));
}
/**
 * Returns jsdoc for a given node.
 * @param node
 * @param ts
 * @param tagNames
 */
function getJsDoc(node, ts, tagNames) {
    var _a;
    const jsDocNode = getJSDocNode(node, ts);
    // If we couldn't find jsdoc, find and parse the jsdoc string ourselves
    if (jsDocNode == null) {
        const leadingComment = getLeadingCommentForNode(node, ts);
        if (leadingComment != null) {
            const jsDoc = parseJsDocString(leadingComment);
            // Return this jsdoc if we don't have to filter by tag name
            if (jsDoc == null || tagNames == null || tagNames.length === 0) {
                return jsDoc;
            }
            return {
                ...jsDoc,
                tags: (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.filter(t => tagNames.includes(t.tag))
            };
        }
        return undefined;
    }
    // Parse all jsdoc tags
    // Typescript removes some information after parsing jsdoc tags, so unfortunately we will have to parse.
    return {
        description: jsDocNode.comment == null ? undefined : unescapeJSDoc(String(jsDocNode.comment)),
        node: jsDocNode,
        tags: jsDocNode.tags == null
            ? []
            : arrayDefined(jsDocNode.tags.map(node => {
                var _a, _b;
                const tag = String(node.tagName.escapedText);
                // Filter by tag name
                if (tagNames != null && tagNames.length > 0 && !tagNames.includes(tag.toLowerCase())) {
                    return undefined;
                }
                // If Typescript generated a "type expression" or "name", comment will not include those.
                // We can't just use what typescript parsed because it doesn't include things like optional jsdoc: name notation [...]
                // Therefore we need to manually get the text and remove newlines/*
                const typeExpressionPart = "typeExpression" in node ? (_a = node.typeExpression) === null || _a === void 0 ? void 0 : _a.getText() : undefined;
                const namePart = "name" in node ? (_b = node.name) === null || _b === void 0 ? void 0 : _b.getText() : undefined;
                const fullComment = (typeExpressionPart === null || typeExpressionPart === void 0 ? void 0 : typeExpressionPart.startsWith("@"))
                    ? // To make matters worse, if Typescript can't parse a certain jsdoc, it will include the rest of the jsdocs tag from there in "typeExpressionPart"
                        // Therefore we check if there are multiple jsdoc tags in the string to only take the first one
                        // This will discard the following jsdocs, but at least we don't crash :-)
                        typeExpressionPart.split(/\n\s*\*\s?@/)[0] || ""
                    : `@${tag}${typeExpressionPart != null ? ` ${typeExpressionPart} ` : ""}${namePart != null ? ` ${namePart} ` : ""} ${node.comment || ""}`;
                const comment = typeof node.comment === "string" ? node.comment.replace(/^\s*-\s*/, "").trim() : "";
                return {
                    node,
                    tag,
                    comment,
                    parsed: lazy(() => parseJsDocTagString(fullComment))
                };
            }))
    };
}
/**
 * Converts a given string to a SimpleType
 * Defaults to ANY
 * See http://usejsdoc.org/tags-type.html
 * @param str
 * @param context
 */
function parseSimpleJsDocTypeExpression(str, context) {
    // Fail safe if "str" is somehow undefined
    if (str == null) {
        return { kind: "ANY" };
    }
    // Parse normal types
    switch (str.toLowerCase()) {
        case "undefined":
            return { kind: "UNDEFINED" };
        case "null":
            return { kind: "NULL" };
        case "string":
            return { kind: "STRING" };
        case "number":
            return { kind: "NUMBER" };
        case "boolean":
            return { kind: "BOOLEAN" };
        case "array":
            return { kind: "ARRAY", type: { kind: "ANY" } };
        case "object":
            return { kind: "OBJECT", members: [] };
        case "any":
        case "*":
            return { kind: "ANY" };
    }
    // Match
    //  {  string  }
    if (str.startsWith(" ") || str.endsWith(" ")) {
        return parseSimpleJsDocTypeExpression(str.trim(), context);
    }
    // Match:
    //   {string|number}
    if (str.includes("|")) {
        return {
            kind: "UNION",
            types: str.split("|").map(str => {
                const childType = parseSimpleJsDocTypeExpression(str, context);
                // Convert ANY types to string literals so that {on|off} is "on"|"off" and not ANY|ANY
                if (childType.kind === "ANY") {
                    return {
                        kind: "STRING_LITERAL",
                        value: str
                    };
                }
                return childType;
            })
        };
    }
    // Match:
    //  {?number}       (nullable)
    //  {!number}       (not nullable)
    //  {...number}     (array of)
    const prefixMatch = str.match(/^(\?|!|(\.\.\.))(.+)$/);
    if (prefixMatch != null) {
        const modifier = prefixMatch[1];
        const type = parseSimpleJsDocTypeExpression(prefixMatch[3], context);
        switch (modifier) {
            case "?":
                return {
                    kind: "UNION",
                    types: [
                        {
                            kind: "NULL"
                        },
                        type
                    ]
                };
            case "!":
                return type;
            case "...":
                return {
                    kind: "ARRAY",
                    type
                };
        }
    }
    // Match:
    //  {(......)}
    const parenMatch = str.match(/^\((.+)\)$/);
    if (parenMatch != null) {
        return parseSimpleJsDocTypeExpression(parenMatch[1], context);
    }
    // Match
    //   {"red"}
    const stringLiteralMatch = str.match(/^["'](.+)["']$/);
    if (stringLiteralMatch != null) {
        return {
            kind: "STRING_LITERAL",
            value: stringLiteralMatch[1]
        };
    }
    // Match
    //   {[number]}
    const arrayMatch = str.match(/^\[(.+)]$/);
    if (arrayMatch != null) {
        return {
            kind: "ARRAY",
            type: parseSimpleJsDocTypeExpression(arrayMatch[1], context)
        };
    }
    // Match
    //   CustomEvent<string>
    //   MyInterface<string, number>
    //   MyInterface<{foo: string, bar: string}, number>
    const genericArgsMatch = str.match(/^(.*)<(.*)>$/);
    if (genericArgsMatch != null) {
        // Here we split generic arguments by "," and
        //   afterwards remerge parts that were incorrectly split
        // For example: "{foo: string, bar: string}, number" would result in
        //   ["{foo: string", "bar: string}", "number"]
        // The correct way to improve "parseSimpleJsDocTypeExpression" is to build a custom lexer/parser.
        const typeArgStrings = [];
        for (const part of genericArgsMatch[2].split(/\s*,\s*/)) {
            if (part.match(/[}:]/) != null && typeArgStrings.length > 0) {
                typeArgStrings[typeArgStrings.length - 1] += `, ${part}`;
            }
            else {
                typeArgStrings.push(part);
            }
        }
        return {
            kind: "GENERIC_ARGUMENTS",
            target: parseSimpleJsDocTypeExpression(genericArgsMatch[1], context),
            typeArguments: typeArgStrings.map(typeArg => parseSimpleJsDocTypeExpression(typeArg, context))
        };
    }
    // If nothing else, try to find the type in Typescript global lib or else return "any"
    return getLibTypeWithName(str, context) || { kind: "ANY" };
}
/**
 * Finds a @type jsdoc tag in the jsdoc and returns the corresponding simple type
 * @param jsDoc
 * @param context
 */
function getJsDocType(jsDoc, context) {
    var _a;
    if (jsDoc.tags != null) {
        const typeJsDocTag = jsDoc.tags.find(t => t.tag === "type");
        if (typeJsDocTag != null) {
            // We get the text of the node because typescript strips the type jsdoc tag under certain circumstances
            const parsedJsDoc = parseJsDocTagString(((_a = typeJsDocTag.node) === null || _a === void 0 ? void 0 : _a.getText()) || "");
            if (parsedJsDoc.type != null) {
                return parseSimpleJsDocTypeExpression(parsedJsDoc.type, context);
            }
        }
    }
}
const JSDOC_TAGS_WITH_REQUIRED_NAME = ["param", "fires", "@element", "@customElement"];
/**
 * Takes a string that represents a value in jsdoc and transforms it to a javascript value
 * @param value
 */
function parseJsDocValue(value) {
    if (value == null) {
        return value;
    }
    // Parse quoted strings
    const quotedMatch = value.match(/^["'`](.*)["'`]$/);
    if (quotedMatch != null) {
        return quotedMatch[1];
    }
    // Parse keywords
    switch (value) {
        case "false":
            return false;
        case "true":
            return true;
        case "undefined":
            return undefined;
        case "null":
            return null;
    }
    // Parse number
    if (!isNaN(Number(value))) {
        return Number(value);
    }
    return value;
}
/**
 * Parses "@tag {type} name description" or "@tag name {type} description"
 * @param str
 */
function parseJsDocTagString(str) {
    const jsDocTag = {
        tag: ""
    };
    if (str[0] !== "@") {
        return jsDocTag;
    }
    const moveStr = (byLength) => {
        str = str.substring(typeof byLength === "number" ? byLength : byLength.length);
    };
    const unqouteStr = (quotedStr) => {
        return quotedStr.replace(/^['"](.+)["']$/, (_, match) => match);
    };
    const matchTag = () => {
        // Match tag
        // Example: "  @mytag"
        const tagResult = str.match(/^(\s*@(\S+))/);
        if (tagResult == null) {
            return jsDocTag;
        }
        else {
            // Move string to the end of the match
            // Example: "  @mytag|"
            moveStr(tagResult[1]);
            jsDocTag.tag = tagResult[2];
        }
    };
    const matchType = () => {
        // Match type
        // Example: "   {MyType}"
        const typeResult = str.match(/^(\s*{([\s\S]*)})/);
        if (typeResult != null) {
            // Move string to the end of the match
            // Example: "  {MyType}|"
            moveStr(typeResult[1]);
            jsDocTag.type = typeResult[2];
        }
    };
    const matchName = () => {
        // Match optional name
        // Example: "  [myname=mydefault]"
        const defaultNameResult = str.match(/^(\s*\[([\s\S]+)\])/);
        if (defaultNameResult != null) {
            // Move string to the end of the match
            // Example: "  [myname=mydefault]|"
            moveStr(defaultNameResult[1]);
            // Using [...] means that this doc is optional
            jsDocTag.optional = true;
            // Split the inner content between [...] into parts
            // Example:  "myname=mydefault" => "myname", "mydefault"
            const parts = defaultNameResult[2].split("=");
            if (parts.length === 2) {
                // Both name and default were given
                jsDocTag.name = unqouteStr(parts[0]);
                jsDocTag.default = parseJsDocValue(parts[1]);
            }
            else if (parts.length !== 0) {
                // No default was given
                jsDocTag.name = unqouteStr(parts[0]);
            }
        }
        else {
            // else, match required name
            // Example: "   myname"
            // A name is needed some jsdoc tags making it possible to include omit "-"
            // Therefore we don't look for "-" or line end if the name is required - in that case we only need to eat the first word to find the name.
            const regex = JSDOC_TAGS_WITH_REQUIRED_NAME.includes(jsDocTag.tag) ? /^(\s*(\S+))/ : /^(\s*(\S+))((\s*-[\s\S]+)|\s*)($|[\r\n])/;
            const nameResult = str.match(regex);
            if (nameResult != null) {
                // Move string to end of match
                // Example: "   myname|"
                moveStr(nameResult[1]);
                jsDocTag.name = unqouteStr(nameResult[2].trim());
            }
        }
    };
    const matchComment = () => {
        // Match comment
        if (str.length > 0) {
            // The rest of the string is parsed as comment. Remove "-" if needed.
            jsDocTag.description = str.replace(/^\s*-\s*/, "").trim() || undefined;
        }
        // Expand the name based on namespace and classname
        if (jsDocTag.name != null) {
            /**
             * The name could look like this, so we need to parse and the remove the class name and namespace from the name
             *   InputSwitch#[CustomEvent]input-switch-check-changed
             *   InputSwitch#input-switch-check-changed
             */
            const match = jsDocTag.name.match(/(.*)#(\[.*\])?(.*)/);
            if (match != null) {
                jsDocTag.className = match[1];
                jsDocTag.namespace = match[2];
                jsDocTag.name = match[3];
            }
        }
    };
    matchTag();
    matchType();
    matchName();
    // Type can come both before and after "name"
    if (jsDocTag.type == null) {
        matchType();
    }
    matchComment();
    return jsDocTag;
}
/**
 * Parses an entire jsdoc string
 * @param doc
 */
function parseJsDocString(doc) {
    // Prepare lines
    const lines = doc.split("\n").map(line => line.trim());
    let description = "";
    let readDescription = true;
    let currentTag = "";
    const tags = [];
    /**
     * Parsing will add to "currentTag" and commit it when necessary
     */
    const commitCurrentTag = () => {
        if (currentTag.length > 0) {
            const tagToCommit = currentTag;
            const tagMatch = tagToCommit.match(/^@(\S+)\s*/);
            if (tagMatch != null) {
                tags.push({
                    parsed: lazy(() => parseJsDocTagString(tagToCommit)),
                    node: undefined,
                    tag: tagMatch[1],
                    comment: tagToCommit.substr(tagMatch[0].length)
                });
            }
            currentTag = "";
        }
    };
    // Parse all lines one by one
    for (const line of lines) {
        // Don't parse the last line ("*/")
        if (line.match(/\*\//)) {
            continue;
        }
        // Match a line like: "* @mytag description"
        const tagCommentMatch = line.match(/(^\s*\*\s*)@\s*/);
        if (tagCommentMatch != null) {
            // Commit current tag (if any has been read). Now "currentTag" will reset.
            commitCurrentTag();
            // Add everything on the line from "@"
            currentTag += line.substr(tagCommentMatch[1].length);
            // We hit a jsdoc tag, so don't read description anymore
            readDescription = false;
        }
        else if (!readDescription) {
            // If we are not reading the description, we are currently reading a multiline tag
            const commentMatch = line.match(/^\s*\*\s*/);
            if (commentMatch != null) {
                currentTag += "\n" + line.substr(commentMatch[0].length);
            }
        }
        else {
            // Read everything after "*" into the description if we are currently reading the description
            // If we are on the first line, add everything after "/*"
            const startLineMatch = line.match(/^\s*\/\*\*/);
            if (startLineMatch != null) {
                description += line.substr(startLineMatch[0].length);
            }
            // Add everything after "*" into the current description
            const commentMatch = line.match(/^\s*\*\s*/);
            if (commentMatch != null) {
                if (description.length > 0) {
                    description += "\n";
                }
                description += line.substr(commentMatch[0].length);
            }
        }
    }
    // Commit a tag if we were currently parsing one
    commitCurrentTag();
    if (description.length === 0 && tags.length === 0) {
        return undefined;
    }
    return {
        description: unescapeJSDoc(description),
        tags
    };
}
/**
 * Certain characters as "@" can be escaped in order to prevent Typescript from
 * parsing it as a jsdoc tag. This function unescapes these characters.
 * @param str
 */
function unescapeJSDoc(str) {
    return str.replace(/\\@/, "@");
}

const EVENT_NAMES = [
    "Event",
    "CustomEvent",
    "AnimationEvent",
    "ClipboardEvent",
    "DragEvent",
    "FocusEvent",
    "HashChangeEvent",
    "InputEvent",
    "KeyboardEvent",
    "MouseEvent",
    "PageTransitionEvent",
    "PopStateEvent",
    "ProgressEvent",
    "StorageEvent",
    "TouchEvent",
    "TransitionEvent",
    "UiEvent",
    "WheelEvent"
];
/**
 * Discovers events dispatched
 * @param node
 * @param context
 */
function discoverEvents(node, context) {
    var _a;
    const { ts, checker } = context;
    // new CustomEvent("my-event");
    if (ts.isNewExpression(node)) {
        const { expression, arguments: args } = node;
        if (EVENT_NAMES.includes(expression.getText()) && args && args.length >= 1) {
            const arg = args[0];
            const eventName = (_a = resolveNodeValue(arg, { ...context, strict: true })) === null || _a === void 0 ? void 0 : _a.value;
            if (typeof eventName === "string") {
                // Either grab jsdoc from the new expression or from a possible call expression that its wrapped in
                const jsDoc = getJsDoc(expression, ts) ||
                    (ts.isCallLikeExpression(node.parent) && getJsDoc(node.parent.parent, ts)) ||
                    (ts.isExpressionStatement(node.parent) && getJsDoc(node.parent, ts)) ||
                    undefined;
                return [
                    {
                        jsDoc,
                        name: eventName,
                        node,
                        type: lazy(() => checker.getTypeAtLocation(node))
                    }
                ];
            }
        }
    }
    return undefined;
}

/**
 * Discovers global feature defined on "HTMLElementEventMap" or "HTMLElement"
 */
const discoverGlobalFeatures$3 = {
    event: (node, context) => {
        var _a, _b;
        const { ts, checker } = context;
        if (context.ts.isInterfaceDeclaration(node) && ["HTMLElementEventMap", "GlobalEventHandlersEventMap"].includes(node.name.text)) {
            const events = [];
            for (const member of node.members) {
                if (ts.isPropertySignature(member)) {
                    const name = (_a = resolveNodeValue(member.name, context)) === null || _a === void 0 ? void 0 : _a.value;
                    if (name != null && typeof name === "string") {
                        events.push({
                            node: member,
                            jsDoc: getJsDoc(member, ts),
                            name: name,
                            type: lazy(() => checker.getTypeAtLocation(member))
                        });
                    }
                }
            }
            (_b = context === null || context === void 0 ? void 0 : context.emitContinue) === null || _b === void 0 ? void 0 : _b.call(context);
            return events;
        }
    },
    member: (node, context) => {
        var _a, _b;
        const { ts } = context;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            const members = [];
            for (const member of node.members) {
                if (ts.isPropertySignature(member)) {
                    const name = (_a = resolveNodeValue(member.name, context)) === null || _a === void 0 ? void 0 : _a.value;
                    if (name != null && typeof name === "string") {
                        members.push({
                            priority: "medium",
                            node: member,
                            jsDoc: getJsDoc(member, ts),
                            kind: "property",
                            propName: name,
                            type: lazy(() => context.checker.getTypeAtLocation(member))
                        });
                    }
                }
            }
            (_b = context === null || context === void 0 ? void 0 : context.emitContinue) === null || _b === void 0 ? void 0 : _b.call(context);
            return members;
        }
    }
};

/**
 * Discovers inheritance from a node by looking at "extends" and "implements"
 * @param node
 * @param baseContext
 */
function discoverInheritance$1(node, baseContext) {
    let declarationKind = undefined;
    const heritageClauses = [];
    const declarationNodes = new Set();
    const context = {
        ...baseContext,
        emitDeclaration: decl => declarationNodes.add(decl),
        emitInheritance: (kind, identifier) => heritageClauses.push({ kind, identifier, declaration: undefined }),
        emitDeclarationKind: kind => (declarationKind = declarationKind || kind),
        visitedNodes: new Set()
    };
    // Resolve the structure of the node
    resolveStructure(node, context);
    // Reverse heritage clauses because they come out in wrong order
    heritageClauses.reverse();
    return {
        declarationNodes: Array.from(declarationNodes),
        heritageClauses,
        declarationKind
    };
}
function resolveStructure(node, context) {
    const { ts } = context;
    if (context.visitedNodes.has(node)) {
        return;
    }
    context.visitedNodes.add(node);
    // Call this function recursively if this node is an identifier
    if (ts.isIdentifier(node)) {
        for (const decl of resolveDeclarationsDeep(node, context)) {
            resolveStructure(decl, context);
        }
    }
    // Emit declaration node if we've found a class of interface
    else if (ts.isClassLike(node) || ts.isInterfaceDeclaration(node)) {
        context.emitDeclarationKind(ts.isClassLike(node) ? "class" : "interface");
        context.emitDeclaration(node);
        // Resolve inheritance
        for (const heritage of node.heritageClauses || []) {
            for (const type of heritage.types || []) {
                resolveHeritage(heritage, type.expression, context);
            }
        }
    }
    // Emit a declaration node if this node is a type literal
    else if (ts.isTypeLiteralNode(node) || ts.isObjectLiteralExpression(node)) {
        context.emitDeclarationKind("interface");
        context.emitDeclaration(node);
    }
    // Emit a mixin if this node is a function
    else if (ts.isFunctionLike(node) || ts.isCallLikeExpression(node)) {
        context.emitDeclarationKind("mixin");
        if (ts.isFunctionLike(node) && node.getSourceFile().isDeclarationFile) {
            // Find any identifiers if the node is in a declaration file
            findChildren(node.type, ts.isIdentifier, identifier => {
                resolveStructure(identifier, context);
            });
        }
        else {
            // Else find the first class declaration in the block
            // Note that we don't look for a return statement because this would complicate things
            const clzDecl = findChild(node, ts.isClassLike);
            if (clzDecl != null) {
                resolveStructure(clzDecl, context);
                return;
            }
            // If we didn't find any class declarations, we might be in a function that wraps a mixin
            // Therefore find the return statement and call this method recursively
            const returnNode = findChild(node, ts.isReturnStatement);
            if (returnNode != null && returnNode.expression != null && returnNode.expression !== node) {
                const returnNodeExp = returnNode.expression;
                // If a function call is returned, this function call expression is followed, and the arguments are treated as heritage
                //    Example: return MyFirstMixin(MySecondMixin(Base))   -->   MyFirstMixin is followed, and MySecondMixin + Base are inherited
                if (ts.isCallExpression(returnNodeExp) && returnNodeExp.expression != null) {
                    for (const arg of returnNodeExp.arguments) {
                        resolveHeritage(undefined, arg, context);
                    }
                    resolveStructure(returnNodeExp.expression, context);
                }
                return;
            }
        }
    }
    else if (ts.isVariableDeclaration(node) && (node.initializer != null || node.type != null)) {
        resolveStructure((node.initializer || node.type), context);
    }
    else if (ts.isIntersectionTypeNode(node)) {
        emitTypeLiteralsDeclarations(node, context);
    }
}
function resolveHeritage(heritage, node, context) {
    const { ts } = context;
    /**
     * Parse mixins
     */
    if (ts.isCallExpression(node)) {
        // Mixins
        const { expression: identifier, arguments: args } = node;
        // Extend classes given to the mixin
        // Example: class MyElement extends MyMixin(MyBase) --> MyBase
        // Example: class MyElement extends MyMixin(MyBase1, MyBase2) --> MyBase1, MyBase2
        for (const arg of args) {
            resolveHeritage(heritage, arg, context);
        }
        // Resolve and traverse the mixin function
        // Example: class MyElement extends MyMixin(MyBase) --> MyMixin
        if (identifier != null && ts.isIdentifier(identifier)) {
            resolveHeritage("mixin", identifier, context);
        }
    }
    else if (ts.isIdentifier(node)) {
        // Try to handle situation like this, by resolving the variable in between
        //    const Base = ExtraMixin(base);
        //    class MixinClass extends Base { }
        let dontEmitHeritageClause = false;
        // Resolve the declaration of this identifier
        const declarations = resolveDeclarationsDeep(node, context);
        for (const decl of declarations) {
            // If the resolved declaration is a variable declaration assigned to a function, try to follow the assignments.
            //    Example:    const MyBase = MyMixin(Base); return class extends MyBase { ... }
            if (context.ts.isVariableDeclaration(decl) && decl.initializer != null) {
                if (context.ts.isCallExpression(decl.initializer)) {
                    let hasDeclaration = false;
                    resolveStructure(decl, {
                        ...context,
                        emitInheritance: () => { },
                        emitDeclarationKind: () => { },
                        emitDeclaration: () => {
                            hasDeclaration = true;
                        }
                    });
                    if (!hasDeclaration) {
                        resolveHeritage(heritage, decl.initializer, context);
                        dontEmitHeritageClause = true;
                    }
                }
            }
            // Don't emit inheritance if it's a parameter, because the parameter
            //    is a subsitution for the actual base class which we have already resolved.
            else if (context.ts.isParameter(decl)) {
                dontEmitHeritageClause = true;
            }
        }
        if (!dontEmitHeritageClause) {
            // This is an "implements" clause if implement keyword is used or if all the resolved declarations are interfaces
            const kind = heritage != null && typeof heritage === "string"
                ? heritage
                : (heritage === null || heritage === void 0 ? void 0 : heritage.token) === ts.SyntaxKind.ImplementsKeyword ||
                    (declarations.length > 0 && !declarations.some(decl => !context.ts.isInterfaceDeclaration(decl)))
                    ? "implements"
                    : "extends";
            context.emitInheritance(kind, node);
        }
    }
}
/**
 * Emits "type literals" in the AST. Emits them with "emitDeclaration"
 * @param node
 * @param context
 */
function emitTypeLiteralsDeclarations(node, context) {
    var _a;
    if (context.ts.isTypeLiteralNode(node)) {
        // If we encounter a construct signature, follow the type
        const construct = (_a = node.members) === null || _a === void 0 ? void 0 : _a.find((member) => context.ts.isConstructSignatureDeclaration(member));
        if (construct != null && construct.type != null) {
            context.emitDeclarationKind("mixin");
            emitTypeLiteralsDeclarations(construct.type, context);
        }
        else {
            context.emitDeclaration(node);
        }
    }
    else {
        node.forEachChild(n => emitTypeLiteralsDeclarations(n, context));
    }
}

/**
 * Discovers members based on standard vanilla custom element rules
 * @param node
 * @param context
 */
function discoverMembers$2(node, context) {
    var _a, _b;
    const { ts, checker } = context;
    // Never pick up members not declared directly on the declaration node being traversed
    if (node.parent !== context.declarationNode) {
        return undefined;
    }
    // static get observedAttributes() { return ['c', 'l']; }
    if (ts.isGetAccessor(node) && hasModifier(node, ts.SyntaxKind.StaticKeyword, ts)) {
        if (node.name.getText() === "observedAttributes" && node.body != null) {
            const members = [];
            // Find either the first "return" statement or the first "array literal expression"
            const arrayLiteralExpression = (_b = (_a = node.body.statements.find(statement => ts.isReturnStatement(statement))) === null || _a === void 0 ? void 0 : _a.expression) !== null && _b !== void 0 ? _b : node.body.statements.find(statement => ts.isArrayLiteralExpression(statement));
            if (arrayLiteralExpression != null && ts.isArrayLiteralExpression(arrayLiteralExpression)) {
                // Emit an attribute for each string literal in the array.
                for (const attrNameNode of arrayLiteralExpression.elements) {
                    const attrName = ts.isStringLiteralLike(attrNameNode) ? attrNameNode.text : undefined;
                    if (attrName == null)
                        continue;
                    members.push({
                        priority: "medium",
                        node: attrNameNode,
                        jsDoc: getJsDoc(attrNameNode, ts),
                        kind: "attribute",
                        attrName,
                        type: undefined // () => ({ kind: "ANY" } as SimpleType),
                    });
                }
            }
            return members;
        }
    }
    // class { myProp = "hello"; }
    else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        const { name, initializer } = (() => {
            if (ts.isPropertySignature(node)) {
                return { name: node.name, initializer: undefined };
            }
            return node;
        })();
        if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
            // Always ignore the "prototype" property
            if (name.text === "prototype") {
                return undefined;
            }
            // Find default value based on initializer
            const resolvedDefaultValue = initializer != null ? resolveNodeValue(initializer, context) : undefined;
            const def = resolvedDefaultValue != null ? resolvedDefaultValue.value : initializer === null || initializer === void 0 ? void 0 : initializer.getText();
            return [
                {
                    priority: "high",
                    node,
                    kind: "property",
                    jsDoc: getJsDoc(node, ts),
                    propName: name.text,
                    type: lazy(() => checker.getTypeAtLocation(node)),
                    default: def,
                    visibility: getMemberVisibilityFromNode(node, ts),
                    modifiers: getModifiersFromNode(node, ts)
                    //required: isPropertyRequired(node, context.checker),
                }
            ];
        }
    }
    // class { set myProp(value: string) { ... } }
    else if (ts.isSetAccessor(node) || ts.isGetAccessor(node)) {
        const { name, parameters } = node;
        if (ts.isIdentifier(name)) {
            const parameter = ts.isSetAccessor(node) != null && (parameters === null || parameters === void 0 ? void 0 : parameters.length) > 0 ? parameters[0] : undefined;
            return [
                {
                    priority: "high",
                    node,
                    jsDoc: getJsDoc(node, ts),
                    kind: "property",
                    propName: name.text,
                    type: lazy(() => (parameter == null ? context.checker.getTypeAtLocation(node) : context.checker.getTypeAtLocation(parameter))),
                    visibility: getMemberVisibilityFromNode(node, ts),
                    modifiers: getModifiersFromNode(node, ts)
                }
            ];
        }
    }
    // constructor { super(); this.title = "Hello"; }
    else if (ts.isConstructorDeclaration(node)) {
        if (node.body != null) {
            const assignments = node.body.statements
                .filter((stmt) => ts.isExpressionStatement(stmt))
                .map(stmt => stmt.expression)
                .filter((exp) => ts.isBinaryExpression(exp));
            const members = [];
            for (const assignment of assignments) {
                const { left, right } = assignment;
                if (ts.isPropertyAccessExpression(left)) {
                    if (left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                        const propName = left.name.getText();
                        const resolvedInitializer = resolveNodeValue(right, context);
                        const def = resolvedInitializer != null ? resolvedInitializer.value : undefined; //right.getText();
                        members.push({
                            priority: "low",
                            node,
                            kind: "property",
                            propName,
                            default: def,
                            type: () => relaxType(tsSimpleType.toSimpleType(checker.getTypeAtLocation(right), checker)),
                            jsDoc: getJsDoc(assignment.parent, ts),
                            visibility: isNamePrivate(propName) ? "private" : undefined
                        });
                    }
                }
            }
            return members;
        }
    }
    return undefined;
}

/**
 * Discovers methods
 * @param node
 * @param context
 */
function discoverMethods(node, context) {
    var _a;
    const { ts } = context;
    // Never pick up method declaration not declared directly on the declaration node being traversed
    if (node.parent !== context.declarationNode) {
        return undefined;
    }
    // class { myMethod () {} }
    if ((ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) && !hasModifier(node, ts.SyntaxKind.StaticKeyword, ts)) {
        // Outscope static methods for now
        const name = node.name.getText();
        if (!context.config.analyzeDefaultLib && isHTMLElementMethodName(name)) {
            return undefined;
        }
        // Allow the analyzer to analyze within methods
        (_a = context.emitContinue) === null || _a === void 0 ? void 0 : _a.call(context);
        return [
            {
                jsDoc: getJsDoc(node, ts),
                name,
                node: node,
                visibility: getMemberVisibilityFromNode(node, ts),
                type: lazy(() => context.checker.getTypeAtLocation(node))
            }
        ];
    }
    return undefined;
}
function isHTMLElementMethodName(name) {
    return ["attributeChangedCallback", "connectedCallback", "disconnectedCallback"].includes(name);
}

/**
 * Excludes nodes from "lib.dom.d.ts" if analyzeLibDom is false
 * @param node
 * @param context
 */
function excludeNode$2(node, context) {
    if (context.config.analyzeDefaultLib) {
        return undefined;
    }
    return isLibDom(node);
}
function isLibDom(node) {
    return node.getSourceFile().fileName.endsWith("lib.dom.d.ts");
}

/**
 * A flavor that discovers using standard custom element rules
 */
class CustomElementFlavor {
    constructor() {
        this.excludeNode = excludeNode$2;
        this.discoverDefinitions = discoverDefinitions$5;
        this.discoverFeatures = {
            member: discoverMembers$2,
            event: discoverEvents,
            method: discoverMethods
        };
        this.discoverGlobalFeatures = discoverGlobalFeatures$3;
        this.discoverInheritance = discoverInheritance$1;
    }
}

/**
 * Transforms jsdoc tags to a T array using a "transform"
 * @param node
 * @param tagNames
 * @param transform
 * @param context
 */
function parseJsDocForNode(node, tagNames, transform, context) {
    var _a;
    const { tags } = getJsDoc(node, context.ts, tagNames) || {};
    if (tags != null && tags.length > 0) {
        (_a = context.emitContinue) === null || _a === void 0 ? void 0 : _a.call(context);
        return arrayDefined(tags.map(tag => transform(tag.node, tag.parsed())));
    }
    return undefined;
}

/**
 * Discovers definitions using "@customElement" or "@element" jsdoc
 * @param node
 * @param context
 */
function discoverDefinitions$4(node, context) {
    // /** @customElement my-element */ myClass extends HTMLElement { ... }
    if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
        const identifier = getNodeIdentifier(node, context);
        return parseJsDocForNode(node, ["customelement", "element"], (tagNode, { name }) => {
            return {
                tagName: name || "",
                definitionNode: tagNode,
                identifierNode: identifier,
                tagNameNode: tagNode
            };
        }, context);
    }
}

const discoverFeatures$1 = {
    csspart: (node, context) => {
        if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
            return parseJsDocForNode(node, ["csspart"], (tagNode, { name, description }) => {
                if (name != null && name.length > 0) {
                    return {
                        name: name,
                        jsDoc: description != null ? { description } : undefined
                    };
                }
            }, context);
        }
    },
    cssproperty: (node, context) => {
        if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
            return parseJsDocForNode(node, ["cssprop", "cssproperty", "cssvar", "cssvariable"], (tagNode, { name, description, type, default: def }) => {
                if (name != null && name.length > 0) {
                    return {
                        name: name,
                        jsDoc: description != null ? { description } : undefined,
                        typeHint: type || undefined,
                        default: def
                    };
                }
            }, context);
        }
    },
    event: (node, context) => {
        if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
            return parseJsDocForNode(node, ["event", "fires", "emits"], (tagNode, { name, description, type }) => {
                if (name != null && name.length > 0 && tagNode != null) {
                    return {
                        name: name,
                        jsDoc: description != null ? { description } : undefined,
                        type: type != null ? lazy(() => parseSimpleJsDocTypeExpression(type, context) || { kind: "ANY" }) : undefined,
                        typeHint: type,
                        node: tagNode
                    };
                }
            }, context);
        }
    },
    slot: (node, context) => {
        if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
            return parseJsDocForNode(node, ["slot"], (tagNode, { name, type, description }) => {
                // Treat "-" as unnamed slot
                if (name === "-") {
                    name = undefined;
                }
                // Grab the type from jsdoc and use it to find permitted tag names
                // Example: @slot {"div"|"span"} myslot
                const permittedTagNameType = type == null ? undefined : parseSimpleJsDocTypeExpression(type, context);
                const permittedTagNames = (() => {
                    if (permittedTagNameType == null) {
                        return undefined;
                    }
                    switch (permittedTagNameType.kind) {
                        case "STRING_LITERAL":
                            return [permittedTagNameType.value];
                        case "UNION":
                            return permittedTagNameType.types
                                .filter((type) => type.kind === "STRING_LITERAL")
                                .map(type => type.value);
                        default:
                            return undefined;
                    }
                })();
                return {
                    name: name,
                    jsDoc: description != null ? { description } : undefined,
                    permittedTagNames
                };
            }, context);
        }
    },
    member: (node, context) => {
        if (context.ts.isInterfaceDeclaration(node) || context.ts.isClassDeclaration(node)) {
            const priority = getNodeSourceFileLang(node) === "js" ? "high" : "medium";
            const properties = parseJsDocForNode(node, ["prop", "property"], (tagNode, { name, default: def, type, description }) => {
                if (name != null && name.length > 0) {
                    return {
                        priority,
                        kind: "property",
                        propName: name,
                        jsDoc: description != null ? { description } : undefined,
                        typeHint: type,
                        type: lazy(() => (type && parseSimpleJsDocTypeExpression(type, context)) || { kind: "ANY" }),
                        node: tagNode,
                        default: def,
                        visibility: undefined,
                        reflect: undefined,
                        required: undefined,
                        deprecated: undefined
                    };
                }
            }, context);
            const attributes = parseJsDocForNode(node, ["attr", "attribute"], (tagNode, { name, default: def, type, description }) => {
                if (name != null && name.length > 0) {
                    return {
                        priority,
                        kind: "attribute",
                        attrName: name,
                        jsDoc: description != null ? { description } : undefined,
                        type: lazy(() => (type && parseSimpleJsDocTypeExpression(type, context)) || { kind: "ANY" }),
                        typeHint: type,
                        node: tagNode,
                        default: def,
                        visibility: undefined,
                        reflect: undefined,
                        required: undefined,
                        deprecated: undefined
                    };
                }
            }, context);
            if (attributes != null || properties != null) {
                return [...(attributes || []), ...(properties || [])];
            }
            return undefined;
        }
    }
};

const discoverGlobalFeatures$2 = {
    csspart: (node, context) => {
        var _a;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            return (_a = discoverFeatures$1.csspart) === null || _a === void 0 ? void 0 : _a.call(discoverFeatures$1, node, context);
        }
    },
    cssproperty: (node, context) => {
        var _a;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            return (_a = discoverFeatures$1.cssproperty) === null || _a === void 0 ? void 0 : _a.call(discoverFeatures$1, node, context);
        }
    },
    event: (node, context) => {
        var _a;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            return (_a = discoverFeatures$1.event) === null || _a === void 0 ? void 0 : _a.call(discoverFeatures$1, node, context);
        }
    },
    slot: (node, context) => {
        var _a;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            return (_a = discoverFeatures$1.slot) === null || _a === void 0 ? void 0 : _a.call(discoverFeatures$1, node, context);
        }
    },
    member: (node, context) => {
        var _a;
        if (context.ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElement") {
            return (_a = discoverFeatures$1 === null || discoverFeatures$1 === void 0 ? void 0 : discoverFeatures$1.member) === null || _a === void 0 ? void 0 : _a.call(discoverFeatures$1, node, context);
        }
    }
};

/**
 * Refines a component declaration by using jsdoc tags
 * @param declaration
 * @param context
 */
function refineDeclaration$1(declaration, context) {
    if (declaration.jsDoc == null || declaration.jsDoc.tags == null) {
        return undefined;
    }
    // Applies the "@deprecated" jsdoc tag
    const deprecatedTag = declaration.jsDoc.tags.find(t => t.tag === "deprecated");
    if (deprecatedTag != null) {
        return {
            ...declaration,
            deprecated: deprecatedTag.comment || true
        };
    }
    return undefined;
}

/**
 * Refines features by looking at the jsdoc tags on the feature
 */
const refineFeature$3 = {
    event: (event, context) => {
        if (event.jsDoc == null || event.jsDoc.tags == null)
            return event;
        // Check if the feature has "@ignore" jsdoc tag
        if (hasIgnoreJsDocTag(event.jsDoc)) {
            return undefined;
        }
        return [applyJsDocDeprecated, applyJsDocVisibility, applyJsDocType].reduce((event, applyFunc) => applyFunc(event, event.jsDoc, context), event);
    },
    method: (method, context) => {
        if (method.jsDoc == null || method.jsDoc.tags == null)
            return method;
        // Check if the feature has "@ignore" jsdoc tag
        if (hasIgnoreJsDocTag(method.jsDoc)) {
            return undefined;
        }
        method = [applyJsDocDeprecated, applyJsDocVisibility].reduce((method, applyFunc) => applyFunc(method, method.jsDoc, context), method);
        return method;
    },
    member: (member, context) => {
        // Return right away if the member doesn't have jsdoc
        if (member.jsDoc == null || member.jsDoc.tags == null)
            return member;
        // Check if the feature has "@ignore" jsdoc tag
        if (hasIgnoreJsDocTag(member.jsDoc)) {
            return undefined;
        }
        return [
            applyJsDocDeprecated,
            applyJsDocVisibility,
            applyJsDocRequired,
            applyJsDocDefault,
            applyJsDocReflect,
            applyJsDocType,
            applyJsDocAttribute,
            applyJsDocModifiers
        ].reduce((member, applyFunc) => applyFunc(member, member.jsDoc, context), member);
    }
};
/**
 * Applies the "@deprecated" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocDeprecated(feature, jsDoc) {
    var _a;
    const deprecatedTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "deprecated");
    if (deprecatedTag != null) {
        return {
            ...feature,
            deprecated: deprecatedTag.comment || true
        };
    }
    return feature;
}
/**
 * Applies the "@access" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocVisibility(feature, jsDoc) {
    var _a;
    const visibilityTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => ["public", "protected", "private", "package", "access"].includes(tag.tag)); // member + method
    if (visibilityTag != null) {
        return {
            ...feature,
            visibility: (() => {
                switch (visibilityTag.tag) {
                    case "public":
                        return "public";
                    case "protected":
                        return "protected";
                    case "package":
                    case "private":
                        return "private";
                    case "access":
                        switch (visibilityTag.parsed().name) {
                            case "public":
                                return "public";
                            case "protected":
                                return "protected";
                            case "private":
                            case "package":
                                return "private";
                            default:
                                return undefined;
                        }
                    default:
                        return undefined;
                }
            })()
        };
    }
    return feature;
}
/**
 * Applies the "@attribute" jsdoc tag
 * @param feature
 * @param jsDoc
 * @param context
 */
function applyJsDocAttribute(feature, jsDoc, context) {
    var _a, _b, _c;
    const attributeTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => ["attr", "attribute"].includes(tag.tag));
    if (attributeTag != null && feature.attrName == null) {
        const parsed = attributeTag.parsed();
        const result = {
            ...feature,
            attrName: attributeTag.parsed().name || feature.propName,
            default: (_b = feature.default) !== null && _b !== void 0 ? _b : parsed.default
        };
        // @attr jsdoc tag can also include the type of attribute
        if (parsed.type != null && result.typeHint == null) {
            result.typeHint = parsed.type;
            result.type = (_c = feature.type) !== null && _c !== void 0 ? _c : lazy(() => parseSimpleJsDocTypeExpression(parsed.type || "", context));
        }
        return result;
    }
    return feature;
}
/**
 * Applies the "@required" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocRequired(feature, jsDoc) {
    var _a;
    const requiredTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => ["optional", "required"].includes(tag.tag));
    if (requiredTag != null) {
        return {
            ...feature,
            required: requiredTag.tag === "required"
        };
    }
    return feature;
}
/**
 * Applies the "@readonly" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocModifiers(feature, jsDoc) {
    var _a;
    const readonlyTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "readonly");
    if (readonlyTag != null) {
        return {
            ...feature,
            modifiers: (feature.modifiers != null ? new Set(feature.modifiers) : new Set()).add("readonly")
        };
    }
    return feature;
}
/**
 * Applies the "@default" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocDefault(feature, jsDoc) {
    var _a;
    const defaultTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "default");
    if (defaultTag != null) {
        return {
            ...feature,
            default: defaultTag.comment
        };
    }
    return feature;
}
/**
 * Applies the "@reflect" jsdoc tag
 * @param feature
 * @param jsDoc
 */
function applyJsDocReflect(feature, jsDoc) {
    var _a;
    const reflectTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "reflect");
    if (reflectTag != null && feature.reflect == null) {
        return {
            ...feature,
            reflect: (() => {
                switch (reflectTag.comment) {
                    case "to-attribute":
                        return "to-attribute";
                    case "to-property":
                        return "to-property";
                    case "both":
                        return "both";
                    default:
                        return undefined;
                }
            })()
        };
    }
    return feature;
}
/**
 * Applies the "@type" jsdoc tag
 * @param feature
 * @param jsDoc
 * @param context
 */
function applyJsDocType(feature, jsDoc, context) {
    var _a, _b;
    const typeTag = (_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "type");
    if (typeTag != null && feature.typeHint == null) {
        const parsed = typeTag.parsed();
        if (parsed.type != null && parsed.type.length > 0) {
            return {
                ...feature,
                typeHint: parsed.type,
                type: (_b = feature.type) !== null && _b !== void 0 ? _b : lazy(() => parseSimpleJsDocTypeExpression(parsed.type || "", context))
            };
        }
    }
    return feature;
}
/**
 * Returns if jsdoc contains an ignore node
 * @param jsDoc
 */
function hasIgnoreJsDocTag(jsDoc) {
    var _a;
    return ((_a = jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "ignore")) != null;
}

/**
 * Flavors for analyzing jsdoc related features
 */
class JsDocFlavor {
    constructor() {
        this.discoverDefinitions = discoverDefinitions$4;
        this.discoverFeatures = discoverFeatures$1;
        this.discoverGlobalFeatures = discoverGlobalFeatures$2;
        this.refineFeature = refineFeature$3;
        this.refineDeclaration = refineDeclaration$1;
    }
}

/**
 * Discovers element definitions in "IntrinsicElements"
 * @param node
 * @param context
 */
function discoverDefinitions$3(node, context) {
    const { ts } = context;
    if (ts.isInterfaceDeclaration(node)) {
        if (node.name.text === "IntrinsicElements") {
            const extensions = getInterfaceKeys(node, context);
            return extensions.map(({ key, keyNode, identifier, declaration }) => ({
                tagName: key,
                tagNameNode: keyNode,
                identifierNode: identifier,
                declarationNode: declaration
            }));
        }
    }
    return undefined;
}

/**
 * Discovers members declared on "IntrinsicAttributes"
 */
const discoverGlobalFeatures$1 = {
    member: (node, context) => {
        var _a, _b;
        const { ts } = context;
        if (ts.isInterfaceDeclaration(node) && node.name.text === "IntrinsicAttributes") {
            const members = [];
            for (const member of node.members) {
                if (ts.isPropertySignature(member)) {
                    const name = (_a = resolveNodeValue(member.name, context)) === null || _a === void 0 ? void 0 : _a.value;
                    if (name != null && typeof name === "string") {
                        members.push({
                            priority: "medium",
                            node: member,
                            jsDoc: getJsDoc(member, ts),
                            kind: "property",
                            propName: name,
                            attrName: name,
                            type: () => context.checker.getTypeAtLocation(member)
                        });
                    }
                }
            }
            (_b = context === null || context === void 0 ? void 0 : context.emitContinue) === null || _b === void 0 ? void 0 : _b.call(context);
            return members;
        }
    }
};

/**
 * Flavors for analyzing jsx related features
 */
class JSXFlavor {
    constructor() {
        this.discoverDefinitions = discoverDefinitions$3;
        this.discoverGlobalFeatures = discoverGlobalFeatures$1;
    }
}

/**
 * Visits lit-element related definitions.
 * Specifically it finds the usage of the @customElement decorator.
 * @param node
 * @param context
 */
function discoverDefinitions$2(node, context) {
    const { ts, checker } = context;
    // @customElement("my-element")
    if (ts.isClassDeclaration(node)) {
        // Visit all decorators on the class
        for (const decorator of getDecorators(node, context)) {
            const callExpression = decorator.expression;
            // Find "@customElement"
            if (ts.isCallExpression(callExpression) && ts.isIdentifier(callExpression.expression)) {
                const decoratorIdentifierName = callExpression.expression.escapedText;
                // Decorators called "customElement"
                if (decoratorIdentifierName === "customElement") {
                    // Resolve the value of the first argument. This is the tag name.
                    const unresolvedTagNameNode = callExpression.arguments[0];
                    const resolvedTagNameNode = resolveNodeValue(unresolvedTagNameNode, { ts, checker, strict: true });
                    const identifier = getNodeIdentifier(node, context);
                    if (resolvedTagNameNode != null && typeof resolvedTagNameNode.value === "string") {
                        return [
                            {
                                tagName: resolvedTagNameNode.value,
                                tagNameNode: resolvedTagNameNode.node,
                                identifierNode: identifier
                            }
                        ];
                    }
                }
            }
        }
        return;
    }
    node.forEachChild(child => {
        discoverDefinitions$2(child, context);
    });
}

const LIT_ELEMENT_PROPERTY_DECORATOR_KINDS = ["property", "internalProperty", "state"];
/**
 * Returns a potential lit element property decorator.
 * @param node
 * @param context
 */
function getLitElementPropertyDecorator(node, context) {
    const { ts } = context;
    // Find a decorator with "property" name.
    for (const decorator of getDecorators(node, context)) {
        const expression = decorator.expression;
        // We find the first decorator calling specific identifier name (found in LIT_ELEMENT_PROPERTY_DECORATOR_KINDS)
        if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
            const identifier = expression.expression;
            const kind = identifier.text;
            if (LIT_ELEMENT_PROPERTY_DECORATOR_KINDS.includes(kind)) {
                return { expression, kind };
            }
        }
    }
    return undefined;
}
/**
 * Returns a potential lit property decorator configuration.
 * @param node
 * @param context
 */
function getLitElementPropertyDecoratorConfig(node, context) {
    // Get reference to a possible "@property" decorator.
    const decorator = getLitElementPropertyDecorator(node, context);
    if (decorator != null) {
        // Parse the first argument to the decorator which is the lit-property configuration.
        const configNode = decorator.expression.arguments[0];
        // Add decorator to "nodes"
        const config = { node: { decorator: decorator.expression } };
        // Apply specific config based on the decorator kind
        switch (decorator.kind) {
            case "internalProperty":
            case "state":
                config.attribute = false;
                config.state = true;
                break;
        }
        if (configNode == null) {
            return config;
        }
        const resolved = resolveNodeValue(configNode, context);
        return resolved != null ? getLitPropertyOptions(resolved.node, resolved.value, context, config) : config;
    }
    return undefined;
}
/**
 * Determines if a given object has the specified property, used
 * as a type-guard.
 * @param obj
 * @param key
 */
function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Computes the correct type for a given node for use in lit property
 * configuration.
 * @param ts
 * @param node
 */
function getLitPropertyType(ts, node) {
    const value = ts.isIdentifier(node) ? node.text : undefined;
    switch (value) {
        case "String":
        case "StringConstructor":
            return { kind: "STRING" };
        case "Number":
        case "NumberConstructor":
            return { kind: "NUMBER" };
        case "Boolean":
        case "BooleanConstructor":
            return { kind: "BOOLEAN" };
        case "Array":
        case "ArrayConstructor":
            return { kind: "ARRAY", type: { kind: "ANY" } };
        case "Object":
        case "ObjectConstructor":
            return { kind: "OBJECT", members: [] };
        default:
            // This is an unknown type, so set the name as a string
            return node.getText();
    }
}
/**
 * Parses an object literal expression and returns a lit property configuration.
 * @param node
 * @param existingConfig
 * @param context
 */
function getLitPropertyOptions(node, object, context, existingConfig = {}) {
    const { ts } = context;
    const result = { ...existingConfig };
    let attributeInitializer;
    let typeInitializer;
    if (typeof object === "object" && object !== null && !Array.isArray(object)) {
        if (hasOwnProperty(object, "converter") && object.converter !== undefined) {
            result.hasConverter = true;
        }
        if (hasOwnProperty(object, "reflect") && object.reflect !== undefined) {
            result.reflect = object.reflect === true;
        }
        if (hasOwnProperty(object, "state") && object.state !== undefined) {
            result.state = object.state === true;
        }
        if (hasOwnProperty(object, "value")) {
            result.default = object.value;
        }
        if (hasOwnProperty(object, "attribute") && (typeof object.attribute === "boolean" || typeof object.attribute === "string")) {
            result.attribute = object.attribute;
            if (ts.isObjectLiteralExpression(node)) {
                const prop = node.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "attribute");
                if (prop) {
                    attributeInitializer = prop.initializer;
                }
            }
        }
    }
    if (ts.isObjectLiteralExpression(node)) {
        const typeProp = node.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "type");
        if (typeProp) {
            typeInitializer = typeProp.initializer;
            result.type = getLitPropertyType(ts, typeProp.initializer);
        }
    }
    return {
        ...result,
        node: {
            ...(result.node || {}),
            attribute: attributeInitializer,
            type: typeInitializer
        }
    };
}

/**
 * Parses lit-related declaration members.
 * This is primary by looking at the "@property" decorator and the "static get properties()".
 * @param node
 * @param context
 */
function discoverMembers$1(node, context) {
    const { ts } = context;
    // Never pick up members not declared directly on the declaration node being traversed
    if (node.parent !== context.declarationNode) {
        return undefined;
    }
    // static get properties() { return { myProp: {type: String} } }
    if (ts.isGetAccessor(node) && hasModifier(node, ts.SyntaxKind.StaticKeyword, ts)) {
        const name = node.name.getText();
        if (name === "properties" && node.body != null) {
            const returnStatement = node.body.statements.find(ts.isReturnStatement.bind(ts));
            if (returnStatement != null) {
                return parseStaticProperties(returnStatement, context);
            }
        }
    }
    // @property({type: String}) myProp = "hello";
    else if (ts.isSetAccessor(node) || ts.isGetAccessor(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        return parsePropertyDecorator$1(node, context);
    }
}
/**
 * Visits a lit property decorator and returns members based on it.
 * @param node
 * @param context
 */
function parsePropertyDecorator$1(node, context) {
    const { ts, checker } = context;
    // Parse the content of a possible lit "@property" decorator.
    const litConfig = getLitElementPropertyDecoratorConfig(node, context);
    if (litConfig != null) {
        const propName = node.name.getText();
        // Get the attribute based on the configuration
        const attrName = getLitAttributeName(propName, litConfig, context);
        // Find the default value for this property
        const initializer = "initializer" in node ? node.initializer : undefined;
        const resolvedDefaultValue = initializer != null ? resolveNodeValue(initializer, context) : undefined;
        const def = resolvedDefaultValue != null ? resolvedDefaultValue.value : initializer === null || initializer === void 0 ? void 0 : initializer.getText();
        // Find our if the property/attribute is required
        //const required = ("initializer" in node && isPropertyRequired(node, context.checker)) || undefined;
        const required = undefined;
        const jsDoc = getJsDoc(node, ts);
        // Emit a property with "attrName"
        return [
            {
                priority: "high",
                kind: "property",
                propName,
                attrName,
                type: lazy(() => {
                    const propType = checker.getTypeAtLocation(node);
                    const inJavascriptFile = getNodeSourceFileLang(node) === "js";
                    return inJavascriptFile && typeof litConfig.type === "object" && litConfig.type.kind === "ANY" ? litConfig.type : propType;
                }),
                node,
                default: def,
                required,
                jsDoc,
                meta: litConfig,
                visibility: getMemberVisibilityFromNode(node, ts),
                reflect: litConfig.reflect ? "both" : attrName != null ? "to-property" : undefined,
                modifiers: getModifiersFromNode(node, ts)
            }
        ];
    }
    return undefined;
}
/**
 * Returns if we are in a Polymer context.
 * @param context
 */
function inPolymerFlavorContext(context) {
    var _a, _b, _c;
    const declaration = context.getDeclaration();
    // TODO: find a better way to construct a cache key
    const cacheKey = `isPolymerFlavorContext:${((_a = context.sourceFile) === null || _a === void 0 ? void 0 : _a.fileName) || "unknown"}`;
    if (context.cache.general.has(cacheKey)) {
        return context.cache.general.get(cacheKey);
    }
    let result = false;
    // Use "@polymer" jsdoc tag to indicate that this is polymer context
    if ((_c = (_b = declaration.jsDoc) === null || _b === void 0 ? void 0 : _b.tags) === null || _c === void 0 ? void 0 : _c.some(t => t.tag === "polymer" || t.tag === "polymerElement")) {
        result = true;
    }
    // TODO: This only checks the immediate inheritance. Make it recursive to go throught the entire inheritance chain.
    if (context.getDeclaration().heritageClauses.some(c => ["PolymerElement", "Polymer.Element"].includes(c.identifier.getText()))) {
        result = true;
    }
    context.cache.general.set(cacheKey, result);
    return result;
}
/**
 * Returns an attribute name based on a property name and a lit-configuration
 * @param propName
 * @param litConfig
 * @param context
 */
function getLitAttributeName(propName, litConfig, context) {
    // Don't emit attribute if the value is specifically "false"
    if (litConfig.attribute === false) {
        return undefined;
    }
    // Get the attribute name either by looking at "{attribute: ...}" or just taking the property name.
    let attrName = typeof litConfig.attribute === "string" ? litConfig.attribute : propName;
    if (inPolymerFlavorContext(context)) {
        // From the documentation: https://polymer-library.polymer-project.org/3.0/docs/devguide/properties#attribute-reflection
        attrName = camelToDashCase(attrName).toLowerCase();
    }
    return attrName;
}
/**
 * Visits static properties
 * static get properties() { return { myProp: {type: String, attribute: "my-attr"} } }
 * @param returnStatement
 * @param context
 */
function parseStaticProperties(returnStatement, context) {
    const { ts } = context;
    const memberResults = [];
    if (returnStatement.expression != null && ts.isObjectLiteralExpression(returnStatement.expression)) {
        // Each property in the object literal expression corresponds to a class field.
        for (const propNode of returnStatement.expression.properties) {
            // Get propName
            const propName = propNode.name != null && ts.isIdentifier(propNode.name) ? propNode.name.text : undefined;
            if (propName == null) {
                continue;
            }
            // Parse the lit property config for this property
            // Treat non-object-literal-expressions like the "type" (to support Polymer specific syntax)
            let litConfig = {};
            if (ts.isPropertyAssignment(propNode)) {
                if (inPolymerFlavorContext(context) && !ts.isObjectLiteralExpression(propNode.initializer)) {
                    litConfig = { type: getLitPropertyType(ts, propNode.initializer) };
                }
                else {
                    const resolved = resolveNodeValue(propNode.initializer, context);
                    if (resolved) {
                        litConfig = getLitPropertyOptions(resolved.node, resolved.value, context, litConfig);
                    }
                }
            }
            // Get attrName based on the litConfig
            const attrName = getLitAttributeName(propName, litConfig, context);
            // Get more metadata
            const jsDoc = getJsDoc(propNode, ts);
            const emitAttribute = litConfig.attribute !== false;
            // Emit either the attribute or the property
            memberResults.push({
                priority: "high",
                kind: "property",
                type: lazy(() => {
                    return (jsDoc && getJsDocType(jsDoc, context)) || (typeof litConfig.type === "object" && litConfig.type) || { kind: "ANY" };
                }),
                propName: propName,
                attrName: emitAttribute ? attrName : undefined,
                jsDoc,
                node: propNode,
                meta: litConfig,
                default: litConfig.default,
                reflect: litConfig.reflect ? "both" : attrName != null ? "to-property" : undefined,
                visibility: isNamePrivate(propName) ? "private" : undefined
            });
        }
    }
    return memberResults;
}

function excludeNode$1(node, context) {
    if (context.config.analyzeDependencies) {
        return undefined;
    }
    // Exclude lit element related super classes if "analyzeLib" is false
    const declName = getNodeName(node, context);
    if (declName != null) {
        return declName === "LitElement" || declName === "UpdatingElement";
    }
    else {
        const fileName = node.getSourceFile().fileName;
        return fileName.includes("/lit-element.") || fileName.endsWith("/updating-element.");
    }
}

const refineFeature$2 = {
    method: (method, context) => {
        // This is temporary, but for now we force lit-element named methods to be protected
        if (LIT_ELEMENT_PROTECTED_METHODS.includes(method.name)) {
            return {
                ...method,
                visibility: "protected"
            };
        }
        return method;
    }
};
const LIT_ELEMENT_PROTECTED_METHODS = [
    "render",
    "requestUpdate",
    "firstUpdated",
    "updated",
    "update",
    "shouldUpdate",
    "hasUpdated",
    "updateComplete"
];

/**
 * Flavors for analyzing LitElement related features: https://lit-element.polymer-project.org/
 */
class LitElementFlavor {
    constructor() {
        this.excludeNode = excludeNode$1;
        this.discoverDefinitions = discoverDefinitions$2;
        this.discoverFeatures = {
            member: discoverMembers$1
        };
        this.refineFeature = refineFeature$2;
    }
}

const LWCCACHE = Symbol("LWC Component");
function getLwcComponent(node, context) {
    const { ts } = context;
    if (ts.isClassDeclaration(node)) {
        if (node[LWCCACHE]) {
            return node[LWCCACHE];
        }
        const r = _isLwcComponent(node, context);
        node[LWCCACHE] = r;
        return r;
    }
    return undefined;
}
function _isLwcComponent(node, context) {
    // Return right away if the node is not a class declaration
    if (!context.ts.isClassDeclaration(node)) {
        return undefined;
    }
    const jsName = node.getSourceFile().fileName;
    const splitjsName = jsName.split("/");
    if (splitjsName.length < 3) {
        return;
    }
    const nameSpace = splitjsName[splitjsName.length - 3];
    const componentName = splitjsName[splitjsName.length - 2];
    const tagName = nameSpace + "-" + camelToDashCase(componentName);
    // Main case (~100% of the cases)
    // The class is a default export and there is a template (.html) starting with <template>
    // Moreover the JS file name should match the directory name, minus the extension (js|ts)
    //    https://lwc.dev/guide/reference#html-file
    const flags = context.ts.getCombinedModifierFlags(node);
    if (flags & context.ts.ModifierFlags.ExportDefault && (jsName.endsWith(".js") || jsName.endsWith(".ts"))) {
        const fileName = splitjsName[splitjsName.length - 1];
        const fileNoExt = fileName.substring(0, fileName.length - 3);
        if (fileNoExt === componentName) {
            const htmlName = jsName.substring(0, jsName.length - 3) + ".html";
            if (fs.existsSync(htmlName)) {
                const content = fs.readFileSync(htmlName, "utf8").trim();
                if (content.startsWith("<template>")) {
                    return { tagName };
                }
            }
        }
    }
    // Edge case
    // The components are not matching the file naming recommendations, so we check the inheritance
    const lightning = inheritFromLightning(node, context);
    if (lightning) {
        return { tagName };
    }
    // Finally, we use a JS doc definition in case none of the above work
    // This is the last resort
    const v = parseJsDocForNode(node, ["lwcelement"], (tagNode, { name }) => {
        return { tagName: name || tagName };
    }, context);
    if (v && v.length === 1) {
        return v[0];
    }
}
// Check if the Class inherits from lighning
// For now, we just check one level
function inheritFromLightning(node, context) {
    const { checker } = context;
    if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
            // OK we are getting strange results here with the token beeing 87 (ElseKeyword), 89 (ExportKeyword)
            // Not sure why for now, so we skip checking the keyword as 'LightningElement' is dicriminant enough
            if (clause.token == context.ts.SyntaxKind.ExtendsKeyword) {
                const symbol = checker.getSymbolAtLocation(clause.types[0].expression);
                if ((symbol === null || symbol === void 0 ? void 0 : symbol.escapedName) === "LightningElement") {
                    return true;
                }
            }
        }
    }
    return false;
}
// In case we need to debug the nodes
// export function print(node: Node, context: AnalyzerVisitContext): void {
// 	const {ts} = context;
// 	// eslint-disable-next-line no-console
// 	console.log(`\n========== Syntax tree for ${ts.SyntaxKind[node.kind]}`);
// 	let indent = 1;
// 	function _print(node: Node) {
// 	// eslint-disable-next-line no-console
// 	console.log(new Array(indent + 1).join('   ') + ts.SyntaxKind[node.kind]);
// 		indent++;
// 		ts.forEachChild(node, _print);
// 		indent--;
// 	}
// 	_print(node);
// 	// eslint-disable-next-line no-console
// 	console.log(`======================\n`);
// }
/**
 * Checks if the element has an lwc property decorator (@api).
 * @param node
 * @param context
 */
function hasLwcApiPropertyDecorator(node, context) {
    const { ts } = context;
    // Find a decorator with "api" name.
    for (const decorator of getDecorators(node, context)) {
        const expression = decorator.expression;
        // We find the first decorator calling specific identifier name (@api)
        // Note that this is not a call expression, so we just check that the decorator is an identifier
        if (ts.isIdentifier(expression)) {
            const kind = expression.text;
            if (kind === "api") {
                return true;
            }
        }
    }
    return false;
}

/**
 * Parses LWC related declaration members.
 * This is primary by looking at the "@api" decorator
 * @param node
 * @param context
 */
function discoverMembers(node, context) {
    const { ts } = context;
    // Never pick up members not declared directly on the declaration node being traversed
    if (node.parent !== context.declarationNode) {
        return undefined;
    }
    // @api myProp = "hello";
    if (ts.isSetAccessor(node) || ts.isGetAccessor(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        return parsePropertyDecorator(node, context);
    }
}
/**
 * Visits a LWC property decorator and returns members based on it.
 * @param node
 * @param context
 */
function parsePropertyDecorator(node, context) {
    const { ts, checker } = context;
    // Parse the content of a possible lit "@api" decorator.
    const lwcApi = hasLwcApiPropertyDecorator(node, context);
    if (lwcApi) {
        const propName = node.name.getText();
        // In LWC, the attribute name is deduced from the property name
        // There is currently no way to for it to a different value
        const attrName = lwcAttrName(propName);
        // Find the default value for this property
        const initializer = "initializer" in node ? node.initializer : undefined;
        const resolvedDefaultValue = initializer != null ? resolveNodeValue(initializer, context) : undefined;
        const def = resolvedDefaultValue != null ? resolvedDefaultValue.value : initializer === null || initializer === void 0 ? void 0 : initializer.getText();
        // Find if the property/attribute is required
        //const required = ("initializer" in node && isPropertyRequired(node, context.checker)) || undefined;
        const required = undefined;
        const jsDoc = getJsDoc(node, ts);
        // Emit a property with "attrName"
        return [
            {
                priority: "high",
                kind: "property",
                propName,
                attrName,
                type: lazy(() => {
                    const propType = checker.getTypeAtLocation(node);
                    return propType;
                }),
                node,
                default: def,
                required,
                jsDoc,
                visibility: getMemberVisibilityFromNode(node, ts),
                reflect: undefined,
                modifiers: getModifiersFromNode(node, ts)
            }
        ];
    }
    return undefined;
}
const HTMLAttrs = {
    accessKey: "accesskey",
    bgColor: "bgcolor",
    colSpan: "colspan",
    contentEditable: "contenteditable",
    crossOrigin: "crossorigin",
    dateTime: "datetime",
    htmlFor: "for",
    formAction: "formaction",
    isMap: "ismap",
    maxLength: "maxlength",
    minLength: "minlength",
    noValidate: "novalidate",
    readOnly: "readonly",
    rowSpan: "rowspan",
    tabIndex: "tabindex",
    useMap: "usemap"
};
// LWC attribute names
// https://lwc.dev/guide/javascript#html-attribute-names
function lwcAttrName(propName) {
    // Look for a global HTML name
    const htmlAttr = HTMLAttrs[propName];
    if (htmlAttr) {
        return htmlAttr;
    }
    // Calculate the attribute name from the property
    return camelToDashCase(propName).toLowerCase();
}

function discoverDefinitions$1(node, context) {
    var _a;
    const { ts } = context;
    if (ts.isClassDeclaration(node)) {
        const lwc = getLwcComponent(node, context);
        if (lwc) {
            return [
                {
                    tagName: lwc.tagName,
                    tagNameNode: (_a = node.heritageClauses) === null || _a === void 0 ? void 0 : _a[0].types[0],
                    declarationNode: node
                }
            ];
        }
    }
    return undefined;
}

// In LWC, the public properties & methods must be tagged with @api
// everything else becomes protected and not accessible externally
function hasApiDecorator(node, context) {
    if (!node) {
        return false;
    }
    const { ts } = context;
    for (const decorator of getDecorators(node, context)) {
        const expression = decorator.expression;
        // We find the first decorator calling specific identifier name (found in LWC_PROPERTY_DECORATOR_KINDS)
        if (ts.isIdentifier(expression)) {
            const identifier = expression;
            const kind = identifier.text;
            if (kind === "api") {
                return true;
            }
        }
    }
    return false;
}
function findClassDeclaration(node, { ts }) {
    while (node) {
        if (ts.isClassDeclaration(node)) {
            return node;
        }
        node = node.parent;
    }
}
function isLWCComponent(component, context) {
    var _a;
    const node = findClassDeclaration((_a = component.declaration) === null || _a === void 0 ? void 0 : _a.node, context);
    if (node) {
        return !!getLwcComponent(node, context);
    }
    // You can't assume that everything is a LWC component - that will cause huge
    // problems with the refinement rules below that switch default visibility to protected!!
    return false;
}
const refineFeature$1 = {
    member: (member, context) => {
        if (isLWCComponent(member, context)) {
            const visibility = hasApiDecorator(member.node, context) ? "public" : "protected";
            return {
                ...member,
                visibility
            };
        }
        return member;
    },
    method: (method, context) => {
        if (isLWCComponent(method, context)) {
            const visibility = hasApiDecorator(method.node, context) ? "public" : "protected";
            return {
                ...method,
                visibility
            };
        }
        return method;
    }
};

/**
 * Flavors for analyzing LWC related features: https://lwc.dev/
 */
class LwcFlavor {
    constructor() {
        this.discoverDefinitions = discoverDefinitions$1;
        this.discoverFeatures = {
            member: discoverMembers
        };
        this.refineFeature = refineFeature$1;
    }
}

const VERSION = "2.0.0";
const DEFAULT_FLAVORS = [
    new LitElementFlavor(),
    new LwcFlavor(),
    new CustomElementFlavor(),
    new JsDocFlavor(),
    new JSXFlavor()
];
const DEFAULT_FEATURE_COLLECTION_CACHE = new WeakMap();
const DEFAULT_COMPONENT_DECLARATION_CACHE = new WeakMap();

const ALL_COMPONENT_FEATURES = ["member", "method", "cssproperty", "csspart", "event", "slot"];

/**
 * Creates an "analyzer visit context" based on some options
 * @param options
 */
function makeContextFromConfig(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (options.program == null) {
        throw new Error("A program is required when running 'analyzeSourceFile'");
    }
    // Assign defaults
    const flavors = options.flavors || DEFAULT_FLAVORS;
    const ts = options.ts || tsModule__namespace;
    const checker = options.program.getTypeChecker();
    // Create context
    return {
        checker,
        program: options.program,
        ts,
        flavors,
        cache: {
            featureCollection: DEFAULT_FEATURE_COLLECTION_CACHE,
            componentDeclarationCache: DEFAULT_COMPONENT_DECLARATION_CACHE,
            general: new Map()
        },
        config: {
            ...options.config,
            analyzeDefaultLib: (_b = (_a = options.config) === null || _a === void 0 ? void 0 : _a.analyzeDefaultLib) !== null && _b !== void 0 ? _b : false,
            analyzeDependencies: (_d = (_c = options.config) === null || _c === void 0 ? void 0 : _c.analyzeDependencies) !== null && _d !== void 0 ? _d : false,
            excludedDeclarationNames: (_f = (_e = options.config) === null || _e === void 0 ? void 0 : _e.excludedDeclarationNames) !== null && _f !== void 0 ? _f : [],
            features: (_h = (_g = options.config) === null || _g === void 0 ? void 0 : _g.features) !== null && _h !== void 0 ? _h : ALL_COMPONENT_FEATURES
        }
    };
}

/**
 * Prepares a map of component features and a callback map that adds to the component feature map.
 */
function prepareRefineEmitMap() {
    const collection = {
        members: [],
        methods: [],
        events: [],
        slots: [],
        cssProperties: [],
        cssParts: []
    };
    const refineEmitMap = {
        event: event => collection.events.push(event),
        member: member => collection.members.push(member),
        csspart: cssPart => collection.cssParts.push(cssPart),
        cssproperty: cssProperty => collection.cssProperties.push(cssProperty),
        method: method => collection.methods.push(method),
        slot: slot => collection.slots.push(slot)
    };
    return {
        collection,
        refineEmitMap
    };
}

/**
 * Uses flavors to refine a feature
 * Flavors can also remove a feature
 * @param featureKind
 * @param value
 * @param context
 * @param emitMap
 */
function refineFeature(featureKind, value, context, emitMap) {
    /*if (Array.isArray(value)) {
        value.forEach(v => refineComponentFeature(featureKind, v, context, emitMap));
        return;
    }*/
    var _a;
    let refinedValue = value;
    // Add "declaration" to the feature if necessary
    if ("getDeclaration" in context && refinedValue != null) {
        const decl = context.getDeclaration();
        if (Array.isArray(refinedValue)) {
            for (const val of refinedValue) {
                if (val.declaration == null) {
                    val.declaration = decl;
                }
            }
        }
        else if (refinedValue.declaration == null) {
            refinedValue.declaration = decl;
        }
    }
    for (const flavor of context.flavors) {
        const refineFunc = (_a = flavor.refineFeature) === null || _a === void 0 ? void 0 : _a[featureKind];
        if (refineFunc != null) {
            if (refinedValue == null) {
                return;
            }
            else if (Array.isArray(refinedValue)) {
                const newValue = [];
                for (const val of refinedValue) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const refined = refineFunc(val, context);
                    if (refined != null) {
                        newValue.push(...(Array.isArray(refined) ? refined : [refined]));
                    }
                }
                refinedValue = newValue.length === 0 ? undefined : newValue;
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                refinedValue = refineFunc(refinedValue, context);
            }
        }
    }
    if (refinedValue != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Array.isArray(refinedValue) ? refinedValue : [refinedValue]).forEach(v => { var _a; return (_a = emitMap === null || emitMap === void 0 ? void 0 : emitMap[featureKind]) === null || _a === void 0 ? void 0 : _a.call(emitMap, v); });
    }
}

/**
 * Uses flavors to find features for a node
 * @param node
 * @param context
 * @param emitMap
 */
function visitFeatures(node, context, emitMap) {
    const visitMaps = arrayDefined(context.flavors.map(flavor => flavor.discoverFeatures));
    visitFeaturesWithVisitMaps(node, context, visitMaps, emitMap);
}
/**
 * Uses flavors to find features for a node, using a visit map
 * @param node
 * @param context
 * @param visitMaps
 * @param emitMap
 */
function visitFeaturesWithVisitMaps(node, context, visitMaps, emitMap) {
    var _a;
    for (const feature of context.config.features || []) {
        // Visit all features: always "continue"
        for (const functionMap of visitMaps) {
            const func = functionMap === null || functionMap === void 0 ? void 0 : functionMap[feature];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = func === null || func === void 0 ? void 0 : func(node, context);
            if (value != null) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (_a = emitMap[feature]) === null || _a === void 0 ? void 0 : _a.call(emitMap, value);
            }
        }
    }
    // Visit child nodes
    node.forEachChild(child => {
        visitFeaturesWithVisitMaps(child, context, visitMaps, emitMap);
    });
}

/**
 * Merges based on a name
 * @param entries
 * @param direction
 * @param getName
 * @param merge
 */
function mergeNamedEntries(entries, getName, merge) {
    const merged = new Map();
    for (const entry of entries) {
        const name = getName(entry);
        const existing = merged.get(name);
        if (existing == null) {
            merged.set(name, entry);
        }
        else if (merge != null) {
            merged.set(name, merge(existing, entry));
        }
    }
    return Array.from(merged.values());
}
/**
 * Merges two jsdocs
 * @param leftJsDoc
 * @param rightJsDoc
 */
function mergeJsDoc(leftJsDoc, rightJsDoc) {
    var _a;
    if (leftJsDoc == null) {
        return rightJsDoc;
    }
    else if (rightJsDoc == null) {
        return leftJsDoc;
    }
    return {
        ...(leftJsDoc !== null && leftJsDoc !== void 0 ? leftJsDoc : rightJsDoc),
        description: (_a = leftJsDoc.description) !== null && _a !== void 0 ? _a : rightJsDoc.description
    };
}
/**
 * Merges modifiers
 * @param leftModifiers
 * @param rightModifiers
 */
function mergeModifiers(leftModifiers, rightModifiers) {
    const newSet = new Set();
    if ((leftModifiers === null || leftModifiers === void 0 ? void 0 : leftModifiers.has("static")) && (rightModifiers === null || rightModifiers === void 0 ? void 0 : rightModifiers.has("static"))) {
        newSet.add("static");
    }
    if ((leftModifiers === null || leftModifiers === void 0 ? void 0 : leftModifiers.has("readonly")) && (rightModifiers === null || rightModifiers === void 0 ? void 0 : rightModifiers.has("readonly"))) {
        newSet.add("readonly");
    }
    if (newSet.size === 0) {
        return undefined;
    }
    return newSet;
}
/**
 * Merges entries using a "merge" callback
 * @param entries
 * @param isMergeable
 * @param merge
 */
/*export function mergeEntries<T>(entries: T[], isMergeable: (entry: T, merged: T) => boolean, merge: (left: T, right: T) => T): T[] {
    let mergedEntries: T[] = [];

    for (const entry of entries) {
        let mergeableEntry: T | undefined = undefined;
        for (const mergedEntry of mergedEntries) {
            if (isMergeable(entry, mergedEntry)) {
                mergeableEntry = mergedEntry;
                break;
            }
        }

        let newEntry: T | undefined = undefined;
        if (mergeableEntry == null) {
            newEntry = entry;
        } else {
            mergedEntries = mergedEntries.filter(mergedEntry => mergedEntry !== entry && mergedEntry !== mergeableEntry);
            newEntry = merge(mergeableEntry, entry);
        }
        mergedEntries.push(newEntry);
    }

    return mergedEntries;
}*/

/**
 * Merges multiple slots
 * @param slots
 */
function mergeSlots(slots) {
    return mergeNamedEntries(slots, slot => slot.name || "");
}
/**
 * Merges multiple css parts
 * @param cssParts
 */
function mergeCssParts(cssParts) {
    return mergeNamedEntries(cssParts, cssPart => cssPart.name);
}
/**
 * Merges multiple css properties
 * @param cssProps
 */
function mergeCssProperties(cssProps) {
    return mergeNamedEntries(cssProps, cssProp => cssProp.name);
}
/**
 * Merges multiple methods
 * @param methods
 */
function mergeMethods(methods) {
    return mergeNamedEntries(methods, method => method.name, (left, right) => ({
        ...left,
        jsDoc: mergeJsDoc(left.jsDoc, right.jsDoc)
        //modifiers: mergeModifiers(left.modifiers, right.modifiers)
    }));
    /*return mergeEntries(
        methods,
        (method, mergedMethod) => {
            if (method.name === mergedMethod.name) {
                return (method.modifiers?.has("static") || false) === (mergedMethod.modifiers?.has("static") || false);
            }

            return false;
        },
        (left, right) => ({
            ...left,
            jsDoc: mergeJsDoc(left.jsDoc, right.jsDoc),
            modifiers: mergeModifiers(left.modifiers, right.modifiers)
        })
    );*/
}
/**
 * Merges multiple events
 * @param events
 */
function mergeEvents(events) {
    return mergeNamedEntries(events, event => event.name, (left, right) => ({
        ...left,
        jsDoc: mergeJsDoc(left.jsDoc, right.jsDoc),
        type: () => (left.type != null ? left.type() : right.type != null ? right.type() : { kind: "ANY" }),
        typeHint: left.typeHint || right.typeHint
    }));
}

const priorityValueMap = {
    low: 0,
    medium: 1,
    high: 2
};
/**
 * Merges multiple members based on priority
 * @param members
 * @param context
 */
function mergeMembers(members, context) {
    // Start merging by sorting member results from high to low priority.
    // If two priorities are the same: prioritize the first found element
    // From node 11, equal elements keep their order after sort, but not in node 10
    // Therefore we use "indexOf" to return correct order if two priorities are equal
    members = [...members].sort((a, b) => {
        const vA = priorityValueMap[a.priority || "low"];
        const vB = priorityValueMap[b.priority || "low"];
        if (vA === vB) {
            const iA = members.indexOf(a);
            const iB = members.indexOf(b);
            return iA < iB ? -1 : 1;
        }
        return vA < vB ? 1 : -1;
    });
    // Keep track of merged props and merged attributes
    // These are stored in maps for speed, because we are going to lookup a member per each memberResult
    const mergeMap = {
        props: new Map(),
        attrs: new Map()
    };
    // Merge all members one by one adding them to the merge map
    for (const member of members) {
        // Find a member that is similar to this member
        const mergeableMember = findMemberToMerge(member, mergeMap);
        let newMember = undefined;
        if (mergeableMember == null) {
            // No mergeable member was found, so just add this to the map
            newMember = member;
        }
        else {
            // Remove "member" and "mergeableMember" from the merge map
            // We are going to merge those and add the result to the merge map again
            clearMergeMapWithMember(mergeableMember, mergeMap);
            clearMergeMapWithMember(member, mergeMap);
            newMember = mergeMemberIntoMember(mergeableMember, member, context.checker);
        }
        // Add to merge map
        switch (newMember.kind) {
            case "attribute":
                mergeMap.attrs.set(newMember.attrName, newMember);
                break;
            case "property":
                mergeMap.props.set(newMember.propName, newMember);
                break;
        }
    }
    // Return merged results with only "high" priorities
    return [...mergeMap.props.values(), ...mergeMap.attrs.values()].map(member => ({ ...member, priority: "high" }));
}
/**
 * Removes a member from the merge map
 * @param member
 * @param mergeMap
 */
function clearMergeMapWithMember(member, mergeMap) {
    switch (member.kind) {
        case "attribute":
            mergeMap.attrs.delete(member.attrName);
            break;
        case "property":
            mergeMap.props.delete(member.propName);
            if (member.attrName != null) {
                mergeMap.attrs.delete(member.attrName);
            }
            break;
    }
}
/**
 * Finds a mergeable member
 * @param similar
 * @param mergeMap
 */
function findMemberToMerge(similar, mergeMap) {
    const attrName = similar.attrName; //?.toLowerCase(); // (similar.kind === "attribute" && similar.attrName.toLowerCase()) || undefined;
    const propName = similar.propName; /*?.toLowerCase()*/ //(similar.kind === "property" && similar.propName.toLowerCase()) || undefined;
    // Return a member that matches either propName (prioritized) or attrName
    if (propName != null) {
        const mergeable = mergeMap.props.get(propName) || mergeMap.attrs.get(propName);
        if (mergeable != null) {
            return mergeable;
        }
    }
    if (attrName != null) {
        const mergeableAttr = mergeMap.attrs.get(attrName);
        if (mergeableAttr != null) {
            return mergeableAttr;
        }
        // Try to find a prop with the attr name.
        // Don't return the prop if it already has an attribute that is not equals to the attr name
        const mergeableProp = mergeMap.props.get(attrName);
        if (mergeableProp != null && mergeableProp.attrName == null) {
            return mergeableProp;
        }
        for (const mergedAttr of mergeMap.props.values()) {
            if (mergedAttr.attrName === attrName) {
                return mergedAttr;
            }
        }
    }
}
/**
 * Merges two members of the same kind into each other.
 * This operation prioritizes leftMember
 * @param leftMember
 * @param rightMember
 * @param checker
 */
function mergeMemberIntoMember(leftMember, rightMember, checker) {
    var _a, _b, _c, _d, _e, _f, _g;
    // Always prioritize merging attribute into property if possible
    if (leftMember.kind === "attribute" && rightMember.kind === "property") {
        return mergeMemberIntoMember(rightMember, leftMember);
    }
    return {
        ...leftMember,
        attrName: (_a = leftMember.attrName) !== null && _a !== void 0 ? _a : rightMember.attrName,
        type: (() => {
            var _a, _b;
            // Always prioritize a "property" over an "attribute" when merging types
            if (leftMember.kind === rightMember.kind || leftMember.kind === "property") {
                return (_a = leftMember.type) !== null && _a !== void 0 ? _a : rightMember.type;
            }
            else if (rightMember.kind === "property") {
                return (_b = rightMember.type) !== null && _b !== void 0 ? _b : leftMember.type;
            }
        })(),
        typeHint: (_b = leftMember.typeHint) !== null && _b !== void 0 ? _b : rightMember.typeHint,
        jsDoc: mergeJsDoc(leftMember.jsDoc, rightMember.jsDoc),
        modifiers: mergeModifiers(leftMember.modifiers, rightMember.modifiers),
        meta: (_c = leftMember.meta) !== null && _c !== void 0 ? _c : rightMember.meta,
        default: leftMember.default === undefined ? rightMember.default : leftMember.default,
        required: (_d = leftMember.required) !== null && _d !== void 0 ? _d : rightMember.required,
        visibility: (_e = leftMember.visibility) !== null && _e !== void 0 ? _e : rightMember.visibility,
        deprecated: (_f = leftMember.deprecated) !== null && _f !== void 0 ? _f : rightMember.deprecated,
        declaration: (_g = rightMember.declaration) !== null && _g !== void 0 ? _g : leftMember.declaration
    };
}

/**
 * Merges all features in collections of features
 * @param collection
 * @param context
 */
function mergeFeatures(collection, context) {
    if (Array.isArray(collection)) {
        if (collection.length === 1) {
            return collection[0];
        }
        collection = {
            cssParts: arrayFlat(collection.map(c => c.cssParts)),
            cssProperties: arrayFlat(collection.map(c => c.cssProperties)),
            events: arrayFlat(collection.map(c => c.events)),
            members: arrayFlat(collection.map(c => c.members)),
            methods: arrayFlat(collection.map(c => c.methods)),
            slots: arrayFlat(collection.map(c => c.slots))
        };
        return mergeFeatures(collection, context);
    }
    return {
        cssParts: mergeCssParts(collection.cssParts),
        cssProperties: mergeCssProperties(collection.cssProperties),
        events: mergeEvents(collection.events),
        members: mergeMembers(collection.members, context),
        methods: mergeMethods(collection.methods),
        slots: mergeSlots(collection.slots)
    };
}

/**
 * Discovers features for a given node using flavors
 * @param node
 * @param context
 */
function discoverFeatures(node, context) {
    // Return the result if we already found this node
    if (context.cache.featureCollection.has(node)) {
        return context.cache.featureCollection.get(node);
    }
    const { collection, refineEmitMap } = prepareRefineEmitMap();
    // Discovers features for "node" using flavors
    visitFeatures(node, context, {
        event: event => refineFeature("event", event, context, refineEmitMap),
        member: memberResult => refineFeature("member", memberResult, context, refineEmitMap),
        csspart: cssPart => refineFeature("csspart", cssPart, context, refineEmitMap),
        cssproperty: cssProperty => refineFeature("cssproperty", cssProperty, context, refineEmitMap),
        method: method => refineFeature("method", method, context, refineEmitMap),
        slot: slot => refineFeature("slot", slot, context, refineEmitMap)
    });
    // Merge features that were found
    const mergedCollection = mergeFeatures(collection, context);
    // Cache the features for this node
    context.cache.featureCollection.set(node, mergedCollection);
    return mergedCollection;
}

/**
 * Uses flavors to find inheritance for a node
 * @param node
 * @param context
 * @param emit
 * @param visitSet
 */
function visitInheritance(node, context, emit, visitSet) {
    var _a;
    for (const flavor of context.flavors) {
        const result = (_a = flavor.discoverInheritance) === null || _a === void 0 ? void 0 : _a.call(flavor, node, context);
        if (result != null) {
            emit(result);
        }
    }
}

/**
 * Uses flavors in order to discover inheritance from one of more nodes.
 * @param startNode
 * @param visitedNodes
 * @param context
 */
function discoverInheritance(startNode, visitedNodes, context) {
    const nodes = Array.isArray(startNode) ? startNode : [startNode];
    let declarationKind = undefined;
    const heritageClauses = [];
    const declarationNodes = new Set();
    for (const node of nodes) {
        visitedNodes.add(node);
        // Visit inheritance using flavors
        visitInheritance(node, context, result => {
            // Combine results into one single result
            declarationKind = declarationKind || result.declarationKind;
            if (result.declarationNodes != null) {
                for (const node of result.declarationNodes) {
                    declarationNodes.add(node);
                }
            }
            if (result.heritageClauses != null) {
                heritageClauses.push(...result.heritageClauses);
            }
        });
    }
    return {
        declarationNodes: Array.from(declarationNodes),
        heritageClauses,
        declarationKind: declarationKind || "class"
    };
}

/**
 * Uses flavors to determine if a node should be excluded from the output
 * @param node
 * @param context
 */
function excludeNode(node, context) {
    var _a;
    for (const flavor of context.flavors) {
        const exclude = (_a = flavor.excludeNode) === null || _a === void 0 ? void 0 : _a.call(flavor, node, context);
        if (exclude) {
            return true;
        }
    }
    return false;
}

/**
 * Uses flavors to refine a declaration
 * @param declaration
 * @param context
 */
function refineDeclaration(declaration, context) {
    var _a, _b;
    for (const flavor of context.flavors) {
        declaration = (_b = (_a = flavor.refineDeclaration) === null || _a === void 0 ? void 0 : _a.call(flavor, declaration, context)) !== null && _b !== void 0 ? _b : declaration;
    }
    return declaration;
}

/**
 * Discovers features on component declaration nodes
 * @param initialDeclarationNodes
 * @param baseContext
 * @param options
 */
function analyzeComponentDeclaration(initialDeclarationNodes, baseContext, options = {}) {
    const mainDeclarationNode = initialDeclarationNodes[0];
    if (mainDeclarationNode == null) {
        return undefined;
        //throw new Error("Couldn't find main declaration node");
    }
    // Check if there exists a cached declaration for this node.
    // If a cached declaration was found, test if it should be invalidated (by looking at inherited declarations)
    const cachedDeclaration = baseContext.cache.componentDeclarationCache.get(mainDeclarationNode);
    if (cachedDeclaration != null && !shouldInvalidateCachedDeclaration(cachedDeclaration, baseContext)) {
        return cachedDeclaration;
    }
    options.visitedNodes = options.visitedNodes || new Set();
    // Discover inheritance
    const { declarationKind, declarationNodes, heritageClauses } = discoverInheritance(initialDeclarationNodes, options.visitedNodes, baseContext);
    // Expand all heritage clauses with the component declaration
    for (const heritageClause of heritageClauses) {
        // Only resolve declarations we haven't yet seen and shouldn't be excluded
        const declarations = resolveDeclarations(heritageClause.identifier, baseContext).filter(n => { var _a; return !((_a = options.visitedNodes) === null || _a === void 0 ? void 0 : _a.has(n)) && !shouldExcludeNode(n, baseContext); });
        if (declarations.length > 0) {
            heritageClause.declaration = analyzeComponentDeclaration(declarations, baseContext, options);
        }
    }
    // Get symbol of main declaration node
    const symbol = getSymbol(mainDeclarationNode, baseContext);
    const sourceFile = mainDeclarationNode.getSourceFile();
    const baseDeclaration = {
        sourceFile,
        node: mainDeclarationNode,
        declarationNodes: new Set(declarationNodes),
        symbol,
        heritageClauses,
        kind: declarationKind || "class",
        events: [],
        cssParts: [],
        cssProperties: [],
        members: [],
        methods: [],
        slots: [],
        jsDoc: getJsDoc(mainDeclarationNode, baseContext.ts)
    };
    // Add the "get declaration" hook to the context
    const context = {
        ...baseContext,
        declarationNode: mainDeclarationNode,
        sourceFile: mainDeclarationNode.getSourceFile(),
        getDeclaration: () => baseDeclaration
    };
    // Find features on all declaration nodes
    const featureCollections = [];
    for (const node of declarationNodes) {
        if (shouldExcludeNode(node, context)) {
            continue;
        }
        // Discover component features using flavors
        featureCollections.push(discoverFeatures(node, {
            ...context,
            declarationNode: node,
            sourceFile: node.getSourceFile()
        }));
    }
    // Add all inherited features to the feature collections array
    for (const heritageClause of heritageClauses) {
        if (heritageClause.declaration != null) {
            featureCollections.push({
                ...heritageClause.declaration,
                members: heritageClause.declaration.members
            });
        }
    }
    // If all nodes were excluded, return empty declaration
    if (featureCollections.length === 0) {
        return baseDeclaration;
    }
    // Merge all features into one single collection prioritizing features found in first
    const mergedFeatureCollection = mergeFeatures(featureCollections, context);
    // Refine the declaration and return the result
    const refinedDeclaration = refineDeclaration({
        ...baseDeclaration,
        cssParts: mergedFeatureCollection.cssParts,
        cssProperties: mergedFeatureCollection.cssProperties,
        events: mergedFeatureCollection.events,
        methods: mergedFeatureCollection.methods,
        members: mergedFeatureCollection.members,
        slots: mergedFeatureCollection.slots
    }, context);
    Object.assign(baseDeclaration, refinedDeclaration);
    // Update the cache
    baseContext.cache.componentDeclarationCache.set(mainDeclarationNode, baseDeclaration);
    return baseDeclaration;
}
/**
 * Returns if a node should be excluded from the analyzing
 * @param node
 * @param context
 */
function shouldExcludeNode(node, context) {
    var _a;
    // Uses flavors to determine if the node should be excluded
    if (excludeNode(node, context)) {
        return true;
    }
    // It's possible to exclude declaration names
    const name = getNodeName(node, context);
    if (name != null && ((_a = context.config.excludedDeclarationNames) === null || _a === void 0 ? void 0 : _a.includes(name))) {
        return true;
    }
    return false;
}
/**
 * Returns if the declaration should be invalidated by testing
 *    if any of the inherited declarations in the tree has been invalidated
 * @param componentDeclaration
 * @param context
 */
function shouldInvalidateCachedDeclaration(componentDeclaration, context) {
    var _a;
    for (const heritageClause of componentDeclaration.heritageClauses) {
        if (heritageClause.declaration != null) {
            // This declaration shouldn't be invalidated if the existing "node.getSourceFile()" is equal to the "program.getSourceFile(...)" with the same file name,
            const node = heritageClause.declaration.node;
            const oldSourceFile = node.getSourceFile();
            const newSourceFile = context.program.getSourceFile(oldSourceFile.fileName);
            const foundInCache = (_a = (newSourceFile != null && newSourceFile === oldSourceFile)) !== null && _a !== void 0 ? _a : false;
            // Return "true" that the declaration should invalidate if it wasn't found in the cache
            if (!foundInCache) {
                return true;
            }
            // Test the inherited declarations recursively
            if (shouldInvalidateCachedDeclaration(heritageClause.declaration, context)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Visits the source file and finds all component definitions using flavors
 * @param sourceFile
 * @param context
 */
function discoverDeclarations(sourceFile, context) {
    const declarations = [];
    const symbol = context.checker.getSymbolAtLocation(sourceFile);
    if (symbol != null) {
        // Get all exports in the source file
        const exports = context.checker.getExportsOfModule(symbol);
        // Find all class declarations in the source file
        for (const symbol of exports) {
            const node = symbol.valueDeclaration;
            if (node != null) {
                if (context.ts.isClassDeclaration(node) /* || context.ts.isInterfaceDeclaration(node)*/) {
                    const nodes = resolveSymbolDeclarations(symbol);
                    const decl = analyzeComponentDeclaration(nodes, context);
                    if (decl != null) {
                        declarations.push(decl);
                    }
                }
            }
        }
    }
    return declarations;
}

/**
 * Executes functions in a function map until some function returns a non-undefined value.
 * @param functionMaps
 * @param keys
 * @param arg
 * @param context
 */
function executeFunctionsUntilMatch(functionMaps, keys, arg, context) {
    keys = Array.isArray(keys) ? keys : [keys];
    for (const key of keys) {
        // Loop through each function
        for (const functionMap of functionMaps) {
            const func = functionMap[key];
            if (func == null)
                continue;
            // Save a "continue" flag if necessary
            let shouldContinue = false;
            const result = func(arg, {
                ...context,
                emitContinue() {
                    shouldContinue = true;
                }
            });
            // Return a result if not undefined
            if (result != null) {
                return { value: result, shouldContinue };
            }
        }
    }
    return undefined;
}

/**
 * Uses flavors to visit definitions
 * @param node
 * @param context
 * @param emit
 */
function visitDefinitions(node, context, emit) {
    const result = executeFunctionsUntilMatch(context.flavors, "discoverDefinitions", node, context);
    if (result != null) {
        emit(result.value);
        if (!result.shouldContinue)
            return;
    }
    // Visit child nodes
    node.forEachChild(child => {
        visitDefinitions(child, context, emit);
    });
}

/**
 * Visits the source file and finds all component definitions using flavors
 * @param sourceFile
 * @param context
 * @param analyzeDeclaration
 */
function discoverDefinitions(sourceFile, context, analyzeDeclaration) {
    // Find all definitions in the file using flavors
    const definitionResults = analyzeAndDedupeDefinitions(sourceFile, context);
    return Array.from(definitionResults.entries()).map(([definition, declarationSet]) => {
        let declaration;
        let didEvaluateDeclaration = false;
        return {
            ...definition,
            get declaration() {
                if (!didEvaluateDeclaration) {
                    declaration = analyzeDeclaration(definition, Array.from(declarationSet));
                    didEvaluateDeclaration = true;
                }
                return declaration;
            }
        };
    });
}
/**
 * Finds all component definitions in a file and combine multiple declarations with same tag name.
 * @param sourceFile
 * @param context
 */
function analyzeAndDedupeDefinitions(sourceFile, context) {
    if (sourceFile == null)
        return new Map();
    // Keep a map of "tag name" ==> "definition"
    const tagNameDefinitionMap = new Map();
    // Keep a map of "definition" ==> "declaration nodes"
    const definitionToDeclarationMap = new Map();
    // Discover definitions using flavors
    visitDefinitions(sourceFile, context, results => {
        // Definitions are unique by tag name and are merged when pointing to multiple declaration nodes.
        // This is because multiple definitions can exist side by side for the same tag name (think global TagName type definition and customElements.define)
        for (const result of results) {
            // Find existing definition with the result name
            let definition = tagNameDefinitionMap.get(result.tagName);
            if (definition == null) {
                // No existing definition was found, - create one!
                definition = {
                    sourceFile,
                    tagName: result.tagName,
                    tagNameNodes: new Set(),
                    identifierNodes: new Set()
                };
                tagNameDefinitionMap.set(result.tagName, definition);
            }
            // Add the discovered identifier node to the definition
            if (result.identifierNode != null) {
                definition.identifierNodes.add(result.identifierNode);
            }
            // Add the discovered tag name node to the definition
            if (result.tagNameNode) {
                definition.tagNameNodes.add(result.tagNameNode);
            }
            // Add the discovered declaration node to the map from "definition" ==> "declaration nodes"
            let declarationNodeSet = definitionToDeclarationMap.get(definition);
            if (declarationNodeSet == null) {
                declarationNodeSet = new Set();
                definitionToDeclarationMap.set(definition, declarationNodeSet);
            }
            // Grab the symbol from the identifier node and get the declarations
            // If the is no symbol on the result, use "result.declarationNode" instead
            const symbol = result.identifierNode != null ? getSymbol(result.identifierNode, context) : undefined;
            const declarations = symbol != null ? resolveSymbolDeclarations(symbol) : result.declarationNode != null ? [result.declarationNode] : [];
            for (const decl of declarations) {
                declarationNodeSet.add(decl);
            }
        }
    });
    // Remove duplicates where "tagName" is equals to "" if the declaration node is not used in any other definition.
    const results = Array.from(definitionToDeclarationMap.entries());
    for (const [definition, declarations] of results) {
        if (definition.tagName === "") {
            for (const [checkDefinition, checkDeclarations] of results) {
                // Find duplicated based on overlapping declarations
                if (definition !== checkDefinition && Array.from(declarations).find(decl => checkDeclarations.has(decl) != null)) {
                    definitionToDeclarationMap.delete(definition);
                    break;
                }
            }
        }
    }
    return definitionToDeclarationMap;
}

/**
 * Uses flavors to find global features
 * @param node
 * @param context
 * @param emitMap
 */
function visitGlobalFeatures(node, context, emitMap) {
    const visitMaps = arrayDefined(context.flavors.map(flavor => flavor.discoverGlobalFeatures));
    visitFeaturesWithVisitMaps(node, context, visitMaps, emitMap);
}

/**
 * Discover all global features using flavors
 * @param node
 * @param context
 */
function discoverGlobalFeatures(node, context) {
    const { collection, refineEmitMap } = prepareRefineEmitMap();
    // Discovers global features using flavors
    visitGlobalFeatures(node, context, {
        event: event => refineFeature("event", event, context, refineEmitMap),
        member: memberResult => refineFeature("member", memberResult, context, refineEmitMap),
        csspart: cssPart => refineFeature("csspart", cssPart, context, refineEmitMap),
        cssproperty: cssProperty => refineFeature("cssproperty", cssProperty, context, refineEmitMap),
        method: method => refineFeature("method", method, context, refineEmitMap),
        slot: slot => refineFeature("slot", slot, context, refineEmitMap)
    });
    // Merge features in the collection
    return mergeFeatures(collection, context);
}

/**
 * Analyzes all components in a source file.
 * @param sourceFile
 * @param options
 */
function analyzeSourceFile(sourceFile, options) {
    // Create a new context
    const context = makeContextFromConfig(options);
    // Analyze all components
    const componentDefinitions = discoverDefinitions(sourceFile, context, (definition, declarationNodes) => 
    // The component declaration is analyzed lazily
    analyzeComponentDeclaration(declarationNodes, context));
    // Analyze global features
    let globalFeatures = undefined;
    if (context.config.analyzeGlobalFeatures) {
        globalFeatures = discoverGlobalFeatures(sourceFile, context);
    }
    // Analyze exported declarations
    let declarations = undefined;
    if (context.config.analyzeAllDeclarations) {
        declarations = discoverDeclarations(sourceFile, context);
    }
    return {
        sourceFile,
        componentDefinitions,
        globalFeatures,
        declarations
    };
}

/**
 * Returns the superclass heritage clause
 * @param declaration
 */
function getSuperclassHeritageClause(declaration) {
    return (declaration.heritageClauses.find(clause => { var _a; return clause.kind === "extends" && ((_a = clause.declaration) === null || _a === void 0 ? void 0 : _a.kind) === "class"; }) ||
        declaration.heritageClauses.find(clause => clause.kind === "extends" && clause.declaration == null));
}
/**
 * Returns mixin heritage clauses for the declaration
 * @param declaration
 */
function getMixinHeritageClauses(declaration) {
    return declaration.heritageClauses.filter(clause => { var _a; return clause.kind === "mixin" || ((_a = clause.declaration) === null || _a === void 0 ? void 0 : _a.kind) === "mixin"; });
}
/**
 * Returns all extends heritage clauses for the declaration
 * @param declaration
 */
function getExtendsHeritageClauses(declaration) {
    return declaration.heritageClauses.filter(clause => clause.kind === "extends");
}
/**
 * Returns mixin heritage clauses for the declaration and all inherited declarations
 * @param declaration
 */
function getMixinHeritageClausesInChain(declaration) {
    const clauses = [];
    visitAllHeritageClauses(declaration, clause => {
        if (clause.kind === "mixin") {
            clauses.push(clause);
        }
    });
    return clauses;
}
/**
 * Returns extends heritage clauses for the declaration and all inherited declarations
 * @param declaration
 */
function getExtendsHeritageClausesInChain(declaration) {
    const clauses = [];
    visitAllHeritageClauses(declaration, clause => {
        if (clause.kind === "extends") {
            clauses.push(clause);
        }
    });
    return clauses;
}
/**
 * A helper function that makes it possible to visit all heritage clauses in the inheritance chain.
 * @param declaration
 * @param emit
 */
function visitAllHeritageClauses(declaration, emit) {
    for (const clause of declaration.heritageClauses) {
        emit(clause);
        if (clause.declaration != null) {
            visitAllHeritageClauses(clause.declaration, emit);
        }
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function isTypescriptNode(value) {
    return value instanceof Object && "kind" in value && "flags" in value;
}
function isTypescriptSourceFile(value) {
    return value instanceof Object && "kind" in value && "fileName" in value;
}
function isTypescriptType(value) {
    return value instanceof Object && "flags" in value && "checker" in value;
}
/**
 * Returns a representation of the input that can be JSON stringified
 */
function stripTypescriptValues(input, checker, seenValues = new Set()) {
    var _a, _b, _c, _d;
    if (seenValues.has(input)) {
        return "[Circular]";
    }
    seenValues = new Set(seenValues);
    seenValues.add(input);
    if (input == null) {
        return input;
    }
    else if (typeof input === "function") {
        return stripTypescriptValues(input(), checker, seenValues);
    }
    else if (isTypescriptSourceFile(input)) {
        return `{SOURCEFILE:${(_a = input.fileName.match(".*/(.+)")) === null || _a === void 0 ? void 0 : _a[1]}}`;
    }
    else if (isTypescriptNode(input)) {
        const title = "escapedText" in input ? input.escapedText : undefined;
        return `{NODE:${(_d = (_c = (_b = input.getSourceFile) === null || _b === void 0 ? void 0 : _b.call(input)) === null || _c === void 0 ? void 0 : _c.fileName.match(".*/(.+)")) === null || _d === void 0 ? void 0 : _d[1]}${title != null ? `:${title}` : ""}:${input.pos}}`;
    }
    else if (isTypescriptType(input)) {
        if (checker == null) {
            return "{TYPE}";
        }
        return `{TYPE:${checker.typeToString(input)}}`;
    }
    else if (tsSimpleType.isSimpleType(input)) {
        return `{SIMPLE_TYPE:${tsSimpleType.typeToString(input)}}`;
    }
    else if (Array.isArray(input)) {
        return input.map(i => stripTypescriptValues(i, checker, seenValues));
    }
    else if (input instanceof Set) {
        return stripTypescriptValues(Array.from(input), checker, seenValues);
    }
    else if (input instanceof Map) {
        return stripTypescriptValues(Array.from(input), checker, seenValues);
    }
    else if (input instanceof Object) {
        const obj = {};
        for (const [key, value] of Object.entries(input)) {
            const strippedValue = stripTypescriptValues(value, checker, seenValues);
            if (strippedValue !== undefined && (!Array.isArray(strippedValue) || strippedValue.length > 0)) {
                obj[key] = strippedValue;
            }
        }
        return obj;
    }
    return input;
}

/**
 * Transforms results to json.
 * @param results
 * @param program
 * @param config
 */
const debugJsonTransformer = (results, program, config) => {
    const definitions = arrayFlat(results.map(res => res.componentDefinitions));
    return JSON.stringify(stripTypescriptValues(definitions, program.getTypeChecker()), null, 2);
};

/**
 * Returns a "type hint" from a type
 * The type hint is an easy to read representation of the type and is not made for being parsed.
 * @param type
 * @param checker
 * @param config
 */
function getTypeHintFromType(type, checker, config) {
    if (type == null)
        return undefined;
    if (typeof type === "string")
        return type;
    let typeHint;
    if (config.inlineTypes) {
        // Inline aliased types
        if (tsSimpleType.isSimpleType(type)) {
            // Expand a possible alias
            if (isUnionTypeAlias(type)) {
                type = type.target;
            }
            typeHint = tsSimpleType.typeToString(type);
        }
        else {
            // Transform using Typescript natively, to avoid transforming all types to simple types (overhead).
            // The "InTypeAlias" flag expands the type.
            typeHint = checker.typeToString(type, undefined, tsModule.TypeFormatFlags.InTypeAlias);
        }
    }
    else {
        // Transform types to string
        typeHint = tsSimpleType.typeToString(type, checker);
    }
    // Replace "anys" and "{}" with more human friendly representations
    if (typeHint === "any")
        return undefined;
    if (typeHint === "any[]")
        return "array";
    if (typeHint === "{}")
        return "object";
    // "CustomEvent<unknown>" and "Event" of no interest
    if (typeHint === "CustomEvent<unknown>" || typeHint === "Event")
        return undefined;
    return typeHint;
}
/**
 * Checks if a type is a type alias simple type
 * @param simpleType
 */
function isUnionTypeAlias(simpleType) {
    return simpleType.kind === "ALIAS" && simpleType.target.kind === "UNION";
}

const VISIBILITY_NUMBER_MAP = {
    private: 1,
    protected: 2,
    public: 3
};
/**
 * Removes all items from an array with visibilities that are less visible than "visibility".
 * @param visibility
 * @param array
 */
function filterVisibility(visibility = "public", array) {
    const target = VISIBILITY_NUMBER_MAP[visibility];
    return array.filter(item => VISIBILITY_NUMBER_MAP[item.visibility || "public"] >= target);
}

/**
 * Returns the first element in the set
 * @param set
 */
function getFirst(set) {
    return set.values().next().value;
}

/**
 * Transforms results to json.
 * @param results
 * @param program
 * @param config
 */
const jsonTransformer = (results, program, config) => {
    const checker = program.getTypeChecker();
    // Get all definitions
    const definitions = arrayFlat(results.map(res => res.componentDefinitions));
    // Transform all definitions into "tags"
    const tags = definitions.map(d => definitionToHtmlDataTag$1(d, checker, config));
    const htmlData = {
        version: "experimental",
        tags
    };
    return JSON.stringify(htmlData, null, 2);
};
function definitionToHtmlDataTag$1(definition, checker, config) {
    // Grab path to the definition file if possible
    const node = getFirst(definition.tagNameNodes) || getFirst(definition.identifierNodes);
    const fileName = node === null || node === void 0 ? void 0 : node.getSourceFile().fileName;
    const path$1 = fileName != null && config.cwd != null ? `./${path.relative(config.cwd, fileName)}` : undefined;
    const declaration = definition.declaration;
    if (declaration == null) {
        return {
            name: definition.tagName,
            path: path$1
        };
    }
    const attributes = arrayDefined(filterVisibility(config.visibility, declaration.members).map(d => componentMemberToHtmlDataAttribute(d, checker, config)));
    const properties = arrayDefined(filterVisibility(config.visibility, declaration.members).map(d => componentMemberToHtmlDataProperty(d, checker, config)));
    const events = arrayDefined(filterVisibility(config.visibility, declaration.events).map(e => componentEventToHtmlDataEvent(e)));
    const slots = arrayDefined(declaration.slots.map(e => componentSlotToHtmlDataSlot(e)));
    const cssProperties = arrayDefined(declaration.cssProperties.map(p => componentCssPropToHtmlCssProp(p)));
    const cssParts = arrayDefined(declaration.cssParts.map(p => componentCssPartToHtmlCssPart(p)));
    return {
        name: definition.tagName,
        path: path$1,
        description: getDescriptionFromJsDoc(declaration.jsDoc),
        attributes: attributes.length === 0 ? undefined : attributes,
        properties: properties.length === 0 ? undefined : properties,
        events: events.length === 0 ? undefined : events,
        slots: slots.length === 0 ? undefined : slots,
        cssProperties: cssProperties.length === 0 ? undefined : cssProperties,
        cssParts: cssParts.length === 0 ? undefined : cssParts,
        deprecated: declaration.deprecated === true || typeof declaration.deprecated === "string" || undefined,
        deprecatedMessage: typeof declaration.deprecated === "string" ? declaration.deprecated : undefined
    };
}
function componentCssPropToHtmlCssProp(prop, checker) {
    return {
        name: prop.name || "",
        description: getDescriptionFromJsDoc(prop.jsDoc),
        type: prop.typeHint,
        default: prop.default != null ? JSON.stringify(prop.default) : undefined
    };
}
function componentCssPartToHtmlCssPart(part, checker) {
    return {
        name: part.name || "",
        description: getDescriptionFromJsDoc(part.jsDoc)
    };
}
function componentSlotToHtmlDataSlot(slot, checker) {
    return {
        name: slot.name || "",
        description: getDescriptionFromJsDoc(slot.jsDoc)
    };
}
function componentEventToHtmlDataEvent(event, checker) {
    return {
        name: event.name,
        description: getDescriptionFromJsDoc(event.jsDoc),
        deprecated: event.deprecated === true || undefined,
        deprecatedMessage: typeof event.deprecated === "string" ? event.deprecated : undefined
    };
}
function componentMemberToHtmlDataAttribute(member, checker, config) {
    var _a, _b;
    if (member.attrName == null) {
        return undefined;
    }
    return {
        name: member.attrName,
        description: getDescriptionFromJsDoc(member.jsDoc),
        type: getTypeHintFromType((_a = member.typeHint) !== null && _a !== void 0 ? _a : (_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member), checker, config),
        default: member.default != null ? JSON.stringify(member.default) : undefined,
        deprecated: member.deprecated === true || undefined,
        deprecatedMessage: typeof member.deprecated === "string" ? member.deprecated : undefined
    };
}
function componentMemberToHtmlDataProperty(member, checker, config) {
    var _a, _b;
    if (member.propName == null) {
        return undefined;
    }
    return {
        name: member.propName,
        attribute: member.attrName,
        description: getDescriptionFromJsDoc(member.jsDoc),
        type: getTypeHintFromType((_a = member.typeHint) !== null && _a !== void 0 ? _a : (_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member), checker, config),
        default: member.default != null ? JSON.stringify(member.default) : undefined,
        deprecated: member.deprecated === true || undefined,
        deprecatedMessage: typeof member.deprecated === "string" ? member.deprecated : undefined
    };
}
function getDescriptionFromJsDoc(jsDoc) {
    return jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.description;
}

/**
 * This method returns a "type hint" that represents the method signature
 * The resulting type takes jsdoc into account.
 * I couldn't find a way for Typescript to return the signature string taking jsdoc into account
 *   so therefore I had to do some regex-magic in this method.
 */
function getTypeHintFromMethod(method, checker) {
    var _a, _b, _c, _d, _e, _f, _g;
    let signature = getTypeHintFromType((_a = method.type) === null || _a === void 0 ? void 0 : _a.call(method), checker, {}) || "";
    // Replace "=>" with ":" and the return type with the returnTypeHint if present
    signature = signature.replace(/\)\s*=>\s?(.*)$/, `): ${(_e = (_d = (_c = (_b = method.jsDoc) === null || _b === void 0 ? void 0 : _b.tags) === null || _c === void 0 ? void 0 : _c.find(tag => ["returns", "return"].includes(tag.tag))) === null || _d === void 0 ? void 0 : _d.parsed().type) !== null && _e !== void 0 ? _e : "$1"}`);
    // Replace all "any" types with corresponding type hints
    for (const parameterJsDocTag of ((_g = (_f = method.jsDoc) === null || _f === void 0 ? void 0 : _f.tags) === null || _g === void 0 ? void 0 : _g.filter(tag => tag.tag === "param")) || []) {
        const parsed = parameterJsDocTag.parsed();
        if (parsed.type != null) {
            signature = signature.replace(new RegExp(`${parsed.name}(.*?:\\s*)any\\[?]?`), `${parsed.name}$1${parsed.type}`);
        }
    }
    // Replace "{}" with more pleasant string
    signature = signature.replace("{}", "object");
    return signature;
}

/**
 * Transforms results to json using the schema found in the PR at https://github.com/webcomponents/custom-elements-json/pull/9
 * @param results
 * @param program
 * @param config
 */
const json2Transformer = (results, program, config) => {
    const context = {
        config,
        checker: program.getTypeChecker(),
        program,
        ts: tsModule__namespace
    };
    // Flatten analyzer results expanding inherited declarations into the declaration array.
    const flattenedAnalyzerResults = flattenAnalyzerResults(results);
    // Transform all analyzer results into modules
    const modules = flattenedAnalyzerResults.map(result => analyzerResultToModuleDoc(result, context));
    const htmlData = {
        version: "experimental",
        modules
    };
    return JSON.stringify(htmlData, null, 2);
};
/**
 * Transforms an analyzer result into a module doc
 * @param result
 * @param context
 */
function analyzerResultToModuleDoc(result, context) {
    // Get all export docs from the analyzer result
    const exports = getExportsDocsFromAnalyzerResult(result, context);
    return {
        path: getRelativePath(result.sourceFile.fileName, context),
        exports: exports.length === 0 ? undefined : exports
    };
}
/**
 * Returns ExportDocs in an analyzer result
 * @param result
 * @param context
 */
function getExportsDocsFromAnalyzerResult(result, context) {
    // Return all class- and variable-docs
    return [
        ...getDefinitionDocsFromAnalyzerResult(result, context),
        ...getClassDocsFromAnalyzerResult(result, context),
        ...getVariableDocsFromAnalyzerResult(result, context),
        ...getFunctionDocsFromAnalyzerResult()
    ];
}
/**
 * Returns FunctionDocs in an analyzer result
 * @param result
 * @param context
 */
function getFunctionDocsFromAnalyzerResult(result, context) {
    // TODO: support function exports
    return [];
}
function getDefinitionDocsFromAnalyzerResult(result, context) {
    return arrayDefined(result.componentDefinitions.map(definition => {
        // It's not possible right now to model a tag name where the
        //   declaration couldn't be resolved because the "declaration" is required
        if (definition.declaration == null) {
            return undefined;
        }
        return {
            kind: "definition",
            name: definition.tagName,
            declaration: getReferenceForNode(definition.declaration.node, context)
        };
    }));
}
/**
 * Returns VariableDocs in an analyzer result
 * @param result
 * @param context
 */
function getVariableDocsFromAnalyzerResult(result, context) {
    const varDocs = [];
    // Get all export symbols in the source file
    const symbol = context.checker.getSymbolAtLocation(result.sourceFile);
    if (symbol == null) {
        return [];
    }
    const exports = context.checker.getExportsOfModule(symbol);
    // Convert all export variables to VariableDocs
    for (const exp of exports) {
        switch (exp.flags) {
            case tsModule__namespace.SymbolFlags.BlockScopedVariable:
            case tsModule__namespace.SymbolFlags.Variable: {
                const node = exp.valueDeclaration;
                if (node && tsModule__namespace.isVariableDeclaration(node)) {
                    // Get the nearest variable statement in order to read the jsdoc
                    const variableStatement = findParent(node, tsModule__namespace.isVariableStatement) || node;
                    const jsDoc = getJsDoc(variableStatement, tsModule__namespace);
                    varDocs.push({
                        kind: "variable",
                        name: node.name.getText(),
                        description: jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.description,
                        type: getTypeHintFromType(context.checker.getTypeAtLocation(node), context.checker, context.config),
                        summary: getSummaryFromJsDoc(jsDoc)
                    });
                }
                break;
            }
        }
    }
    return varDocs;
}
/**
 * Returns ClassDocs in an analyzer result
 * @param result
 * @param context
 */
function getClassDocsFromAnalyzerResult(result, context) {
    const classDocs = [];
    // Convert all declarations to class docs
    for (const decl of result.declarations || []) {
        const doc = getExportsDocFromDeclaration(decl, result, context);
        if (doc != null) {
            classDocs.push(doc);
        }
    }
    return classDocs;
}
/**
 * Converts a component declaration to ClassDoc, CustomElementDoc or MixinDoc
 * @param declaration
 * @param result
 * @param context
 */
function getExportsDocFromDeclaration(declaration, result, context) {
    var _a, _b;
    // Only include "mixin" and "class" in the output. Interfaces are not outputted..
    if (declaration.kind === "interface") {
        return undefined;
    }
    // Get the superclass of this declaration
    const superclassHeritage = getSuperclassHeritageClause(declaration);
    const superclassRef = superclassHeritage == null ? undefined : getReferenceFromHeritageClause(superclassHeritage, context);
    // Get all mixins
    const mixinHeritage = getMixinHeritageClauses(declaration);
    const mixinRefs = arrayDefined(mixinHeritage.map(h => getReferenceFromHeritageClause(h, context)));
    const members = getClassMemberDocsFromDeclaration(declaration, context);
    const classDoc = {
        kind: "class",
        superclass: superclassRef,
        mixins: mixinRefs.length > 0 ? mixinRefs : undefined,
        description: (_a = declaration.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
        name: ((_b = declaration.symbol) === null || _b === void 0 ? void 0 : _b.name) || getNodeName(declaration.node, { ts: tsModule__namespace }) || "",
        members: members.length > 0 ? members : undefined,
        summary: getSummaryFromJsDoc(declaration.jsDoc)
    };
    // Find the first corresponding custom element definition for this declaration
    const definition = result.componentDefinitions.find(def => { var _a; return ((_a = def.declaration) === null || _a === void 0 ? void 0 : _a.node) === declaration.node; });
    if (definition != null) {
        const events = getEventDocsFromDeclaration(declaration, context);
        const slots = getSlotDocsFromDeclaration(declaration, context);
        const attributes = getAttributeDocsFromDeclaration(declaration, context);
        const cssProperties = getCSSPropertyDocsFromDeclaration(declaration, context);
        const cssParts = getCSSPartDocsFromDeclaration(declaration, context);
        // Return a custom element doc if a definition was found
        const customElementDoc = {
            ...classDoc,
            tagName: definition.tagName,
            events: events.length > 0 ? events : undefined,
            slots: slots.length > 0 ? slots : undefined,
            attributes: attributes.length > 0 ? attributes : undefined,
            cssProperties: cssProperties.length > 0 ? cssProperties : undefined,
            cssParts: cssParts.length > 0 ? cssParts : undefined
        };
        return customElementDoc;
    }
    return classDoc;
}
/**
 * Returns event docs for a declaration
 * @param declaration
 * @param context
 */
function getEventDocsFromDeclaration(declaration, context) {
    return filterVisibility(context.config.visibility, declaration.events).map(event => {
        var _a, _b;
        const type = ((_a = event.type) === null || _a === void 0 ? void 0 : _a.call(event)) || { kind: "ANY" };
        const simpleType = tsSimpleType.isSimpleType(type) ? type : tsSimpleType.toSimpleType(type, context.checker);
        const typeName = simpleType.kind === "GENERIC_ARGUMENTS" ? simpleType.target.name : simpleType.name;
        const customEventDetailType = typeName === "CustomEvent" && simpleType.kind === "GENERIC_ARGUMENTS" ? simpleType.typeArguments[0] : undefined;
        return {
            description: (_b = event.jsDoc) === null || _b === void 0 ? void 0 : _b.description,
            name: event.name,
            inheritedFrom: getInheritedFromReference(declaration, event, context),
            type: typeName == null || simpleType.kind === "ANY" ? "Event" : typeName,
            detailType: customEventDetailType != null ? getTypeHintFromType(customEventDetailType, context.checker, context.config) : undefined
        };
    });
}
/**
 * Returns slot docs for a declaration
 * @param declaration
 * @param context
 */
function getSlotDocsFromDeclaration(declaration, context) {
    return declaration.slots.map(slot => {
        var _a;
        return ({
            description: (_a = slot.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
            name: slot.name || "",
            inheritedFrom: getInheritedFromReference(declaration, slot, context)
        });
    });
}
/**
 * Returns css properties for a declaration
 * @param declaration
 * @param context
 */
function getCSSPropertyDocsFromDeclaration(declaration, context) {
    return declaration.cssProperties.map(cssProperty => {
        var _a;
        return ({
            name: cssProperty.name,
            description: (_a = cssProperty.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
            type: cssProperty.typeHint,
            default: cssProperty.default != null ? JSON.stringify(cssProperty.default) : undefined,
            inheritedFrom: getInheritedFromReference(declaration, cssProperty, context)
        });
    });
}
/**
 * Returns css parts for a declaration
 * @param declaration
 * @param context
 */
function getCSSPartDocsFromDeclaration(declaration, context) {
    return declaration.cssParts.map(cssPart => {
        var _a;
        return ({
            name: cssPart.name,
            description: (_a = cssPart.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
            inheritedFrom: getInheritedFromReference(declaration, cssPart, context)
        });
    });
}
/**
 * Returns attribute docs for a declaration
 * @param declaration
 * @param context
 */
function getAttributeDocsFromDeclaration(declaration, context) {
    var _a, _b;
    const attributeDocs = [];
    for (const member of filterVisibility(context.config.visibility, declaration.members)) {
        if (member.attrName != null) {
            attributeDocs.push({
                name: member.attrName,
                fieldName: member.propName,
                defaultValue: member.default != null ? JSON.stringify(member.default) : undefined,
                description: (_a = member.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
                type: getTypeHintFromType(member.typeHint || ((_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member)), context.checker, context.config),
                inheritedFrom: getInheritedFromReference(declaration, member, context)
            });
        }
    }
    return attributeDocs;
}
/**
 * Returns class member docs for a declaration
 * @param declaration
 * @param context
 */
function getClassMemberDocsFromDeclaration(declaration, context) {
    return [...getFieldDocsFromDeclaration(declaration, context), ...getMethodDocsFromDeclaration(declaration, context)];
}
/**
 * Returns method docs for a declaration
 * @param declaration
 * @param context
 */
function getMethodDocsFromDeclaration(declaration, context) {
    var _a;
    const methodDocs = [];
    for (const method of filterVisibility(context.config.visibility, declaration.methods)) {
        const parameters = [];
        let returnType = undefined;
        const node = method.node;
        if (node !== undefined && tsModule__namespace.isMethodDeclaration(node)) {
            // Build a list of parameters
            for (const param of node.parameters) {
                const name = param.name.getText();
                const { description, typeHint } = getParameterFromJsDoc(name, method.jsDoc);
                parameters.push({
                    name: name,
                    type: getTypeHintFromType(typeHint || (param.type != null ? context.checker.getTypeAtLocation(param.type) : undefined), context.checker, context.config),
                    description: description
                });
            }
            // Get return type
            const signature = context.checker.getSignatureFromDeclaration(node);
            if (signature != null) {
                returnType = context.checker.getReturnTypeOfSignature(signature);
            }
        }
        // Get return info from jsdoc
        const { description: returnDescription, typeHint: returnTypeHint } = getReturnFromJsDoc(method.jsDoc);
        methodDocs.push({
            kind: "method",
            name: method.name,
            privacy: method.visibility,
            type: getTypeHintFromMethod(method, context.checker),
            description: (_a = method.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
            parameters,
            return: {
                description: returnDescription,
                type: getTypeHintFromType(returnTypeHint || returnType, context.checker, context.config)
            },
            inheritedFrom: getInheritedFromReference(declaration, method, context),
            summary: getSummaryFromJsDoc(method.jsDoc)
            // TODO: "static"
        });
    }
    return methodDocs;
}
/**
 * Returns field docs from a declaration
 * @param declaration
 * @param context
 */
function getFieldDocsFromDeclaration(declaration, context) {
    var _a, _b;
    const fieldDocs = [];
    for (const member of filterVisibility(context.config.visibility, declaration.members)) {
        if (member.propName != null) {
            fieldDocs.push({
                kind: "field",
                name: member.propName,
                privacy: member.visibility,
                description: (_a = member.jsDoc) === null || _a === void 0 ? void 0 : _a.description,
                type: getTypeHintFromType(member.typeHint || ((_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member)), context.checker, context.config),
                default: member.default != null ? JSON.stringify(member.default) : undefined,
                inheritedFrom: getInheritedFromReference(declaration, member, context),
                summary: getSummaryFromJsDoc(member.jsDoc)
                // TODO: "static"
            });
        }
    }
    return fieldDocs;
}
function getInheritedFromReference(onDeclaration, feature, context) {
    if (feature.declaration != null && feature.declaration !== onDeclaration) {
        return getReferenceForNode(feature.declaration.node, context);
    }
    return undefined;
}
/**
 * Returns a Reference to a node
 * @param node
 * @param context
 */
function getReferenceForNode(node, context) {
    const sourceFile = node.getSourceFile();
    const name = getNodeName(node, context);
    // Test if the source file is from a typescript lib
    // TODO: Find a better way of checking this
    const isLib = sourceFile.isDeclarationFile && sourceFile.fileName.match(/typescript\/lib.*\.d\.ts$/) != null;
    if (isLib) {
        // Only return the name of the declaration if it's from lib
        return {
            name
        };
    }
    // Test if the source file is located in a package
    const packageName = getPackageName(sourceFile);
    if (packageName != null) {
        return {
            name,
            package: packageName
        };
    }
    // Get the module path name
    const module = getRelativePath(sourceFile.fileName, context);
    return {
        name,
        module
    };
}
/**
 * Returns the name of the package (if any)
 * @param sourceFile
 */
function getPackageName(sourceFile) {
    // TODO: Make it possible to access the ModuleResolutionHost
    //  in order to resolve the package using "resolveModuleNames"
    //  The following approach is very, very naive and is only temporary.
    const match = sourceFile.fileName.match(/node_modules\/(.*?)\//);
    if (match != null) {
        return match[1];
    }
    return undefined;
}
/**
 * Returns a relative path based on "cwd" in the config
 * @param fullPath
 * @param context
 */
function getRelativePath(fullPath, context) {
    return context.config.cwd != null ? `./${path.relative(context.config.cwd, fullPath)}` : path.basename(fullPath);
}
/**
 * Returns description and typeHint based on jsdoc for a specific parameter name
 * @param name
 * @param jsDoc
 */
function getParameterFromJsDoc(name, jsDoc) {
    if ((jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.tags) == undefined) {
        return {};
    }
    for (const tag of jsDoc.tags) {
        const parsed = tag.parsed();
        if (parsed.tag === "param" && parsed.name === name) {
            return { description: parsed.description, typeHint: parsed.type };
        }
    }
    return {};
}
/**
 * Get return description and return typeHint from jsdoc
 * @param jsDoc
 */
function getReturnFromJsDoc(jsDoc) {
    var _a;
    const tag = (_a = jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => ["returns", "return"].includes(tag.tag));
    if (tag == null) {
        return {};
    }
    const parsed = tag.parsed();
    return { description: parsed.description, typeHint: parsed.type };
}
/**
 * Converts a heritage clause into a reference
 * @param heritage
 * @param context
 */
function getReferenceFromHeritageClause(heritage, context) {
    var _a;
    const node = (_a = heritage.declaration) === null || _a === void 0 ? void 0 : _a.node;
    const identifier = heritage.identifier;
    // Return a reference for this node if any
    if (node != null) {
        return getReferenceForNode(node, context);
    }
    // Try to get declaration of the identifier if no node was found
    const [declaration] = resolveDeclarations(identifier, context);
    if (declaration != null) {
        return getReferenceForNode(declaration, context);
    }
    // Just return the name of the reference if nothing could be resolved
    const name = getNodeName(identifier, context);
    if (name != null) {
        return { name };
    }
    return undefined;
}
/**
 * Flatten all analyzer results with inherited declarations
 * @param results
 */
function flattenAnalyzerResults(results) {
    // Keep track of declarations in each source file
    const declarationMap = new Map();
    /**
     * Add a declaration to the declaration map
     * @param declaration
     */
    function addDeclarationToMap(declaration) {
        const sourceFile = declaration.node.getSourceFile();
        const exportDocs = declarationMap.get(sourceFile) || new Set();
        if (!declarationMap.has(sourceFile)) {
            declarationMap.set(sourceFile, exportDocs);
        }
        exportDocs.add(declaration);
    }
    for (const result of results) {
        for (const decl of result.declarations || []) {
            // Add all existing declarations to the map
            addDeclarationToMap(decl);
            visitAllHeritageClauses(decl, clause => {
                // Flatten all component declarations
                if (clause.declaration != null) {
                    addDeclarationToMap(clause.declaration);
                }
            });
        }
    }
    // Return new results with flattened declarations
    return results.map(result => {
        const declarations = declarationMap.get(result.sourceFile);
        return {
            ...result,
            declarations: declarations != null ? Array.from(declarations) : result.declarations
        };
    });
}
/**
 * Returns the content of the summary jsdoc tag if any
 * @param jsDoc
 */
function getSummaryFromJsDoc(jsDoc) {
    var _a;
    const summaryTag = (_a = jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.tag === "summary");
    if (summaryTag == null) {
        return undefined;
    }
    return summaryTag.comment;
}

/**
 * Parses and returns examples for a component.
 * @param declaration
 */
function getExamplesFromComponent(declaration) {
    var _a, _b;
    const examples = ((_b = (_a = declaration.jsDoc) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.filter(tag => tag.tag === "example" || tag.tag === "demo")) || [];
    return examples.map(exampleFromJsDocTag);
}
/**
 * Returns an example based on a jsdoc tag
 * @param tag
 */
function exampleFromJsDocTag(tag) {
    const { code, lang, description } = discoverCodeFromExampleText(tag.comment || "");
    return {
        lang,
        description,
        code
    };
}
/**
 * Parses some text and returns the first found example
 * @param text
 */
function discoverCodeFromExampleText(text) {
    // Check if there is a code example already like this: ```code here ```
    const escapedCodeMatch = text.match(/([\s\S]*)```(\S*)([\s\S]+)```/);
    if (escapedCodeMatch != null) {
        return {
            description: (escapedCodeMatch[1] || "").trim() || undefined,
            lang: escapedCodeMatch[2] || undefined,
            code: (escapedCodeMatch[3] || "").trim()
        };
    }
    // Else, assume that the text is the code
    return { code: text.trim(), lang: discoverLanguageFromExampleText(text) };
}
/**
 * Returns the language of some code based on assumptions
 * @param code
 */
function discoverLanguageFromExampleText(code) {
    if (code.includes("html`")) {
        return "javascript";
    }
    if (code.match(/<\S/)) {
        return "html";
    }
    return "javascript";
}

/**
 * Returns a markdown header with a specific level taking global start title level into account.
 * @param title
 * @param level
 * @param config
 */
function markdownHeader(title, level, config) {
    var _a, _b;
    level = level - 1 + (((_a = config.markdown) === null || _a === void 0 ? void 0 : _a.headerLevel) || ((_b = config.markdown) === null || _b === void 0 ? void 0 : _b.titleLevel) || 1);
    return `${"#".repeat(level)} ${title}`;
}
/**
 * Returns a markdown table representation of the rows.
 * Strips unused columns.
 * @param rows
 * @param removeEmptyColumns
 */
function markdownTable(rows, { removeEmptyColumns } = { removeEmptyColumns: true }) {
    // Constants for pretty printing the markdown tables
    const MIN_CELL_WIDTH = 3;
    const MAX_CELL_WIDTH = 50;
    const CELL_PADDING = 1;
    // Count the number of columns
    let columnCount = Math.max(...rows.map(r => r.length));
    if (removeEmptyColumns) {
        // Create a boolean array where each entry tells if a column is used or not (excluding the header)
        const emptyColumns = Array(columnCount)
            .fill(false)
            .map((b, i) => i !== 0 && rows.slice(1).find(r => r[i] != null && r[i].length > 0) == null);
        // Remove unused columns if necessary
        if (emptyColumns.includes(true)) {
            // Filter out the unused columns in each row
            rows = rows.map(row => row.filter((column, i) => !emptyColumns[i]));
            // Adjust the column count
            columnCount = Math.max(...rows.map(r => r.length));
        }
    }
    // Escape all cells in the markdown output
    rows = rows.map(r => r.map(markdownEscapeTableCell));
    // Create a boolean array where each entry corresponds to the preferred column width.
    // This is done by taking the largest width of all cells in each column.
    const columnWidths = Array(columnCount)
        .fill(0)
        .map((c, i) => Math.min(MAX_CELL_WIDTH, Math.max(MIN_CELL_WIDTH, ...rows.map(r => (r[i] || "").length)) + CELL_PADDING * 2));
    // Build up the table
    return `
|${rows[0].map((r, i) => fillWidth(r, columnWidths[i], CELL_PADDING)).join("|")}|
|${columnWidths.map(c => "-".repeat(c)).join("|")}|
${rows
        .slice(1)
        .map(r => `|${r.map((r, i) => fillWidth(r, columnWidths[i], CELL_PADDING)).join("|")}|`)
        .join("\n")}
`;
}
/**
 * Escape a text so it can be used in a markdown table
 * @param text
 */
function markdownEscapeTableCell(text) {
    return text.replace(/\n/g, "<br />").replace(/\|/g, "\\|");
}
/**
 * Highlights some text
 * @param text
 */
function markdownHighlight(text) {
    if (text == null || text.length === 0)
        return "";
    return `\`${text}\``;
}
/**
 * Creates padding around some text with a target width.
 * @param text
 * @param width
 * @param paddingStart
 */
function fillWidth(text, width, paddingStart) {
    return " ".repeat(paddingStart) + text + " ".repeat(Math.max(1, width - text.length - paddingStart));
}

/**
 * Transforms the component results to markdown
 * @param results
 * @param program
 * @param config
 */
const markdownTransformer = (results, program, config) => {
    // Grab all definitions
    const definitions = arrayFlat(results.map(res => res.componentDefinitions));
    // Transform all definitions to markdown
    const markdownSegments = arrayDefined(definitions.map(definition => {
        var _a, _b;
        // Add tagName as header
        let segmentText = markdownHeader(definition.tagName, 1, config) + "\n";
        const declaration = definition.declaration;
        if (declaration == null) {
            return undefined;
        }
        // Add component jsdoc comment to the output
        if (((_a = declaration.jsDoc) === null || _a === void 0 ? void 0 : _a.description) != null)
            segmentText += `\n${(_b = declaration.jsDoc) === null || _b === void 0 ? void 0 : _b.description}\n`;
        // Add mixins (don't include mixins prefixed with _)
        const mixins = arrayDedupe(arrayDefined(getMixinHeritageClausesInChain(declaration).map(clause => { var _a, _b; return ((_b = (_a = clause.declaration) === null || _a === void 0 ? void 0 : _a.symbol) === null || _b === void 0 ? void 0 : _b.name) || clause.identifier.getText(); })).filter(name => !name.startsWith("_")));
        if (mixins.length > 0) {
            segmentText += `\n**Mixins:** ${mixins.join(", ")}\n`;
        }
        // Add examples
        const examples = getExamplesFromComponent(declaration);
        if (examples.length > 0) {
            segmentText += "\n" + markdownHeader(`Example${examples.length > 1 ? "s" : ""}`, 2, config) + "\n";
            for (const example of examples) {
                if (example.description != null) {
                    segmentText += `\n${example.description}\n`;
                }
                segmentText += `\n\`\`\`${example.lang || ""}\n${example.code}\n\`\`\`\n`;
            }
        }
        // Grab all items from the component and add them as tables to the output.
        const properties = filterVisibility(config.visibility, declaration.members
            .filter((m) => m.kind === "property")
            .filter(m => m.modifiers == null || !m.modifiers.has("static"))).sort((a, b) => (a.propName < b.propName ? -1 : 1));
        const attributes = filterVisibility(config.visibility, declaration.members.filter((m) => m.kind === "attribute")).sort((a, b) => (a.attrName < b.attrName ? -1 : 1));
        const methods = filterVisibility(config.visibility, declaration.methods).sort((a, b) => (a.name < b.name ? -1 : 1));
        const slots = declaration.slots.sort((a, b) => (a.name == null ? -1 : b.name == null ? 1 : a.name < b.name ? -1 : 1));
        const events = declaration.events.sort((a, b) => (a.name < b.name ? -1 : 1));
        const cssProps = declaration.cssProperties.sort((a, b) => (a.name < b.name ? -1 : 1));
        const cssParts = declaration.cssParts.sort((a, b) => (a.name < b.name ? -1 : 1));
        if (attributes.length > 0) {
            segmentText += "\n" + memberAttributeSection(attributes, program.getTypeChecker(), config);
        }
        if (properties.length > 0) {
            segmentText += "\n" + memberPropertySection(properties, program.getTypeChecker(), config);
        }
        if (methods.length > 0) {
            segmentText += "\n" + methodSection(methods, program.getTypeChecker(), config);
        }
        if (events.length > 0) {
            segmentText += "\n" + eventSection(events, program.getTypeChecker(), config);
        }
        if (slots.length > 0) {
            segmentText += "\n" + slotSection(slots, config);
        }
        if (cssParts.length > 0) {
            segmentText += "\n" + cssPartSection(cssParts, config);
        }
        if (cssProps.length > 0) {
            segmentText += "\n" + cssPropSection(cssProps, config);
        }
        return segmentText;
    }));
    return markdownSegments.join("\n\n");
};
/**
 * Returns a markdown table with css props
 * @param cssProperties
 * @param config
 */
function cssPropSection(cssProperties, config) {
    const rows = [["Property", "Type", "Default", "Description"]];
    rows.push(...cssProperties.map(prop => {
        var _a;
        const def = (prop.default !== undefined ? JSON.stringify(prop.default) : "") || "";
        return [(prop.name && markdownHighlight(prop.name)) || "", prop.typeHint || "", def, ((_a = prop.jsDoc) === null || _a === void 0 ? void 0 : _a.description) || ""];
    }));
    return markdownHeader("CSS Custom Properties", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with css parts
 * @param cssPart
 * @param config
 */
function cssPartSection(cssPart, config) {
    const rows = [["Part", "Description"]];
    rows.push(...cssPart.map(part => { var _a; return [(part.name && markdownHighlight(part.name)) || "", ((_a = part.jsDoc) === null || _a === void 0 ? void 0 : _a.description) || ""]; }));
    return markdownHeader("CSS Shadow Parts", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with methods
 * @param methods
 * @param checker
 * @param config
 */
function methodSection(methods, checker, config) {
    const showVisibility = shouldShowVisibility(methods, config);
    const rows = [["Method", "Visibility", "Type", "Description"]];
    rows.push(...methods.map(method => {
        var _a, _b, _c;
        // Build up a description of parameters
        const paramDescription = ((_b = (_a = method.jsDoc) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.filter(tag => tag.tag === "param" && tag.comment != null).map(tag => {
            return `**${tag.parsed().name}**: ${tag.parsed().description}`;
        }).join("\n").trim()) || undefined;
        const description = ((_c = method.jsDoc) === null || _c === void 0 ? void 0 : _c.description) || undefined;
        return [
            method.name != null ? markdownHighlight(method.name) : "",
            showVisibility ? method.visibility || "public" : "",
            markdownHighlight(getTypeHintFromMethod(method, checker)),
            `${description || ""}${description != null && paramDescription != null ? "\n\n" : ""}${paramDescription || ""}`
        ];
    }));
    return markdownHeader("Methods", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with events
 * @param events
 * @param config
 * @param checker
 */
function eventSection(events, checker, config) {
    const showVisibility = shouldShowVisibility(events, config);
    const rows = [["Event", "Visibility", "Type", "Description"]];
    rows.push(...events.map(event => {
        var _a, _b, _c;
        return [
            (event.name && markdownHighlight(event.name)) || "",
            showVisibility ? event.visibility || "public" : "",
            markdownHighlight(getTypeHintFromType((_a = event.typeHint) !== null && _a !== void 0 ? _a : (_b = event.type) === null || _b === void 0 ? void 0 : _b.call(event), checker, config)),
            ((_c = event.jsDoc) === null || _c === void 0 ? void 0 : _c.description) || ""
        ];
    }));
    return markdownHeader("Events", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with slots
 * @param slots
 * @param config
 */
function slotSection(slots, config) {
    const rows = [["Name", "Permitted Tag Names", "Description"]];
    rows.push(...slots.map(slot => {
        var _a;
        return [
            (slot.name && markdownHighlight(slot.name)) || "",
            (slot.permittedTagNames && slot.permittedTagNames.map(tagName => markdownHighlight(tagName)).join(" | ")) || "",
            ((_a = slot.jsDoc) === null || _a === void 0 ? void 0 : _a.description) || ""
        ];
    }));
    return markdownHeader("Slots", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with attributes.
 * @param members
 * @param checker
 * @param config
 */
function memberAttributeSection(members, checker, config) {
    var _a, _b, _c;
    const showVisibility = shouldShowVisibility(members, config);
    const rows = [["Attribute", "Visibility", "Type", "Default", "Description"]];
    // Add members as rows one by one
    for (const member of members) {
        const attrName = markdownHighlight(member.attrName);
        const type = markdownHighlight(getTypeHintFromType((_a = member.typeHint) !== null && _a !== void 0 ? _a : (_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member), checker, config));
        const visibility = member.visibility || "public";
        const def = (member.default !== undefined ? JSON.stringify(member.default) : "") || (member.required && "**required**") || "";
        const comment = ((_c = member.jsDoc) === null || _c === void 0 ? void 0 : _c.description) || "";
        rows.push([attrName, showVisibility ? visibility : "", type, def, comment]);
    }
    return markdownHeader("Attributes", 2, config) + "\n" + markdownTable(rows);
}
/**
 * Returns a markdown table with properties
 * @param members
 * @param checker
 * @param config
 */
function memberPropertySection(members, checker, config) {
    var _a, _b, _c;
    const showVisibility = shouldShowVisibility(members, config);
    const rows = [["Property", "Attribute", "Visibility", "Modifiers", "Type", "Default", "Description"]];
    // Add properties as rows one by one
    for (const member of members) {
        const propName = markdownHighlight(member.propName);
        const attrName = (member.attrName && markdownHighlight(member.attrName)) || "";
        const visibility = member.visibility || "public";
        const type = markdownHighlight(getTypeHintFromType((_a = member.typeHint) !== null && _a !== void 0 ? _a : (_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member), checker, config));
        const mods = member.modifiers != null ? Array.from(member.modifiers).join(", ") : "";
        const def = (member.default !== undefined ? JSON.stringify(member.default) : "") || (member.required && "**required**") || "";
        const comment = ((_c = member.jsDoc) === null || _c === void 0 ? void 0 : _c.description) || "";
        rows.push([propName, attrName, showVisibility ? visibility : "", mods, type, def, comment]);
    }
    return markdownHeader("Properties", 2, config) + "\n" + markdownTable(rows);
}
function shouldShowVisibility(items, config) {
    return (config.visibility != null && config.visibility !== "public" && items.some(method => method.visibility != null && method.visibility !== "public"));
}

/**
 * Vscode json output format transformer.
 * @param results
 * @param program
 * @param config
 */
const vscodeTransformer = (results, program, config) => {
    const checker = program.getTypeChecker();
    // Grab all definitions
    const definitions = results.map(res => res.componentDefinitions).reduce((acc, cur) => [...acc, ...cur], []);
    // Transform all definitions into "tags"
    const tags = definitions.map(d => definitionToHtmlDataTag(d, checker));
    const vscodeJson = {
        version: 1,
        tags,
        globalAttributes: [],
        valueSets: []
    };
    return JSON.stringify(vscodeJson, null, 2);
};
function definitionToHtmlDataTag(definition, checker) {
    const declaration = definition.declaration;
    if (declaration == null) {
        return {
            name: definition.tagName,
            attributes: []
        };
    }
    // Transform all members into "attributes"
    const customElementAttributes = arrayDefined(declaration.members.map(d => componentMemberToVscodeAttr(d, checker)));
    const eventAttributes = arrayDefined(declaration.events.map(e => componentEventToVscodeAttr(e, checker)));
    const attributes = [...customElementAttributes, ...eventAttributes];
    return {
        name: definition.tagName,
        description: formatMetadata(declaration.jsDoc, {
            Events: declaration.events.map(e => { var _a; return formatEntryRow(e.name, e.jsDoc, (_a = e.type) === null || _a === void 0 ? void 0 : _a.call(e), checker); }),
            Slots: declaration.slots.map(s => formatEntryRow(s.name || " ", s.jsDoc, s.permittedTagNames && s.permittedTagNames.map(n => `"${markdownHighlight(n)}"`).join(" | "), checker)),
            Attributes: declaration.members
                .map(m => { var _a; return ("attrName" in m && m.attrName != null ? formatEntryRow(m.attrName, m.jsDoc, m.typeHint || ((_a = m.type) === null || _a === void 0 ? void 0 : _a.call(m)), checker) : undefined); })
                .filter(m => m != null),
            Properties: declaration.members
                .map(m => { var _a; return ("propName" in m && m.propName != null ? formatEntryRow(m.propName, m.jsDoc, m.typeHint || ((_a = m.type) === null || _a === void 0 ? void 0 : _a.call(m)), checker) : undefined); })
                .filter(m => m != null)
        }),
        attributes
    };
}
function componentEventToVscodeAttr(event, checker) {
    var _a;
    return {
        name: `on${event.name}`,
        description: formatEntryRow(event.name, event.jsDoc, (_a = event.type) === null || _a === void 0 ? void 0 : _a.call(event), checker)
    };
}
function componentMemberToVscodeAttr(member, checker) {
    var _a, _b;
    if (member.attrName == null) {
        return undefined;
    }
    return {
        name: member.attrName,
        description: formatMetadata(formatEntryRow(member.attrName, member.jsDoc, member.typeHint || ((_a = member.type) === null || _a === void 0 ? void 0 : _a.call(member)), checker), {
            Property: "propName" in member ? member.propName : undefined,
            Default: member.default === undefined ? undefined : String(member.default)
        }),
        ...((member.type && typeToVscodeValuePart((_b = member.type) === null || _b === void 0 ? void 0 : _b.call(member), checker)) || {})
    };
}
/**
 * Converts a type to either a value set or string unions.
 * @param type
 * @param checker
 */
function typeToVscodeValuePart(type, checker) {
    const simpleType = tsSimpleType.isSimpleType(type) ? type : tsSimpleType.toSimpleType(type, checker);
    switch (simpleType.kind) {
        case "BOOLEAN":
            return { valueSet: "v" };
        case "STRING_LITERAL":
            return { values: [{ name: simpleType.value }] };
        case "ENUM":
            return { values: typesToStringUnion(simpleType.types.map(({ type }) => type)) };
        case "UNION":
            return { values: typesToStringUnion(simpleType.types) };
    }
    return undefined;
}
/**
 * Returns a list of strings that represents the types.
 * Only looks at literal types and strips the rest.
 * @param types
 */
function typesToStringUnion(types) {
    return arrayDefined(types.map(t => {
        switch (t.kind) {
            case "STRING_LITERAL":
            case "NUMBER_LITERAL":
                return { name: t.value.toString() };
            default:
                return undefined;
        }
    }));
}
/**
 * Formats description and metadata so that it can be used in documentation.
 * @param doc
 * @param metadata
 */
function formatMetadata(doc, metadata) {
    const metaText = arrayDefined(Object.entries(metadata).map(([key, value]) => {
        if (value == null) {
            return undefined;
        }
        else if (Array.isArray(value)) {
            const filtered = arrayDefined(value);
            if (filtered.length === 0)
                return undefined;
            return `${key}:\n\n${filtered.map(v => `  * ${v}`).join(`\n\n`)}`;
        }
        else {
            return `${key}: ${value}`;
        }
    })).join(`\n\n`);
    const comment = typeof doc === "string" ? doc : (doc === null || doc === void 0 ? void 0 : doc.description) || "";
    return `${comment || ""}${metadata ? `${comment ? `\n\n` : ""}${metaText}` : ""}` || undefined;
}
/**
 * Formats name, doc and type so that it can be presented in documentation
 * @param name
 * @param doc
 * @param type
 * @param checker
 */
function formatEntryRow(name, doc, type, checker) {
    const comment = typeof doc === "string" ? doc : (doc === null || doc === void 0 ? void 0 : doc.description) || "";
    const typeText = typeof type === "string" ? type : type == null ? "" : formatType(type, checker);
    return `${markdownHighlight(name)}${typeText == null ? "" : ` {${typeText}}`}${comment == null ? "" : " - "}${comment || ""}`;
}
/**
 * Formats a type to present in documentation
 * @param type
 * @param checker
 */
function formatType(type, checker) {
    return !tsSimpleType.isAssignableToSimpleTypeKind(type, "ANY", checker) ? markdownHighlight(tsSimpleType.typeToString(type, checker)) : undefined;
}

const transformerFunctionMap = {
    debug: debugJsonTransformer,
    json: jsonTransformer,
    json2: json2Transformer,
    markdown: markdownTransformer,
    md: markdownTransformer,
    vscode: vscodeTransformer
};
/**
 * Transforms the analyzer results into a string representation based on the transformer kind
 * @param kind
 * @param results
 * @param program
 * @param config
 */
function transformAnalyzerResult(kind, results, program, config = {}) {
    const func = transformerFunctionMap[kind];
    if (func == null) {
        throw new Error(`Couldn't find transformer function for transformer kind: ${kind}`);
    }
    return func(Array.isArray(results) ? results : [results], program, {
        visibility: "public",
        ...config
    });
}

exports.ALL_COMPONENT_FEATURES = ALL_COMPONENT_FEATURES;
exports.CustomElementFlavor = CustomElementFlavor;
exports.DEFAULT_COMPONENT_DECLARATION_CACHE = DEFAULT_COMPONENT_DECLARATION_CACHE;
exports.DEFAULT_FEATURE_COLLECTION_CACHE = DEFAULT_FEATURE_COLLECTION_CACHE;
exports.JsDocFlavor = JsDocFlavor;
exports.VERSION = VERSION;
exports.analyzeComponentDeclaration = analyzeComponentDeclaration;
exports.analyzeSourceFile = analyzeSourceFile;
exports.arrayDefined = arrayDefined;
exports.arrayFlat = arrayFlat;
exports.getExtendsHeritageClauses = getExtendsHeritageClauses;
exports.getExtendsHeritageClausesInChain = getExtendsHeritageClausesInChain;
exports.getJsDoc = getJsDoc;
exports.getJsDocType = getJsDocType;
exports.getMixinHeritageClauses = getMixinHeritageClauses;
exports.getMixinHeritageClausesInChain = getMixinHeritageClausesInChain;
exports.getSuperclassHeritageClause = getSuperclassHeritageClause;
exports.makeContextFromConfig = makeContextFromConfig;
exports.parseSimpleJsDocTypeExpression = parseSimpleJsDocTypeExpression;
exports.stripTypescriptValues = stripTypescriptValues;
exports.transformAnalyzerResult = transformAnalyzerResult;
exports.visitAllHeritageClauses = visitAllHeritageClauses;
