"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _classNode, _referencer, _emitDecoratorMetadata;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassVisitor = void 0;
const types_1 = require("@typescript-eslint/types");
const definition_1 = require("../definition");
const TypeVisitor_1 = require("./TypeVisitor");
const Visitor_1 = require("./Visitor");
class ClassVisitor extends Visitor_1.Visitor {
    constructor(referencer, node, emitDecoratorMetadata) {
        super(referencer);
        _classNode.set(this, void 0);
        _referencer.set(this, void 0);
        _emitDecoratorMetadata.set(this, void 0);
        __classPrivateFieldSet(this, _referencer, referencer);
        __classPrivateFieldSet(this, _classNode, node);
        __classPrivateFieldSet(this, _emitDecoratorMetadata, emitDecoratorMetadata);
    }
    static visit(referencer, node, emitDecoratorMetadata) {
        const classVisitor = new ClassVisitor(referencer, node, emitDecoratorMetadata);
        classVisitor.visitClass(node);
    }
    visit(node) {
        // make sure we only handle the nodes we are designed to handle
        if (node && node.type in this) {
            super.visit(node);
        }
        else {
            __classPrivateFieldGet(this, _referencer).visit(node);
        }
    }
    ///////////////////
    // Visit helpers //
    ///////////////////
    visitClass(node) {
        var _a, _b;
        if (node.type === types_1.AST_NODE_TYPES.ClassDeclaration && node.id) {
            __classPrivateFieldGet(this, _referencer).currentScope()
                .defineIdentifier(node.id, new definition_1.ClassNameDefinition(node.id, node));
        }
        (_a = node.decorators) === null || _a === void 0 ? void 0 : _a.forEach(d => __classPrivateFieldGet(this, _referencer).visit(d));
        __classPrivateFieldGet(this, _referencer).scopeManager.nestClassScope(node);
        if (node.id) {
            // define the class name again inside the new scope
            // references to the class should not resolve directly to the parent class
            __classPrivateFieldGet(this, _referencer).currentScope()
                .defineIdentifier(node.id, new definition_1.ClassNameDefinition(node.id, node));
        }
        __classPrivateFieldGet(this, _referencer).visit(node.superClass);
        // visit the type param declarations
        this.visitType(node.typeParameters);
        // then the usages
        this.visitType(node.superTypeParameters);
        (_b = node.implements) === null || _b === void 0 ? void 0 : _b.forEach(imp => this.visitType(imp));
        this.visit(node.body);
        __classPrivateFieldGet(this, _referencer).close(node);
    }
    visitClassProperty(node) {
        this.visitProperty(node);
        /**
         * class A {
         *   @meta     // <--- check this
         *   foo: Type;
         * }
         */
        this.visitMetadataType(node.typeAnnotation, !!node.decorators);
    }
    visitFunctionParameterTypeAnnotation(node, withDecorators) {
        if ('typeAnnotation' in node) {
            this.visitMetadataType(node.typeAnnotation, withDecorators);
        }
        else if (node.type === types_1.AST_NODE_TYPES.AssignmentPattern) {
            this.visitMetadataType(node.left.typeAnnotation, withDecorators);
        }
        else if (node.type === types_1.AST_NODE_TYPES.TSParameterProperty) {
            this.visitFunctionParameterTypeAnnotation(node.parameter, withDecorators);
        }
    }
    visitMethodFunction(node, methodNode) {
        var _a, _b;
        if (node.id) {
            // FunctionExpression with name creates its special scope;
            // FunctionExpressionNameScope.
            __classPrivateFieldGet(this, _referencer).scopeManager.nestFunctionExpressionNameScope(node);
        }
        // Consider this function is in the MethodDefinition.
        __classPrivateFieldGet(this, _referencer).scopeManager.nestFunctionScope(node, true);
        /**
         * class A {
         *   @meta     // <--- check this
         *   foo(a: Type) {}
         *
         *   @meta     // <--- check this
         *   foo(): Type {}
         * }
         */
        let withMethodDecorators = !!methodNode.decorators;
        /**
         * class A {
         *   foo(
         *     @meta    // <--- check this
         *     a: Type
         *   ) {}
         *
         *   set foo(
         *     @meta    // <--- EXCEPT this. TS do nothing for this
         *     a: Type
         *   ) {}
         * }
         */
        withMethodDecorators =
            withMethodDecorators ||
                (methodNode.kind !== 'set' &&
                    node.params.some(param => param.decorators));
        if (!withMethodDecorators && methodNode.kind === 'set') {
            const keyName = getLiteralMethodKeyName(methodNode);
            /**
             * class A {
             *   @meta      // <--- check this
             *   get a() {}
             *   set ['a'](v: Type) {}
             * }
             */
            if (keyName !== null &&
                ((_a = __classPrivateFieldGet(this, _classNode).body.body.find((node) => node !== methodNode &&
                    node.type === types_1.AST_NODE_TYPES.MethodDefinition &&
                    // Node must both be static or not
                    node.static === methodNode.static &&
                    getLiteralMethodKeyName(node) === keyName)) === null || _a === void 0 ? void 0 : _a.decorators)) {
                withMethodDecorators = true;
            }
        }
        /**
         * @meta      // <--- check this
         * class A {
         *   constructor(a: Type) {}
         * }
         */
        if (!withMethodDecorators &&
            methodNode.kind === 'constructor' &&
            __classPrivateFieldGet(this, _classNode).decorators) {
            withMethodDecorators = true;
        }
        // Process parameter declarations.
        for (const param of node.params) {
            this.visitPattern(param, (pattern, info) => {
                __classPrivateFieldGet(this, _referencer).currentScope()
                    .defineIdentifier(pattern, new definition_1.ParameterDefinition(pattern, node, info.rest));
                __classPrivateFieldGet(this, _referencer).referencingDefaultValue(pattern, info.assignments, null, true);
            }, { processRightHandNodes: true });
            this.visitFunctionParameterTypeAnnotation(param, withMethodDecorators);
            (_b = param.decorators) === null || _b === void 0 ? void 0 : _b.forEach(d => this.visit(d));
        }
        this.visitMetadataType(node.returnType, withMethodDecorators);
        this.visitType(node.typeParameters);
        // In TypeScript there are a number of function-like constructs which have no body,
        // so check it exists before traversing
        if (node.body) {
            // Skip BlockStatement to prevent creating BlockStatement scope.
            if (node.body.type === types_1.AST_NODE_TYPES.BlockStatement) {
                __classPrivateFieldGet(this, _referencer).visitChildren(node.body);
            }
            else {
                __classPrivateFieldGet(this, _referencer).visit(node.body);
            }
        }
        __classPrivateFieldGet(this, _referencer).close(node);
    }
    visitProperty(node) {
        var _a;
        if (node.computed) {
            __classPrivateFieldGet(this, _referencer).visit(node.key);
        }
        __classPrivateFieldGet(this, _referencer).visit(node.value);
        if ('decorators' in node) {
            (_a = node.decorators) === null || _a === void 0 ? void 0 : _a.forEach(d => __classPrivateFieldGet(this, _referencer).visit(d));
        }
    }
    visitMethod(node) {
        var _a;
        if (node.computed) {
            __classPrivateFieldGet(this, _referencer).visit(node.key);
        }
        if (node.value.type === types_1.AST_NODE_TYPES.FunctionExpression) {
            this.visitMethodFunction(node.value, node);
        }
        else {
            __classPrivateFieldGet(this, _referencer).visit(node.value);
        }
        if ('decorators' in node) {
            (_a = node.decorators) === null || _a === void 0 ? void 0 : _a.forEach(d => __classPrivateFieldGet(this, _referencer).visit(d));
        }
    }
    visitType(node) {
        if (!node) {
            return;
        }
        TypeVisitor_1.TypeVisitor.visit(__classPrivateFieldGet(this, _referencer), node);
    }
    visitMetadataType(node, withDecorators) {
        if (!node) {
            return;
        }
        // emit decorators metadata only work for TSTypeReference in ClassDeclaration
        if (__classPrivateFieldGet(this, _classNode).type === types_1.AST_NODE_TYPES.ClassDeclaration &&
            !__classPrivateFieldGet(this, _classNode).declare &&
            node.typeAnnotation.type === types_1.AST_NODE_TYPES.TSTypeReference && __classPrivateFieldGet(this, _emitDecoratorMetadata)) {
            let identifier;
            if (node.typeAnnotation.typeName.type === types_1.AST_NODE_TYPES.TSQualifiedName) {
                let iter = node.typeAnnotation.typeName;
                while (iter.left.type === types_1.AST_NODE_TYPES.TSQualifiedName) {
                    iter = iter.left;
                }
                identifier = iter.left;
            }
            else {
                identifier = node.typeAnnotation.typeName;
            }
            if (withDecorators) {
                __classPrivateFieldGet(this, _referencer).currentScope().referenceDualValueType(identifier);
                if (node.typeAnnotation.typeParameters) {
                    this.visitType(node.typeAnnotation.typeParameters);
                }
                // everything is handled now
                return;
            }
        }
        this.visitType(node);
    }
    /////////////////////
    // Visit selectors //
    /////////////////////
    ClassBody(node) {
        // this is here on purpose so that this visitor explicitly declares visitors
        // for all nodes it cares about (see the instance visit method above)
        this.visitChildren(node);
    }
    ClassProperty(node) {
        this.visitClassProperty(node);
    }
    MethodDefinition(node) {
        this.visitMethod(node);
    }
    TSAbstractClassProperty(node) {
        this.visitClassProperty(node);
    }
    TSAbstractMethodDefinition(node) {
        this.visitProperty(node);
    }
    Identifier(node) {
        __classPrivateFieldGet(this, _referencer).visit(node);
    }
}
exports.ClassVisitor = ClassVisitor;
_classNode = new WeakMap(), _referencer = new WeakMap(), _emitDecoratorMetadata = new WeakMap();
/**
 * Only if key is one of [identifier, string, number], ts will combine metadata of accessors .
 * class A {
 *   get a() {}
 *   set ['a'](v: Type) {}
 *
 *   get [1]() {}
 *   set [1](v: Type) {}
 *
 *   // Following won't be combined
 *   get [key]() {}
 *   set [key](v: Type) {}
 *
 *   get [true]() {}
 *   set [true](v: Type) {}
 *
 *   get ['a'+'b']() {}
 *   set ['a'+'b']() {}
 * }
 */
function getLiteralMethodKeyName(node) {
    if (node.computed && node.key.type === types_1.AST_NODE_TYPES.Literal) {
        if (typeof node.key.value === 'string' ||
            typeof node.key.value === 'number') {
            return node.key.value;
        }
    }
    else if (!node.computed && node.key.type === types_1.AST_NODE_TYPES.Identifier) {
        return node.key.name;
    }
    return null;
}
//# sourceMappingURL=ClassVisitor.js.map