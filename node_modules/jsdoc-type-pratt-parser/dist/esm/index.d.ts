import { Node } from 'estree';

/**
 * A parse sub result that might not be a valid type expression on its own.
 */
type NonRootResult = RootResult | PropertyResult | ObjectFieldResult | JsdocObjectFieldResult | KeyValueResult | MappedTypeResult | IndexSignatureResult | TypeParameterResult | CallSignatureResult | ConstructorSignatureResult | MethodSignatureResult | IndexedAccessIndexResult | ComputedPropertyResult | ComputedMethodResult;
interface ObjectFieldResult {
    type: 'JsdocTypeObjectField';
    key: string | MappedTypeResult | IndexSignatureResult | ComputedPropertyResult | ComputedMethodResult;
    right: RootResult | undefined;
    optional: boolean;
    readonly: boolean;
    meta: {
        quote: QuoteStyle | undefined;
        postColonSpacing?: string;
        postKeySpacing?: string;
        postOptionalSpacing?: string;
    };
}
interface JsdocObjectFieldResult {
    type: 'JsdocTypeJsdocObjectField';
    left: RootResult;
    right: RootResult;
}
interface PropertyResult {
    type: 'JsdocTypeProperty';
    value: string;
    meta: {
        quote: QuoteStyle | undefined;
    };
}
/**
 * A key value pair represented by a `:`. Can occur as a named parameter of a {@link FunctionResult} or as an entry for
 * an {@link TupleResult}. Is a {@link NonRootResult}.
 */
interface KeyValueResult {
    type: 'JsdocTypeKeyValue';
    key: string;
    right: RootResult | undefined;
    optional: boolean;
    variadic: boolean;
    meta?: {
        postKeySpacing: string;
        postOptionalSpacing: string;
        postVariadicSpacing: string;
        postColonSpacing: string;
    };
}
interface IndexSignatureResult {
    type: 'JsdocTypeIndexSignature';
    key: string;
    right: RootResult;
}
interface MappedTypeResult {
    type: 'JsdocTypeMappedType';
    key: string;
    right: RootResult;
}
interface TypeParameterResult {
    type: 'JsdocTypeTypeParameter';
    defaultValue?: RootResult;
    name: NameResult;
    constraint?: RootResult;
    meta?: {
        defaultValueSpacing: string;
    };
}
interface CallSignatureResult {
    type: 'JsdocTypeCallSignature';
    parameters: Array<RootResult | KeyValueResult>;
    returnType: RootResult;
    typeParameters?: TypeParameterResult[];
    meta?: {
        parameterSpacing: string;
        typeParameterSpacing: string;
        postGenericSpacing: string;
        preReturnMarkerSpacing?: string;
        postReturnMarkerSpacing?: string;
    };
}
interface ConstructorSignatureResult {
    type: 'JsdocTypeConstructorSignature';
    parameters: Array<RootResult | KeyValueResult>;
    returnType: RootResult;
    typeParameters?: TypeParameterResult[];
    meta?: {
        parameterSpacing: string;
        typeParameterSpacing: string;
        postNewSpacing: string;
        postGenericSpacing: string;
        preReturnMarkerSpacing?: string;
        postReturnMarkerSpacing?: string;
    };
}
interface MethodSignatureResult {
    type: 'JsdocTypeMethodSignature';
    name: string;
    meta: {
        quote: QuoteStyle | undefined;
        parameterSpacing?: string;
        typeParameterSpacing?: string;
        postMethodNameSpacing?: string;
        postGenericSpacing?: string;
        preReturnMarkerSpacing?: string;
        postReturnMarkerSpacing?: string;
    };
    parameters: Array<RootResult | KeyValueResult>;
    returnType: RootResult;
    typeParameters?: TypeParameterResult[];
}
interface IndexedAccessIndexResult {
    type: 'JsdocTypeIndexedAccessIndex';
    right: RootResult;
}
interface ComputedPropertyResult {
    type: 'JsdocTypeComputedProperty';
    value: RootResult | Node;
}
interface ComputedMethodResult {
    type: 'JsdocTypeComputedMethod';
    value: RootResult | Node;
    optional: boolean;
    parameters: Array<RootResult | KeyValueResult>;
    returnType: RootResult;
    typeParameters?: TypeParameterResult[];
    meta?: {
        parameterSpacing: string;
        typeParameterSpacing: string;
        postGenericSpacing: string;
        preReturnMarkerSpacing?: string;
        postReturnMarkerSpacing?: string;
    };
}

/**
 * A parse result that corresponds to a valid type expression.
 */
type RootResult = NameResult | UnionResult | GenericResult | StringValueResult | NullResult | UndefinedResult | AnyResult | UnknownResult | FunctionResult | ObjectResult | NamePathResult | SymbolResult | TypeOfResult | KeyOfResult | ImportResult | TupleResult | SpecialNamePath | OptionalResult<RootResult> | NullableResult<RootResult> | NotNullableResult<RootResult> | VariadicResult<RootResult> | ParenthesisResult | IntersectionResult | NumberResult | PredicateResult | AssertsResult | ReadonlyArrayResult | AssertsPlainResult | ConditionalResult | TemplateLiteralResult;
type QuoteStyle = 'single' | 'double';
/**
 * `element` is optional.
 */
interface OptionalResult<T extends RootResult> {
    type: 'JsdocTypeOptional';
    element: T;
    meta: {
        position: 'prefix' | 'suffix';
    };
}
/**
 * A nullable type.
 */
interface NullableResult<T extends RootResult> {
    type: 'JsdocTypeNullable';
    element: T;
    meta: {
        position: 'prefix' | 'suffix';
    };
}
/**
 * A not nullable type.
 */
interface NotNullableResult<T extends RootResult> {
    type: 'JsdocTypeNotNullable';
    element: T;
    meta: {
        position: 'prefix' | 'suffix';
    };
}
/**
 * A rest or spread parameter. It can either occur in `@param` tags or as last parameter of a function,
 * or it is a spread tuple or object type and can occur inside these. For any mode that is not `jsdoc` this can
 * only occur in position `'suffix'`.
 */
interface VariadicResult<T extends RootResult> {
    type: 'JsdocTypeVariadic';
    element?: T;
    meta: {
        position: 'prefix' | 'suffix' | undefined;
        squareBrackets: boolean;
    };
}
/**
 * A type name.
 */
interface NameResult {
    type: 'JsdocTypeName';
    value: string;
}
/**
 * A type union.
 */
interface UnionResult {
    type: 'JsdocTypeUnion';
    elements: RootResult[];
    meta?: {
        spacing: string;
    };
}
/**
 * A generic type. The property `left` is the generic type that has `elements` as type values for its type parameters.
 * Array types that are written as `Type[]` always have the name `Array` as the `left` type and `elements` will contain
 * only one element (in this case the name `Type`). To differentiate `Type[]` and `Array<Type>` there is the meta
 * property
 * `brackets`.
 */
interface GenericResult {
    type: 'JsdocTypeGeneric';
    left: RootResult;
    elements: RootResult[];
    infer?: boolean;
    meta: {
        brackets: 'angle' | 'square';
        dot: boolean;
        elementSpacing?: string;
    };
}
/**
 * A string value as a type.
 */
interface StringValueResult {
    type: 'JsdocTypeStringValue';
    value: string;
    meta: {
        quote: QuoteStyle;
    };
}
/**
 * The `null` type.
 */
interface NullResult {
    type: 'JsdocTypeNull';
}
/**
 * The `undefined` type.
 */
interface UndefinedResult {
    type: 'JsdocTypeUndefined';
}
/**
 * The `any` type, represented by `*` (`any` is parsed as a name).
 */
interface AnyResult {
    type: 'JsdocTypeAny';
}
/**
 * The unknown type, represented by `?` (`unknown` is parsed as a name).
 */
interface UnknownResult {
    type: 'JsdocTypeUnknown';
}
/**
 * A function type. Has `parameters` which can be named, if the grammar supports it. Some grammars only allow named
 * `this` and `new` parameters. Named parameters are returned as {@link KeyValueResult}s. It can have a `returnType`.
 * It can be a normal function type or an arrow, which is indicated by `arrow`. If `parenthesis` is false, it is any
 * kind of function without specified parameters or return type.
 */
interface FunctionResult {
    type: 'JsdocTypeFunction';
    parameters: Array<RootResult | KeyValueResult>;
    returnType?: RootResult;
    constructor: boolean;
    arrow: boolean;
    parenthesis: boolean;
    typeParameters?: TypeParameterResult[];
    meta?: {
        parameterSpacing: string;
        typeParameterSpacing: string;
        preReturnMarkerSpacing: string;
        postReturnMarkerSpacing: string;
        postGenericSpacing?: string;
    };
}
/**
 * An object type. Contains entries which can be {@link KeyValueResult}s or {@link NameResult}s. In most grammars the
 * keys need to be {@link NameResult}s. In some grammars it possible that an entry is only a {@link RootResult} or a
 * {@link NumberResult} without a key. The separator is `'comma'` by default.
 */
interface ObjectResult {
    type: 'JsdocTypeObject';
    elements: Array<ObjectFieldResult | JsdocObjectFieldResult | CallSignatureResult | ConstructorSignatureResult | MethodSignatureResult | ComputedPropertyResult | ComputedMethodResult>;
    meta: {
        separator: 'comma' | 'semicolon' | 'linebreak' | 'comma-and-linebreak' | 'semicolon-and-linebreak' | undefined;
        separatorForSingleObjectField?: boolean;
        trailingPunctuation?: boolean;
        propertyIndent?: string;
    };
}
type SpecialNamePathType = 'module' | 'event' | 'external';
/**
 * A module type. Often this is a `left` type of {@link NamePathResult}.
 */
interface SpecialNamePath<Type extends SpecialNamePathType = SpecialNamePathType> {
    type: 'JsdocTypeSpecialNamePath';
    value: string;
    specialType: Type;
    meta: {
        quote: QuoteStyle | undefined;
    };
}
/**
 * A name path type. This can be a property path separated by `.` or an inner or static member (`~`, `#`).
 */
interface NamePathResult {
    type: 'JsdocTypeNamePath';
    left: RootResult;
    right: PropertyResult | SpecialNamePath<'event'> | IndexedAccessIndexResult;
    pathType: 'inner' | 'instance' | 'property' | 'property-brackets';
}
/**
 * A symbol type. Only available in `jsdoc` mode.
 */
interface SymbolResult {
    type: 'JsdocTypeSymbol';
    value: string;
    element?: NumberResult | NameResult | VariadicResult<NameResult>;
}
/**
 * A typeof type. The `element` normally should be a name.
 */
interface TypeOfResult {
    type: 'JsdocTypeTypeof';
    element: RootResult;
}
/**
 * A keyof type. The `element` normally should be a name.
 */
interface KeyOfResult {
    type: 'JsdocTypeKeyof';
    element: RootResult;
}
/**
 * An import type. The `element` is {@link StringValueResult} representing the path. Often the `left` side of an
 * {@link NamePathResult}.
 */
interface ImportResult {
    type: 'JsdocTypeImport';
    element: StringValueResult;
}
/**
 * A tuple type containing multiple `elements`.
 */
interface TupleResult {
    type: 'JsdocTypeTuple';
    elements: RootResult[] | KeyValueResult[];
    meta?: {
        elementSpacing: string;
    };
}
/**
 * A type enclosed in parenthesis. Often {@link UnionResult}s ot {@link IntersectionResult}s.
 */
interface ParenthesisResult {
    type: 'JsdocTypeParenthesis';
    element: RootResult;
}
/**
 * An intersection type.
 */
interface IntersectionResult {
    type: 'JsdocTypeIntersection';
    elements: RootResult[];
}
/**
 * A number. Can be the key of an {@link ObjectResult} entry or the parameter of a {@link SymbolResult}.
 * Is a {@link NonRootResult}.
 */
interface NumberResult {
    type: 'JsdocTypeNumber';
    value: number;
}
/**
 * A typescript predicate. Is used in return annotations like this: `@return {x is string}`.
 */
interface PredicateResult {
    type: 'JsdocTypePredicate';
    left: NameResult;
    right: RootResult;
}
/**
 * An asserts result. Is used like this: `@return {asserts foo is Bar}`
 */
interface AssertsResult {
    type: 'JsdocTypeAsserts';
    left: NameResult;
    right: RootResult;
}
/**
 * A TypeScript readonly modifier. Is used like this: `readonly string[]`.
 */
interface ReadonlyArrayResult {
    type: 'JsdocTypeReadonlyArray';
    element: RootResult;
}
/**
 * An asserts result without `is`. Is used like this: `@return {asserts foo}`
 */
interface AssertsPlainResult {
    type: 'JsdocTypeAssertsPlain';
    element: NameResult;
}
/**
 * A TypeScript conditional. Is used like this: `A extends B ? C : D`.
 */
interface ConditionalResult {
    type: 'JsdocTypeConditional';
    checksType: RootResult;
    extendsType: RootResult;
    trueType: RootResult;
    falseType: RootResult;
}
/**
 * A TypeScript template literal. Is used like: `\`someText${someType}\``
 */
interface TemplateLiteralResult {
    type: 'JsdocTypeTemplateLiteral';
    literals: string[];
    interpolations: RootResult[];
}

type ParseMode = 'closure' | 'jsdoc' | 'typescript';
/**
 * This function parses the given expression in the given mode and produces a {@link RootResult}.
 * @param expression
 * @param mode
 */
declare function parse(expression: string, mode: ParseMode, { module, strictMode, asyncFunctionBody, classContext, computedPropertyParser }?: {
    module?: boolean;
    strictMode?: boolean;
    asyncFunctionBody?: boolean;
    classContext?: boolean;
    computedPropertyParser?: (text: string, options?: any) => unknown;
}): RootResult;
/**
 * This function tries to parse the given expression in multiple modes and returns the first successful
 * {@link RootResult}. By default it tries `'typescript'`, `'closure'` and `'jsdoc'` in this order. If
 * no mode was successful it throws the error that was produced by the last parsing attempt.
 * @param expression
 * @param modes
 */
declare function tryParse(expression: string, modes?: ParseMode[], { module, strictMode, asyncFunctionBody, classContext, }?: {
    module?: boolean;
    strictMode?: boolean;
    asyncFunctionBody?: boolean;
    classContext?: boolean;
}): RootResult;
/**
 * This function parses the given expression in the given mode and produces a name path.
 * @param expression
 * @param mode
 */
declare function parseNamePath(expression: string, mode: ParseMode, { includeSpecial }?: {
    includeSpecial?: boolean;
}): RootResult;
/**
 * This function parses the given expression in the given mode and produces a name.
 * @param expression
 * @param mode
 */
declare function parseName(expression: string, mode: ParseMode): RootResult;

type TransformFunction<TransformResult> = (parseResult: NonRootResult) => TransformResult;
type TransformRule<TransformResult, InputType extends NonRootResult> = (parseResult: InputType, transform: TransformFunction<TransformResult>) => TransformResult;
type TransformRules<TransformResult> = {
    [P in NonRootResult as P['type']]: TransformRule<TransformResult, P>;
};
declare function transform<TransformResult>(rules: TransformRules<TransformResult>, parseResult: NonRootResult): TransformResult;

interface ModifiableResult {
    optional?: boolean;
    nullable?: boolean;
    repeatable?: boolean;
}
type CatharsisParseResult = CatharsisNameResult | CatharsisUnionResult | CatharsisGenericResult | CatharsisNullResult | CatharsisUndefinedResult | CatharsisAllResult | CatharsisUnknownResult | CatharsisFunctionResult | CatharsisRecordResult | CatharsisFieldResult;
type CatharsisNameResult = ModifiableResult & {
    type: 'NameExpression';
    name: string;
    reservedWord?: boolean;
};
type CatharsisUnionResult = ModifiableResult & {
    type: 'TypeUnion';
    elements: CatharsisParseResult[];
};
type CatharsisGenericResult = ModifiableResult & {
    type: 'TypeApplication';
    expression: CatharsisParseResult;
    applications: CatharsisParseResult[];
};
type CatharsisNullResult = ModifiableResult & {
    type: 'NullLiteral';
};
type CatharsisUndefinedResult = ModifiableResult & {
    type: 'UndefinedLiteral';
};
type CatharsisAllResult = ModifiableResult & {
    type: 'AllLiteral';
};
type CatharsisUnknownResult = ModifiableResult & {
    type: 'UnknownLiteral';
};
type CatharsisFunctionResult = ModifiableResult & {
    type: 'FunctionType';
    params: CatharsisParseResult[];
    result?: CatharsisParseResult;
    this?: CatharsisParseResult;
    new?: CatharsisParseResult;
};
type CatharsisFieldResult = ModifiableResult & {
    type: 'FieldType';
    key: CatharsisParseResult;
    value: CatharsisParseResult | undefined;
};
type CatharsisRecordResult = ModifiableResult & {
    type: 'RecordType';
    fields: CatharsisFieldResult[];
};
declare function catharsisTransform(result: RootResult): CatharsisParseResult;

type JtpResult = JtpNameResult | JtpNullableResult | JtpNotNullableResult | JtpOptionalResult | JtpVariadicResult | JtpTypeOfResult | JtpTupleResult | JtpKeyOfResult | JtpStringValueResult | JtpImportResult | JtpAnyResult | JtpUnknownResult | JtpFunctionResult | JtpGenericResult | JtpRecordEntryResult | JtpRecordResult | JtpMemberResult | JtpUnionResult | JtpParenthesisResult | JtpNamedParameterResult | JtpModuleResult | JtpFilePath | JtpIntersectionResult | JtpNumberResult;
type JtpQuoteStyle = 'single' | 'double' | 'none';
interface JtpNullableResult {
    type: 'NULLABLE';
    value: JtpResult;
    meta: {
        syntax: 'PREFIX_QUESTION_MARK' | 'SUFFIX_QUESTION_MARK';
    };
}
interface JtpNotNullableResult {
    type: 'NOT_NULLABLE';
    value: JtpResult;
    meta: {
        syntax: 'PREFIX_BANG' | 'SUFFIX_BANG';
    };
}
interface JtpOptionalResult {
    type: 'OPTIONAL';
    value: JtpResult;
    meta: {
        syntax: 'PREFIX_EQUAL_SIGN' | 'SUFFIX_EQUALS_SIGN' | 'SUFFIX_KEY_QUESTION_MARK';
    };
}
interface JtpVariadicResult {
    type: 'VARIADIC';
    value?: JtpResult;
    meta: {
        syntax: 'PREFIX_DOTS' | 'SUFFIX_DOTS' | 'ONLY_DOTS';
    };
}
interface JtpNameResult {
    type: 'NAME';
    name: string;
}
interface JtpTypeOfResult {
    type: 'TYPE_QUERY';
    name?: JtpResult;
}
interface JtpKeyOfResult {
    type: 'KEY_QUERY';
    value?: JtpResult;
}
interface JtpTupleResult {
    type: 'TUPLE';
    entries: JtpResult[];
}
interface JtpStringValueResult {
    type: 'STRING_VALUE';
    quoteStyle: JtpQuoteStyle;
    string: string;
}
interface JtpImportResult {
    type: 'IMPORT';
    path: JtpStringValueResult;
}
interface JtpAnyResult {
    type: 'ANY';
}
interface JtpUnknownResult {
    type: 'UNKNOWN';
}
interface JtpFunctionResult {
    type: 'FUNCTION' | 'ARROW';
    params: JtpResult[];
    returns: JtpResult | null;
    new: JtpResult | null;
    this?: JtpResult | null;
}
interface JtpGenericResult {
    type: 'GENERIC';
    subject: JtpResult;
    objects: JtpResult[];
    meta: {
        syntax: 'ANGLE_BRACKET' | 'ANGLE_BRACKET_WITH_DOT' | 'SQUARE_BRACKET';
    };
}
interface JtpRecordEntryResult {
    type: 'RECORD_ENTRY';
    key: string;
    quoteStyle: JtpQuoteStyle;
    value: JtpResult | null;
    readonly: false;
}
interface JtpRecordResult {
    type: 'RECORD';
    entries: JtpRecordEntryResult[];
}
interface JtpMemberResult {
    type: 'MEMBER' | 'INNER_MEMBER' | 'INSTANCE_MEMBER';
    owner: JtpResult;
    name: string;
    quoteStyle: JtpQuoteStyle;
    hasEventPrefix: boolean;
}
interface JtpUnionResult {
    type: 'UNION';
    left: JtpResult;
    right: JtpResult;
}
interface JtpIntersectionResult {
    type: 'INTERSECTION';
    left: JtpResult;
    right: JtpResult;
}
interface JtpParenthesisResult {
    type: 'PARENTHESIS';
    value: JtpResult;
}
interface JtpNamedParameterResult {
    type: 'NAMED_PARAMETER';
    name: string;
    typeName: JtpResult;
}
interface JtpModuleResult {
    type: 'MODULE';
    value: JtpResult;
}
interface JtpFilePath {
    type: 'FILE_PATH';
    quoteStyle: JtpQuoteStyle;
    path: string;
}
interface JtpNumberResult {
    type: 'NUMBER_VALUE';
    number: string;
}
declare function jtpTransform(result: RootResult): JtpResult;

declare function stringifyRules({ computedPropertyStringifier }?: {
    computedPropertyStringifier?: (node: Node, options?: any) => string;
}): TransformRules<string>;
declare function stringify(result: RootResult, stringificationRules?: TransformRules<string> | ((node: Node, options?: any) => string)): string;

declare function identityTransformRules(): TransformRules<NonRootResult>;

/**
 * A node visitor function.
 * @param node the visited node.
 * @param parentNode the parent node.
 * @param property the property on the parent node that contains the visited node. It can be the node itself or
 *  an array of nodes.
 */
type NodeVisitor = (node: NonRootResult, parentNode?: NonRootResult, property?: string, index?: number) => void;
/**
 * A function to traverse an AST. It traverses it depth first.
 * @param node the node to start traversing at.
 * @param onEnter node visitor function that will be called on entering the node. This corresponds to preorder traversing.
 * @param onLeave node visitor function that will be called on leaving the node. This corresponds to postorder traversing.
 */
declare function traverse(node: RootResult, onEnter?: NodeVisitor, onLeave?: NodeVisitor): void;

type VisitorKeys = {
    [P in NonRootResult as P['type']]: Array<keyof P>;
};
declare const visitorKeys: VisitorKeys;

export { type AnyResult, type AssertsPlainResult, type AssertsResult, type CallSignatureResult, type ComputedMethodResult, type ComputedPropertyResult, type ConditionalResult, type ConstructorSignatureResult, type FunctionResult, type GenericResult, type ImportResult, type IndexSignatureResult, type IndexedAccessIndexResult, type IntersectionResult, type JsdocObjectFieldResult, type KeyOfResult, type KeyValueResult, type MappedTypeResult, type MethodSignatureResult, type NamePathResult, type NameResult, type NodeVisitor, type NonRootResult, type NotNullableResult, type NullResult, type NullableResult, type NumberResult, type ObjectFieldResult, type ObjectResult, type OptionalResult, type ParenthesisResult, type ParseMode, type PredicateResult, type PropertyResult, type QuoteStyle, type ReadonlyArrayResult, type RootResult, type SpecialNamePath, type SpecialNamePathType, type StringValueResult, type SymbolResult, type TemplateLiteralResult, type TransformFunction, type TransformRule, type TransformRules, type TupleResult, type TypeOfResult, type TypeParameterResult, type UndefinedResult, type UnionResult, type UnknownResult, type VariadicResult, type VisitorKeys, catharsisTransform, identityTransformRules, jtpTransform, parse, parseName, parseNamePath, stringify, stringifyRules, transform, traverse, tryParse, visitorKeys };
