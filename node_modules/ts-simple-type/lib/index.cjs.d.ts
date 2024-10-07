import * as tsModule from "typescript";
import { Type, TypeChecker, Node, Program } from "typescript";
type SimpleTypeKind = 
// Primitives types
"STRING_LITERAL" | "NUMBER_LITERAL" | "BOOLEAN_LITERAL" | "BIG_INT_LITERAL" | "ES_SYMBOL_UNIQUE" | "STRING" | "NUMBER" | "BOOLEAN" | "BIG_INT" | "ES_SYMBOL" | "NULL" | "UNDEFINED" | "VOID" | "NEVER" | "ANY" | "UNKNOWN" | "ENUM" | "ENUM_MEMBER" | "NON_PRIMITIVE" | "UNION" | "INTERSECTION" | "INTERFACE" | "OBJECT" | "CLASS" | "FUNCTION" | "METHOD" | "GENERIC_ARGUMENTS" | "GENERIC_PARAMETER" | "ALIAS" | "TUPLE" | "ARRAY" | "DATE" | "PROMISE";
type SimpleTypeModifierKind = "EXPORT" | "AMBIENT" | "PUBLIC" | "PRIVATE" | "PROTECTED" | "STATIC" | "READONLY" | "ABSTRACT" | "ASYNC" | "DEFAULT";
// ##############################
// Base
// ##############################
interface SimpleTypeBase {
    readonly kind: SimpleTypeKind;
    readonly name?: string;
}
// ##############################
// Primitive Types
// ##############################
interface SimpleTypeBigIntLiteral extends SimpleTypeBase {
    readonly kind: "BIG_INT_LITERAL";
    readonly value: bigint;
}
interface SimpleTypeStringLiteral extends SimpleTypeBase {
    readonly kind: "STRING_LITERAL";
    readonly value: string;
}
interface SimpleTypeNumberLiteral extends SimpleTypeBase {
    readonly kind: "NUMBER_LITERAL";
    readonly value: number;
}
interface SimpleTypeBooleanLiteral extends SimpleTypeBase {
    readonly kind: "BOOLEAN_LITERAL";
    readonly value: boolean;
}
interface SimpleTypeString extends SimpleTypeBase {
    readonly kind: "STRING";
}
interface SimpleTypeNumber extends SimpleTypeBase {
    readonly kind: "NUMBER";
}
interface SimpleTypeBoolean extends SimpleTypeBase {
    readonly kind: "BOOLEAN";
}
interface SimpleTypeBigInt extends SimpleTypeBase {
    readonly kind: "BIG_INT";
}
interface SimpleTypeESSymbol extends SimpleTypeBase {
    readonly kind: "ES_SYMBOL";
}
interface SimpleTypeESSymbolUnique extends SimpleTypeBase {
    readonly kind: "ES_SYMBOL_UNIQUE";
    readonly value: string;
}
// ##############################
// TS-specific types
// ##############################
interface SimpleTypeNull extends SimpleTypeBase {
    readonly kind: "NULL";
}
interface SimpleTypeNever extends SimpleTypeBase {
    readonly kind: "NEVER";
}
interface SimpleTypeUndefined extends SimpleTypeBase {
    readonly kind: "UNDEFINED";
}
interface SimpleTypeAny extends SimpleTypeBase {
    readonly kind: "ANY";
}
interface SimpleTypeUnknown extends SimpleTypeBase {
    readonly kind: "UNKNOWN";
}
interface SimpleTypeVoid extends SimpleTypeBase {
    readonly kind: "VOID";
}
interface SimpleTypeNonPrimitive extends SimpleTypeBase {
    readonly kind: "NON_PRIMITIVE";
}
interface SimpleTypeEnumMember extends SimpleTypeBase {
    readonly kind: "ENUM_MEMBER";
    readonly fullName: string;
    readonly name: string;
    readonly type: SimpleTypePrimitive;
}
interface SimpleTypeEnum extends SimpleTypeBase {
    readonly name: string;
    readonly kind: "ENUM";
    readonly types: SimpleTypeEnumMember[];
}
// ##############################
// Structure Types
// ##############################
interface SimpleTypeUnion extends SimpleTypeBase {
    readonly kind: "UNION";
    readonly types: SimpleType[];
}
interface SimpleTypeIntersection extends SimpleTypeBase {
    readonly kind: "INTERSECTION";
    readonly types: SimpleType[];
}
// ##############################
// Object Types
// ##############################
interface SimpleTypeMember {
    readonly optional: boolean;
    readonly type: SimpleType;
    readonly modifiers?: SimpleTypeModifierKind[];
}
interface SimpleTypeMemberNamed extends SimpleTypeMember {
    readonly name: string;
}
interface SimpleTypeObjectTypeBase extends SimpleTypeBase {
    readonly members?: SimpleTypeMemberNamed[];
    readonly ctor?: SimpleTypeFunction;
    readonly call?: SimpleTypeFunction;
    readonly typeParameters?: SimpleTypeGenericParameter[];
    readonly indexType?: {
        ["STRING"]?: SimpleType;
        ["NUMBER"]?: SimpleType;
    };
}
interface SimpleTypeInterface extends SimpleTypeObjectTypeBase {
    readonly kind: "INTERFACE";
}
interface SimpleTypeClass extends SimpleTypeObjectTypeBase {
    readonly kind: "CLASS";
}
interface SimpleTypeObject extends SimpleTypeObjectTypeBase {
    readonly kind: "OBJECT";
}
// ##############################
// Callable
// ##############################
interface SimpleTypeFunctionParameter {
    readonly name: string;
    readonly type: SimpleType;
    readonly optional: boolean;
    readonly rest: boolean;
    readonly initializer: boolean;
}
interface SimpleTypeFunction extends SimpleTypeBase {
    readonly kind: "FUNCTION";
    readonly parameters?: SimpleTypeFunctionParameter[];
    readonly typeParameters?: SimpleTypeGenericParameter[];
    readonly returnType?: SimpleType;
}
interface SimpleTypeMethod extends SimpleTypeBase {
    readonly kind: "METHOD";
    readonly parameters: SimpleTypeFunctionParameter[];
    readonly typeParameters?: SimpleTypeGenericParameter[];
    readonly returnType: SimpleType;
}
// ##############################
// Generics
// ##############################
interface SimpleTypeGenericArguments extends SimpleTypeBase {
    readonly kind: "GENERIC_ARGUMENTS";
    readonly name?: undefined;
    readonly target: SimpleType;
    readonly typeArguments: SimpleType[];
}
interface SimpleTypeGenericParameter extends SimpleTypeBase {
    readonly name: string;
    readonly kind: "GENERIC_PARAMETER";
    readonly default?: SimpleType;
}
interface SimpleTypeAlias extends SimpleTypeBase {
    readonly kind: "ALIAS";
    readonly name: string;
    readonly target: SimpleType;
    readonly typeParameters?: SimpleTypeGenericParameter[];
}
// ##############################
// Lists
// ##############################
interface SimpleTypeTuple extends SimpleTypeBase {
    readonly kind: "TUPLE";
    readonly members: SimpleTypeMember[];
    readonly rest?: boolean;
}
interface SimpleTypeArray extends SimpleTypeBase {
    readonly kind: "ARRAY";
    readonly type: SimpleType;
}
// ##############################
// Special Types
// ##############################
interface SimpleTypeDate extends SimpleTypeBase {
    readonly kind: "DATE";
}
interface SimpleTypePromise extends SimpleTypeBase {
    readonly kind: "PROMISE";
    readonly type: SimpleType;
}
type SimpleType = SimpleTypeBigIntLiteral | SimpleTypeEnumMember | SimpleTypeEnum | SimpleTypeClass | SimpleTypeFunction | SimpleTypeObject | SimpleTypeInterface | SimpleTypeTuple | SimpleTypeArray | SimpleTypeUnion | SimpleTypeIntersection | SimpleTypeStringLiteral | SimpleTypeNumberLiteral | SimpleTypeBooleanLiteral | SimpleTypeESSymbolUnique | SimpleTypeString | SimpleTypeNumber | SimpleTypeBoolean | SimpleTypeBigInt | SimpleTypeESSymbol | SimpleTypeNull | SimpleTypeUndefined | SimpleTypeNever | SimpleTypeAny | SimpleTypeMethod | SimpleTypeVoid | SimpleTypeNonPrimitive | SimpleTypePromise | SimpleTypeUnknown | SimpleTypeAlias | SimpleTypeDate | SimpleTypeGenericArguments | SimpleTypeGenericParameter;
// Primitive, literal
type SimpleTypeLiteral = SimpleTypeBigIntLiteral | SimpleTypeBooleanLiteral | SimpleTypeStringLiteral | SimpleTypeNumberLiteral | SimpleTypeESSymbolUnique;
declare const LITERAL_TYPE_KINDS: SimpleTypeKind[];
declare function isSimpleTypeLiteral(type: SimpleType): type is SimpleTypeLiteral;
// Primitive
type SimpleTypePrimitive = SimpleTypeLiteral | SimpleTypeString | SimpleTypeNumber | SimpleTypeBoolean | SimpleTypeBigInt | SimpleTypeNull | SimpleTypeUndefined | SimpleTypeESSymbol;
declare const PRIMITIVE_TYPE_KINDS: SimpleTypeKind[];
declare function isSimpleTypePrimitive(type: SimpleType): type is SimpleTypePrimitive;
// All kinds
declare const SIMPLE_TYPE_KINDS: SimpleTypeKind[];
declare function isSimpleType(type: unknown): type is SimpleType;
type SimpleTypeKindMap = {
    STRING_LITERAL: SimpleTypeStringLiteral;
    NUMBER_LITERAL: SimpleTypeNumberLiteral;
    BOOLEAN_LITERAL: SimpleTypeBooleanLiteral;
    BIG_INT_LITERAL: SimpleTypeBigIntLiteral;
    ES_SYMBOL_UNIQUE: SimpleTypeESSymbolUnique;
    STRING: SimpleTypeString;
    NUMBER: SimpleTypeNumber;
    BOOLEAN: SimpleTypeBoolean;
    BIG_INT: SimpleTypeBigInt;
    ES_SYMBOL: SimpleTypeESSymbol;
    NULL: SimpleTypeNull;
    UNDEFINED: SimpleTypeUndefined;
    VOID: SimpleTypeVoid;
    NEVER: SimpleTypeNever;
    ANY: SimpleTypeAny;
    UNKNOWN: SimpleTypeUnknown;
    ENUM: SimpleTypeEnum;
    ENUM_MEMBER: SimpleTypeEnumMember;
    NON_PRIMITIVE: SimpleTypeNonPrimitive;
    UNION: SimpleTypeUnion;
    INTERSECTION: SimpleTypeIntersection;
    INTERFACE: SimpleTypeInterface;
    OBJECT: SimpleTypeObject;
    CLASS: SimpleTypeClass;
    FUNCTION: SimpleTypeFunction;
    METHOD: SimpleTypeMethod;
    GENERIC_ARGUMENTS: SimpleTypeGenericArguments;
    GENERIC_PARAMETER: SimpleTypeGenericParameter;
    ALIAS: SimpleTypeAlias;
    TUPLE: SimpleTypeTuple;
    ARRAY: SimpleTypeArray;
    DATE: SimpleTypeDate;
    PROMISE: SimpleTypePromise;
};
declare function setTypescriptModule(ts: typeof tsModule): void;
declare function getTypescriptModule(): typeof tsModule;
interface SimpleTypeBaseOptions {
}
interface SimpleTypeComparisonOptions extends SimpleTypeBaseOptions {
    strict?: boolean;
    strictNullChecks?: boolean;
    strictFunctionTypes?: boolean;
    noStrictGenericChecks?: boolean;
    isAssignable?: (typeA: SimpleType, typeB: SimpleType, options: SimpleTypeComparisonOptions) => boolean | undefined | void;
    debug?: boolean;
    debugLog?: (text: string) => void;
    cache?: WeakMap<SimpleType, WeakMap<SimpleType, boolean>>;
    maxDepth?: number;
    maxOps?: number;
}
interface SimpleTypeKindComparisonOptions extends SimpleTypeBaseOptions {
    matchAny?: boolean;
}
/**
 * Tests a type is assignable to a primitive type.
 * @param type The type to test.
 * @param options
 */
declare function isAssignableToPrimitiveType(type: SimpleType): boolean;
declare function isAssignableToPrimitiveType(type: Type | SimpleType, checker: TypeChecker): boolean;
/**
 * Tests if "typeA = typeB" in strict mode.
 * @param typeA - Type A
 * @param typeB - Type B
 * @param checkerOrOptions
 * @param options
 */
declare function isAssignableToType(typeA: SimpleType, typeB: SimpleType, options?: SimpleTypeComparisonOptions): boolean;
declare function isAssignableToType(typeA: SimpleType | Type | Node, typeB: SimpleType | Type | Node, checker: TypeChecker | Program, options?: SimpleTypeComparisonOptions): boolean;
declare function isAssignableToType(typeA: Type | Node, typeB: Type | Node, checker: TypeChecker | Program, options?: SimpleTypeComparisonOptions): boolean;
declare function isAssignableToType(typeA: Type | Node | SimpleType, typeB: Type | Node | SimpleType, checker: Program | TypeChecker, options?: SimpleTypeComparisonOptions): boolean;
/**
 * Tests if a type is assignable to a value.
 * Tests "type = value" in strict mode.
 * @param type The type to test.
 * @param value The value to test.
 */
declare function isAssignableToValue(type: SimpleType, value: unknown): boolean;
declare function isAssignableToValue(type: SimpleType | Type | Node, value: unknown, checker: TypeChecker | Program): boolean;
/**
 * Checks if a simple type kind is assignable to a type.
 * @param type The type to check
 * @param kind The simple type kind to check
 * @param kind The simple type kind to check
 * @param checker TypeCHecker if type is a typescript type
 * @param options Options
 */
declare function isAssignableToSimpleTypeKind(type: SimpleType, kind: SimpleTypeKind | SimpleTypeKind[], options?: SimpleTypeKindComparisonOptions): boolean;
declare function isAssignableToSimpleTypeKind(type: Type | SimpleType, kind: SimpleTypeKind | SimpleTypeKind[], checker: TypeChecker, options?: SimpleTypeKindComparisonOptions): boolean;
interface ToSimpleTypeOptions {
    eager?: boolean;
    cache?: WeakMap<Type, SimpleType>;
}
/**
 * Converts a Typescript type to a "SimpleType"
 * @param type The type to convert.
 * @param checker
 * @param options
 */
declare function toSimpleType(type: SimpleType, checker?: TypeChecker, options?: ToSimpleTypeOptions): SimpleType;
declare function toSimpleType(type: Node, checker: TypeChecker, options?: ToSimpleTypeOptions): SimpleType;
declare function toSimpleType(type: Type, checker: TypeChecker, options?: ToSimpleTypeOptions): SimpleType;
declare function toSimpleType(type: Type | Node | SimpleType, checker: TypeChecker, options?: ToSimpleTypeOptions): SimpleType;
/**
 * Returns a string representation of a given type.
 * @param simpleType
 */
declare function typeToString(simpleType: SimpleType): string;
declare function typeToString(type: SimpleType | Type, checker: TypeChecker): string;
type SerializedSimpleTypeWithRef<ST = SimpleType> = {
    [key in keyof ST]: ST[key] extends SimpleType ? string : SerializedSimpleTypeWithRef<ST[key]>;
};
interface SerializedSimpleType {
    typeMap: Record<number, SerializedSimpleTypeWithRef>;
    type: number;
}
/**
 * Deserialize a serialized type into a SimpleType
 * @param serializedSimpleType
 */
declare function deserializeSimpleType(serializedSimpleType: SerializedSimpleType): SimpleType;
/**
 * Serialize a SimpleType
 * @param simpleType
 */
declare function serializeSimpleType(simpleType: SimpleType): SerializedSimpleType;
declare function validateType(type: SimpleType, callback: (simpleType: SimpleType) => boolean | undefined | void): boolean;
export { SimpleTypeKind, SimpleTypeModifierKind, SimpleTypeBase, SimpleTypeBigIntLiteral, SimpleTypeStringLiteral, SimpleTypeNumberLiteral, SimpleTypeBooleanLiteral, SimpleTypeString, SimpleTypeNumber, SimpleTypeBoolean, SimpleTypeBigInt, SimpleTypeESSymbol, SimpleTypeESSymbolUnique, SimpleTypeNull, SimpleTypeNever, SimpleTypeUndefined, SimpleTypeAny, SimpleTypeUnknown, SimpleTypeVoid, SimpleTypeNonPrimitive, SimpleTypeEnumMember, SimpleTypeEnum, SimpleTypeUnion, SimpleTypeIntersection, SimpleTypeMember, SimpleTypeMemberNamed, SimpleTypeObjectTypeBase, SimpleTypeInterface, SimpleTypeClass, SimpleTypeObject, SimpleTypeFunctionParameter, SimpleTypeFunction, SimpleTypeMethod, SimpleTypeGenericArguments, SimpleTypeGenericParameter, SimpleTypeAlias, SimpleTypeTuple, SimpleTypeArray, SimpleTypeDate, SimpleTypePromise, SimpleType, SimpleTypeLiteral, LITERAL_TYPE_KINDS, isSimpleTypeLiteral, SimpleTypePrimitive, PRIMITIVE_TYPE_KINDS, isSimpleTypePrimitive, SIMPLE_TYPE_KINDS, isSimpleType, SimpleTypeKindMap, setTypescriptModule, getTypescriptModule, SimpleTypeBaseOptions, SimpleTypeComparisonOptions, SimpleTypeKindComparisonOptions, isAssignableToPrimitiveType, isAssignableToType, isAssignableToValue, isAssignableToSimpleTypeKind, ToSimpleTypeOptions, toSimpleType, typeToString, SerializedSimpleTypeWithRef, SerializedSimpleType, deserializeSimpleType, serializeSimpleType, validateType };
//# sourceMappingURL=index.cjs.d.ts.map