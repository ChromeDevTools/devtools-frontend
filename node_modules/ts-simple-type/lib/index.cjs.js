'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tsModule = require('typescript');
require('util');

function _interopNamespace(e) {
	if (e && e.__esModule) return e;
	var n = Object.create(null);
	if (e) {
		Object.keys(e).forEach(function (k) {
			if (k !== 'default') {
				var d = Object.getOwnPropertyDescriptor(e, k);
				Object.defineProperty(n, k, d.get ? d : {
					enumerable: true,
					get: function () {
						return e[k];
					}
				});
			}
		});
	}
	n['default'] = e;
	return Object.freeze(n);
}

var tsModule__namespace = /*#__PURE__*/_interopNamespace(tsModule);

// Collect all values on place. This is a map so Typescript will complain if we forget any kind.
const SIMPLE_TYPE_MAP = {
    NUMBER_LITERAL: "primitive_literal",
    STRING_LITERAL: "primitive_literal",
    BIG_INT_LITERAL: "primitive_literal",
    BOOLEAN_LITERAL: "primitive_literal",
    ES_SYMBOL_UNIQUE: "primitive_literal",
    BIG_INT: "primitive",
    BOOLEAN: "primitive",
    NULL: "primitive",
    UNDEFINED: "primitive",
    VOID: "primitive",
    ES_SYMBOL: "primitive",
    NUMBER: "primitive",
    STRING: "primitive",
    NON_PRIMITIVE: undefined,
    ENUM_MEMBER: undefined,
    ALIAS: undefined,
    ANY: undefined,
    ARRAY: undefined,
    CLASS: undefined,
    DATE: undefined,
    ENUM: undefined,
    FUNCTION: undefined,
    GENERIC_ARGUMENTS: undefined,
    GENERIC_PARAMETER: undefined,
    INTERFACE: undefined,
    INTERSECTION: undefined,
    METHOD: undefined,
    NEVER: undefined,
    OBJECT: undefined,
    PROMISE: undefined,
    TUPLE: undefined,
    UNION: undefined,
    UNKNOWN: undefined
};
const LITERAL_TYPE_KINDS = Object.keys(SIMPLE_TYPE_MAP).filter(kind => SIMPLE_TYPE_MAP[kind] === "primitive_literal");
function isSimpleTypeLiteral(type) {
    return LITERAL_TYPE_KINDS.includes(type.kind);
}
const PRIMITIVE_TYPE_KINDS = [...LITERAL_TYPE_KINDS, ...Object.keys(SIMPLE_TYPE_MAP).filter(kind => SIMPLE_TYPE_MAP[kind] === "primitive")];
function isSimpleTypePrimitive(type) {
    return PRIMITIVE_TYPE_KINDS.includes(type.kind);
}
// All kinds
const SIMPLE_TYPE_KINDS = Object.keys(SIMPLE_TYPE_MAP);
function isSimpleType(type) {
    return typeof type === "object" && type != null && "kind" in type && Object.values(SIMPLE_TYPE_KINDS).find((key) => key === type.kind) != null;
}

let selectedTSModule = tsModule__namespace;
function setTypescriptModule(ts) {
    selectedTSModule = ts;
}
function getTypescriptModule() {
    return selectedTSModule;
}

function or(list, match) {
    return list.find((a, i) => match(a, i)) != null;
}
function and(list, match) {
    return list.find((a, i) => !match(a, i)) == null;
}

function isTypeChecker(obj) {
    return obj != null && typeof obj === "object" && "getSymbolAtLocation" in obj;
}
function isProgram(obj) {
    return obj != null && typeof obj === "object" && "getTypeChecker" in obj && "getCompilerOptions" in obj;
}
function isNode(obj) {
    return obj != null && typeof obj === "object" && "kind" in obj && "flags" in obj && "pos" in obj && "end" in obj;
}
function typeHasFlag(type, flag, op = "and") {
    return hasFlag(type.flags, flag, op);
}
function hasFlag(flags, flag, op = "and") {
    if (Array.isArray(flag)) {
        return (op === "and" ? and : or)(flag, f => hasFlag(flags, f));
    }
    return (flags & flag) !== 0;
}
function isBoolean(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.BooleanLike) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "Boolean";
}
function isBooleanLiteral(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.BooleanLiteral);
}
function isBigIntLiteral(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.BigIntLiteral);
}
function isUniqueESSymbol(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.UniqueESSymbol);
}
function isESSymbolLike(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.ESSymbolLike) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "Symbol";
}
function isLiteral(type, ts) {
    return type.isLiteral() || isBooleanLiteral(type, ts) || isBigIntLiteral(type, ts) || isUniqueESSymbol(type, ts);
}
function isString(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.StringLike) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "String";
}
function isNumber(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.NumberLike) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "Number";
}
function isEnum(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.EnumLike);
}
function isBigInt(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.BigIntLike) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "BigInt";
}
function isObject(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.Object) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "Object";
}
function isNonPrimitive(type, ts) {
    var _a;
    return typeHasFlag(type, ts.TypeFlags.NonPrimitive) || ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === "object";
}
function isThisType(type, ts) {
    var _a, _b;
    const kind = (_b = (_a = type.getSymbol()) === null || _a === void 0 ? void 0 : _a.valueDeclaration) === null || _b === void 0 ? void 0 : _b.kind;
    if (kind == null) {
        return false;
    }
    return hasFlag(kind, ts.SyntaxKind.ThisKeyword);
}
function isUnknown(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.Unknown);
}
function isNull(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.Null);
}
function isUndefined(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.Undefined);
}
function isVoid(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.VoidLike);
}
function isNever(type, ts) {
    return typeHasFlag(type, ts.TypeFlags.Never);
}
function isObjectTypeReference(type, ts) {
    return hasFlag(type.objectFlags, ts.ObjectFlags.Reference);
}
function isSymbol(obj) {
    return "flags" in obj && "name" in obj && "getDeclarations" in obj;
}
function isMethod(type, ts) {
    if (!isObject(type, ts))
        return false;
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    return hasFlag(symbol.flags, ts.SymbolFlags.Method);
}
function getDeclaration(symbol, ts) {
    const declarations = symbol.getDeclarations();
    if (declarations == null || declarations.length === 0)
        return symbol.valueDeclaration;
    return declarations[0];
}
function isArray(type, checker, ts) {
    if (!isObject(type, ts))
        return false;
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    return getTypeArguments(type, checker, ts).length === 1 && ["ArrayLike", "ReadonlyArray", "ConcatArray", "Array"].includes(symbol.getName());
}
function isPromise(type, checker, ts) {
    if (!isObject(type, ts))
        return false;
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    return getTypeArguments(type, checker, ts).length === 1 && ["PromiseLike", "Promise"].includes(symbol.getName());
}
function isDate(type, ts) {
    if (!isObject(type, ts))
        return false;
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    return symbol.getName() === "Date";
}
function isTupleTypeReference(type, ts) {
    const target = getTargetType(type, ts);
    if (target == null)
        return false;
    return (target.objectFlags & ts.ObjectFlags.Tuple) !== 0;
}
function isFunction(type, ts) {
    if (!isObject(type, ts))
        return false;
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    return (symbol.flags & ts.SymbolFlags.Function) !== 0 || symbol.escapedName === "Function" || (symbol.members != null && symbol.members.has("__call"));
}
function getTypeArguments(type, checker, ts) {
    if (isObject(type, ts)) {
        if (isObjectTypeReference(type, ts)) {
            if ("getTypeArguments" in checker) {
                return Array.from(checker.getTypeArguments(type) || []);
            }
            else {
                return Array.from(type.typeArguments || []);
            }
        }
    }
    return [];
}
function getTargetType(type, ts) {
    if (isObject(type, ts) && isObjectTypeReference(type, ts)) {
        return type.target;
    }
}
function getModifiersFromDeclaration(declaration, ts) {
    const tsModifiers = ts.getCombinedModifierFlags(declaration);
    const modifiers = [];
    const map = {
        [ts.ModifierFlags.Export]: "EXPORT",
        [ts.ModifierFlags.Ambient]: "AMBIENT",
        [ts.ModifierFlags.Public]: "PUBLIC",
        [ts.ModifierFlags.Private]: "PRIVATE",
        [ts.ModifierFlags.Protected]: "PROTECTED",
        [ts.ModifierFlags.Static]: "STATIC",
        [ts.ModifierFlags.Readonly]: "READONLY",
        [ts.ModifierFlags.Abstract]: "ABSTRACT",
        [ts.ModifierFlags.Async]: "ASYNC",
        [ts.ModifierFlags.Default]: "DEFAULT"
    };
    Object.entries(map).forEach(([tsModifier, modifierKind]) => {
        if ((tsModifiers & Number(tsModifier)) !== 0) {
            modifiers.push(modifierKind);
        }
    });
    return modifiers;
}
function isImplicitGeneric(type, checker, ts) {
    return isArray(type, checker, ts) || isTupleTypeReference(type, ts) || isPromise(type, checker, ts);
}
function isMethodSignature(type, ts) {
    const symbol = type.getSymbol();
    if (symbol == null)
        return false;
    if (!isObject(type, ts))
        return false;
    if (type.getCallSignatures().length === 0)
        return false;
    const decl = getDeclaration(symbol);
    if (decl == null)
        return false;
    return decl.kind === ts.SyntaxKind.MethodSignature;
}

const DEFAULT_TYPE_CACHE = new WeakMap();
const DEFAULT_RESULT_CACHE = new Map();
const DEFAULT_GENERIC_PARAMETER_TYPE = { kind: "UNKNOWN" };
const NEVER_TYPE = { kind: "NEVER" };

function resolveType$1(simpleType, parameterMap = new Map()) {
    switch (simpleType.kind) {
        case "GENERIC_PARAMETER": {
            const resolvedArgument = parameterMap === null || parameterMap === void 0 ? void 0 : parameterMap.get(simpleType.name);
            return resolveType$1(resolvedArgument || /*simpleType.default ||*/ DEFAULT_GENERIC_PARAMETER_TYPE, parameterMap);
        }
        case "GENERIC_ARGUMENTS": {
            const updatedGenericParameterMap = extendTypeParameterMap(simpleType, parameterMap);
            return resolveType$1(simpleType.target, updatedGenericParameterMap);
        }
        default:
            return simpleType;
    }
}

/**
 * Returns a type that represents the length of the Tuple type
 * Read more here: https://github.com/microsoft/TypeScript/pull/24897
 * @param tuple
 */
function getTupleLengthType(tuple) {
    // When the tuple has rest argument, return "number"
    if (tuple.rest) {
        return {
            kind: "NUMBER"
        };
    }
    // Else return an intersection of number literals that represents all possible lengths
    const minLength = tuple.members.filter(member => !member.optional).length;
    if (minLength === tuple.members.length) {
        return {
            kind: "NUMBER_LITERAL",
            value: minLength
        };
    }
    return {
        kind: "UNION",
        types: new Array(tuple.members.length - minLength + 1).fill(0).map((_, i) => ({
            kind: "NUMBER_LITERAL",
            value: minLength + i
        }))
    };
}
function simplifySimpleTypes(types) {
    let newTypes = [...types];
    const NULLABLE_TYPE_KINDS = ["UNDEFINED", "NULL"];
    // Only include one instance of primitives and literals
    newTypes = newTypes.filter((type, i) => {
        // Only include one of each literal with specific value
        if (isSimpleTypeLiteral(type)) {
            return !newTypes.slice(0, i).some(newType => newType.kind === type.kind && newType.value === type.value);
        }
        if (PRIMITIVE_TYPE_KINDS.includes(type.kind) || NULLABLE_TYPE_KINDS.includes(type.kind)) {
            // Remove this type from the array if there is already a primitive in the array
            return !newTypes.slice(0, i).some(t => t.kind === type.kind);
        }
        return true;
    });
    // Simplify boolean literals
    const booleanLiteralTypes = newTypes.filter((t) => t.kind === "BOOLEAN_LITERAL");
    if (booleanLiteralTypes.find(t => t.value === true) != null && booleanLiteralTypes.find(t => t.value === false) != null) {
        newTypes = [...newTypes.filter(type => type.kind !== "BOOLEAN_LITERAL"), { kind: "BOOLEAN" }];
    }
    // Reorder "NULL" and "UNDEFINED" to be last
    const nullableTypes = newTypes.filter((t) => NULLABLE_TYPE_KINDS.includes(t.kind));
    if (nullableTypes.length > 0) {
        newTypes = [
            ...newTypes.filter(t => !NULLABLE_TYPE_KINDS.includes(t.kind)),
            ...nullableTypes.sort((t1, t2) => (t1.kind === "NULL" ? (t2.kind === "UNDEFINED" ? -1 : 0) : t2.kind === "NULL" ? 1 : 0))
        ];
    }
    return newTypes;
}
function extendTypeParameterMap(genericType, existingMap) {
    const target = resolveType$1(genericType.target, existingMap);
    if ("typeParameters" in target) {
        const parameterEntries = (target.typeParameters || []).map((parameter, i) => {
            const typeArg = genericType.typeArguments[i];
            const resolvedTypeArg = typeArg == null ? /*parameter.default || */ DEFAULT_GENERIC_PARAMETER_TYPE : resolveType$1(typeArg, existingMap);
            //return [parameter.name, genericType.typeArguments[i] || parameter.default || { kind: "ANY" }] as [string, SimpleType];
            return [parameter.name, resolvedTypeArg];
        });
        const allParameterEntries = [...existingMap.entries(), ...parameterEntries];
        return new Map(allParameterEntries);
    }
    return existingMap;
}

function toSimpleType(type, checker, options = {}) {
    if (isSimpleType(type)) {
        return type;
    }
    checker = checker;
    if (isNode(type)) {
        // "type" is a "Node", convert it to a "Type" and continue.
        return toSimpleType(checker.getTypeAtLocation(type), checker);
    }
    return toSimpleTypeCached(type, {
        checker,
        eager: options.eager,
        cache: options.cache || DEFAULT_TYPE_CACHE,
        ts: getTypescriptModule()
    });
}
function toSimpleTypeCached(type, options) {
    if (options.cache.has(type)) {
        return options.cache.get(type);
    }
    // This function will resolve the type and assign the content to "target".
    // This way we can cache "target" before calling "toSimpleTypeInternal" recursively
    const resolveType = (target) => {
        // Construct the simple type recursively
        //const simpleTypeOverwrite = options.cache.has(type) ? options.cache.get(type)! : toSimpleTypeInternal(type, options);
        const simpleTypeOverwrite = toSimpleTypeInternal(type, options);
        // Strip undefined keys to make the output cleaner
        Object.entries(simpleTypeOverwrite).forEach(([k, v]) => {
            if (v == null)
                delete simpleTypeOverwrite[k];
        });
        // Transfer properties on the simpleType to the placeholder
        // This makes it possible to keep on using the reference "placeholder".
        Object.assign(target, simpleTypeOverwrite);
    };
    if (options.eager === true) {
        // Make and cache placeholder
        const placeholder = {};
        options.cache.set(type, placeholder);
        // Resolve type into placeholder
        resolveType(placeholder);
        Object.freeze(placeholder);
        return placeholder;
    }
    else {
        const placeholder = {};
        // A function that only resolves the type once
        let didResolve = false;
        const ensureResolved = () => {
            if (!didResolve) {
                resolveType(placeholder);
                didResolve = true;
            }
        };
        // Use "toStringTag" as a hook into resolving the type.
        // If we don't have this hook, console.log would always print "{}" because the type hasn't been resolved
        Object.defineProperty(placeholder, Symbol.toStringTag, {
            get() {
                resolveType(placeholder);
                // Don't return any tag. Only use this function as a hook for calling "resolveType"
                return undefined;
            }
        });
        // Return a proxy with the purpose of resolving the type lazy
        const proxy = new Proxy(placeholder, {
            ownKeys(target) {
                ensureResolved();
                return [...Object.getOwnPropertyNames(target), ...Object.getOwnPropertySymbols(target)];
            },
            has(target, p) {
                // Always return true if we test for "kind", but don't resolve the type
                // This way "isSimpleType" (which checks for "kind") will succeed without resolving the type
                if (p === "kind") {
                    return true;
                }
                ensureResolved();
                return p in target;
            },
            getOwnPropertyDescriptor(target, p) {
                ensureResolved();
                return Object.getOwnPropertyDescriptor(target, p);
            },
            get: (target, p) => {
                ensureResolved();
                return target[p];
            },
            set: (target, p) => {
                throw new TypeError(`Cannot assign to read only property '${p}'`);
            }
        });
        options.cache.set(type, proxy);
        return proxy;
    }
}
/**
 * Tries to lift a potential generic type and wrap the result in a "GENERIC_ARGUMENTS" simple type and/or "ALIAS" type.
 * Returns the "simpleType" otherwise.
 * @param simpleType
 * @param type
 * @param options
 */
function liftGenericType(type, options) {
    // Check for alias reference
    if (type.aliasSymbol != null) {
        const aliasDeclaration = getDeclaration(type.aliasSymbol, options.ts);
        const typeParameters = getTypeParameters(aliasDeclaration, options);
        return {
            target: type,
            generic: target => {
                // Lift the simple type to an ALIAS type.
                const aliasType = {
                    kind: "ALIAS",
                    name: type.aliasSymbol.getName() || "",
                    target,
                    typeParameters
                };
                // Lift the alias type if it uses generic arguments.
                if (type.aliasTypeArguments != null) {
                    const typeArguments = Array.from(type.aliasTypeArguments || []).map(t => toSimpleTypeCached(t, options));
                    return {
                        kind: "GENERIC_ARGUMENTS",
                        target: aliasType,
                        typeArguments
                    };
                }
                return target;
            }
        };
    }
    // Check if the type is a generic interface/class reference and lift it.
    else if (isObject(type, options.ts) && isObjectTypeReference(type, options.ts) && type.typeArguments != null && type.typeArguments.length > 0) {
        // Special case for array, tuple and promise, they are generic in themselves
        if (isImplicitGeneric(type, options.checker, options.ts)) {
            return undefined;
        }
        return {
            target: type.target,
            generic: target => {
                const typeArguments = Array.from(type.typeArguments || []).map(t => toSimpleTypeCached(t, options));
                return {
                    kind: "GENERIC_ARGUMENTS",
                    target,
                    typeArguments
                };
            }
        };
    }
    return undefined;
}
function toSimpleTypeInternal(type, options) {
    const { checker, ts } = options;
    const symbol = type.getSymbol();
    const name = symbol != null ? getRealSymbolName(symbol, ts) : undefined;
    let simpleType;
    const generic = liftGenericType(type, options);
    if (generic != null) {
        type = generic.target;
    }
    if (isLiteral(type, ts)) {
        const literalSimpleType = primitiveLiteralToSimpleType(type, checker, ts);
        if (literalSimpleType != null) {
            // Enum members
            if (symbol != null && symbol.flags & ts.SymbolFlags.EnumMember) {
                const parentSymbol = symbol.parent;
                if (parentSymbol != null) {
                    return {
                        name: name || "",
                        fullName: `${parentSymbol.name}.${name}`,
                        kind: "ENUM_MEMBER",
                        type: literalSimpleType
                    };
                }
            }
            // Literals types
            return literalSimpleType;
        }
    }
    // Primitive types
    else if (isString(type, ts)) {
        simpleType = { kind: "STRING", name };
    }
    else if (isNumber(type, ts)) {
        simpleType = { kind: "NUMBER", name };
    }
    else if (isBoolean(type, ts)) {
        simpleType = { kind: "BOOLEAN", name };
    }
    else if (isBigInt(type, ts)) {
        simpleType = { kind: "BIG_INT", name };
    }
    else if (isESSymbolLike(type, ts)) {
        simpleType = { kind: "ES_SYMBOL", name };
    }
    else if (isUndefined(type, ts)) {
        simpleType = { kind: "UNDEFINED", name };
    }
    else if (isNull(type, ts)) {
        simpleType = { kind: "NULL", name };
    }
    else if (isUnknown(type, ts)) {
        simpleType = { kind: "UNKNOWN", name };
    }
    else if (isVoid(type, ts)) {
        simpleType = { kind: "VOID", name };
    }
    else if (isNever(type, ts)) {
        simpleType = { kind: "NEVER", name };
    }
    // Enum
    else if (isEnum(type, ts) && type.isUnion()) {
        simpleType = {
            name: name || "",
            kind: "ENUM",
            types: type.types.map(t => toSimpleTypeCached(t, options))
        };
    }
    // Promise
    else if (isPromise(type, checker, ts)) {
        simpleType = {
            kind: "PROMISE",
            name,
            type: toSimpleTypeCached(getTypeArguments(type, checker, ts)[0], options)
        };
    }
    // Unions and intersections
    else if (type.isUnion()) {
        simpleType = {
            kind: "UNION",
            types: simplifySimpleTypes(type.types.map(t => toSimpleTypeCached(t, options))),
            name
        };
    }
    else if (type.isIntersection()) {
        simpleType = {
            kind: "INTERSECTION",
            types: simplifySimpleTypes(type.types.map(t => toSimpleTypeCached(t, options))),
            name
        };
    }
    // Date
    else if (isDate(type, ts)) {
        simpleType = {
            kind: "DATE",
            name
        };
    }
    // Array
    else if (isArray(type, checker, ts)) {
        simpleType = {
            kind: "ARRAY",
            type: toSimpleTypeCached(getTypeArguments(type, checker, ts)[0], options),
            name
        };
    }
    else if (isTupleTypeReference(type, ts)) {
        const types = getTypeArguments(type, checker, ts);
        const minLength = type.target.minLength;
        simpleType = {
            kind: "TUPLE",
            rest: type.target.hasRestElement || false,
            members: types.map((childType, i) => {
                return {
                    optional: i >= minLength,
                    type: toSimpleTypeCached(childType, options)
                };
            }),
            name
        };
    }
    // Method signatures
    else if (isMethodSignature(type, ts)) {
        const callSignatures = type.getCallSignatures();
        simpleType = getSimpleFunctionFromCallSignatures(callSignatures, options);
    }
    // Class
    else if (type.isClass() && symbol != null) {
        const classDecl = getDeclaration(symbol);
        if (classDecl != null && ts.isClassDeclaration(classDecl)) {
            const ctor = (() => {
                var _a;
                const ctorSymbol = symbol != null && symbol.members != null ? symbol.members.get("__constructor") : undefined;
                if (ctorSymbol != null && symbol != null) {
                    const ctorDecl = ctorSymbol.declarations !== undefined && ((_a = ctorSymbol.declarations) === null || _a === void 0 ? void 0 : _a.length) > 0 ? ctorSymbol.declarations[0] : ctorSymbol.valueDeclaration;
                    if (ctorDecl != null && ts.isConstructorDeclaration(ctorDecl)) {
                        return getSimpleFunctionFromSignatureDeclaration(ctorDecl, options);
                    }
                }
            })();
            const call = getSimpleFunctionFromCallSignatures(type.getCallSignatures(), options);
            const members = checker
                .getPropertiesOfType(type)
                .map(symbol => {
                const declaration = getDeclaration(symbol);
                // Some instance properties may have an undefined declaration.
                // Since we can't do too much without a declaration, filtering
                // these out seems like the best strategy for the moment.
                //
                // See https://github.com/runem/web-component-analyzer/issues/60 for
                // more info.
                if (declaration == null)
                    return null;
                return {
                    name: symbol.name,
                    optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
                    modifiers: getModifiersFromDeclaration(declaration, ts),
                    type: toSimpleTypeCached(checker.getTypeAtLocation(declaration), options)
                };
            })
                .filter((member) => member != null);
            const typeParameters = getTypeParameters(getDeclaration(symbol), options);
            simpleType = {
                kind: "CLASS",
                name,
                call,
                ctor,
                typeParameters,
                members
            };
        }
    }
    // Interface
    else if ((type.isClassOrInterface() || isObject(type, ts)) && !((symbol === null || symbol === void 0 ? void 0 : symbol.name) === "Function")) {
        // Handle the empty object
        if (isObject(type, ts) && (symbol === null || symbol === void 0 ? void 0 : symbol.name) === "Object") {
            return {
                kind: "OBJECT"
            };
        }
        const members = type.getProperties().map(symbol => {
            const declaration = getDeclaration(symbol);
            return {
                name: symbol.name,
                optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
                modifiers: declaration != null ? getModifiersFromDeclaration(declaration, ts) : [],
                type: toSimpleTypeCached(checker.getTypeAtLocation(symbol.valueDeclaration), options)
            };
        });
        const ctor = getSimpleFunctionFromCallSignatures(type.getConstructSignatures(), options);
        const call = getSimpleFunctionFromCallSignatures(type.getCallSignatures(), options);
        const typeParameters = (type.isClassOrInterface() && type.typeParameters != null ? type.typeParameters.map(t => toSimpleTypeCached(t, options)) : undefined) ||
            (symbol != null ? getTypeParameters(getDeclaration(symbol), options) : undefined);
        let indexType = {};
        if (type.getStringIndexType()) {
            indexType["STRING"] = toSimpleTypeCached(type.getStringIndexType(), options);
        }
        if (type.getNumberIndexType()) {
            indexType["NUMBER"] = toSimpleTypeCached(type.getNumberIndexType(), options);
        }
        if (Object.keys(indexType).length === 0) {
            indexType = undefined;
        }
        // Simplify: if there is only a single "call" signature and nothing else, just return the call signature
        /*if (call != null && members.length === 0 && ctor == null && indexType == null) {
            return { ...call, name, typeParameters };
        }*/
        simpleType = {
            kind: type.isClassOrInterface() ? "INTERFACE" : "OBJECT",
            typeParameters,
            ctor,
            members,
            name,
            indexType,
            call
        };
    }
    // Handle "object" type
    else if (isNonPrimitive(type, ts)) {
        return {
            kind: "NON_PRIMITIVE"
        };
    }
    // Function
    else if (symbol != null && (isFunction(type, ts) || isMethod(type, ts))) {
        simpleType = getSimpleFunctionFromCallSignatures(type.getCallSignatures(), options, name);
        if (simpleType == null) {
            simpleType = {
                kind: "FUNCTION",
                name
            };
        }
    }
    // Type Parameter
    else if (type.isTypeParameter() && symbol != null) {
        // This type
        if (isThisType(type, ts) && symbol.valueDeclaration != null) {
            return toSimpleTypeCached(checker.getTypeAtLocation(symbol.valueDeclaration), options);
        }
        const defaultType = type.getDefault();
        const defaultSimpleType = defaultType != null ? toSimpleTypeCached(defaultType, options) : undefined;
        simpleType = {
            kind: "GENERIC_PARAMETER",
            name: symbol.getName(),
            default: defaultSimpleType
        };
    }
    // If no type was found, return "ANY"
    if (simpleType == null) {
        simpleType = {
            kind: "ANY",
            name
        };
    }
    // Lift generic types and aliases if possible
    if (generic != null) {
        return generic.generic(simpleType);
    }
    return simpleType;
}
function primitiveLiteralToSimpleType(type, checker, ts) {
    if (type.isNumberLiteral()) {
        return {
            kind: "NUMBER_LITERAL",
            value: type.value
        };
    }
    else if (type.isStringLiteral()) {
        return {
            kind: "STRING_LITERAL",
            value: type.value
        };
    }
    else if (isBooleanLiteral(type, ts)) {
        // See https://github.com/Microsoft/TypeScript/issues/22269 for more information
        return {
            kind: "BOOLEAN_LITERAL",
            value: checker.typeToString(type) === "true"
        };
    }
    else if (isBigIntLiteral(type, ts)) {
        return {
            kind: "BIG_INT_LITERAL",
            /* global BigInt */
            value: BigInt(`${type.value.negative ? "-" : ""}${type.value.base10Value}`)
        };
    }
    else if (isUniqueESSymbol(type, ts)) {
        return {
            kind: "ES_SYMBOL_UNIQUE",
            value: String(type.escapedName) || Math.floor(Math.random() * 100000000).toString()
        };
    }
}
function getSimpleFunctionFromCallSignatures(signatures, options, fallbackName) {
    if (signatures.length === 0) {
        return undefined;
    }
    const signature = signatures[signatures.length - 1];
    const signatureDeclaration = signature.getDeclaration();
    return getSimpleFunctionFromSignatureDeclaration(signatureDeclaration, options, fallbackName);
}
function getSimpleFunctionFromSignatureDeclaration(signatureDeclaration, options, fallbackName) {
    const { checker } = options;
    const symbol = checker.getSymbolAtLocation(signatureDeclaration);
    const parameters = signatureDeclaration.parameters.map(parameterDecl => {
        const argType = checker.getTypeAtLocation(parameterDecl);
        return {
            name: parameterDecl.name.getText() || fallbackName,
            optional: parameterDecl.questionToken != null,
            type: toSimpleTypeCached(argType, options),
            rest: parameterDecl.dotDotDotToken != null,
            initializer: parameterDecl.initializer != null
        };
    });
    const name = symbol != null ? symbol.getName() : undefined;
    const type = checker.getTypeAtLocation(signatureDeclaration);
    const kind = isMethod(type, options.ts) ? "METHOD" : "FUNCTION";
    const signature = checker.getSignatureFromDeclaration(signatureDeclaration);
    const returnType = signature == null ? undefined : toSimpleTypeCached(checker.getReturnTypeOfSignature(signature), options);
    const typeParameters = getTypeParameters(signatureDeclaration, options);
    return { name, kind, returnType, parameters, typeParameters };
}
function getRealSymbolName(symbol, ts) {
    const name = symbol.getName();
    if (name != null && [ts.InternalSymbolName.Type, ts.InternalSymbolName.Object, ts.InternalSymbolName.Function].includes(name)) {
        return undefined;
    }
    return name;
}
function getTypeParameters(obj, options) {
    if (obj == null)
        return undefined;
    if (isSymbol(obj)) {
        const decl = getDeclaration(obj, options.ts);
        return getTypeParameters(decl, options);
    }
    if (options.ts.isClassDeclaration(obj) ||
        options.ts.isFunctionDeclaration(obj) ||
        options.ts.isFunctionTypeNode(obj) ||
        options.ts.isTypeAliasDeclaration(obj) ||
        options.ts.isMethodDeclaration(obj) ||
        options.ts.isMethodSignature(obj)) {
        return obj.typeParameters == null
            ? undefined
            : Array.from(obj.typeParameters)
                .map(td => options.checker.getTypeAtLocation(td))
                .map(t => toSimpleTypeCached(t, options));
    }
    return undefined;
}

function validateType(type, callback) {
    return validateTypeInternal(type, callback, new Map());
}
function validateTypeInternal(type, callback, parameterMap) {
    const res = callback(type);
    if (res != null) {
        return res;
    }
    switch (type.kind) {
        case "ENUM":
        case "UNION": {
            return or(type.types, childType => validateTypeInternal(childType, callback, parameterMap));
        }
        case "ALIAS": {
            return validateTypeInternal(type.target, callback, parameterMap);
        }
        case "INTERSECTION": {
            return and(type.types, childType => validateTypeInternal(childType, callback, parameterMap));
        }
        case "GENERIC_PARAMETER": {
            const resolvedArgument = parameterMap === null || parameterMap === void 0 ? void 0 : parameterMap.get(type.name);
            return validateTypeInternal(resolvedArgument || DEFAULT_GENERIC_PARAMETER_TYPE, callback, parameterMap);
        }
        case "GENERIC_ARGUMENTS": {
            const updatedGenericParameterMap = extendTypeParameterMap(type, parameterMap);
            return validateTypeInternal(type.target, callback, updatedGenericParameterMap);
        }
    }
    return false;
}

function isAssignableToSimpleTypeKind(type, kind, optionsOrChecker, options = {}) {
    const checker = isTypeChecker(optionsOrChecker) ? optionsOrChecker : undefined;
    options = (isTypeChecker(optionsOrChecker) || optionsOrChecker == null ? options : optionsOrChecker) || {};
    if (!isSimpleType(type)) {
        return isAssignableToSimpleTypeKind(toSimpleType(type, checker), kind, options);
    }
    return validateType(type, simpleType => {
        if (Array.isArray(kind) && or(kind, itemKind => simpleType.kind === itemKind)) {
            return true;
        }
        if (simpleType.kind === kind) {
            return true;
        }
        switch (simpleType.kind) {
            // Make sure that an object without members are treated as ANY
            case "OBJECT": {
                if (simpleType.members == null || simpleType.members.length === 0) {
                    return isAssignableToSimpleTypeKind({ kind: "ANY" }, kind, options);
                }
                break;
            }
            case "ANY": {
                return options.matchAny || false;
            }
            case "ENUM_MEMBER": {
                return isAssignableToSimpleTypeKind(simpleType.type, kind, options);
            }
        }
    });
}

function isAssignableToPrimitiveType(type, checkerOrOptions) {
    const checker = isTypeChecker(checkerOrOptions) ? checkerOrOptions : undefined;
    return isAssignableToSimpleTypeKind(type, PRIMITIVE_TYPE_KINDS, checker, { matchAny: true });
}

/**
 * Converts a simple type to a string.
 * @param type Simple Type
 */
function simpleTypeToString(type) {
    return simpleTypeToStringInternal(type, new Set());
}
function simpleTypeToStringInternal(type, visitTypeSet) {
    if (!isSimpleTypePrimitive(type)) {
        if (visitTypeSet.has(type)) {
            return "";
        }
        visitTypeSet = new Set([...visitTypeSet, type]);
    }
    switch (type.kind) {
        case "BOOLEAN_LITERAL":
            return String(type.value);
        case "NUMBER_LITERAL":
            return String(type.value);
        case "STRING_LITERAL":
            return `"${type.value}"`;
        case "BIG_INT_LITERAL":
            return `${type.value}n`;
        case "ES_SYMBOL":
            return `Symbol()`;
        case "ES_SYMBOL_UNIQUE":
            return `Symbol(${type.name})`;
        case "STRING":
            return "string";
        case "BOOLEAN":
            return "boolean";
        case "NUMBER":
            return "number";
        case "BIG_INT":
            return "bigint";
        case "UNDEFINED":
            return "undefined";
        case "NULL":
            return "null";
        case "ANY":
            return "any";
        case "UNKNOWN":
            return "unknown";
        case "VOID":
            return "void";
        case "NEVER":
            return "never";
        case "FUNCTION":
        case "METHOD": {
            if (type.kind === "FUNCTION" && type.name != null)
                return type.name;
            const argText = functionArgTypesToString(type.parameters || [], visitTypeSet);
            return `${type.typeParameters != null ? `<${type.typeParameters.map(tp => tp.name).join(",")}>` : ""}(${argText})${type.returnType != null ? ` => ${simpleTypeToStringInternal(type.returnType, visitTypeSet)}` : ""}`;
        }
        case "ARRAY": {
            const hasMultipleTypes = ["UNION", "INTERSECTION"].includes(type.type.kind);
            let memberType = simpleTypeToStringInternal(type.type, visitTypeSet);
            if (type.name != null && ["ArrayLike", "ReadonlyArray"].includes(type.name))
                return `${type.name}<${memberType}>`;
            if (hasMultipleTypes && type.type.name == null)
                memberType = `(${memberType})`;
            return `${memberType}[]`;
        }
        case "UNION": {
            if (type.name != null)
                return type.name;
            return truncateAndJoinList(type.types.map(t => simpleTypeToStringInternal(t, visitTypeSet)), " | ", { maxContentLength: 200 });
        }
        case "ENUM":
            return type.name;
        case "ENUM_MEMBER":
            return type.fullName;
        case "INTERSECTION":
            if (type.name != null)
                return type.name;
            return truncateAndJoinList(type.types.map(t => simpleTypeToStringInternal(t, visitTypeSet)), " & ", { maxContentLength: 200 });
        case "INTERFACE":
            if (type.name != null)
                return type.name;
        // this fallthrough is intentional
        case "OBJECT": {
            if (type.members == null || type.members.length === 0) {
                if (type.call == null && type.ctor == null) {
                    return "{}";
                }
                if (type.call != null && type.ctor == null) {
                    return simpleTypeToStringInternal(type.call, visitTypeSet);
                }
            }
            const entries = (type.members || []).map(member => {
                // this check needs to change in the future
                if (member.type.kind === "FUNCTION" || member.type.kind === "METHOD") {
                    const result = simpleTypeToStringInternal(member.type, visitTypeSet);
                    return `${member.name}${result.replace(" => ", ": ")}`;
                }
                return `${member.name}: ${simpleTypeToStringInternal(member.type, visitTypeSet)}`;
            });
            if (type.ctor != null) {
                entries.push(`new${simpleTypeToStringInternal(type.ctor, visitTypeSet)}`);
            }
            if (type.call != null) {
                entries.push(simpleTypeToStringInternal(type.call, visitTypeSet));
            }
            return `{ ${entries.join("; ")}${entries.length > 0 ? ";" : ""} }`;
        }
        case "TUPLE":
            return `[${type.members.map(member => `${simpleTypeToStringInternal(member.type, visitTypeSet)}${member.optional ? "?" : ""}`).join(", ")}]`;
        case "GENERIC_ARGUMENTS": {
            const { target, typeArguments } = type;
            return typeArguments.length === 0 ? target.name || "" : `${target.name}<${typeArguments.map(t => simpleTypeToStringInternal(t, visitTypeSet)).join(", ")}>`;
        }
        case "PROMISE":
            return `${type.name || "Promise"}<${simpleTypeToStringInternal(type.type, visitTypeSet)}>`;
        case "DATE":
            return "Date";
        default:
            return type.name || "";
    }
}
function truncateAndJoinList(items, combine, { maxLength, maxContentLength }) {
    const text = items.join(combine);
    // Truncate if too long
    let slice = 0;
    if (maxContentLength != null && text.length > maxContentLength) {
        let curLength = 0;
        for (const item of items) {
            curLength += item.length;
            slice++;
            if (curLength > maxContentLength) {
                break;
            }
        }
    }
    else if (maxLength != null && items.length > maxLength) {
        slice = maxLength;
    }
    if (slice !== 0) {
        return [...items.slice(0, slice), `... ${items.length - slice} more ...`].join(combine);
    }
    return text;
}
function functionArgTypesToString(argTypes, visitTypeSet) {
    return argTypes
        .map(arg => {
        return `${arg.rest ? "..." : ""}${arg.name}${arg.optional ? "?" : ""}: ${simpleTypeToStringInternal(arg.type, visitTypeSet)}`;
    })
        .join(", ");
}

/**
 * Returns if typeB is assignable to typeA.
 * @param typeA Type A
 * @param typeB Type B
 * @param config
 */
function isAssignableToSimpleType(typeA, typeB, config) {
    var _a, _b, _c, _d, _e, _f, _g;
    const userCache = config === null || config === void 0 ? void 0 : config.cache;
    config = {
        ...config,
        cache: undefined,
        strict: (_a = config === null || config === void 0 ? void 0 : config.strict) !== null && _a !== void 0 ? _a : true,
        strictFunctionTypes: (_c = (_b = config === null || config === void 0 ? void 0 : config.strictFunctionTypes) !== null && _b !== void 0 ? _b : config === null || config === void 0 ? void 0 : config.strict) !== null && _c !== void 0 ? _c : true,
        strictNullChecks: (_e = (_d = config === null || config === void 0 ? void 0 : config.strictNullChecks) !== null && _d !== void 0 ? _d : config === null || config === void 0 ? void 0 : config.strict) !== null && _e !== void 0 ? _e : true,
        maxDepth: (_f = config === null || config === void 0 ? void 0 : config.maxDepth) !== null && _f !== void 0 ? _f : 50,
        maxOps: (_g = config === null || config === void 0 ? void 0 : config.maxOps) !== null && _g !== void 0 ? _g : 1000
    };
    const cacheKey = `${config.strict}:${config.strictFunctionTypes}:${config.strictNullChecks}`;
    const cache = DEFAULT_RESULT_CACHE.get(cacheKey) || new WeakMap();
    DEFAULT_RESULT_CACHE.set(cacheKey, cache);
    return isAssignableToSimpleTypeCached(typeA, typeB, {
        config,
        operations: { value: 0 },
        depth: 0,
        cache: userCache || cache,
        insideType: new Set(),
        comparingTypes: new Map(),
        genericParameterMapA: new Map(),
        genericParameterMapB: new Map(),
        preventCaching: () => { }
    });
}
function isAssignableToSimpleTypeCached(typeA, typeB, options) {
    let typeACache = options.cache.get(typeA);
    let preventCaching = false;
    if (typeACache === null || typeACache === void 0 ? void 0 : typeACache.has(typeB)) {
        if (options.config.debug) {
            logDebug(options, "caching", `Found cache when comparing: ${simpleTypeToStringLazy(typeA)} (${typeA.kind}) and ${simpleTypeToStringLazy(typeB)} (${typeB.kind}). Cache content: ${typeACache.get(typeB)}`);
        }
        return typeACache.get(typeB);
    }
    // Call "isAssignableToSimpleTypeInternal" with a mutated options object
    const result = isAssignableToSimpleTypeInternal(typeA, typeB, {
        depth: options.depth,
        operations: options.operations,
        genericParameterMapA: options.genericParameterMapA,
        genericParameterMapB: options.genericParameterMapB,
        config: options.config,
        insideType: options.insideType,
        comparingTypes: options.comparingTypes,
        cache: options.cache,
        preventCaching: () => {
            options.preventCaching();
            preventCaching = true;
        }
    });
    if (!preventCaching) {
        /*if (options.config.debug) {
            logDebug(
                options,
                "caching",
                `Setting cache for comparison between ${simpleTypeToStringLazy(typeA)} (${typeA.kind}) and ${simpleTypeToStringLazy(typeB)} (${typeB.kind}). Result: ${result}`
            );
        }*/
        if (typeACache == null) {
            typeACache = new WeakMap();
            options.cache.set(typeA, typeACache);
        }
        typeACache.set(typeB, result);
    }
    return result;
}
function isCacheableType(simpleType, options) {
    switch (simpleType.kind) {
        case "UNION":
        case "INTERSECTION":
            if (options.genericParameterMapA.size !== 0 || options.genericParameterMapB.size !== 0) {
                return false;
            }
            break;
    }
    return !("typeParameters" in simpleType) && !["GENERIC_ARGUMENTS", "GENERIC_PARAMETER", "PROMISE", "LAZY"].includes(simpleType.kind);
}
function isAssignableToSimpleTypeInternal(typeA, typeB, options) {
    // It's assumed that the "options" parameter is already an unique reference that is safe to mutate.
    // Mutate depth and "operations"
    options.depth = options.depth + 1;
    options.operations.value++;
    // Handle debugging nested calls to isAssignable
    if (options.config.debug === true) {
        logDebugHeader(typeA, typeB, options);
    }
    if (options.depth >= options.config.maxDepth || options.operations.value >= options.config.maxOps) {
        options.preventCaching();
        return true;
    }
    // When comparing types S and T, the relationship in question is assumed to be true
    //   for every directly or indirectly nested occurrence of the same S and the same T
    if (options.comparingTypes.has(typeA)) {
        if (options.comparingTypes.get(typeA).has(typeB)) {
            options.preventCaching();
            if (options.config.debug) {
                logDebug(options, "comparing types", "Returns true because this relation is already being checking");
            }
            return true;
        }
    }
    // We might need a better way of handling refs, but these check are good for now
    if (options.insideType.has(typeA) || options.insideType.has(typeB)) {
        if (options.config.debug) {
            logDebug(options, "inside type", `{${typeA.kind}, ${typeB.kind}} {typeA: ${options.insideType.has(typeA)}} {typeB: ${options.insideType.has(typeB)}} {insideTypeMap: ${Array.from(options.insideType.keys())
                .map(t => simpleTypeToStringLazy(t))
                .join()}}`);
        }
        options.preventCaching();
        return true;
    }
    // Handle two types being equal
    // Types are not necessarily equal if they have typeParams because we still need to check the actual generic arguments
    if (isCacheableType(typeA, options) && isCacheableType(typeB, options)) {
        if (typeA === typeB) {
            if (options.config.debug) {
                logDebug(options, "equal", "The two types are equal!", typeA.kind, typeB.kind);
            }
            return true;
        }
    }
    else {
        options.preventCaching();
    }
    // Make it possible to overwrite default behavior by running user defined logic for comparing types
    if (options.config.isAssignable != null) {
        const result = options.config.isAssignable(typeA, typeB, options.config);
        if (result != null) {
            //options.preventCaching();
            return result;
        }
    }
    // Any and unknown. Everything is assignable to "ANY" and "UNKNOWN"
    if (typeA.kind === "UNKNOWN" || typeA.kind === "ANY") {
        return true;
    }
    // Mutate options and add this comparison to "comparingTypes".
    // Only do this if one of the types is not a primitive to save memory.
    if (!isSimpleTypePrimitive(typeA) && !isSimpleTypePrimitive(typeB)) {
        const comparingTypes = new Map(options.comparingTypes);
        if (comparingTypes.has(typeA)) {
            comparingTypes.get(typeA).add(typeB);
        }
        else {
            comparingTypes.set(typeA, new Set([typeB]));
        }
        options.comparingTypes = comparingTypes;
    }
    // #####################
    // Expand typeB
    // #####################
    switch (typeB.kind) {
        // [typeB] (expand)
        case "UNION": {
            // Some types seems to absorb other types when type checking a union (eg. 'unknown').
            // Usually typescript will absorb those types for us, but not when working with generic parameters.
            // The following line needs to be improved.
            const types = typeB.types.filter(t => resolveType(t, options.genericParameterMapB) !== DEFAULT_GENERIC_PARAMETER_TYPE);
            return and(types, childTypeB => isAssignableToSimpleTypeCached(typeA, childTypeB, options));
        }
        // [typeB] (expand)
        case "INTERSECTION": {
            // If we compare an intersection against an intersection, we need to compare from typeA and not typeB
            // Example: [string, number] & [string] === [string, number] & [string]
            if (typeA.kind === "INTERSECTION") {
                break;
            }
            const combined = reduceIntersectionIfPossible(typeB, options.genericParameterMapB);
            if (combined.kind === "NEVER") {
                if (options.config.debug) {
                    logDebug(options, "intersection", `Combining types in intersection is impossible. Comparing with 'never' instead.`);
                }
                return isAssignableToSimpleTypeCached(typeA, { kind: "NEVER" }, options);
            }
            if (options.config.debug) {
                if (combined !== typeB) {
                    logDebug(options, "intersection", `Types in intersection were combined into: ${simpleTypeToStringLazy(combined)}`);
                }
            }
            if (combined.kind !== "INTERSECTION") {
                return isAssignableToSimpleTypeCached(typeA, combined, options);
            }
            // An intersection type I is assignable to a type T if any type in I is assignable to T.
            return or(combined.types, memberB => isAssignableToSimpleTypeCached(typeA, memberB, options));
        }
        // [typeB] (expand)
        case "ALIAS": {
            return isAssignableToSimpleTypeCached(typeA, typeB.target, options);
        }
        // [typeB] (expand)
        case "GENERIC_ARGUMENTS": {
            const updatedGenericParameterMapB = extendTypeParameterMap(typeB, options.genericParameterMapB);
            if (options.config.debug) {
                logDebug(options, "generic args", "Expanding with typeB args: ", Array.from(updatedGenericParameterMapB.entries())
                    .map(([name, type]) => `${name}=${simpleTypeToStringLazy(type)}`)
                    .join("; "), "typeParameters" in typeB.target ? "" : "[No type parameters in target!]");
            }
            return isAssignableToSimpleTypeCached(typeA, typeB.target, {
                ...options,
                genericParameterMapB: updatedGenericParameterMapB
            });
        }
        // [typeB] (expand)
        case "GENERIC_PARAMETER": {
            const resolvedArgument = options.genericParameterMapB.get(typeB.name);
            const realTypeB = resolvedArgument || typeB.default || DEFAULT_GENERIC_PARAMETER_TYPE;
            if (options.config.debug) {
                logDebug(options, "generic", `Resolving typeB for param ${typeB.name} to:`, simpleTypeToStringLazy(realTypeB), ", Default: ", simpleTypeToStringLazy(typeB.default), ", In map: ", options.genericParameterMapB.has(typeB.name), ", GenericParamMapB: ", Array.from(options.genericParameterMapB.entries())
                    .map(([name, t]) => `${name}=${simpleTypeToStringLazy(t)}`)
                    .join("; "));
            }
            return isAssignableToSimpleTypeCached(typeA, realTypeB, options);
        }
    }
    // #####################
    // Compare typeB
    // #####################
    switch (typeB.kind) {
        // [typeB] (compare)
        case "ENUM_MEMBER": {
            return isAssignableToSimpleTypeCached(typeA, typeB.type, options);
        }
        // [typeB] (compare)
        case "ENUM": {
            return and(typeB.types, childTypeB => isAssignableToSimpleTypeCached(typeA, childTypeB, options));
        }
        // [typeB] (compare)
        case "UNDEFINED":
        case "NULL": {
            // When strict null checks are turned off, "undefined" and "null" are in the domain of every type but never
            if (!options.config.strictNullChecks) {
                return typeA.kind !== "NEVER";
            }
            break;
        }
        // [typeB] (compare)
        case "ANY": {
            // "any" can be assigned to anything but "never"
            return typeA.kind !== "NEVER";
        }
        // [typeB] (compare)
        case "NEVER": {
            // "never" can be assigned to anything
            return true;
        }
    }
    // #####################
    // Expand typeA
    // #####################
    switch (typeA.kind) {
        // [typeA] (expand)
        case "ALIAS": {
            return isAssignableToSimpleTypeCached(typeA.target, typeB, options);
        }
        // [typeA] (expand)
        case "GENERIC_PARAMETER": {
            const resolvedArgument = options.genericParameterMapA.get(typeA.name);
            const realTypeA = resolvedArgument || typeA.default || DEFAULT_GENERIC_PARAMETER_TYPE;
            if (options.config.debug) {
                logDebug(options, "generic", `Resolving typeA for param ${typeA.name} to:`, simpleTypeToStringLazy(realTypeA), ", Default: ", simpleTypeToStringLazy(typeA.default), ", In map: ", options.genericParameterMapA.has(typeA.name), ", GenericParamMapA: ", Array.from(options.genericParameterMapA.entries())
                    .map(([name, t]) => `${name}=${simpleTypeToStringLazy(t)}`)
                    .join("; "));
            }
            return isAssignableToSimpleTypeCached(realTypeA, typeB, options);
        }
        // [typeA] (expand)
        case "GENERIC_ARGUMENTS": {
            const updatedGenericParameterMapA = extendTypeParameterMap(typeA, options.genericParameterMapA);
            if (options.config.debug) {
                logDebug(options, "generic args", "Expanding with typeA args: ", Array.from(updatedGenericParameterMapA.entries())
                    .map(([name, type]) => `${name}=${simpleTypeToStringLazy(type)}`)
                    .join("; "), "typeParameters" in typeA.target ? "" : "[No type parameters in target!]");
            }
            return isAssignableToSimpleTypeCached(typeA.target, typeB, {
                ...options,
                genericParameterMapA: updatedGenericParameterMapA
            });
        }
        // [typeA] (expand)
        case "UNION": {
            // Some types seems to absorb other types when type checking a union (eg. 'unknown').
            // Usually typescript will absorb those types for us, but not when working with generic parameters.
            // The following line needs to be improved.
            const types = typeA.types.filter(t => resolveType(t, options.genericParameterMapA) !== DEFAULT_GENERIC_PARAMETER_TYPE || typeB === DEFAULT_GENERIC_PARAMETER_TYPE);
            return or(types, childTypeA => isAssignableToSimpleTypeCached(childTypeA, typeB, options));
        }
        // [typeA] (expand)
        case "INTERSECTION": {
            const combined = reduceIntersectionIfPossible(typeA, options.genericParameterMapA);
            if (combined.kind === "NEVER") {
                if (options.config.debug) {
                    logDebug(options, "intersection", `Combining types in intersection is impossible. Comparing with 'never' instead.`);
                }
                return isAssignableToSimpleTypeCached({ kind: "NEVER" }, typeB, options);
            }
            if (options.config.debug) {
                if (combined !== typeA) {
                    logDebug(options, "intersection", `Types in intersection were combined into: ${simpleTypeToStringLazy(combined)}`);
                }
            }
            if (combined.kind !== "INTERSECTION") {
                return isAssignableToSimpleTypeCached(combined, typeB, options);
            }
            // A type T is assignable to an intersection type I if T is assignable to each type in I.
            return and(combined.types, memberA => isAssignableToSimpleTypeCached(memberA, typeB, options));
        }
    }
    // #####################
    // Compare typeA
    // #####################
    switch (typeA.kind) {
        // [typeA] (compare)
        case "NON_PRIMITIVE": {
            if (options.config.debug) {
                logDebug(options, "object", `Checking if typeB is non-primitive [primitive=${isSimpleTypePrimitive(typeB)}] [hasName=${typeB.name != null}]`);
            }
            if (isSimpleTypePrimitive(typeB)) {
                return typeB.name != null;
            }
            return typeB.kind !== "UNKNOWN";
        }
        // [typeA] (compare)
        case "ARRAY": {
            if (typeB.kind === "ARRAY") {
                return isAssignableToSimpleTypeCached(typeA.type, typeB.type, options);
            }
            else if (typeB.kind === "TUPLE") {
                return and(typeB.members, memberB => isAssignableToSimpleTypeCached(typeA.type, memberB.type, options));
            }
            return false;
        }
        // [typeA] (compare)
        case "ENUM": {
            return or(typeA.types, childTypeA => isAssignableToSimpleTypeCached(childTypeA, typeB, options));
        }
        // [typeA] (compare)
        case "NUMBER_LITERAL":
        case "STRING_LITERAL":
        case "BIG_INT_LITERAL":
        case "BOOLEAN_LITERAL":
        case "ES_SYMBOL_UNIQUE": {
            return isSimpleTypeLiteral(typeB) ? typeA.value === typeB.value : false;
        }
        // [typeA] (compare)
        case "ENUM_MEMBER": {
            // You can always assign a "number" | "number literal" to a "number literal" enum member type.
            if (resolveType(typeA.type, options.genericParameterMapA).kind === "NUMBER_LITERAL" && ["NUMBER", "NUMBER_LITERAL"].includes(typeB.kind)) {
                if (typeB.name != null) {
                    return false;
                }
                return true;
            }
            return isAssignableToSimpleTypeCached(typeA.type, typeB, options);
        }
        // [typeA] (compare)
        case "STRING":
        case "BOOLEAN":
        case "NUMBER":
        case "ES_SYMBOL":
        case "BIG_INT": {
            if (typeB.name != null) {
                return false;
            }
            if (isSimpleTypeLiteral(typeB)) {
                return PRIMITIVE_TYPE_TO_LITERAL_MAP[typeA.kind] === typeB.kind;
            }
            return typeA.kind === typeB.kind;
        }
        // [typeA] (compare)
        case "UNDEFINED":
        case "NULL": {
            return typeA.kind === typeB.kind;
        }
        // [typeA] (compare)
        case "VOID": {
            return typeB.kind === "VOID" || typeB.kind === "UNDEFINED";
        }
        // [typeA] (compare)
        case "NEVER": {
            return false;
        }
        // [typeA] (compare)
        // https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions
        case "FUNCTION":
        case "METHOD": {
            if ("call" in typeB && typeB.call != null) {
                return isAssignableToSimpleTypeCached(typeA, typeB.call, options);
            }
            if (typeB.kind !== "FUNCTION" && typeB.kind !== "METHOD")
                return false;
            if (typeB.parameters == null || typeB.returnType == null)
                return typeA.parameters == null || typeA.returnType == null;
            if (typeA.parameters == null || typeA.returnType == null)
                return true;
            // Any return type is assignable to void
            if (options.config.debug) {
                logDebug(options, "function", `Checking if return type of typeA is 'void'`);
            }
            if (!isAssignableToSimpleTypeKind(typeA.returnType, "VOID")) {
                //if (!isAssignableToSimpleTypeInternal(typeA.returnType, { kind: "VOID" }, options)) {
                if (options.config.debug) {
                    logDebug(options, "function", `Return type is not void. Checking return types`);
                }
                if (!isAssignableToSimpleTypeCached(typeA.returnType, typeB.returnType, options)) {
                    return false;
                }
            }
            // Test "this" types
            const typeAThisParam = typeA.parameters.find(arg => arg.name === "this");
            const typeBThisParam = typeB.parameters.find(arg => arg.name === "this");
            if (typeAThisParam != null && typeBThisParam != null) {
                if (options.config.debug) {
                    logDebug(options, "function", `Checking 'this' param`);
                }
                if (!isAssignableToSimpleTypeCached(typeAThisParam.type, typeBThisParam.type, options)) {
                    return false;
                }
            }
            // Get all "non-this" params
            const paramTypesA = typeAThisParam == null ? typeA.parameters : typeA.parameters.filter(arg => arg !== typeAThisParam);
            const paramTypesB = typeBThisParam == null ? typeB.parameters : typeB.parameters.filter(arg => arg !== typeBThisParam);
            // A function with 0 params can be assigned to any other function
            if (paramTypesB.length === 0) {
                return true;
            }
            // A function with more required params than typeA isn't assignable
            const requiredParamCountB = paramTypesB.reduce((sum, param) => (param.optional || param.rest ? sum : sum + 1), 0);
            if (requiredParamCountB > paramTypesA.length) {
                if (options.config.debug) {
                    logDebug(options, "function", `typeB has more required params than typeA: ${requiredParamCountB} > ${paramTypesA.length}`);
                }
                return false;
            }
            let prevParamA = undefined;
            let prevParamB = undefined;
            // Compare the types of each param
            for (let i = 0; i < Math.max(paramTypesA.length, paramTypesB.length); i++) {
                let paramA = paramTypesA[i];
                let paramB = paramTypesB[i];
                if (options.config.debug) {
                    logDebug(options, "function", `${i} ['${(paramA === null || paramA === void 0 ? void 0 : paramA.name) || "???"}' AND '${(paramB === null || paramB === void 0 ? void 0 : paramB.name) || "???"}'] Checking parameters ${options.config.strictFunctionTypes ? "[contravariant]" : "[bivariant]"}: [${(paramA === null || paramA === void 0 ? void 0 : paramA.type) == null ? "???" : simpleTypeToStringLazy(paramA.type)}  AND  ${(paramB === null || paramB === void 0 ? void 0 : paramB.type) == null ? "???" : simpleTypeToStringLazy(paramB.type)}]`);
                }
                // Try to find the last param in typeA. If it's a rest param, continue with that one
                if (paramA == null && (prevParamA === null || prevParamA === void 0 ? void 0 : prevParamA.rest)) {
                    if (options.config.debug) {
                        logDebug(options, "function", `paramA is null and but last param in typeA is rest. Use that one.`);
                    }
                    paramA = prevParamA;
                }
                // Try to find the last param in typeB. If it's a rest param, continue with that one
                if (paramB == null && (prevParamB === null || prevParamB === void 0 ? void 0 : prevParamB.rest)) {
                    if (options.config.debug) {
                        logDebug(options, "function", `paramB is null and but last param in typeB is rest. Use that one.`);
                    }
                    paramB = prevParamB;
                }
                prevParamA = paramA;
                prevParamB = paramB;
                // If paramA is not present, check if paramB is optional or not present as well
                if (paramA == null) {
                    if (paramB != null && !paramB.optional && !paramB.rest) {
                        if (options.config.debug) {
                            logDebug(options, "function", `paramA is null and paramB is null, optional or has rest`);
                        }
                        return false;
                    }
                    if (options.config.debug) {
                        logDebug(options, "function", `paramA is null and paramB it not null, but is optional or has rest`);
                    }
                    continue;
                }
                // If paramB isn't present, check if paramA is optional
                if (paramB == null) {
                    if (options.config.debug) {
                        logDebug(options, "function", `paramB is 'null' returning true`);
                    }
                    return true;
                }
                // Check if we are comparing a spread against a non-spread
                const resolvedTypeA = resolveType(paramA.type, options.genericParameterMapA);
                const resolvedTypeB = resolveType(paramB.type, options.genericParameterMapB);
                // Unpack the array of rest parameters if possible
                const paramAType = paramA.rest && resolvedTypeA.kind === "ARRAY" ? resolvedTypeA.type : paramA.type;
                const paramBType = paramB.rest && resolvedTypeB.kind === "ARRAY" ? resolvedTypeB.type : paramB.type;
                if (paramA.rest) {
                    if (options.config.debug) {
                        logDebug(options, "function", `paramA is 'rest' and has been resolved to '${simpleTypeToStringLazy(paramAType)}'`);
                    }
                }
                if (paramB.rest) {
                    if (options.config.debug) {
                        logDebug(options, "function", `paramB is 'rest' and has been resolved to '${simpleTypeToStringLazy(paramBType)}'`);
                    }
                }
                // Check if the param types are assignable
                // Function parameter type checking is bivariant (when strictFunctionTypes is off) and contravariant (when strictFunctionTypes is on)
                if (!options.config.strictFunctionTypes) {
                    if (options.config.debug) {
                        logDebug(options, "function", `Checking covariant relationship`);
                    }
                    // Strict is off, therefore start by checking the covariant.
                    // The contravariant relationship will be checked afterwards resulting in bivariant behavior
                    if (isAssignableToSimpleTypeCached(paramAType, paramBType, options)) {
                        // Continue to next parameter
                        continue;
                    }
                }
                // There is something strange going on where it seems checking two methods is less strict and checking two functions.
                // I haven't found any documentation for this behavior, but it seems to be the case.
                /* Examples (with strictFunctionTypes):
                        // -----------------------------
                        interface I1 {
                            test(b: string | null): void;
                        }
                        interface I2 {
                            test(a: string): void;
                        }

                        // This will not fail
                        const thisWillNotFail: I1 = {} as I2;

                        // -----------------------------
                        interface I3 {
                            test: (b: string | null) => void;
                        }

                        interface I4 {
                            test: (a: string) => void;
                        }

                        // This will fail with:
                        //    Types of parameters 'a' and 'b' are incompatible.
                        //      Type 'string | null' is not assignable to type 'string'.
                        //         Type 'null' is not assignable to type 'string'
                        const thisWillFail: I3 = {} as I4;
                    */
                const newOptions = {
                    ...options,
                    config: typeA.kind === "METHOD" || typeB.kind === "METHOD"
                        ? {
                            ...options.config,
                            strictNullChecks: false,
                            strictFunctionTypes: false
                        }
                        : options.config,
                    cache: new WeakMap(),
                    genericParameterMapB: options.genericParameterMapA,
                    genericParameterMapA: options.genericParameterMapB
                };
                if (options.config.debug) {
                    logDebug(options, "function", `Checking contravariant relationship`);
                }
                // Contravariant
                if (!isAssignableToSimpleTypeCached(paramBType, paramAType, newOptions)) {
                    return false;
                }
            }
            return true;
        }
        // [typeA] (compare)
        case "INTERFACE":
        case "OBJECT":
        case "CLASS": {
            // If there are no members check that "typeB" is not assignable to a set of incompatible type kinds
            // This is to check the empty object {} and Object
            const typeAHasZeroMembers = isObjectEmpty(typeA, {
                ignoreOptionalMembers: ["UNKNOWN", "NON_PRIMITIVE"].includes(typeB.kind)
            });
            if (typeAHasZeroMembers && typeA.call == null && (typeA.ctor == null || typeA.kind === "CLASS")) {
                if (options.config.debug) {
                    logDebug(options, "object-type", `typeA is the empty object '{}'`);
                }
                return !isAssignableToSimpleTypeKind(typeB, ["NULL", "UNDEFINED", "NEVER", "VOID", ...(options.config.strictNullChecks ? ["UNKNOWN"] : [])], {
                    matchAny: false
                });
            }
            switch (typeB.kind) {
                case "FUNCTION":
                case "METHOD":
                    return typeA.call != null && isAssignableToSimpleTypeCached(typeA.call, typeB, options);
                case "INTERFACE":
                case "OBJECT":
                case "CLASS": {
                    // Test both callable types
                    const membersA = typeA.members || [];
                    const membersB = typeB.members || [];
                    options.insideType = new Set([...options.insideType, typeA, typeB]);
                    // Check how many properties typeB has in common with typeA.
                    let membersInCommon = 0;
                    // Make sure that every required prop in typeA is present in typeB
                    const requiredMembersInTypeAExistsInTypeB = and(membersA, memberA => {
                        //if (memberA.optional) return true;
                        const memberB = membersB.find(memberB => memberA.name === memberB.name);
                        if (memberB != null)
                            membersInCommon += 1;
                        return memberB == null
                            ? // If corresponding "memberB" couldn't be found, return true if "memberA" is optional
                                memberA.optional
                            : // If corresponding "memberB" was found, return true if "memberA" is optional or "memberB" is not optional
                                memberA.optional || !memberB.optional;
                    });
                    if (!requiredMembersInTypeAExistsInTypeB) {
                        if (options.config.debug) {
                            logDebug(options, "object-type", `Didn't find required members from typeA in typeB`);
                        }
                        return false;
                    }
                    // Check if construct signatures are assignable (if any)
                    if (typeA.ctor != null && typeA.kind !== "CLASS") {
                        if (options.config.debug) {
                            logDebug(options, "object-type", `Checking if typeB.ctor is assignable to typeA.ctor`);
                        }
                        if (typeB.ctor != null && typeB.kind !== "CLASS") {
                            if (!isAssignableToSimpleTypeCached(typeA.ctor, typeB.ctor, options)) {
                                return false;
                            }
                            membersInCommon += 1;
                        }
                        else {
                            if (options.config.debug) {
                                logDebug(options, "object-type", `Expected typeB.ctor to have a ctor`);
                            }
                            return false;
                        }
                    }
                    // Check if call signatures are assignable (if any)
                    if (typeA.call != null) {
                        if (options.config.debug) {
                            logDebug(options, "object-type", `Checking if typeB.call is assignable to typeA.call`);
                        }
                        if (typeB.call != null) {
                            if (!isAssignableToSimpleTypeCached(typeA.call, typeB.call, options)) {
                                return false;
                            }
                            membersInCommon += 1;
                        }
                        else {
                            return false;
                        }
                    }
                    // They are not assignable if typeB has 0 members in common with typeA, and there are more than 0 members in typeB.
                    // The ctor of classes are not counted towards if typeB is empty
                    const typeBIsEmpty = membersB.length === 0 && typeB.call == null && ((typeB.kind !== "CLASS" && typeB.ctor == null) || typeB.kind === "CLASS");
                    if (membersInCommon === 0 && !typeBIsEmpty) {
                        if (options.config.debug) {
                            logDebug(options, "object-type", `typeB has 0 members in common with typeA and there are more than 0 members in typeB`);
                        }
                        return false;
                    }
                    // Ensure that every member in typeB is assignable to corresponding members in typeA
                    const membersInTypeBAreAssignableToMembersInTypeA = and(membersB, memberB => {
                        const memberA = membersA.find(memberA => memberA.name === memberB.name);
                        if (memberA == null) {
                            return true;
                        }
                        if (options.config.debug) {
                            logDebug(options, "object-type", `Checking member '${memberA.name}' types`);
                        }
                        return isAssignableToSimpleTypeCached(memberA.type, memberB.type, options);
                    });
                    if (options.config.debug) {
                        if (!membersInTypeBAreAssignableToMembersInTypeA) {
                            logDebug(options, "object-type", `Not all members in typeB is assignable to corresponding members in typeA`);
                        }
                        else {
                            logDebug(options, "object-type", `All members were checked successfully`);
                        }
                    }
                    return membersInTypeBAreAssignableToMembersInTypeA;
                }
                default:
                    return false;
            }
        }
        // [typeA] (compare)
        case "TUPLE": {
            if (typeB.kind !== "TUPLE")
                return false;
            // Compare the length of each tuple, but compare the length type instead of the actual length
            // We compare the length type because Typescript compares the type of the "length" member of tuples
            if (!isAssignableToSimpleTypeCached(getTupleLengthType(typeA), getTupleLengthType(typeB), options)) {
                return false;
            }
            // Compare if typeB elements are assignable to typeA's rest element
            // Example: [string, ...boolean[]] === [any, true, 123]
            if (typeA.rest && typeB.members.length > typeA.members.length) {
                return and(typeB.members.slice(typeA.members.length), (memberB, i) => {
                    return isAssignableToSimpleTypeCached(typeA.members[typeA.members.length - 1].type, memberB.type, options);
                });
            }
            // Compare that every type of typeB is assignable to corresponding members in typeA
            return and(typeA.members, (memberA, i) => {
                const memberB = typeB.members[i];
                if (memberB == null)
                    return memberA.optional;
                return isAssignableToSimpleTypeCached(memberA.type, memberB.type, options);
            });
        }
        // [typeA] (compare)
        case "PROMISE": {
            return typeB.kind === "PROMISE" && isAssignableToSimpleTypeCached(typeA.type, typeB.type, options);
        }
        // [typeA] (compare)
        case "DATE": {
            return typeB.kind === "DATE";
        }
    }
    // If we some how end up here (we shouldn't), return "true" as a safe fallback
    // @ts-ignore
    return true;
}
function reduceIntersectionIfPossible(simpleType, parameterMap) {
    // DOCUMENTATION FROM TYPESCRIPT SOURCE CODE (getIntersectionType)
    // We normalize combinations of intersection and union types based on the distributive property of the '&'
    // operator. Specifically, because X & (A | B) is equivalent to X & A | X & B, we can transform intersection
    // types with union type constituents into equivalent union types with intersection type constituents and
    // effectively ensure that union types are always at the top level in type representations.
    //
    // We do not perform structural deduplication on intersection types. Intersection types are created only by the &
    // type operator and we can't reduce those because we want to support recursive intersection types. For example,
    // a type alias of the form "type List<T> = T & { next: List<T> }" cannot be reduced during its declaration.
    // Also, unlike union types, the order of the constituent types is preserved in order that overload resolution
    // for intersections of types with signatures can be deterministic.
    var _a, _b;
    // An intersection type is considered empty if it contains
    // the type never, or
    // more than one unit type or,
    // an object type and a nullable type (null or undefined), or
    // a string-like type and a type known to be non-string-like, or
    // a number-like type and a type known to be non-number-like, or
    // a symbol-like type and a type known to be non-symbol-like, or
    // a void-like type and a type known to be non-void-like, or
    // a non-primitive type and a type known to be primitive.
    const typeKindMap = new Map();
    const primitiveSet = new Set();
    const primitiveLiteralSet = new Map();
    for (const member of simpleType.types) {
        const resolvedType = resolveType(member, parameterMap);
        typeKindMap.set(resolvedType.kind, [...(typeKindMap.get(resolvedType.kind) || []), resolvedType]);
        switch (resolvedType.kind) {
            case "NEVER":
                return NEVER_TYPE;
        }
        if (isSimpleTypePrimitive(resolvedType)) {
            if (isSimpleTypeLiteral(resolvedType)) {
                if (primitiveLiteralSet.has(resolvedType.kind) && primitiveLiteralSet.get(resolvedType.kind) !== resolvedType.value) {
                    return NEVER_TYPE;
                }
                primitiveLiteralSet.set(resolvedType.kind, resolvedType.value);
            }
            else {
                primitiveSet.add(resolvedType.kind);
                if (primitiveSet.size > 1) {
                    return NEVER_TYPE;
                }
            }
        }
    }
    if ((((_a = typeKindMap.get("TUPLE")) === null || _a === void 0 ? void 0 : _a.length) || 0) > 1) {
        let len = undefined;
        for (const type of typeKindMap.get("TUPLE")) {
            if (len != null && len !== type.members.length) {
                return NEVER_TYPE;
            }
            len = type.members.length;
        }
    }
    if (typeKindMap.size === 1 && (((_b = typeKindMap.get("OBJECT")) === null || _b === void 0 ? void 0 : _b.length) || 0) > 1) {
        const members = new Map();
        for (const type of typeKindMap.get("OBJECT")) {
            for (const member of type.members || []) {
                if (members.has(member.name)) {
                    const combinedMemberType = reduceIntersectionIfPossible({ kind: "INTERSECTION", types: [members.get(member.name).type, member.type] }, parameterMap);
                    if (combinedMemberType.kind === "NEVER") {
                        return combinedMemberType;
                    }
                    members.set(member.name, { ...member, type: combinedMemberType });
                }
                else {
                    members.set(member.name, member);
                }
            }
        }
        return { ...typeKindMap.get("OBJECT")[0], members: Array.from(members.values()) };
    }
    return simpleType;
}
function isObjectEmpty(simpleType, { ignoreOptionalMembers }) {
    return simpleType.members == null || simpleType.members.length === 0 || (ignoreOptionalMembers && !simpleType.members.some(m => !m.optional)) || false;
}
function resolveType(simpleType, parameterMap) {
    return resolveType$1(simpleType, parameterMap);
}
function logDebugHeader(typeA, typeB, options) {
    const silentConfig = { ...options.config, debug: false, maxOps: 20, maxDepth: 20 };
    let result;
    try {
        result = isAssignableToSimpleType(typeA, typeB, silentConfig);
    }
    catch (e) {
        result = e.message;
    }
    const depthChars = "   ".repeat(options.depth);
    const firstLogPart = ` ${depthChars}${simpleTypeToStringLazy(typeA)} ${colorText(options, ">:", "cyan")} ${simpleTypeToStringLazy(typeB)}   [${typeA.kind} === ${typeB.kind}]`;
    let text = `${firstLogPart} ${" ".repeat(Math.max(2, 120 - firstLogPart.length))}${colorText(options, options.depth, "yellow")} ### (${typeA.name || "???"} === ${typeB.name || "???"}) [result=${colorText(options, result, result === true ? "green" : "red")}]`;
    if (options.depth >= 50) {
        // Too deep
        if (options.depth === 50) {
            text = `Nested comparisons reach 100. Skipping logging...`;
        }
        else {
            return;
        }
    }
    // eslint-disable-next-line no-console
    (options.config.debugLog || console.log)(text);
}
function logDebug(options, title, ...args) {
    const depthChars = "   ".repeat(options.depth);
    const text = `${depthChars} [${colorText(options, title, "blue")}] ${args.join(" ")}`;
    // eslint-disable-next-line no-console
    (options.config.debugLog || console.log)(colorText(options, text, "gray"));
}
function simpleTypeToStringLazy(simpleType) {
    if (simpleType == null) {
        return "???";
    }
    return simpleTypeToString(simpleType);
}
function colorText(options, text, color) {
    if (options.config.debugLog != null) {
        return `${text}`;
    }
    const RESET = "\x1b[0m";
    const COLOR = (() => {
        switch (color) {
            case "gray":
                return "\x1b[2m\x1b[37m";
            case "red":
                return "\x1b[31m";
            case "green":
                return "\x1b[32m";
            case "yellow":
                return "\x1b[33m";
            case "blue":
                return "\x1b[34m";
            case "cyan":
                return "\x1b[2m\x1b[36m";
        }
    })();
    return `${COLOR}${text}${RESET}`;
}
const PRIMITIVE_TYPE_TO_LITERAL_MAP = {
    ["STRING"]: "STRING_LITERAL",
    ["NUMBER"]: "NUMBER_LITERAL",
    ["BOOLEAN"]: "BOOLEAN_LITERAL",
    ["BIG_INT"]: "BIG_INT_LITERAL",
    ["ES_SYMBOL"]: "ES_SYMBOL_UNIQUE"
};
/*const LITERAL_TYPE_TO_PRIMITIVE_TYPE_MAP = ({
    ["STRING_LITERAL"]: "STRING",
    ["NUMBER_LITERAL"]: "NUMBER",
    ["BOOLEAN_LITERAL"]: "BOOLEAN",
    ["BIG_INT_LITERAL"]: "BIG_INT",
    ["ES_SYMBOL_UNIQUE"]: "ES_SYMBOL"
} as unknown) as Record<SimpleTypeKind, SimpleTypeKind | undefined>;*/

function isAssignableToType(typeA, typeB, checkerOrOptions, options) {
    if (typeA === typeB)
        return true;
    // Get the correct TypeChecker
    const checker = isTypeChecker(checkerOrOptions) ? checkerOrOptions : isProgram(checkerOrOptions) ? checkerOrOptions.getTypeChecker() : undefined;
    // Get the correct options. Potentially merge user given options with program options.
    options = {
        ...(checkerOrOptions == null ? {} : isProgram(checkerOrOptions) ? checkerOrOptions.getCompilerOptions() : isTypeChecker(checkerOrOptions) ? {} : checkerOrOptions),
        ...(options || {})
    };
    // Check if the types are nodes (in which case we need to get the type of the node)
    typeA = isNode(typeA) ? checker.getTypeAtLocation(typeA) : typeA;
    typeB = isNode(typeB) ? checker.getTypeAtLocation(typeB) : typeB;
    // Use native "isTypeAssignableTo" if both types are native TS-types and "isTypeAssignableTo" is exposed on TypeChecker
    if (!isSimpleType(typeA) && !isSimpleType(typeB) && checker != null && checker.isTypeAssignableTo != null) {
        return checker.isTypeAssignableTo(typeB, typeA);
    }
    // Convert the TS types to SimpleTypes
    const simpleTypeA = isSimpleType(typeA) ? typeA : toSimpleType(typeA, checker);
    const simpleTypeB = isSimpleType(typeB) ? typeB : toSimpleType(typeB, checker);
    return isAssignableToSimpleType(simpleTypeA, simpleTypeB, options);
}

function isAssignableToValue(type, value, checker) {
    const typeB = convertValueToSimpleType(value, { visitValueSet: new Set(), widening: false });
    return isAssignableToType(type, typeB, checker, { strict: true });
}
function convertValueToSimpleType(value, { visitValueSet, widening }) {
    if (visitValueSet.has(value)) {
        return { kind: "ANY" };
    }
    if (value === undefined) {
        return {
            kind: "UNDEFINED"
        };
    }
    else if (value === null) {
        return {
            kind: "NULL"
        };
    }
    else if (typeof value === "string") {
        if (widening) {
            return { kind: "STRING" };
        }
        return {
            kind: "STRING_LITERAL",
            value
        };
    }
    else if (typeof value === "number") {
        if (widening) {
            return { kind: "NUMBER" };
        }
        return {
            kind: "NUMBER_LITERAL",
            value
        };
    }
    else if (typeof value === "boolean") {
        if (widening) {
            return { kind: "BOOLEAN" };
        }
        return {
            kind: "BOOLEAN_LITERAL",
            value
        };
    }
    else if (typeof value === "symbol") {
        if (widening) {
            return { kind: "ES_SYMBOL" };
        }
        return {
            kind: "ES_SYMBOL_UNIQUE",
            value: Math.random().toString()
        };
    }
    else if (Array.isArray(value)) {
        visitValueSet.add(value);
        const firstElement = value[0];
        if (firstElement != null) {
            return { kind: "ARRAY", type: convertValueToSimpleType(firstElement, { visitValueSet, widening: true }) };
        }
        return {
            kind: "ARRAY",
            type: { kind: "ANY" }
        };
    }
    else if (value instanceof Promise) {
        return {
            kind: "PROMISE",
            type: { kind: "ANY" }
        };
    }
    else if (value instanceof Date) {
        return {
            kind: "DATE"
        };
    }
    else if (typeof value === "object" && value != null) {
        visitValueSet.add(value);
        const members = Object.entries(value).map(([key, value]) => ({
            name: key,
            type: convertValueToSimpleType(value, { visitValueSet, widening })
        }));
        return {
            kind: "OBJECT",
            members
        };
    }
    return { kind: "ANY" };
}

function typeToString(type, checker) {
    if (isSimpleType(type)) {
        return simpleTypeToString(type);
    }
    // Use the typescript checker to return a string for a type
    return checker.typeToString(type);
}

const TYPE_REF_PREFIX = "__REF__";
function isTypeRef(value) {
    return typeof value === "string" && value.startsWith(TYPE_REF_PREFIX);
}
/**
 * Deserialize a serialized type into a SimpleType
 * @param serializedSimpleType
 */
function deserializeSimpleType(serializedSimpleType) {
    const { typeMap } = serializedSimpleType;
    // Make a map to lookup ids to get a shared SimpleType
    const deserializedTypeMap = new Map();
    // Add an empty object for each type in the reference map.
    // These object will be filled out afterwards.
    // This is useful because it allows us to easily shared references.
    for (const typeId of Object.keys(typeMap)) {
        deserializedTypeMap.set(Number(typeId), {});
    }
    // Loop through all types and deserialize them
    for (const [typeId, serializedType] of Object.entries(typeMap)) {
        const deserializedType = convertObject(serializedType, obj => {
            // Find and replace with a corresponding type in the typeMap when encountering a typeRef
            if (isTypeRef(obj)) {
                const typeId = Number(obj.replace(TYPE_REF_PREFIX, ""));
                return deserializedTypeMap.get(typeId);
            }
        });
        // Merge the content of "deserialized type" into the reference
        Object.assign(deserializedTypeMap.get(Number(typeId)), deserializedType);
    }
    // Return the main deserialized type
    return deserializedTypeMap.get(serializedSimpleType.type);
}
/**
 * Serialize a SimpleType
 * @param simpleType
 */
function serializeSimpleType(simpleType) {
    // Assign an "id" to each serialized type
    const typeMap = {};
    // Make it possible to lookup an id based on a SimpleType
    const typeMapReverse = new WeakMap();
    // Keep track of current id
    let id = 0;
    const mainTypeId = serializeTypeInternal(simpleType, {
        assignIdToType: type => {
            if (typeMapReverse.has(type)) {
                return typeMapReverse.get(type);
            }
            const assignedId = id++;
            typeMapReverse.set(type, assignedId);
            return assignedId;
        },
        getIdFromType: type => {
            return typeMapReverse.get(type);
        },
        emitType: (id, simpleTypeWithRef) => {
            typeMap[id] = simpleTypeWithRef;
            return id++;
        }
    });
    return {
        type: mainTypeId,
        typeMap
    };
}
function serializeTypeInternal(simpleType, { emitType, getIdFromType, assignIdToType }) {
    // If this SimpleType already has been assigned an ID, we don't need to serialize it again
    const existingId = getIdFromType(simpleType);
    if (existingId != null) {
        return existingId;
    }
    const id = assignIdToType(simpleType);
    const serializedType = convertObject({ ...simpleType }, obj => {
        // Replace with id whenever encountering a SimpleType
        if (isSimpleType(obj)) {
            // Convert the SimpleType recursively
            const id = serializeTypeInternal(obj, { emitType, getIdFromType, assignIdToType });
            return `${TYPE_REF_PREFIX}${id}`;
        }
    });
    // Emit this serialized type to the type map
    emitType(id, serializedType);
    return id;
}
function convertObject(input, convert) {
    let outer = true;
    function convertObjectInner(obj) {
        if (Array.isArray(obj)) {
            return obj.map(o => convertObjectInner(o));
        }
        if (!outer) {
            const convertedObj = convert(obj);
            if (convertedObj != null) {
                return convertedObj;
            }
        }
        outer = false;
        if (typeof obj === "object" && obj != null) {
            const newObj = {};
            for (const [key, value] of Object.entries(obj)) {
                newObj[key] = convertObjectInner(value);
            }
            return newObj;
        }
        return obj;
    }
    return convertObjectInner(input);
}

exports.LITERAL_TYPE_KINDS = LITERAL_TYPE_KINDS;
exports.PRIMITIVE_TYPE_KINDS = PRIMITIVE_TYPE_KINDS;
exports.SIMPLE_TYPE_KINDS = SIMPLE_TYPE_KINDS;
exports.deserializeSimpleType = deserializeSimpleType;
exports.getTypescriptModule = getTypescriptModule;
exports.isAssignableToPrimitiveType = isAssignableToPrimitiveType;
exports.isAssignableToSimpleTypeKind = isAssignableToSimpleTypeKind;
exports.isAssignableToType = isAssignableToType;
exports.isAssignableToValue = isAssignableToValue;
exports.isSimpleType = isSimpleType;
exports.isSimpleTypeLiteral = isSimpleTypeLiteral;
exports.isSimpleTypePrimitive = isSimpleTypePrimitive;
exports.serializeSimpleType = serializeSimpleType;
exports.setTypescriptModule = setTypescriptModule;
exports.toSimpleType = toSimpleType;
exports.typeToString = typeToString;
exports.validateType = validateType;
