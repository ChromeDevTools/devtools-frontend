(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.jtpp = {}));
})(this, (function (exports) { 'use strict';

    function tokenToString(token) {
        if (token.text !== undefined && token.text !== '') {
            return `'${token.type}' with value '${token.text}'`;
        }
        else {
            return `'${token.type}'`;
        }
    }
    class NoParsletFoundError extends Error {
        constructor(token) {
            super(`No parslet found for token: ${tokenToString(token)}`);
            this.token = token;
            Object.setPrototypeOf(this, NoParsletFoundError.prototype);
        }
        getToken() {
            return this.token;
        }
    }
    class EarlyEndOfParseError extends Error {
        constructor(token) {
            super(`The parsing ended early. The next token was: ${tokenToString(token)}`);
            this.token = token;
            Object.setPrototypeOf(this, EarlyEndOfParseError.prototype);
        }
        getToken() {
            return this.token;
        }
    }
    class UnexpectedTypeError extends Error {
        constructor(result, message) {
            let error = `Unexpected type: '${result.type}'.`;
            if (message !== undefined) {
                error += ` Message: ${message}`;
            }
            super(error);
            Object.setPrototypeOf(this, UnexpectedTypeError.prototype);
        }
    }
    // export class UnexpectedTokenError extends Error {
    //   private expected: Token
    //   private found: Token
    //
    //   constructor (expected: Token, found: Token) {
    //     super(`The parsing ended early. The next token was: ${tokenToString(token)}`)
    //
    //     this.token = token
    //
    //     Object.setPrototypeOf(this, EarlyEndOfParseError.prototype)
    //   }
    //
    //   getToken() {
    //     return this.token
    //   }
    // }

    const baseNameTokens = [
        'module', 'keyof', 'event', 'external',
        'readonly', 'is',
        'typeof', 'in',
        'null', 'undefined', 'function', 'asserts', 'infer',
        'extends', 'import'
    ];
    const reservedWordsAsRootTSTypes = [
        'false',
        'null',
        'true',
        'void'
    ];
    const reservedWords$1 = {
        always: [
            'break',
            'case',
            'catch',
            'class',
            'const',
            'continue',
            'debugger',
            'default',
            'delete',
            'do',
            'else',
            'export',
            'extends',
            'false',
            'finally',
            'for',
            'function',
            'if',
            'import',
            'in',
            'instanceof',
            'new',
            'null',
            'return',
            'super',
            'switch',
            'this',
            'throw',
            'true',
            'try',
            'typeof',
            'var',
            'void',
            'while',
            'with'
        ],
        strictMode: [
            'let',
            'static',
            'yield'
        ],
        moduleOrAsyncFunctionBodies: [
            'await'
        ]
    };
    const futureReservedWords = {
        always: ['enum'],
        strictMode: [
            'implements',
            'interface',
            'package',
            'private',
            'protected',
            'public'
        ]
    };
    const strictModeNonIdentifiers = [
        'arguments',
        'eval'
    ];

    function assertResultIsNotReservedWord(parser, result) {
        let text;
        if (result.type === 'JsdocTypeName') {
            text = result.value;
        }
        else if (result.type === 'JsdocTypeParenthesis') {
            let res = result;
            while (res.type === 'JsdocTypeParenthesis') {
                res = res.element;
            }
            if (res.type === 'JsdocTypeName') {
                text = res.value;
            }
            else {
                return result;
            }
        }
        else {
            return result;
        }
        if (reservedWords$1.always.includes(text) && !reservedWordsAsRootTSTypes.includes(text) &&
            (text !== 'this' || parser.classContext !== true)) {
            throw new Error(`Unexpected reserved keyword "${text}"`);
        }
        if (futureReservedWords.always.includes(text)) {
            throw new Error(`Unexpected future reserved keyword "${text}"`);
        }
        if ((parser.module !== undefined && parser.module) ||
            (parser.strictMode !== undefined && parser.strictMode)) {
            if (reservedWords$1.strictMode.includes(text)) {
                throw new Error(`Unexpected reserved keyword "${text}" for strict mode`);
            }
            if (futureReservedWords.strictMode.includes(text)) {
                throw new Error(`Unexpected future reserved keyword "${text}" for strict mode`);
            }
            if (strictModeNonIdentifiers.includes(text)) {
                throw new Error(`The item "${text}" is not an identifier in strict mode`);
            }
        }
        if ((parser.module !== undefined && parser.module) ||
            (parser.asyncFunctionBody !== undefined && parser.asyncFunctionBody)) {
            if (reservedWords$1.moduleOrAsyncFunctionBodies.includes(text)) {
                throw new Error(`Unexpected reserved keyword "${text}" for modules or async function bodies`);
            }
        }
        return result;
    }
    /**
     * Throws an error if the provided result is not a {@link RootResult}
     */
    function assertRootResult(result) {
        if (result === undefined) {
            throw new Error('Unexpected undefined');
        }
        if (result.type === 'JsdocTypeKeyValue' || result.type === 'JsdocTypeParameterList' ||
            result.type === 'JsdocTypeProperty' || result.type === 'JsdocTypeReadonlyProperty' ||
            result.type === 'JsdocTypeObjectField' || result.type === 'JsdocTypeJsdocObjectField' ||
            result.type === 'JsdocTypeIndexSignature' || result.type === 'JsdocTypeMappedType' ||
            result.type === 'JsdocTypeTypeParameter' || result.type === 'JsdocTypeCallSignature' ||
            result.type === 'JsdocTypeConstructorSignature' || result.type === 'JsdocTypeMethodSignature' ||
            result.type === 'JsdocTypeIndexedAccessIndex' || result.type === 'JsdocTypeComputedProperty' ||
            result.type === 'JsdocTypeComputedMethod') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }
    function assertPlainKeyValueOrRootResult(result) {
        if (result.type === 'JsdocTypeKeyValue') {
            return assertPlainKeyValueResult(result);
        }
        return assertRootResult(result);
    }
    function assertPlainKeyValueOrNameResult(result) {
        if (result.type === 'JsdocTypeName') {
            return result;
        }
        return assertPlainKeyValueResult(result);
    }
    function assertPlainKeyValueResult(result) {
        if (result.type !== 'JsdocTypeKeyValue') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }
    function assertNumberOrVariadicNameResult(result) {
        var _a;
        if (result.type === 'JsdocTypeVariadic') {
            if (((_a = result.element) === null || _a === void 0 ? void 0 : _a.type) === 'JsdocTypeName') {
                return result;
            }
            throw new UnexpectedTypeError(result);
        }
        if (result.type !== 'JsdocTypeNumber' && result.type !== 'JsdocTypeName') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }
    function assertArrayOrTupleResult(result) {
        if (result.type === 'JsdocTypeTuple') {
            return result;
        }
        if (result.type === 'JsdocTypeGeneric' && result.meta.brackets === 'square') {
            return result;
        }
        throw new UnexpectedTypeError(result);
    }
    function isSquaredProperty(result) {
        return result.type === 'JsdocTypeIndexSignature' || result.type === 'JsdocTypeMappedType';
    }

    // higher precedence = higher importance
    var Precedence;
    (function (Precedence) {
        Precedence[Precedence["ALL"] = 0] = "ALL";
        Precedence[Precedence["PARAMETER_LIST"] = 1] = "PARAMETER_LIST";
        Precedence[Precedence["OBJECT"] = 2] = "OBJECT";
        Precedence[Precedence["KEY_VALUE"] = 3] = "KEY_VALUE";
        Precedence[Precedence["INDEX_BRACKETS"] = 4] = "INDEX_BRACKETS";
        Precedence[Precedence["UNION"] = 5] = "UNION";
        Precedence[Precedence["INTERSECTION"] = 6] = "INTERSECTION";
        Precedence[Precedence["PREFIX"] = 7] = "PREFIX";
        Precedence[Precedence["INFIX"] = 8] = "INFIX";
        Precedence[Precedence["TUPLE"] = 9] = "TUPLE";
        Precedence[Precedence["SYMBOL"] = 10] = "SYMBOL";
        Precedence[Precedence["OPTIONAL"] = 11] = "OPTIONAL";
        Precedence[Precedence["NULLABLE"] = 12] = "NULLABLE";
        Precedence[Precedence["KEY_OF_TYPE_OF"] = 13] = "KEY_OF_TYPE_OF";
        Precedence[Precedence["FUNCTION"] = 14] = "FUNCTION";
        Precedence[Precedence["ARROW"] = 15] = "ARROW";
        Precedence[Precedence["ARRAY_BRACKETS"] = 16] = "ARRAY_BRACKETS";
        Precedence[Precedence["GENERIC"] = 17] = "GENERIC";
        Precedence[Precedence["NAME_PATH"] = 18] = "NAME_PATH";
        Precedence[Precedence["PARENTHESIS"] = 19] = "PARENTHESIS";
        Precedence[Precedence["SPECIAL_TYPES"] = 20] = "SPECIAL_TYPES";
    })(Precedence || (Precedence = {}));

    class Parser {
        constructor(grammar, lexer, baseParser, { module, strictMode, asyncFunctionBody, classContext, externalParsers } = {}) {
            this.grammar = grammar;
            this._lexer = lexer;
            this.baseParser = baseParser;
            this.externalParsers = externalParsers;
            this.module = module;
            this.strictMode = strictMode;
            this.asyncFunctionBody = asyncFunctionBody;
            this.classContext = classContext;
        }
        get lexer() {
            return this._lexer;
        }
        /**
         * Parses a given string and throws an error if the parse ended before the end of the string.
         */
        parse() {
            const result = this.parseType(Precedence.ALL);
            if (this.lexer.current.type !== 'EOF') {
                throw new EarlyEndOfParseError(this.lexer.current);
            }
            return result;
        }
        /**
         * Parses with the current lexer and asserts that the result is a {@link RootResult}.
         */
        parseType(precedence) {
            return assertRootResult(this.parseIntermediateType(precedence));
        }
        /**
         * The main parsing function. First it tries to parse the current state in the prefix step, and then it continues
         * to parse the state in the infix step.
         */
        parseIntermediateType(precedence) {
            const result = this.tryParslets(null, precedence);
            if (result === null) {
                throw new NoParsletFoundError(this.lexer.current);
            }
            return this.parseInfixIntermediateType(result, precedence);
        }
        /**
         * In the infix parsing step the parser continues to parse the current state with all parslets until none returns
         * a result.
         */
        parseInfixIntermediateType(left, precedence) {
            let result = this.tryParslets(left, precedence);
            while (result !== null) {
                left = result;
                result = this.tryParslets(left, precedence);
            }
            return left;
        }
        /**
         * Tries to parse the current state with all parslets in the grammar and returns the first non null result.
         */
        tryParslets(left, precedence) {
            for (const parslet of this.grammar) {
                const result = parslet(this, precedence, left);
                if (result !== null) {
                    return result;
                }
            }
            return null;
        }
        /**
         * If the given type equals the current type of the {@link Lexer} advance the lexer. Return true if the lexer was
         * advanced.
         */
        consume(types) {
            if (!Array.isArray(types)) {
                types = [types];
            }
            if (types.includes(this.lexer.current.type)) {
                this._lexer = this.lexer.advance();
                return true;
            }
            else {
                return false;
            }
        }
        acceptLexerState(parser) {
            this._lexer = parser.lexer;
        }
    }

    function isQuestionMarkUnknownType(next) {
        return next === '}' || next === 'EOF' || next === '|' || next === ',' || next === ')' || next === '>';
    }

    const nullableParslet = (parser, precedence, left) => {
        const type = parser.lexer.current.type;
        const next = parser.lexer.next.type;
        const accept = ((left == null) && type === '?' && !isQuestionMarkUnknownType(next)) ||
            ((left != null) && type === '?');
        if (!accept) {
            return null;
        }
        parser.consume('?');
        if (left == null) {
            return {
                type: 'JsdocTypeNullable',
                element: parser.parseType(Precedence.NULLABLE),
                meta: {
                    position: 'prefix'
                }
            };
        }
        else {
            return {
                type: 'JsdocTypeNullable',
                element: assertRootResult(left),
                meta: {
                    position: 'suffix'
                }
            };
        }
    };

    function composeParslet(options) {
        const parslet = (parser, curPrecedence, left) => {
            const type = parser.lexer.current.type;
            const next = parser.lexer.next.type;
            if (left === null) {
                if ('parsePrefix' in options) {
                    if (options.accept(type, next)) {
                        return options.parsePrefix(parser);
                    }
                }
            }
            else {
                if ('parseInfix' in options) {
                    if (options.precedence > curPrecedence && options.accept(type, next)) {
                        return options.parseInfix(parser, left);
                    }
                }
            }
            return null;
        };
        // for debugging
        Object.defineProperty(parslet, 'name', {
            value: options.name
        });
        return parslet;
    }

    const optionalParslet = composeParslet({
        name: 'optionalParslet',
        accept: type => type === '=',
        precedence: Precedence.OPTIONAL,
        parsePrefix: parser => {
            parser.consume('=');
            return {
                type: 'JsdocTypeOptional',
                element: parser.parseType(Precedence.OPTIONAL),
                meta: {
                    position: 'prefix'
                }
            };
        },
        parseInfix: (parser, left) => {
            parser.consume('=');
            return {
                type: 'JsdocTypeOptional',
                element: assertRootResult(left),
                meta: {
                    position: 'suffix'
                }
            };
        }
    });

    const numberParslet = composeParslet({
        name: 'numberParslet',
        accept: type => type === 'Number',
        parsePrefix: parser => {
            const value = parseFloat(parser.lexer.current.text);
            parser.consume('Number');
            return {
                type: 'JsdocTypeNumber',
                value
            };
        }
    });

    const parenthesisParslet = composeParslet({
        name: 'parenthesisParslet',
        accept: type => type === '(',
        parsePrefix: parser => {
            parser.consume('(');
            if (parser.consume(')')) {
                return {
                    type: 'JsdocTypeParameterList',
                    elements: []
                };
            }
            const result = parser.parseIntermediateType(Precedence.ALL);
            if (!parser.consume(')')) {
                throw new Error('Unterminated parenthesis');
            }
            if (result.type === 'JsdocTypeParameterList') {
                return result;
            }
            else if (result.type === 'JsdocTypeKeyValue') {
                return {
                    type: 'JsdocTypeParameterList',
                    elements: [result]
                };
            }
            return {
                type: 'JsdocTypeParenthesis',
                element: assertRootResult(result)
            };
        }
    });

    const specialTypesParslet = composeParslet({
        name: 'specialTypesParslet',
        accept: (type, next) => (type === '?' && isQuestionMarkUnknownType(next)) ||
            type === 'null' || type === 'undefined' || type === '*',
        parsePrefix: parser => {
            if (parser.consume('null')) {
                return {
                    type: 'JsdocTypeNull'
                };
            }
            if (parser.consume('undefined')) {
                return {
                    type: 'JsdocTypeUndefined'
                };
            }
            if (parser.consume('*')) {
                return {
                    type: 'JsdocTypeAny'
                };
            }
            if (parser.consume('?')) {
                return {
                    type: 'JsdocTypeUnknown'
                };
            }
            throw new Error('Unacceptable token: ' + parser.lexer.current.text);
        }
    });

    const notNullableParslet = composeParslet({
        name: 'notNullableParslet',
        accept: type => type === '!',
        precedence: Precedence.NULLABLE,
        parsePrefix: parser => {
            parser.consume('!');
            return {
                type: 'JsdocTypeNotNullable',
                element: parser.parseType(Precedence.NULLABLE),
                meta: {
                    position: 'prefix'
                }
            };
        },
        parseInfix: (parser, left) => {
            parser.consume('!');
            return {
                type: 'JsdocTypeNotNullable',
                element: assertRootResult(left),
                meta: {
                    position: 'suffix'
                }
            };
        }
    });

    function createParameterListParslet({ allowTrailingComma }) {
        return composeParslet({
            name: 'parameterListParslet',
            accept: type => type === ',',
            precedence: Precedence.PARAMETER_LIST,
            parseInfix: (parser, left) => {
                const elements = [
                    assertPlainKeyValueOrRootResult(left)
                ];
                parser.consume(',');
                do {
                    try {
                        const next = parser.parseIntermediateType(Precedence.PARAMETER_LIST);
                        elements.push(assertPlainKeyValueOrRootResult(next));
                    }
                    catch (e) {
                        if (e instanceof NoParsletFoundError) {
                            break;
                        }
                        else {
                            throw e;
                        }
                    }
                } while (parser.consume(','));
                if (elements.length > 0 && elements.slice(0, -1).some(e => e.type === 'JsdocTypeVariadic')) {
                    throw new Error('Only the last parameter may be a rest parameter');
                }
                return {
                    type: 'JsdocTypeParameterList',
                    elements
                };
            }
        });
    }

    const genericParslet = composeParslet({
        name: 'genericParslet',
        accept: (type, next) => type === '<' || (type === '.' && next === '<'),
        precedence: Precedence.GENERIC,
        parseInfix: (parser, left) => {
            const dot = parser.consume('.');
            parser.consume('<');
            const objects = [];
            let infer = false;
            if (parser.consume('infer')) {
                infer = true;
                const left = parser.parseIntermediateType(Precedence.SYMBOL);
                if (left.type !== 'JsdocTypeName') {
                    throw new UnexpectedTypeError(left, 'A typescript infer always has to have a name.');
                }
                objects.push(left);
            }
            else {
                do {
                    objects.push(parser.parseType(Precedence.PARAMETER_LIST));
                } while (parser.consume(','));
            }
            if (!parser.consume('>')) {
                throw new Error('Unterminated generic parameter list');
            }
            return Object.assign(Object.assign({ type: 'JsdocTypeGeneric', left: assertRootResult(left), elements: objects }, (infer ? { infer: true } : {})), { meta: {
                    brackets: 'angle',
                    dot
                } });
        }
    });

    const unionParslet = composeParslet({
        name: 'unionParslet',
        accept: type => type === '|',
        precedence: Precedence.UNION,
        parseInfix: (parser, left) => {
            parser.consume('|');
            const elements = [];
            do {
                elements.push(parser.parseType(Precedence.UNION));
            } while (parser.consume('|'));
            return {
                type: 'JsdocTypeUnion',
                elements: [
                    assertResultIsNotReservedWord(parser, assertRootResult(left)),
                    ...elements.map((element) => assertResultIsNotReservedWord(parser, element))
                ]
            };
        }
    });

    const baseGrammar = [
        nullableParslet,
        optionalParslet,
        numberParslet,
        parenthesisParslet,
        specialTypesParslet,
        notNullableParslet,
        createParameterListParslet({
            allowTrailingComma: true
        }),
        genericParslet,
        unionParslet,
        optionalParslet
    ];

    function createNamePathParslet({ allowSquareBracketsOnAnyType, allowJsdocNamePaths, pathGrammar }) {
        return function namePathParslet(parser, precedence, left) {
            if ((left == null) || precedence >= Precedence.NAME_PATH) {
                return null;
            }
            const type = parser.lexer.current.type;
            const next = parser.lexer.next.type;
            const accept = (type === '.' && next !== '<') ||
                (type === '[' && (allowSquareBracketsOnAnyType || left.type === 'JsdocTypeName')) ||
                (allowJsdocNamePaths && (type === '~' || type === '#'));
            if (!accept) {
                return null;
            }
            let pathType;
            let brackets = false;
            if (parser.consume('.')) {
                pathType = 'property';
            }
            else if (parser.consume('[')) {
                pathType = 'property-brackets';
                brackets = true;
            }
            else if (parser.consume('~')) {
                pathType = 'inner';
            }
            else {
                parser.consume('#');
                pathType = 'instance';
            }
            const pathParser = brackets && allowSquareBracketsOnAnyType
                ? parser
                : pathGrammar !== null
                    ? new Parser(pathGrammar, parser.lexer, parser)
                    : parser;
            const parsed = pathParser.parseType(Precedence.NAME_PATH);
            parser.acceptLexerState(pathParser);
            let right;
            switch (parsed.type) {
                case 'JsdocTypeName':
                    right = {
                        type: 'JsdocTypeProperty',
                        value: parsed.value,
                        meta: {
                            quote: undefined
                        }
                    };
                    break;
                case 'JsdocTypeNumber':
                    right = {
                        type: 'JsdocTypeProperty',
                        value: parsed.value.toString(10),
                        meta: {
                            quote: undefined
                        }
                    };
                    break;
                case 'JsdocTypeStringValue':
                    right = {
                        type: 'JsdocTypeProperty',
                        value: parsed.value,
                        meta: {
                            quote: parsed.meta.quote
                        }
                    };
                    break;
                case 'JsdocTypeSpecialNamePath':
                    if (parsed.specialType === 'event') {
                        right = parsed;
                    }
                    else {
                        throw new UnexpectedTypeError(parsed, 'Type \'JsdocTypeSpecialNamePath\' is only allowed with specialType \'event\'');
                    }
                    break;
                default:
                    if (!brackets || !allowSquareBracketsOnAnyType) {
                        throw new UnexpectedTypeError(parsed, 'Expecting \'JsdocTypeName\', \'JsdocTypeNumber\', \'JsdocStringValue\' or \'JsdocTypeSpecialNamePath\'');
                    }
                    right = {
                        type: 'JsdocTypeIndexedAccessIndex',
                        right: parsed
                    };
            }
            if (brackets && !parser.consume(']')) {
                const token = parser.lexer.current;
                throw new Error(`Unterminated square brackets. Next token is '${token.type}' ` +
                    `with text '${token.text}'`);
            }
            return {
                type: 'JsdocTypeNamePath',
                left: assertRootResult(left),
                right,
                pathType
            };
        };
    }

    function createNameParslet({ allowedAdditionalTokens }) {
        return composeParslet({
            name: 'nameParslet',
            accept: type => type === 'Identifier' || type === 'this' || type === 'new' || allowedAdditionalTokens.includes(type),
            parsePrefix: parser => {
                const { type, text } = parser.lexer.current;
                parser.consume(type);
                return {
                    type: 'JsdocTypeName',
                    value: text
                };
            }
        });
    }

    const stringValueParslet = composeParslet({
        name: 'stringValueParslet',
        accept: type => type === 'StringValue',
        parsePrefix: parser => {
            const text = parser.lexer.current.text;
            parser.consume('StringValue');
            return {
                type: 'JsdocTypeStringValue',
                value: text.slice(1, -1),
                meta: {
                    quote: text.startsWith('\'') ? 'single' : 'double'
                }
            };
        }
    });

    function createSpecialNamePathParslet({ pathGrammar, allowedTypes }) {
        return composeParslet({
            name: 'specialNamePathParslet',
            accept: type => allowedTypes.includes(type),
            parsePrefix: parser => {
                const type = parser.lexer.current.type;
                parser.consume(type);
                if (!parser.consume(':')) {
                    return {
                        type: 'JsdocTypeName',
                        value: type
                    };
                }
                let result;
                let token = parser.lexer.current;
                if (parser.consume('StringValue')) {
                    result = {
                        type: 'JsdocTypeSpecialNamePath',
                        value: token.text.slice(1, -1),
                        specialType: type,
                        meta: {
                            quote: token.text.startsWith('\'') ? 'single' : 'double'
                        }
                    };
                }
                else {
                    let value = '';
                    const allowed = ['Identifier', '@', '/'];
                    while (allowed.some(type => parser.consume(type))) {
                        value += token.text;
                        token = parser.lexer.current;
                    }
                    result = {
                        type: 'JsdocTypeSpecialNamePath',
                        value,
                        specialType: type,
                        meta: {
                            quote: undefined
                        }
                    };
                }
                const moduleParser = new Parser(pathGrammar, parser.lexer, parser);
                const moduleResult = moduleParser.parseInfixIntermediateType(result, Precedence.ALL);
                parser.acceptLexerState(moduleParser);
                return assertRootResult(moduleResult);
            }
        });
    }

    const basePathGrammar = [
        createNameParslet({
            allowedAdditionalTokens: ['external', 'module']
        }),
        stringValueParslet,
        numberParslet,
        createNamePathParslet({
            allowSquareBracketsOnAnyType: false,
            allowJsdocNamePaths: true,
            pathGrammar: null
        })
    ];
    const pathGrammar = [
        ...basePathGrammar,
        createSpecialNamePathParslet({
            allowedTypes: ['event'],
            pathGrammar: basePathGrammar
        }),
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        })
    ];

    function getParameters(value) {
        let parameters = [];
        if (value.type === 'JsdocTypeParameterList') {
            parameters = value.elements;
        }
        else if (value.type === 'JsdocTypeParenthesis') {
            parameters = [value.element];
        }
        else {
            throw new UnexpectedTypeError(value);
        }
        return parameters.map(p => assertPlainKeyValueOrRootResult(p));
    }
    function getUnnamedParameters(value) {
        const parameters = getParameters(value);
        if (parameters.some(p => p.type === 'JsdocTypeKeyValue')) {
            throw new Error('No parameter should be named');
        }
        return parameters;
    }
    function createFunctionParslet({ allowNamedParameters, allowNoReturnType, allowWithoutParenthesis, allowNewAsFunctionKeyword }) {
        return composeParslet({
            name: 'functionParslet',
            accept: (type, next) => type === 'function' || (allowNewAsFunctionKeyword && type === 'new' && next === '('),
            parsePrefix: parser => {
                const newKeyword = parser.consume('new');
                parser.consume('function');
                const hasParenthesis = parser.lexer.current.type === '(';
                if (!hasParenthesis) {
                    if (!allowWithoutParenthesis) {
                        throw new Error('function is missing parameter list');
                    }
                    return {
                        type: 'JsdocTypeName',
                        value: 'function'
                    };
                }
                let result = {
                    type: 'JsdocTypeFunction',
                    parameters: [],
                    arrow: false,
                    constructor: newKeyword,
                    parenthesis: hasParenthesis
                };
                const value = parser.parseIntermediateType(Precedence.FUNCTION);
                if (allowNamedParameters === undefined) {
                    result.parameters = getUnnamedParameters(value);
                }
                else if (newKeyword && value.type === 'JsdocTypeFunction' && value.arrow) {
                    result = value;
                    result.constructor = true;
                    return result;
                }
                else {
                    result.parameters = getParameters(value);
                    for (const p of result.parameters) {
                        if (p.type === 'JsdocTypeKeyValue' && (!allowNamedParameters.includes(p.key))) {
                            throw new Error(`only allowed named parameters are ${allowNamedParameters.join(', ')} but got ${p.type}`);
                        }
                    }
                }
                if (parser.consume(':')) {
                    result.returnType = parser.parseType(Precedence.PREFIX);
                }
                return result;
            }
        });
    }

    function createVariadicParslet({ allowPostfix, allowEnclosingBrackets }) {
        return composeParslet({
            name: 'variadicParslet',
            accept: type => type === '...',
            precedence: Precedence.PREFIX,
            parsePrefix: parser => {
                parser.consume('...');
                const brackets = allowEnclosingBrackets && parser.consume('[');
                try {
                    const element = parser.parseType(Precedence.PREFIX);
                    if (brackets && !parser.consume(']')) {
                        throw new Error('Unterminated variadic type. Missing \']\'');
                    }
                    return {
                        type: 'JsdocTypeVariadic',
                        element: assertRootResult(element),
                        meta: {
                            position: 'prefix',
                            squareBrackets: brackets
                        }
                    };
                }
                catch (e) {
                    if (e instanceof NoParsletFoundError) {
                        if (brackets) {
                            throw new Error('Empty square brackets for variadic are not allowed.', {
                                cause: e
                            });
                        }
                        return {
                            type: 'JsdocTypeVariadic',
                            meta: {
                                position: undefined,
                                squareBrackets: false
                            }
                        };
                    }
                    else {
                        throw e;
                    }
                }
            },
            parseInfix: allowPostfix
                ? (parser, left) => {
                    parser.consume('...');
                    return {
                        type: 'JsdocTypeVariadic',
                        element: assertRootResult(left),
                        meta: {
                            position: 'suffix',
                            squareBrackets: false
                        }
                    };
                }
                : undefined
        });
    }

    const symbolParslet = composeParslet({
        name: 'symbolParslet',
        accept: type => type === '(',
        precedence: Precedence.SYMBOL,
        parseInfix: (parser, left) => {
            if (left.type !== 'JsdocTypeName') {
                throw new Error('Symbol expects a name on the left side. (Reacting on \'(\')');
            }
            parser.consume('(');
            const result = {
                type: 'JsdocTypeSymbol',
                value: left.value
            };
            if (!parser.consume(')')) {
                const next = parser.parseIntermediateType(Precedence.SYMBOL);
                result.element = assertNumberOrVariadicNameResult(next);
                if (!parser.consume(')')) {
                    throw new Error('Symbol does not end after value');
                }
            }
            return result;
        }
    });

    const arrayBracketsParslet = composeParslet({
        name: 'arrayBracketsParslet',
        precedence: Precedence.ARRAY_BRACKETS,
        accept: (type, next) => type === '[' && next === ']',
        parseInfix: (parser, left) => {
            parser.consume('[');
            parser.consume(']');
            return {
                type: 'JsdocTypeGeneric',
                left: {
                    type: 'JsdocTypeName',
                    value: 'Array'
                },
                elements: [
                    assertRootResult(left)
                ],
                meta: {
                    brackets: 'square',
                    dot: false
                }
            };
        }
    });

    function createObjectParslet({ signatureGrammar, objectFieldGrammar, allowKeyTypes }) {
        return composeParslet({
            name: 'objectParslet',
            accept: type => type === '{',
            parsePrefix: parser => {
                var _a;
                parser.consume('{');
                const result = {
                    type: 'JsdocTypeObject',
                    meta: {
                        separator: 'comma'
                    },
                    elements: []
                };
                if (!parser.consume('}')) {
                    let separator;
                    const fieldParser = new Parser(objectFieldGrammar, parser.lexer, parser, ((_a = parser.externalParsers) === null || _a === void 0 ? void 0 : _a.computedPropertyParser) !== undefined
                        ? {
                            externalParsers: {
                                computedPropertyParser: parser.externalParsers.computedPropertyParser
                            }
                        }
                        : undefined);
                    while (true) {
                        fieldParser.acceptLexerState(parser);
                        let field = fieldParser.parseIntermediateType(Precedence.OBJECT);
                        parser.acceptLexerState(fieldParser);
                        if (field === undefined && allowKeyTypes) {
                            field = parser.parseIntermediateType(Precedence.OBJECT);
                        }
                        let optional = false;
                        if (field.type === 'JsdocTypeNullable') {
                            optional = true;
                            field = field.element;
                        }
                        if (field.type === 'JsdocTypeNumber' || field.type === 'JsdocTypeName' || field.type === 'JsdocTypeStringValue') {
                            let quote;
                            if (field.type === 'JsdocTypeStringValue') {
                                quote = field.meta.quote;
                            }
                            result.elements.push({
                                type: 'JsdocTypeObjectField',
                                key: field.value.toString(),
                                right: undefined,
                                optional,
                                readonly: false,
                                meta: {
                                    quote
                                }
                            });
                        }
                        else if (signatureGrammar !== undefined &&
                            (field.type === 'JsdocTypeCallSignature' ||
                                field.type === 'JsdocTypeConstructorSignature' ||
                                field.type === 'JsdocTypeMethodSignature')) {
                            const signatureParser = new Parser([
                                ...signatureGrammar,
                                ...parser.grammar.flatMap((grammar) => {
                                    // We're supplying our own version
                                    if (grammar.name === 'keyValueParslet') {
                                        return [];
                                    }
                                    return [grammar];
                                })
                            ], parser.lexer, parser);
                            signatureParser.acceptLexerState(parser);
                            const params = signatureParser.parseIntermediateType(Precedence.OBJECT);
                            parser.acceptLexerState(signatureParser);
                            field.parameters = getParameters(params);
                            const returnType = parser.parseType(Precedence.OBJECT);
                            field.returnType = returnType;
                            result.elements.push(field);
                        }
                        else if (field.type === 'JsdocTypeObjectField' ||
                            field.type === 'JsdocTypeJsdocObjectField') {
                            result.elements.push(field);
                        }
                        else if (field.type === 'JsdocTypeReadonlyProperty' &&
                            field.element.type === 'JsdocTypeObjectField') {
                            if (typeof field.element.key === 'object' &&
                                field.element.key.type === 'JsdocTypeComputedMethod') {
                                throw new Error('Computed method may not be readonly');
                            }
                            field.element.readonly = true;
                            result.elements.push(field.element);
                        }
                        else {
                            throw new UnexpectedTypeError(field);
                        }
                        if (parser.lexer.current.startOfLine) {
                            separator !== null && separator !== void 0 ? separator : (separator = 'linebreak');
                            // Handle single stray comma/semi-colon
                            parser.consume(',') || parser.consume(';');
                        }
                        else if (parser.consume(',')) {
                            if (parser.lexer.current.startOfLine) {
                                separator = 'comma-and-linebreak';
                            }
                            else {
                                separator = 'comma';
                            }
                        }
                        else if (parser.consume(';')) {
                            if (parser.lexer.current.startOfLine) {
                                separator = 'semicolon-and-linebreak';
                            }
                            else {
                                separator = 'semicolon';
                            }
                        }
                        else {
                            break;
                        }
                        const type = parser.lexer.current.type;
                        if (type === '}') {
                            break;
                        }
                    }
                    result.meta.separator = separator !== null && separator !== void 0 ? separator : 'comma'; // TODO: use undefined here
                    if ((separator !== null && separator !== void 0 ? separator : '').endsWith('linebreak')) {
                        // TODO: Consume appropriate whitespace
                        result.meta.propertyIndent = '  ';
                    }
                    if (!parser.consume('}')) {
                        throw new Error('Unterminated record type. Missing \'}\'');
                    }
                }
                return result;
            }
        });
    }

    function createObjectFieldParslet({ allowSquaredProperties, allowKeyTypes, allowReadonly, allowOptional }) {
        return composeParslet({
            name: 'objectFieldParslet',
            precedence: Precedence.KEY_VALUE,
            accept: type => type === ':',
            parseInfix: (parser, left) => {
                var _a;
                let optional = false;
                let readonlyProperty = false;
                if (allowOptional && left.type === 'JsdocTypeNullable') {
                    optional = true;
                    left = left.element;
                }
                if (allowReadonly && left.type === 'JsdocTypeReadonlyProperty') {
                    readonlyProperty = true;
                    left = left.element;
                }
                /* c8 ignore next 2 -- Always has base parser? */
                // object parslet uses a special grammar and for the value we want to switch back to the parent
                const parentParser = (_a = parser.baseParser) !== null && _a !== void 0 ? _a : parser;
                parentParser.acceptLexerState(parser);
                if (left.type === 'JsdocTypeNumber' || left.type === 'JsdocTypeName' || left.type === 'JsdocTypeStringValue' ||
                    isSquaredProperty(left)) {
                    /* c8 ignore next 3 -- Guard */
                    if (isSquaredProperty(left) && !allowSquaredProperties) {
                        throw new UnexpectedTypeError(left);
                    }
                    parentParser.consume(':');
                    let quote;
                    if (left.type === 'JsdocTypeStringValue') {
                        quote = left.meta.quote;
                    }
                    const right = parentParser.parseType(Precedence.KEY_VALUE);
                    parser.acceptLexerState(parentParser);
                    return {
                        type: 'JsdocTypeObjectField',
                        /* c8 ignore next -- Guard; not needed anymore? */
                        key: isSquaredProperty(left) ? left : left.value.toString(),
                        right,
                        optional,
                        readonly: readonlyProperty,
                        meta: {
                            quote
                        }
                    };
                }
                else {
                    if (!allowKeyTypes) {
                        throw new UnexpectedTypeError(left);
                    }
                    parentParser.consume(':');
                    const right = parentParser.parseType(Precedence.KEY_VALUE);
                    parser.acceptLexerState(parentParser);
                    return {
                        type: 'JsdocTypeJsdocObjectField',
                        left: assertRootResult(left),
                        right
                    };
                }
            }
        });
    }

    function createKeyValueParslet({ allowOptional, allowVariadic, acceptParameterList }) {
        return composeParslet({
            name: 'keyValueParslet',
            precedence: Precedence.KEY_VALUE,
            accept: type => type === ':',
            parseInfix: (parser, left) => {
                let optional = false;
                let variadic = false;
                if (allowOptional && left.type === 'JsdocTypeNullable') {
                    optional = true;
                    left = left.element;
                }
                if (allowVariadic && left.type === 'JsdocTypeVariadic' && left.element !== undefined) {
                    variadic = true;
                    left = left.element;
                }
                if (left.type !== 'JsdocTypeName') {
                    if (acceptParameterList !== undefined && left.type === 'JsdocTypeParameterList') {
                        parser.consume(':');
                        return left;
                    }
                    throw new UnexpectedTypeError(left);
                }
                parser.consume(':');
                const right = parser.parseType(Precedence.KEY_VALUE);
                return {
                    type: 'JsdocTypeKeyValue',
                    key: left.value,
                    right,
                    optional,
                    variadic
                };
            }
        });
    }

    const jsdocBaseGrammar = [
        ...baseGrammar,
        createFunctionParslet({
            allowWithoutParenthesis: true,
            allowNamedParameters: ['this', 'new'],
            allowNoReturnType: true,
            allowNewAsFunctionKeyword: false
        }),
        stringValueParslet,
        createSpecialNamePathParslet({
            allowedTypes: ['module', 'external', 'event'],
            pathGrammar
        }),
        createVariadicParslet({
            allowEnclosingBrackets: true,
            allowPostfix: true
        }),
        createNameParslet({
            allowedAdditionalTokens: ['keyof']
        }),
        symbolParslet,
        arrayBracketsParslet,
        createNamePathParslet({
            allowSquareBracketsOnAnyType: false,
            allowJsdocNamePaths: true,
            pathGrammar
        })
    ];
    const jsdocGrammar = [
        ...jsdocBaseGrammar,
        createObjectParslet({
            // jsdoc syntax allows full types as keys, so we need to pull in the full grammar here
            // we leave out the object type deliberately
            objectFieldGrammar: [
                createNameParslet({
                    allowedAdditionalTokens: ['typeof', 'module', 'in']
                }),
                createObjectFieldParslet({
                    allowSquaredProperties: false,
                    allowKeyTypes: true,
                    allowOptional: false,
                    allowReadonly: false
                }),
                ...jsdocBaseGrammar
            ],
            allowKeyTypes: true
        }),
        createKeyValueParslet({
            allowOptional: true,
            allowVariadic: true
        })
    ];
    const jsdocNameGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        })
    ];
    const jsdocNamePathGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        }),
        createNamePathParslet({
            allowSquareBracketsOnAnyType: false,
            allowJsdocNamePaths: true,
            pathGrammar
        })
    ];
    const jsdocNamePathSpecialGrammar = [
        createSpecialNamePathParslet({
            allowedTypes: ['module', 'external', 'event'],
            pathGrammar
        }),
        ...jsdocNamePathGrammar
    ];

    const typeOfParslet = composeParslet({
        name: 'typeOfParslet',
        accept: type => type === 'typeof',
        parsePrefix: parser => {
            parser.consume('typeof');
            return {
                type: 'JsdocTypeTypeof',
                element: parser.parseType(Precedence.KEY_OF_TYPE_OF)
            };
        }
    });

    const objectFieldGrammar$1 = [
        createNameParslet({
            allowedAdditionalTokens: [
                'typeof', 'module', 'keyof', 'event', 'external', 'in'
            ]
        }),
        nullableParslet,
        optionalParslet,
        stringValueParslet,
        numberParslet,
        createObjectFieldParslet({
            allowSquaredProperties: false,
            allowKeyTypes: false,
            allowOptional: false,
            allowReadonly: false
        })
    ];
    const closureGrammar = [
        ...baseGrammar,
        createObjectParslet({
            allowKeyTypes: false,
            objectFieldGrammar: objectFieldGrammar$1
        }),
        createNameParslet({
            allowedAdditionalTokens: ['event', 'external', 'in']
        }),
        typeOfParslet,
        createFunctionParslet({
            allowWithoutParenthesis: false,
            allowNamedParameters: ['this', 'new'],
            allowNoReturnType: true,
            allowNewAsFunctionKeyword: false
        }),
        createVariadicParslet({
            allowEnclosingBrackets: false,
            allowPostfix: false
        }),
        // additional name parslet is needed for some special cases
        createNameParslet({
            allowedAdditionalTokens: ['keyof']
        }),
        createSpecialNamePathParslet({
            allowedTypes: ['module'],
            pathGrammar
        }),
        createNamePathParslet({
            allowSquareBracketsOnAnyType: false,
            allowJsdocNamePaths: true,
            pathGrammar
        }),
        createKeyValueParslet({
            allowOptional: false,
            allowVariadic: false
        }),
        symbolParslet
    ];
    const closureNameGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        })
    ];
    const closureNamePathGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        }),
        createNamePathParslet({
            allowSquareBracketsOnAnyType: false,
            allowJsdocNamePaths: true,
            pathGrammar
        })
    ];
    const closureNamePathSpecialGrammar = [
        createSpecialNamePathParslet({
            allowedTypes: ['module'],
            pathGrammar
        }),
        ...closureNamePathGrammar
    ];

    const assertsParslet = composeParslet({
        name: 'assertsParslet',
        accept: type => type === 'asserts',
        parsePrefix: (parser) => {
            parser.consume('asserts');
            const left = parser.parseIntermediateType(Precedence.SYMBOL);
            if (left.type !== 'JsdocTypeName') {
                throw new UnexpectedTypeError(left, 'A typescript asserts always has to have a name.');
            }
            if (!parser.consume('is')) {
                return {
                    type: 'JsdocTypeAssertsPlain',
                    element: left
                };
            }
            return {
                type: 'JsdocTypeAsserts',
                left,
                right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
            };
        }
    });

    // (optional new or optionally quoted other optional name) +
    //    (...args) + ":" + return value
    const functionPropertyParslet = composeParslet({
        name: 'functionPropertyParslet',
        accept: (type, next) => type === 'new' && (next === '(' || next === '<') ||
            type === 'Identifier' && (next === '(' || next === '<') ||
            type === 'StringValue' && (next === '(' || next === '<') ||
            type === '(' || type === '<',
        parsePrefix: parser => {
            let result;
            // Just a placeholder
            const returnType = {
                type: 'JsdocTypeName',
                value: 'void'
            };
            const newKeyword = parser.consume('new');
            if (newKeyword) {
                result = {
                    type: 'JsdocTypeConstructorSignature',
                    parameters: [],
                    returnType
                };
            }
            else {
                const text = parser.lexer.current.text;
                const identifier = parser.consume('Identifier');
                if (identifier) {
                    result = {
                        type: 'JsdocTypeMethodSignature',
                        name: text,
                        meta: {
                            quote: undefined
                        },
                        parameters: [],
                        returnType
                    };
                }
                else {
                    const text = parser.lexer.current.text;
                    const stringValue = parser.consume('StringValue');
                    if (stringValue) {
                        result = {
                            type: 'JsdocTypeMethodSignature',
                            name: text.slice(1, -1),
                            meta: {
                                quote: text.startsWith('"') ? 'double' : 'single'
                            },
                            parameters: [],
                            returnType
                        };
                    }
                    else {
                        result = {
                            type: 'JsdocTypeCallSignature',
                            parameters: [],
                            returnType
                        };
                    }
                }
            }
            const typeParameters = [];
            if (parser.consume('<')) {
                do {
                    let defaultValue = undefined;
                    let name = parser.parseIntermediateType(Precedence.SYMBOL);
                    if (name.type === 'JsdocTypeOptional') {
                        name = name.element;
                        defaultValue = parser.parseType(Precedence.SYMBOL);
                    }
                    if (name.type !== 'JsdocTypeName') {
                        throw new UnexpectedTypeError(name);
                    }
                    let constraint = undefined;
                    if (parser.consume('extends')) {
                        constraint = parser.parseType(Precedence.SYMBOL);
                        // Got an equal sign
                        if (constraint.type === 'JsdocTypeOptional') {
                            constraint = constraint.element;
                            defaultValue = parser.parseType(Precedence.SYMBOL);
                        }
                    }
                    const typeParameter = {
                        type: 'JsdocTypeTypeParameter',
                        name
                    };
                    if (constraint !== undefined) {
                        typeParameter.constraint = constraint;
                    }
                    if (defaultValue !== undefined) {
                        typeParameter.defaultValue = defaultValue;
                    }
                    typeParameters.push(typeParameter);
                    if (parser.consume('>')) {
                        break;
                    }
                } while (parser.consume(','));
                result.typeParameters = typeParameters;
            }
            const hasParenthesis = parser.lexer.current.type === '(';
            /* c8 ignore next 3 -- Unreachable */
            if (!hasParenthesis) {
                throw new Error('function property is missing parameter list');
            }
            return result;
        }
    });

    function createTupleParslet({ allowQuestionMark }) {
        return composeParslet({
            name: 'tupleParslet',
            accept: type => type === '[',
            parsePrefix: parser => {
                parser.consume('[');
                const result = {
                    type: 'JsdocTypeTuple',
                    elements: []
                };
                if (parser.consume(']')) {
                    return result;
                }
                const typeList = parser.parseIntermediateType(Precedence.ALL);
                if (typeList.type === 'JsdocTypeParameterList') {
                    if (typeList.elements[0].type === 'JsdocTypeKeyValue') {
                        result.elements = typeList.elements.map(assertPlainKeyValueResult);
                    }
                    else {
                        result.elements = typeList.elements.map(assertRootResult);
                    }
                }
                else {
                    if (typeList.type === 'JsdocTypeKeyValue') {
                        result.elements = [assertPlainKeyValueResult(typeList)];
                    }
                    else {
                        result.elements = [assertRootResult(typeList)];
                    }
                }
                if (!parser.consume(']')) {
                    throw new Error('Unterminated \'[\'');
                }
                if (result.elements.some((e) => e.type === 'JsdocTypeUnknown')) {
                    throw new Error('Question mark in tuple not allowed');
                }
                return result;
            }
        });
    }

    const keyOfParslet = composeParslet({
        name: 'keyOfParslet',
        accept: type => type === 'keyof',
        parsePrefix: parser => {
            parser.consume('keyof');
            return {
                type: 'JsdocTypeKeyof',
                element: assertRootResult(parser.parseType(Precedence.KEY_OF_TYPE_OF))
            };
        }
    });

    const importParslet = composeParslet({
        name: 'importParslet',
        accept: type => type === 'import',
        parsePrefix: parser => {
            parser.consume('import');
            if (!parser.consume('(')) {
                throw new Error('Missing parenthesis after import keyword');
            }
            const path = parser.parseType(Precedence.PREFIX);
            if (path.type !== 'JsdocTypeStringValue') {
                throw new Error('Only string values are allowed as paths for imports');
            }
            if (!parser.consume(')')) {
                throw new Error('Missing closing parenthesis after import keyword');
            }
            return {
                type: 'JsdocTypeImport',
                element: path
            };
        }
    });

    const readonlyPropertyParslet = composeParslet({
        name: 'readonlyPropertyParslet',
        accept: (type, next) => type === 'readonly' && next !== ':',
        parsePrefix: parser => {
            parser.consume('readonly');
            return {
                type: 'JsdocTypeReadonlyProperty',
                element: parser.parseIntermediateType(Precedence.KEY_VALUE)
            };
        }
    });

    const arrowFunctionParslet = composeParslet({
        name: 'arrowFunctionParslet',
        precedence: Precedence.ARROW,
        accept: type => type === '=>',
        parseInfix: (parser, left) => {
            parser.consume('=>');
            return {
                type: 'JsdocTypeFunction',
                parameters: getParameters(left).map(assertPlainKeyValueOrNameResult),
                arrow: true,
                constructor: false,
                parenthesis: true,
                returnType: parser.parseType(Precedence.OBJECT)
            };
        }
    });

    const genericArrowFunctionParslet = composeParslet({
        name: 'genericArrowFunctionParslet',
        accept: type => type === '<',
        parsePrefix: (parser) => {
            const typeParameters = [];
            parser.consume('<');
            do {
                let defaultValue = undefined;
                let name = parser.parseIntermediateType(Precedence.SYMBOL);
                if (name.type === 'JsdocTypeOptional') {
                    name = name.element;
                    defaultValue = parser.parseType(Precedence.SYMBOL);
                }
                if (name.type !== 'JsdocTypeName') {
                    throw new UnexpectedTypeError(name);
                }
                let constraint = undefined;
                if (parser.consume('extends')) {
                    constraint = parser.parseType(Precedence.SYMBOL);
                    // Got an equal sign
                    if (constraint.type === 'JsdocTypeOptional') {
                        constraint = constraint.element;
                        defaultValue = parser.parseType(Precedence.SYMBOL);
                    }
                }
                const typeParameter = {
                    type: 'JsdocTypeTypeParameter',
                    name
                };
                if (constraint !== undefined) {
                    typeParameter.constraint = constraint;
                }
                if (defaultValue !== undefined) {
                    typeParameter.defaultValue = defaultValue;
                }
                typeParameters.push(typeParameter);
                if (parser.consume('>')) {
                    break;
                }
            } while (parser.consume(','));
            const functionBase = parser.parseIntermediateType(Precedence.SYMBOL);
            functionBase.typeParameters = typeParameters;
            return functionBase;
        }
    });

    const intersectionParslet = composeParslet({
        name: 'intersectionParslet',
        accept: type => type === '&',
        precedence: Precedence.INTERSECTION,
        parseInfix: (parser, left) => {
            parser.consume('&');
            const elements = [];
            do {
                elements.push(parser.parseType(Precedence.INTERSECTION));
            } while (parser.consume('&'));
            return {
                type: 'JsdocTypeIntersection',
                elements: [
                    assertResultIsNotReservedWord(parser, assertRootResult(left)),
                    ...elements.map((element) => assertResultIsNotReservedWord(parser, element))
                ]
            };
        }
    });

    const predicateParslet = composeParslet({
        name: 'predicateParslet',
        precedence: Precedence.INFIX,
        accept: type => type === 'is',
        parseInfix: (parser, left) => {
            if (left.type !== 'JsdocTypeName') {
                throw new UnexpectedTypeError(left, 'A typescript predicate always has to have a name on the left side.');
            }
            parser.consume('is');
            return {
                type: 'JsdocTypePredicate',
                left,
                right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
            };
        }
    });

    const breakingWhitespaceRegex = /^\s*\n\s*/;
    class Lexer {
        static create(lexerRules, text) {
            const current = this.read(lexerRules, text);
            text = current.text;
            const next = this.read(lexerRules, text);
            text = next.text;
            return new Lexer(lexerRules, text, undefined, current.token, next.token);
        }
        constructor(lexerRules, text, previous, current, next) {
            this.text = '';
            this.lexerRules = lexerRules;
            this.text = text;
            this.previous = previous;
            this.current = current;
            this.next = next;
        }
        static read(lexerRules, text, startOfLine = false) {
            startOfLine || (startOfLine = breakingWhitespaceRegex.test(text));
            text = text.trim();
            for (const rule of lexerRules) {
                const partial = rule(text);
                if (partial !== null) {
                    const token = Object.assign(Object.assign({}, partial), { startOfLine });
                    text = text.slice(token.text.length);
                    return { text, token };
                }
            }
            throw new Error('Unexpected Token ' + text);
        }
        remaining() {
            return this.next.text + this.text;
        }
        advance() {
            const next = Lexer.read(this.lexerRules, this.text);
            return new Lexer(this.lexerRules, next.text, this.current, this.next, next.token);
        }
    }

    const objectSquaredPropertyParslet = composeParslet({
        name: 'objectSquarePropertyParslet',
        accept: type => type === '[',
        parsePrefix: parser => {
            var _a, _b;
            if (parser.baseParser === undefined) {
                throw new Error('Only allowed inside object grammar');
            }
            parser.consume('[');
            let innerBracketType;
            if (((_a = parser.externalParsers) === null || _a === void 0 ? void 0 : _a.computedPropertyParser) === undefined) {
                try {
                    innerBracketType = parser.parseIntermediateType(Precedence.OBJECT);
                }
                catch (err) {
                    throw new Error('Error parsing value inside square bracketed property.', {
                        cause: err
                    });
                }
            }
            let result;
            if (innerBracketType !== undefined &&
                // Looks like an object field because of `key: value`, but is
                //  shaping to be an index signature
                innerBracketType.type === 'JsdocTypeObjectField' &&
                typeof innerBracketType.key === 'string' &&
                !innerBracketType.optional &&
                !innerBracketType.readonly &&
                innerBracketType.right !== undefined) {
                const key = innerBracketType.key;
                if (!parser.consume(']')) {
                    throw new Error('Unterminated square brackets');
                }
                if (!parser.consume(':')) {
                    throw new Error('Incomplete index signature');
                }
                const parentParser = parser.baseParser;
                parentParser.acceptLexerState(parser);
                innerBracketType.key = {
                    type: 'JsdocTypeIndexSignature',
                    key,
                    right: innerBracketType.right
                };
                innerBracketType.optional = false;
                innerBracketType.meta.quote = undefined;
                result = innerBracketType;
                const right = parentParser.parseType(Precedence.INDEX_BRACKETS);
                result.right = right;
                parser.acceptLexerState(parentParser);
            }
            else if (innerBracketType !== undefined &&
                // Looks like a name, but is shaping to be a mapped type clause
                innerBracketType.type === 'JsdocTypeName' &&
                parser.consume('in')) {
                const parentParser = parser.baseParser;
                parentParser.acceptLexerState(parser);
                const mappedTypeRight = parentParser.parseType(Precedence.ARRAY_BRACKETS);
                if (!parentParser.consume(']')) {
                    throw new Error('Unterminated square brackets');
                }
                const optional = parentParser.consume('?');
                if (!parentParser.consume(':')) {
                    throw new Error('Incomplete mapped type clause: missing colon');
                }
                const right = parentParser.parseType(Precedence.INDEX_BRACKETS);
                result = {
                    type: 'JsdocTypeObjectField',
                    optional,
                    readonly: false,
                    meta: {
                        quote: undefined
                    },
                    key: {
                        type: 'JsdocTypeMappedType',
                        key: innerBracketType.value,
                        right: mappedTypeRight
                    },
                    right
                };
                parser.acceptLexerState(parentParser);
            }
            else {
                if (((_b = parser.externalParsers) === null || _b === void 0 ? void 0 : _b.computedPropertyParser) !== undefined) {
                    let remaining = parser.lexer.current.text + parser.lexer.remaining();
                    let checkingText = remaining;
                    while (checkingText !== '') {
                        try {
                            innerBracketType = parser.externalParsers.computedPropertyParser(checkingText);
                            break;
                        }
                        catch (err) { }
                        checkingText = checkingText.slice(0, -1);
                    }
                    remaining = remaining.slice(checkingText.length);
                    const remainingTextParser = new Parser(parser.grammar, Lexer.create(parser.lexer.lexerRules, remaining), parser.baseParser, {
                        externalParsers: {
                            computedPropertyParser: parser.externalParsers.computedPropertyParser
                        }
                    });
                    parser.acceptLexerState(remainingTextParser);
                }
                if (!parser.consume(']')) {
                    throw new Error('Unterminated square brackets');
                }
                let optional = parser.consume('?');
                const typeParameters = [];
                if (parser.consume('<')) {
                    do {
                        let defaultValue = undefined;
                        let name = parser.parseIntermediateType(Precedence.SYMBOL);
                        if (name.type === 'JsdocTypeOptional') {
                            name = name.element;
                            defaultValue = parser.parseType(Precedence.SYMBOL);
                        }
                        if (name.type !== 'JsdocTypeName') {
                            throw new UnexpectedTypeError(name);
                        }
                        let constraint = undefined;
                        if (parser.consume('extends')) {
                            constraint = parser.parseType(Precedence.SYMBOL);
                            // Got an equal sign
                            if (constraint.type === 'JsdocTypeOptional') {
                                constraint = constraint.element;
                                defaultValue = parser.parseType(Precedence.SYMBOL);
                            }
                        }
                        const typeParameter = {
                            type: 'JsdocTypeTypeParameter',
                            name
                        };
                        if (constraint !== undefined) {
                            typeParameter.constraint = constraint;
                        }
                        if (defaultValue !== undefined) {
                            typeParameter.defaultValue = defaultValue;
                        }
                        typeParameters.push(typeParameter);
                        if (parser.consume('>')) {
                            break;
                        }
                    } while (parser.consume(','));
                }
                let type;
                let key;
                const checkMiddle = () => {
                    // Safe if set above
                    // eslint-disable-next-line logical-assignment-operators -- Keep for comment
                    if (!optional) {
                        optional = parser.consume('?');
                        // How can we grab this?
                        // if (optional && type === 'JsdocTypeComputedMethod') {
                        //   throw new Error('Computed methods may not be optional')
                        // }
                    }
                };
                // Limit this to JsdocTypeName and JsdocTypeStringValue?
                let right;
                const text = parser.lexer.current.type;
                if (text === '(') {
                    const signatureParser = new Parser([
                        createKeyValueParslet({
                            allowVariadic: true,
                            allowOptional: true,
                            acceptParameterList: true,
                        }),
                        ...parser.baseParser.grammar.flatMap((grammar) => {
                            // We're supplying our own version
                            if (grammar.name === 'keyValueParslet') {
                                return [];
                            }
                            return [grammar];
                        })
                    ], parser.lexer, parser);
                    signatureParser.acceptLexerState(parser);
                    const params = signatureParser.parseIntermediateType(Precedence.OBJECT);
                    parser.acceptLexerState(signatureParser);
                    const parameters = getParameters(params);
                    type = 'JsdocTypeComputedMethod';
                    checkMiddle();
                    parser.consume(':');
                    const nextValue = parser.parseType(Precedence.INDEX_BRACKETS);
                    key = {
                        type,
                        optional,
                        value: innerBracketType,
                        parameters,
                        returnType: nextValue
                    };
                    if (typeParameters.length > 0) {
                        key.typeParameters = typeParameters;
                    }
                }
                else {
                    type = 'JsdocTypeComputedProperty';
                    checkMiddle();
                    if (!parser.consume(':')) {
                        throw new Error('Incomplete computed property: missing colon');
                    }
                    right = parser.parseType(Precedence.INDEX_BRACKETS);
                    key = {
                        type,
                        value: innerBracketType,
                    };
                }
                result = {
                    type: 'JsdocTypeObjectField',
                    optional: type === 'JsdocTypeComputedMethod' ? false : optional,
                    readonly: false,
                    meta: {
                        quote: undefined
                    },
                    key,
                    right
                };
            }
            return result;
        }
    });

    const readonlyArrayParslet = composeParslet({
        name: 'readonlyArrayParslet',
        accept: type => type === 'readonly',
        parsePrefix: parser => {
            parser.consume('readonly');
            return {
                type: 'JsdocTypeReadonlyArray',
                element: assertArrayOrTupleResult(parser.parseIntermediateType(Precedence.ALL))
            };
        }
    });

    const conditionalParslet = composeParslet({
        name: 'conditionalParslet',
        precedence: Precedence.INFIX,
        accept: type => type === 'extends',
        parseInfix: (parser, left) => {
            parser.consume('extends');
            const extendsType = parser.parseType(Precedence.KEY_OF_TYPE_OF).element;
            // parser.consume('?')
            const trueType = parser.parseType(Precedence.INFIX);
            parser.consume(':');
            return {
                type: 'JsdocTypeConditional',
                checksType: assertRootResult(left),
                extendsType,
                trueType,
                falseType: parser.parseType(Precedence.INFIX)
            };
        }
    });

    function makePunctuationRule(type) {
        return text => {
            if (text.startsWith(type)) {
                return { type, text: type };
            }
            else {
                return null;
            }
        };
    }
    function getQuoted(text) {
        let position = 0;
        let char = undefined;
        const mark = text[0];
        let escaped = false;
        if (mark !== '\'' && mark !== '"') {
            return null;
        }
        while (position < text.length) {
            position++;
            char = text[position];
            if (!escaped && char === mark) {
                position++;
                break;
            }
            escaped = !escaped && char === '\\';
        }
        if (char !== mark) {
            throw new Error('Unterminated String');
        }
        return text.slice(0, position);
    }
    /**
     * Gets a full template literal (enclosed in backticks)
     */
    function getTemplateLiteral(text) {
        let position = 0;
        let char = undefined;
        const mark = text[0];
        let escaped = false;
        if (mark !== '`') {
            return null;
        }
        while (position < text.length) {
            position++;
            char = text[position];
            if (!escaped && char === mark) {
                position++;
                break;
            }
            escaped = !escaped && char === '\\';
        }
        if (char !== mark) {
            throw new Error('Unterminated template literal');
        }
        return text.slice(0, position);
    }
    /**
     * Gets the next literal (non-interpolation) portion of a text
     */
    function getTemplateLiteralLiteral(text) {
        let position = 0;
        let char = undefined;
        const start = text[0];
        let escaped = false;
        if (start === '`' || (start === '$' && text[1] === '{')) {
            return null;
        }
        while (position < text.length) {
            position++;
            char = text[position];
            if (!escaped && (char === '`' || (char === '$' && text[position + 1] === '{'))) {
                break;
            }
            escaped = !escaped && char === '\\';
        }
        return text.slice(0, position);
    }
    const identifierStartRegex = /[$_\p{ID_Start}]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u;
    const identifierContinueRegex = /[$\p{ID_Continue}\u200C\u200D]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u;
    const identifierContinueRegexLoose = /[$\-\p{ID_Continue}\u200C\u200D]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u;
    function makeGetIdentifier(identifierContinueRegex) {
        return function (text) {
            let char = text[0];
            if (!identifierStartRegex.test(char)) {
                return null;
            }
            let position = 1;
            do {
                char = text[position];
                if (!identifierContinueRegex.test(char)) {
                    break;
                }
                position++;
            } while (position < text.length);
            return text.slice(0, position);
        };
    }
    const numberRegex = /^(-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?))/;
    const looseNumberRegex = /^(NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity))/;
    function getGetNumber(numberRegex) {
        return function getNumber(text) {
            var _a, _b;
            return (_b = (_a = numberRegex.exec(text)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null;
        };
    }
    const looseIdentifierRule = text => {
        const value = makeGetIdentifier(identifierContinueRegexLoose)(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'Identifier',
            text: value
        };
    };
    const identifierRule = text => {
        const value = makeGetIdentifier(identifierContinueRegex)(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'Identifier',
            text: value
        };
    };
    function makeKeyWordRule(type) {
        return text => {
            if (!text.startsWith(type)) {
                return null;
            }
            const prepends = text[type.length];
            if (prepends !== undefined && identifierContinueRegex.test(prepends)) {
                return null;
            }
            return {
                type,
                text: type
            };
        };
    }
    const stringValueRule = text => {
        const value = getQuoted(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'StringValue',
            text: value
        };
    };
    const templateLiteralRule = text => {
        const value = getTemplateLiteral(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'TemplateLiteral',
            text: value
        };
    };
    const eofRule = text => {
        if (text.length > 0) {
            return null;
        }
        return {
            type: 'EOF',
            text: ''
        };
    };
    const numberRule = text => {
        const value = getGetNumber(numberRegex)(text);
        if (value === null) {
            return null;
        }
        return {
            type: 'Number',
            text: value
        };
    };
    const looseNumberRule = text => {
        const value = getGetNumber(looseNumberRegex)(text);
        if (value === null) {
            return null;
        }
        return {
            type: 'Number',
            text: value
        };
    };
    /**
     * Will be processed highest precedence first
     */
    const rules = [
        eofRule,
        makePunctuationRule('=>'),
        makePunctuationRule('('),
        makePunctuationRule(')'),
        makePunctuationRule('{'),
        makePunctuationRule('}'),
        makePunctuationRule('['),
        makePunctuationRule(']'),
        makePunctuationRule('|'),
        makePunctuationRule('&'),
        makePunctuationRule('<'),
        makePunctuationRule('>'),
        makePunctuationRule(','),
        makePunctuationRule(';'),
        makePunctuationRule('*'),
        makePunctuationRule('?'),
        makePunctuationRule('!'),
        makePunctuationRule('='),
        makePunctuationRule(':'),
        makePunctuationRule('...'),
        makePunctuationRule('.'),
        makePunctuationRule('#'),
        makePunctuationRule('~'),
        makePunctuationRule('/'),
        makePunctuationRule('@'),
        makeKeyWordRule('undefined'),
        makeKeyWordRule('null'),
        makeKeyWordRule('function'),
        makeKeyWordRule('this'),
        makeKeyWordRule('new'),
        makeKeyWordRule('module'),
        makeKeyWordRule('event'),
        makeKeyWordRule('extends'),
        makeKeyWordRule('external'),
        makeKeyWordRule('infer'),
        makeKeyWordRule('typeof'),
        makeKeyWordRule('keyof'),
        makeKeyWordRule('readonly'),
        makeKeyWordRule('import'),
        makeKeyWordRule('is'),
        makeKeyWordRule('in'),
        makeKeyWordRule('asserts'),
        numberRule,
        identifierRule,
        stringValueRule,
        templateLiteralRule
    ];
    const looseRules = rules.toSpliced(-4, 2, looseNumberRule, looseIdentifierRule);

    const templateLiteralParslet = composeParslet({
        name: 'templateLiteralParslet',
        accept: type => type === 'TemplateLiteral',
        parsePrefix: parser => {
            const text = parser.lexer.current.text;
            parser.consume('TemplateLiteral');
            const literals = [];
            const interpolations = [];
            let currentText = text.slice(1, -1);
            const advanceLiteral = () => {
                var _a;
                const literal = (_a = getTemplateLiteralLiteral(currentText)) !== null && _a !== void 0 ? _a : '';
                // We collect backslashes for total length, but need to replace
                literals.push(literal.replace(/\\`/g, '`'));
                currentText = currentText.slice(literal.length);
            };
            // The first can be the empty string (at least one literal
            //   should be populated)
            advanceLiteral();
            while (true) {
                if (currentText.startsWith('${')) {
                    currentText = currentText.slice(2);
                    let templateParser;
                    let interpolationType;
                    let snipped = currentText;
                    let remnant = '';
                    while (true) {
                        // Some tokens (like hyphen) may not be recognized by the parser,
                        //   so we avoid processing them (may be part of a literal)
                        try {
                            templateParser = new Parser(parser.grammar, Lexer.create(parser.lexer.lexerRules, snipped));
                            interpolationType = templateParser.parseType(Precedence.ALL);
                            break;
                        }
                        catch (err) {
                            remnant = snipped.slice(-1) + remnant;
                            snipped = snipped.slice(0, -1);
                        }
                    }
                    interpolations.push(interpolationType);
                    if (templateParser.lexer.current.text !== '}') {
                        throw new Error('unterminated interpolation');
                    }
                    currentText = templateParser.lexer.remaining() + remnant;
                }
                else { // currentText.startsWith('`')
                    break;
                }
                // May also be empty string if seeing `}${` or just a final `}`
                advanceLiteral();
            }
            return {
                type: 'JsdocTypeTemplateLiteral',
                literals,
                interpolations
            };
        }
    });

    const objectFieldGrammar = [
        functionPropertyParslet,
        readonlyPropertyParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        }),
        nullableParslet,
        optionalParslet,
        stringValueParslet,
        numberParslet,
        createObjectFieldParslet({
            allowSquaredProperties: true,
            allowKeyTypes: false,
            allowOptional: true,
            allowReadonly: true
        }),
        objectSquaredPropertyParslet
    ];
    const typescriptGrammar = [
        ...baseGrammar,
        createObjectParslet({
            allowKeyTypes: false,
            objectFieldGrammar,
            signatureGrammar: [
                createKeyValueParslet({
                    allowVariadic: true,
                    allowOptional: true,
                    acceptParameterList: true,
                })
            ]
        }),
        readonlyArrayParslet,
        typeOfParslet,
        keyOfParslet,
        importParslet,
        stringValueParslet,
        createFunctionParslet({
            allowWithoutParenthesis: true,
            allowNoReturnType: true,
            allowNamedParameters: ['this', 'new', 'args'],
            allowNewAsFunctionKeyword: true
        }),
        createTupleParslet({
            allowQuestionMark: false
        }),
        createVariadicParslet({
            allowEnclosingBrackets: false,
            allowPostfix: false
        }),
        assertsParslet,
        conditionalParslet,
        createNameParslet({
            allowedAdditionalTokens: ['event', 'external', 'in']
        }),
        createSpecialNamePathParslet({
            allowedTypes: ['module'],
            pathGrammar
        }),
        arrayBracketsParslet,
        arrowFunctionParslet,
        genericArrowFunctionParslet,
        createNamePathParslet({
            allowSquareBracketsOnAnyType: true,
            allowJsdocNamePaths: false,
            pathGrammar
        }),
        intersectionParslet,
        predicateParslet,
        templateLiteralParslet,
        createKeyValueParslet({
            allowVariadic: true,
            allowOptional: true
        })
    ];
    const typescriptNameGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        })
    ];
    const typescriptNamePathGrammar = [
        genericParslet,
        arrayBracketsParslet,
        createNameParslet({
            allowedAdditionalTokens: baseNameTokens
        }),
        createNamePathParslet({
            allowSquareBracketsOnAnyType: true,
            // Here we actually want JSDoc name paths (even though TS
            //   in JSDoc namepath positions interpret them differently
            //   than JSDoc)
            allowJsdocNamePaths: true,
            pathGrammar
        })
    ];
    const typescriptNamePathSpecialGrammar = [
        createSpecialNamePathParslet({
            allowedTypes: ['module'],
            pathGrammar
        }),
        ...typescriptNamePathGrammar
    ];

    /**
     * This function parses the given expression in the given mode and produces a {@link RootResult}.
     * @param expression
     * @param mode
     */
    function parse(expression, mode, { module = true, strictMode = true, asyncFunctionBody = true, classContext = false, computedPropertyParser } = {}) {
        let parser;
        switch (mode) {
            case 'closure':
                parser = new Parser(closureGrammar, Lexer.create(looseRules, expression), undefined, {
                    module,
                    strictMode,
                    asyncFunctionBody,
                    classContext
                });
                break;
            case 'jsdoc':
                parser = new Parser(jsdocGrammar, Lexer.create(looseRules, expression), undefined, {
                    module,
                    strictMode,
                    asyncFunctionBody,
                    classContext
                });
                break;
            case 'typescript':
                parser = new Parser(typescriptGrammar, Lexer.create(rules, expression), undefined, {
                    module,
                    strictMode,
                    asyncFunctionBody,
                    classContext,
                    externalParsers: {
                        computedPropertyParser
                    }
                });
                break;
        }
        const result = parser.parse();
        return assertResultIsNotReservedWord(parser, result);
    }
    /**
     * This function tries to parse the given expression in multiple modes and returns the first successful
     * {@link RootResult}. By default it tries `'typescript'`, `'closure'` and `'jsdoc'` in this order. If
     * no mode was successful it throws the error that was produced by the last parsing attempt.
     * @param expression
     * @param modes
     */
    function tryParse(expression, modes = ['typescript', 'closure', 'jsdoc'], { module = true, strictMode = true, asyncFunctionBody = true, classContext = false, } = {}) {
        let error;
        for (const mode of modes) {
            try {
                return parse(expression, mode, {
                    module,
                    strictMode,
                    asyncFunctionBody,
                    classContext
                });
            }
            catch (e) {
                error = e;
            }
        }
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Ok
        throw error;
    }
    /**
     * This function parses the given expression in the given mode and produces a name path.
     * @param expression
     * @param mode
     */
    function parseNamePath(expression, mode, { includeSpecial = false } = {}) {
        switch (mode) {
            case 'closure':
                return (new Parser(includeSpecial ? closureNamePathSpecialGrammar : closureNamePathGrammar, Lexer.create(looseRules, expression))).parse();
            case 'jsdoc':
                return (new Parser(includeSpecial ? jsdocNamePathSpecialGrammar : jsdocNamePathGrammar, Lexer.create(looseRules, expression))).parse();
            case 'typescript': {
                return (new Parser(includeSpecial ? typescriptNamePathSpecialGrammar : typescriptNamePathGrammar, Lexer.create(rules, expression))).parse();
            }
        }
    }
    /**
     * This function parses the given expression in the given mode and produces a name.
     * @param expression
     * @param mode
     */
    function parseName(expression, mode) {
        switch (mode) {
            case 'closure':
                return (new Parser(closureNameGrammar, Lexer.create(looseRules, expression))).parse();
            case 'jsdoc':
                return (new Parser(jsdocNameGrammar, Lexer.create(looseRules, expression))).parse();
            case 'typescript':
                return (new Parser(typescriptNameGrammar, Lexer.create(rules, expression))).parse();
        }
    }

    function transform(rules, parseResult) {
        const rule = rules[parseResult.type];
        if (rule === undefined) {
            throw new Error(`In this set of transform rules exists no rule for type ${parseResult.type}.`);
        }
        return rule(parseResult, aParseResult => transform(rules, aParseResult));
    }
    function notAvailableTransform(parseResult) {
        throw new Error('This transform is not available. Are you trying the correct parsing mode?');
    }
    function extractSpecialParams(source) {
        const result = {
            params: []
        };
        for (const param of source.parameters) {
            if (param.type === 'JsdocTypeKeyValue') {
                if (param.key === 'this') {
                    result.this = param.right;
                }
                else if (param.key === 'new') {
                    result.new = param.right;
                }
                else {
                    result.params.push(param);
                }
            }
            else {
                result.params.push(param);
            }
        }
        return result;
    }

    function applyPosition(position, target, value) {
        return position === 'prefix' ? value + target : target + value;
    }
    function quote(value, quote) {
        switch (quote) {
            case 'double':
                return `"${value}"`;
            case 'single':
                return `'${value}'`;
            case undefined:
                return value;
        }
    }
    function stringifyRules({ computedPropertyStringifier } = {}) {
        return {
            JsdocTypeParenthesis: (result, transform) => `(${result.element !== undefined ? transform(result.element) : ''})`,
            JsdocTypeKeyof: (result, transform) => `keyof ${transform(result.element)}`,
            JsdocTypeFunction: (result, transform) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
                if (!result.arrow) {
                    let stringified = result.constructor ? 'new' : 'function';
                    if (!result.parenthesis) {
                        return stringified;
                    }
                    stringified += `(${result.parameters.map(transform).join(',' + ((_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.parameterSpacing) !== null && _b !== void 0 ? _b : ' '))})`;
                    if (result.returnType !== undefined) {
                        stringified += `${(_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.preReturnMarkerSpacing) !== null && _d !== void 0 ? _d : ''}:${(_f = (_e = result.meta) === null || _e === void 0 ? void 0 : _e.postReturnMarkerSpacing) !== null && _f !== void 0 ? _f : ' '}${transform(result.returnType)}`;
                    }
                    return stringified;
                }
                else {
                    if (result.returnType === undefined) {
                        throw new Error('Arrow function needs a return type.');
                    }
                    let stringified = `${result.typeParameters !== undefined
                    ? `<${result.typeParameters.map(transform).join(',' + ((_h = (_g = result.meta) === null || _g === void 0 ? void 0 : _g.typeParameterSpacing) !== null && _h !== void 0 ? _h : ' '))}>${(_k = (_j = result.meta) === null || _j === void 0 ? void 0 : _j.postGenericSpacing) !== null && _k !== void 0 ? _k : ''}`
                    : ''}(${result.parameters.map(transform).join(',' + ((_m = (_l = result.meta) === null || _l === void 0 ? void 0 : _l.parameterSpacing) !== null && _m !== void 0 ? _m : ' '))})${(_p = (_o = result.meta) === null || _o === void 0 ? void 0 : _o.preReturnMarkerSpacing) !== null && _p !== void 0 ? _p : ' '}=>${(_r = (_q = result.meta) === null || _q === void 0 ? void 0 : _q.postReturnMarkerSpacing) !== null && _r !== void 0 ? _r : ' '}${transform(result.returnType)}`;
                    if (result.constructor) {
                        stringified = 'new ' + stringified;
                    }
                    return stringified;
                }
            },
            JsdocTypeName: result => result.value,
            JsdocTypeTuple: (result, transform) => { var _a, _b; return `[${result.elements.map(transform).join(',' + ((_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.elementSpacing) !== null && _b !== void 0 ? _b : ' '))}]`; },
            JsdocTypeVariadic: (result, transform) => result.meta.position === undefined
                ? '...'
                : applyPosition(result.meta.position, transform(result.element), '...'),
            JsdocTypeNamePath: (result, transform) => {
                const left = transform(result.left);
                const right = transform(result.right);
                switch (result.pathType) {
                    case 'inner':
                        return `${left}~${right}`;
                    case 'instance':
                        return `${left}#${right}`;
                    case 'property':
                        return `${left}.${right}`;
                    case 'property-brackets':
                        return `${left}[${right}]`;
                }
            },
            JsdocTypeStringValue: result => quote(result.value, result.meta.quote),
            JsdocTypeAny: () => '*',
            JsdocTypeGeneric: (result, transform) => {
                var _a;
                if (result.meta.brackets === 'square') {
                    const element = result.elements[0];
                    const transformed = transform(element);
                    if (element.type === 'JsdocTypeUnion' || element.type === 'JsdocTypeIntersection') {
                        return `(${transformed})[]`;
                    }
                    else {
                        return `${transformed}[]`;
                    }
                }
                else {
                    return `${transform(result.left)}${result.meta.dot ? '.' : ''}<${result.infer === true ? 'infer ' : ''}${result.elements.map(transform).join(',' + ((_a = result.meta.elementSpacing) !== null && _a !== void 0 ? _a : ' '))}>`;
                }
            },
            JsdocTypeImport: (result, transform) => `import(${transform(result.element)})`,
            JsdocTypeObjectField: (result, transform) => {
                var _a, _b, _c;
                let text = '';
                if (result.readonly) {
                    text += 'readonly ';
                }
                let optionalBeforeParentheses = false;
                if (typeof result.key === 'string') {
                    text += quote(result.key, result.meta.quote);
                }
                else {
                    if (result.key.type === 'JsdocTypeComputedMethod') {
                        optionalBeforeParentheses = true;
                    }
                    text += transform(result.key);
                }
                text += (_a = result.meta.postKeySpacing) !== null && _a !== void 0 ? _a : '';
                if (!optionalBeforeParentheses && result.optional) {
                    text += '?';
                    text += (_b = result.meta.postOptionalSpacing) !== null && _b !== void 0 ? _b : '';
                }
                if (result.right === undefined) {
                    return text;
                }
                else {
                    return text + `:${(_c = result.meta.postColonSpacing) !== null && _c !== void 0 ? _c : ' '}${transform(result.right)}`;
                }
            },
            JsdocTypeJsdocObjectField: (result, transform) => `${transform(result.left)}: ${transform(result.right)}`,
            JsdocTypeKeyValue: (result, transform) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                let text = result.key;
                if (result.optional) {
                    text += ((_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.postKeySpacing) !== null && _b !== void 0 ? _b : '') + '?' + ((_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.postOptionalSpacing) !== null && _d !== void 0 ? _d : '');
                }
                else if (result.variadic) {
                    text = '...' + ((_f = (_e = result.meta) === null || _e === void 0 ? void 0 : _e.postVariadicSpacing) !== null && _f !== void 0 ? _f : '') + text;
                }
                else if (result.right !== undefined) {
                    text += ((_h = (_g = result.meta) === null || _g === void 0 ? void 0 : _g.postKeySpacing) !== null && _h !== void 0 ? _h : '');
                }
                if (result.right === undefined) {
                    return text;
                }
                else {
                    return text + `:${((_k = (_j = result.meta) === null || _j === void 0 ? void 0 : _j.postColonSpacing) !== null && _k !== void 0 ? _k : ' ')}${transform(result.right)}`;
                }
            },
            JsdocTypeSpecialNamePath: result => `${result.specialType}:${quote(result.value, result.meta.quote)}`,
            JsdocTypeNotNullable: (result, transform) => applyPosition(result.meta.position, transform(result.element), '!'),
            JsdocTypeNull: () => 'null',
            JsdocTypeNullable: (result, transform) => applyPosition(result.meta.position, transform(result.element), '?'),
            JsdocTypeNumber: result => result.value.toString(),
            JsdocTypeObject: (result, transform) => {
                var _a, _b, _c, _d, _e;
                /* c8 ignore next -- Guard */
                const lbType = ((_a = result.meta.separator) !== null && _a !== void 0 ? _a : '').endsWith('linebreak');
                const lbEnding = result.meta.separator === 'comma-and-linebreak'
                    ? ',\n'
                    : result.meta.separator === 'semicolon-and-linebreak'
                        ? ';\n'
                        : result.meta.separator === 'linebreak' ? '\n' : '';
                const separatorForSingleObjectField = (_b = result.meta.separatorForSingleObjectField) !== null && _b !== void 0 ? _b : false;
                const trailingPunctuation = (_c = result.meta.trailingPunctuation) !== null && _c !== void 0 ? _c : false;
                return `{${
            /* c8 ignore next -- Guard */
            (lbType && (separatorForSingleObjectField || result.elements.length > 1) ? '\n' + ((_d = result.meta.propertyIndent) !== null && _d !== void 0 ? _d : '') : '') +
                result.elements.map(transform).join((result.meta.separator === 'comma' ? ', ' : lbType
                    ? lbEnding +
                        /* c8 ignore next -- Guard */
                        ((_e = result.meta.propertyIndent) !== null && _e !== void 0 ? _e : '')
                    : '; ')) +
                (separatorForSingleObjectField && result.elements.length === 1
                    ? (result.meta.separator === 'comma' ? ',' : lbType ? lbEnding : ';')
                    : trailingPunctuation && result.meta.separator !== undefined
                        ? result.meta.separator.startsWith('comma')
                            ? ','
                            : result.meta.separator.startsWith('semicolon')
                                ? ';'
                                : ''
                        : '') +
                (lbType && result.elements.length > 1 ? '\n' : '')}}`;
            },
            JsdocTypeOptional: (result, transform) => applyPosition(result.meta.position, transform(result.element), '='),
            JsdocTypeSymbol: (result, transform) => `${result.value}(${result.element !== undefined ? transform(result.element) : ''})`,
            JsdocTypeTypeof: (result, transform) => `typeof ${transform(result.element)}`,
            JsdocTypeUndefined: () => 'undefined',
            JsdocTypeUnion: (result, transform) => {
                var _a;
                return result.elements.map(transform).join(((_a = result.meta) === null || _a === void 0 ? void 0 : _a.spacing) === undefined
                    ? ' | '
                    : `${result.meta.spacing}|${result.meta.spacing}`);
            },
            JsdocTypeUnknown: () => '?',
            JsdocTypeIntersection: (result, transform) => result.elements.map(transform).join(' & '),
            JsdocTypeProperty: result => quote(result.value, result.meta.quote),
            JsdocTypePredicate: (result, transform) => `${transform(result.left)} is ${transform(result.right)}`,
            JsdocTypeIndexSignature: (result, transform) => `[${result.key}: ${transform(result.right)}]`,
            JsdocTypeMappedType: (result, transform) => `[${result.key} in ${transform(result.right)}]`,
            JsdocTypeAsserts: (result, transform) => `asserts ${transform(result.left)} is ${transform(result.right)}`,
            JsdocTypeReadonlyArray: (result, transform) => `readonly ${transform(result.element)}`,
            JsdocTypeAssertsPlain: (result, transform) => `asserts ${transform(result.element)}`,
            JsdocTypeConditional: (result, transform) => `${transform(result.checksType)} extends ${transform(result.extendsType)} ? ${transform(result.trueType)} : ${transform(result.falseType)}`,
            JsdocTypeTypeParameter: (result, transform) => {
                var _a, _b, _c, _d;
                return `${transform(result.name)}${result.constraint !== undefined ? ` extends ${transform(result.constraint)}` : ''}${result.defaultValue !== undefined ? `${(_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.defaultValueSpacing) !== null && _b !== void 0 ? _b : ' '}=${(_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.defaultValueSpacing) !== null && _d !== void 0 ? _d : ' '}${transform(result.defaultValue)}` : ''}`;
            },
            JsdocTypeCallSignature: (result, transform) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                return `${result.typeParameters !== undefined
                ? `<${result.typeParameters.map(transform).join(',' + ((_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.typeParameterSpacing) !== null && _b !== void 0 ? _b : ' '))}>${(_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.postGenericSpacing) !== null && _d !== void 0 ? _d : ''}`
                : ''}(${result.parameters.map(transform).join(',' + ((_f = (_e = result.meta) === null || _e === void 0 ? void 0 : _e.parameterSpacing) !== null && _f !== void 0 ? _f : ' '))})${(_h = (_g = result.meta) === null || _g === void 0 ? void 0 : _g.preReturnMarkerSpacing) !== null && _h !== void 0 ? _h : ''}:${(_k = (_j = result.meta) === null || _j === void 0 ? void 0 : _j.postReturnMarkerSpacing) !== null && _k !== void 0 ? _k : ' '}${transform(result.returnType)}`;
            },
            JsdocTypeConstructorSignature: (result, transform) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return `new${(_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.postNewSpacing) !== null && _b !== void 0 ? _b : ' '}${result.typeParameters !== undefined
                ? `<${result.typeParameters.map(transform).join(',' + ((_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.typeParameterSpacing) !== null && _d !== void 0 ? _d : ' '))}>${(_f = (_e = result.meta) === null || _e === void 0 ? void 0 : _e.postGenericSpacing) !== null && _f !== void 0 ? _f : ''}`
                : ''}(${result.parameters.map(transform).join(',' + ((_h = (_g = result.meta) === null || _g === void 0 ? void 0 : _g.parameterSpacing) !== null && _h !== void 0 ? _h : ' '))})${(_k = (_j = result.meta) === null || _j === void 0 ? void 0 : _j.preReturnMarkerSpacing) !== null && _k !== void 0 ? _k : ''}:${(_m = (_l = result.meta) === null || _l === void 0 ? void 0 : _l.postReturnMarkerSpacing) !== null && _m !== void 0 ? _m : ' '}${transform(result.returnType)}`;
            },
            JsdocTypeMethodSignature: (result, transform) => {
                var _a, _b, _c, _d, _e, _f;
                const quote = result.meta.quote === 'double'
                    ? '"'
                    : result.meta.quote === 'single'
                        ? "'"
                        : '';
                return `${quote}${result.name}${quote}${(_a = result.meta.postMethodNameSpacing) !== null && _a !== void 0 ? _a : ''}${result.typeParameters !== undefined
                ? `<${result.typeParameters.map(transform).join(',' + ((_b = result.meta.typeParameterSpacing) !== null && _b !== void 0 ? _b : ' '))}>${(_c = result.meta.postGenericSpacing) !== null && _c !== void 0 ? _c : ''}`
                : ''}(${result.parameters.map(transform).join(',' + ((_d = result.meta.parameterSpacing) !== null && _d !== void 0 ? _d : ' '))})${(_e = result.meta.preReturnMarkerSpacing) !== null && _e !== void 0 ? _e : ''}:${(_f = result.meta.postReturnMarkerSpacing) !== null && _f !== void 0 ? _f : ' '}${transform(result.returnType)}`;
            },
            JsdocTypeIndexedAccessIndex: (result, transform) => (transform(result.right)),
            JsdocTypeTemplateLiteral: (result, transform) => (`\`${
        // starts with a literal (even empty string) then alternating
        //    interpolations and literals and also ending in literal
        //    (even empty string)
        result.literals.slice(0, -1).map((literal, idx) => literal.replace(/`/gu, '\\`') + '${' + transform(result.interpolations[idx]) + '}').join('') + result.literals.slice(-1)[0].replace(/`/gu, '\\`')}\``),
            JsdocTypeComputedProperty: (result, transform) => {
                if (result.value.type.startsWith('JsdocType')) {
                    return `[${transform(result.value)}]`;
                }
                else {
                    if (computedPropertyStringifier === undefined) {
                        throw new Error('Must have a computed property stringifier');
                    }
                    return `[${computedPropertyStringifier(result.value).replace(/;$/u, '')}]`;
                }
            },
            JsdocTypeComputedMethod: (result, transform) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
                if (result.value.type.startsWith('JsdocType')) {
                    return `[${transform(result.value)}]${result.optional ? '?' : ''}${result.typeParameters !== undefined
                    ? `<${result.typeParameters.map(transform).join(',' + ((_b = (_a = result.meta) === null || _a === void 0 ? void 0 : _a.typeParameterSpacing) !== null && _b !== void 0 ? _b : ' '))}>${(_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.postGenericSpacing) !== null && _d !== void 0 ? _d : ''}`
                    : ''}(${result.parameters.map(transform).join(',' + ((_f = (_e = result.meta) === null || _e === void 0 ? void 0 : _e.parameterSpacing) !== null && _f !== void 0 ? _f : ' '))})${(_h = (_g = result.meta) === null || _g === void 0 ? void 0 : _g.preReturnMarkerSpacing) !== null && _h !== void 0 ? _h : ''}:${(_k = (_j = result.meta) === null || _j === void 0 ? void 0 : _j.postReturnMarkerSpacing) !== null && _k !== void 0 ? _k : ' '}${transform(result.returnType)}`;
                }
                else {
                    if (computedPropertyStringifier === undefined) {
                        throw new Error('Must have a computed property stringifier');
                    }
                    return `[${computedPropertyStringifier(result.value).replace(/;$/u, '')}](${result.parameters.map(transform).join(',' + ((_m = (_l = result.meta) === null || _l === void 0 ? void 0 : _l.parameterSpacing) !== null && _m !== void 0 ? _m : ' '))})${(_p = (_o = result.meta) === null || _o === void 0 ? void 0 : _o.preReturnMarkerSpacing) !== null && _p !== void 0 ? _p : ''}:${(_r = (_q = result.meta) === null || _q === void 0 ? void 0 : _q.postReturnMarkerSpacing) !== null && _r !== void 0 ? _r : ' '}${transform(result.returnType)}`;
                }
            }
        };
    }
    const storedStringifyRules = stringifyRules();
    function stringify(result, stringificationRules = storedStringifyRules) {
        if (typeof stringificationRules === 'function') {
            stringificationRules = stringifyRules({
                computedPropertyStringifier: stringificationRules,
            });
        }
        return transform(stringificationRules, result);
    }

    const reservedWords = [
        'null',
        'true',
        'false',
        'break',
        'case',
        'catch',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'export',
        'extends',
        'finally',
        'for',
        'function',
        'if',
        'import',
        'in',
        'instanceof',
        'new',
        'return',
        'super',
        'switch',
        'this',
        'throw',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'yield'
    ];
    function makeName(value) {
        const result = {
            type: 'NameExpression',
            name: value
        };
        if (reservedWords.includes(value)) {
            result.reservedWord = true;
        }
        return result;
    }
    const catharsisTransformRules = {
        JsdocTypeOptional: (result, transform) => {
            const transformed = transform(result.element);
            transformed.optional = true;
            return transformed;
        },
        JsdocTypeNullable: (result, transform) => {
            const transformed = transform(result.element);
            transformed.nullable = true;
            return transformed;
        },
        JsdocTypeNotNullable: (result, transform) => {
            const transformed = transform(result.element);
            transformed.nullable = false;
            return transformed;
        },
        JsdocTypeVariadic: (result, transform) => {
            if (result.element === undefined) {
                throw new Error('dots without value are not allowed in catharsis mode');
            }
            const transformed = transform(result.element);
            transformed.repeatable = true;
            return transformed;
        },
        JsdocTypeAny: () => ({
            type: 'AllLiteral'
        }),
        JsdocTypeNull: () => ({
            type: 'NullLiteral'
        }),
        JsdocTypeStringValue: result => makeName(quote(result.value, result.meta.quote)),
        JsdocTypeUndefined: () => ({
            type: 'UndefinedLiteral'
        }),
        JsdocTypeUnknown: () => ({
            type: 'UnknownLiteral'
        }),
        JsdocTypeFunction: (result, transform) => {
            const params = extractSpecialParams(result);
            const transformed = {
                type: 'FunctionType',
                params: params.params.map(transform)
            };
            if (params.this !== undefined) {
                transformed.this = transform(params.this);
            }
            if (params.new !== undefined) {
                transformed.new = transform(params.new);
            }
            if (result.returnType !== undefined) {
                transformed.result = transform(result.returnType);
            }
            return transformed;
        },
        JsdocTypeGeneric: (result, transform) => ({
            type: 'TypeApplication',
            applications: result.elements.map(o => transform(o)),
            expression: transform(result.left)
        }),
        JsdocTypeSpecialNamePath: result => makeName(result.specialType + ':' + quote(result.value, result.meta.quote)),
        JsdocTypeName: result => {
            if (result.value !== 'function') {
                return makeName(result.value);
            }
            else {
                return {
                    type: 'FunctionType',
                    params: []
                };
            }
        },
        JsdocTypeNumber: result => makeName(result.value.toString()),
        JsdocTypeObject: (result, transform) => {
            const transformed = {
                type: 'RecordType',
                fields: []
            };
            for (const field of result.elements) {
                if (field.type !== 'JsdocTypeObjectField' && field.type !== 'JsdocTypeJsdocObjectField') {
                    transformed.fields.push({
                        type: 'FieldType',
                        key: transform(field),
                        value: undefined
                    });
                }
                else {
                    transformed.fields.push(transform(field));
                }
            }
            return transformed;
        },
        JsdocTypeObjectField: (result, transform) => {
            if (typeof result.key !== 'string') {
                throw new Error('Index signatures and mapped types are not supported');
            }
            return {
                type: 'FieldType',
                key: makeName(quote(result.key, result.meta.quote)),
                value: result.right === undefined ? undefined : transform(result.right)
            };
        },
        JsdocTypeJsdocObjectField: (result, transform) => ({
            type: 'FieldType',
            key: transform(result.left),
            value: transform(result.right)
        }),
        JsdocTypeUnion: (result, transform) => ({
            type: 'TypeUnion',
            elements: result.elements.map(e => transform(e))
        }),
        JsdocTypeKeyValue: (result, transform) => ({
            type: 'FieldType',
            key: makeName(result.key),
            value: result.right === undefined ? undefined : transform(result.right)
        }),
        JsdocTypeNamePath: (result, transform) => {
            const leftResult = transform(result.left);
            let rightValue;
            if (result.right.type === 'JsdocTypeIndexedAccessIndex') {
                throw new TypeError('JsdocTypeIndexedAccessIndex is not supported in catharsis');
            }
            if (result.right.type === 'JsdocTypeSpecialNamePath') {
                rightValue = transform(result.right).name;
            }
            else {
                rightValue = quote(result.right.value, result.right.meta.quote);
            }
            const joiner = result.pathType === 'inner' ? '~' : result.pathType === 'instance' ? '#' : '.';
            return makeName(`${leftResult.name}${joiner}${rightValue}`);
        },
        JsdocTypeSymbol: result => {
            let value = '';
            let element = result.element;
            let trailingDots = false;
            if ((element === null || element === void 0 ? void 0 : element.type) === 'JsdocTypeVariadic') {
                if (element.meta.position === 'prefix') {
                    value = '...';
                }
                else {
                    trailingDots = true;
                }
                element = element.element;
            }
            if ((element === null || element === void 0 ? void 0 : element.type) === 'JsdocTypeName') {
                value += element.value;
            }
            else if ((element === null || element === void 0 ? void 0 : element.type) === 'JsdocTypeNumber') {
                value += element.value.toString();
            }
            if (trailingDots) {
                value += '...';
            }
            return makeName(`${result.value}(${value})`);
        },
        JsdocTypeParenthesis: (result, transform) => transform(assertRootResult(result.element)),
        JsdocTypeMappedType: notAvailableTransform,
        JsdocTypeIndexSignature: notAvailableTransform,
        JsdocTypeImport: notAvailableTransform,
        JsdocTypeKeyof: notAvailableTransform,
        JsdocTypeTuple: notAvailableTransform,
        JsdocTypeTypeof: notAvailableTransform,
        JsdocTypeIntersection: notAvailableTransform,
        JsdocTypeProperty: notAvailableTransform,
        JsdocTypePredicate: notAvailableTransform,
        JsdocTypeAsserts: notAvailableTransform,
        JsdocTypeReadonlyArray: notAvailableTransform,
        JsdocTypeAssertsPlain: notAvailableTransform,
        JsdocTypeConditional: notAvailableTransform,
        JsdocTypeTypeParameter: notAvailableTransform,
        JsdocTypeCallSignature: notAvailableTransform,
        JsdocTypeConstructorSignature: notAvailableTransform,
        JsdocTypeMethodSignature: notAvailableTransform,
        JsdocTypeIndexedAccessIndex: notAvailableTransform,
        JsdocTypeTemplateLiteral: notAvailableTransform,
        JsdocTypeComputedProperty: notAvailableTransform,
        JsdocTypeComputedMethod: notAvailableTransform
    };
    function catharsisTransform(result) {
        return transform(catharsisTransformRules, result);
    }

    function getQuoteStyle(quote) {
        switch (quote) {
            case undefined:
                return 'none';
            case 'single':
                return 'single';
            case 'double':
                return 'double';
        }
    }
    function getMemberType(type) {
        switch (type) {
            case 'inner':
                return 'INNER_MEMBER';
            case 'instance':
                return 'INSTANCE_MEMBER';
            case 'property':
                return 'MEMBER';
            case 'property-brackets':
                return 'MEMBER';
        }
    }
    function nestResults(type, results) {
        if (results.length === 2) {
            return {
                type,
                left: results[0],
                right: results[1]
            };
        }
        else {
            return {
                type,
                left: results[0],
                right: nestResults(type, results.slice(1))
            };
        }
    }
    const jtpRules = {
        JsdocTypeOptional: (result, transform) => ({
            type: 'OPTIONAL',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'prefix' ? 'PREFIX_EQUAL_SIGN' : 'SUFFIX_EQUALS_SIGN'
            }
        }),
        JsdocTypeNullable: (result, transform) => ({
            type: 'NULLABLE',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'prefix' ? 'PREFIX_QUESTION_MARK' : 'SUFFIX_QUESTION_MARK'
            }
        }),
        JsdocTypeNotNullable: (result, transform) => ({
            type: 'NOT_NULLABLE',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'prefix' ? 'PREFIX_BANG' : 'SUFFIX_BANG'
            }
        }),
        JsdocTypeVariadic: (result, transform) => {
            const transformed = {
                type: 'VARIADIC',
                meta: {
                    syntax: result.meta.position === 'prefix'
                        ? 'PREFIX_DOTS'
                        : result.meta.position === 'suffix' ? 'SUFFIX_DOTS' : 'ONLY_DOTS'
                }
            };
            if (result.element !== undefined) {
                transformed.value = transform(result.element);
            }
            return transformed;
        },
        JsdocTypeName: result => ({
            type: 'NAME',
            name: result.value
        }),
        JsdocTypeTypeof: (result, transform) => ({
            type: 'TYPE_QUERY',
            name: transform(result.element)
        }),
        JsdocTypeTuple: (result, transform) => ({
            type: 'TUPLE',
            entries: result.elements.map(transform)
        }),
        JsdocTypeKeyof: (result, transform) => ({
            type: 'KEY_QUERY',
            value: transform(result.element)
        }),
        JsdocTypeImport: result => ({
            type: 'IMPORT',
            path: {
                type: 'STRING_VALUE',
                quoteStyle: getQuoteStyle(result.element.meta.quote),
                string: result.element.value
            }
        }),
        JsdocTypeUndefined: () => ({
            type: 'NAME',
            name: 'undefined'
        }),
        JsdocTypeAny: () => ({
            type: 'ANY'
        }),
        JsdocTypeFunction: (result, transform) => {
            const specialParams = extractSpecialParams(result);
            const transformed = {
                type: result.arrow ? 'ARROW' : 'FUNCTION',
                params: specialParams.params.map(param => {
                    if (param.type === 'JsdocTypeKeyValue') {
                        if (param.right === undefined) {
                            throw new Error('Function parameter without \':\' is not expected to be \'KEY_VALUE\'');
                        }
                        return {
                            type: 'NAMED_PARAMETER',
                            name: param.key,
                            typeName: transform(param.right)
                        };
                    }
                    else {
                        return transform(param);
                    }
                }),
                new: null,
                returns: null
            };
            if (specialParams.this !== undefined) {
                transformed.this = transform(specialParams.this);
            }
            else if (!result.arrow) {
                transformed.this = null;
            }
            if (specialParams.new !== undefined) {
                transformed.new = transform(specialParams.new);
            }
            if (result.returnType !== undefined) {
                transformed.returns = transform(result.returnType);
            }
            return transformed;
        },
        JsdocTypeGeneric: (result, transform) => {
            const transformed = {
                type: 'GENERIC',
                subject: transform(result.left),
                objects: result.elements.map(transform),
                meta: {
                    syntax: result.meta.brackets === 'square' ? 'SQUARE_BRACKET' : result.meta.dot ? 'ANGLE_BRACKET_WITH_DOT' : 'ANGLE_BRACKET'
                }
            };
            if (result.meta.brackets === 'square' && result.elements[0].type === 'JsdocTypeFunction' && !result.elements[0].parenthesis) {
                transformed.objects[0] = {
                    type: 'NAME',
                    name: 'function'
                };
            }
            return transformed;
        },
        JsdocTypeObjectField: (result, transform) => {
            if (typeof result.key !== 'string') {
                throw new Error('Index signatures and mapped types are not supported');
            }
            if (result.right === undefined) {
                return {
                    type: 'RECORD_ENTRY',
                    key: result.key,
                    quoteStyle: getQuoteStyle(result.meta.quote),
                    value: null,
                    readonly: false
                };
            }
            let right = transform(result.right);
            if (result.optional) {
                right = {
                    type: 'OPTIONAL',
                    value: right,
                    meta: {
                        syntax: 'SUFFIX_KEY_QUESTION_MARK'
                    }
                };
            }
            return {
                type: 'RECORD_ENTRY',
                key: result.key,
                quoteStyle: getQuoteStyle(result.meta.quote),
                value: right,
                readonly: false
            };
        },
        JsdocTypeJsdocObjectField: () => {
            throw new Error('Keys may not be typed in jsdoctypeparser.');
        },
        JsdocTypeKeyValue: (result, transform) => {
            if (result.right === undefined) {
                return {
                    type: 'RECORD_ENTRY',
                    key: result.key,
                    quoteStyle: 'none',
                    value: null,
                    readonly: false
                };
            }
            let right = transform(result.right);
            if (result.optional) {
                right = {
                    type: 'OPTIONAL',
                    value: right,
                    meta: {
                        syntax: 'SUFFIX_KEY_QUESTION_MARK'
                    }
                };
            }
            return {
                type: 'RECORD_ENTRY',
                key: result.key,
                quoteStyle: 'none',
                value: right,
                readonly: false
            };
        },
        JsdocTypeObject: (result, transform) => {
            const entries = [];
            for (const field of result.elements) {
                if (field.type === 'JsdocTypeObjectField' || field.type === 'JsdocTypeJsdocObjectField') {
                    entries.push(transform(field));
                }
            }
            return {
                type: 'RECORD',
                entries
            };
        },
        JsdocTypeSpecialNamePath: result => {
            if (result.specialType !== 'module') {
                throw new Error(`jsdoctypeparser does not support type ${result.specialType} at this point.`);
            }
            return {
                type: 'MODULE',
                value: {
                    type: 'FILE_PATH',
                    quoteStyle: getQuoteStyle(result.meta.quote),
                    path: result.value
                }
            };
        },
        JsdocTypeNamePath: (result, transform) => {
            let hasEventPrefix = false;
            let name;
            let quoteStyle;
            if (result.right.type === 'JsdocTypeIndexedAccessIndex') {
                throw new TypeError('JsdocTypeIndexedAccessIndex not allowed in jtp');
            }
            if (result.right.type === 'JsdocTypeSpecialNamePath' && result.right.specialType === 'event') {
                hasEventPrefix = true;
                name = result.right.value;
                quoteStyle = getQuoteStyle(result.right.meta.quote);
            }
            else {
                name = result.right.value;
                quoteStyle = getQuoteStyle(result.right.meta.quote);
            }
            const transformed = {
                type: getMemberType(result.pathType),
                owner: transform(result.left),
                name,
                quoteStyle,
                hasEventPrefix
            };
            if (transformed.owner.type === 'MODULE') {
                const tModule = transformed.owner;
                transformed.owner = transformed.owner.value;
                tModule.value = transformed;
                return tModule;
            }
            else {
                return transformed;
            }
        },
        JsdocTypeUnion: (result, transform) => nestResults('UNION', result.elements.map(transform)),
        JsdocTypeParenthesis: (result, transform) => ({
            type: 'PARENTHESIS',
            value: transform(assertRootResult(result.element))
        }),
        JsdocTypeNull: () => ({
            type: 'NAME',
            name: 'null'
        }),
        JsdocTypeUnknown: () => ({
            type: 'UNKNOWN'
        }),
        JsdocTypeStringValue: result => ({
            type: 'STRING_VALUE',
            quoteStyle: getQuoteStyle(result.meta.quote),
            string: result.value
        }),
        JsdocTypeIntersection: (result, transform) => nestResults('INTERSECTION', result.elements.map(transform)),
        JsdocTypeNumber: result => ({
            type: 'NUMBER_VALUE',
            number: result.value.toString()
        }),
        JsdocTypeSymbol: notAvailableTransform,
        JsdocTypeProperty: notAvailableTransform,
        JsdocTypePredicate: notAvailableTransform,
        JsdocTypeMappedType: notAvailableTransform,
        JsdocTypeIndexSignature: notAvailableTransform,
        JsdocTypeAsserts: notAvailableTransform,
        JsdocTypeReadonlyArray: notAvailableTransform,
        JsdocTypeAssertsPlain: notAvailableTransform,
        JsdocTypeConditional: notAvailableTransform,
        JsdocTypeTypeParameter: notAvailableTransform,
        JsdocTypeCallSignature: notAvailableTransform,
        JsdocTypeConstructorSignature: notAvailableTransform,
        JsdocTypeMethodSignature: notAvailableTransform,
        JsdocTypeIndexedAccessIndex: notAvailableTransform,
        JsdocTypeTemplateLiteral: notAvailableTransform,
        JsdocTypeComputedProperty: notAvailableTransform,
        JsdocTypeComputedMethod: notAvailableTransform
    };
    function jtpTransform(result) {
        return transform(jtpRules, result);
    }

    function identityTransformRules() {
        return {
            JsdocTypeIntersection: (result, transform) => ({
                type: 'JsdocTypeIntersection',
                elements: result.elements.map(transform)
            }),
            JsdocTypeGeneric: (result, transform) => ({
                type: 'JsdocTypeGeneric',
                left: transform(result.left),
                elements: result.elements.map(transform),
                meta: {
                    dot: result.meta.dot,
                    brackets: result.meta.brackets
                }
            }),
            JsdocTypeNullable: result => result,
            JsdocTypeUnion: (result, transform) => ({
                type: 'JsdocTypeUnion',
                elements: result.elements.map(transform)
            }),
            JsdocTypeUnknown: result => result,
            JsdocTypeUndefined: result => result,
            JsdocTypeTypeof: (result, transform) => ({
                type: 'JsdocTypeTypeof',
                element: transform(result.element)
            }),
            JsdocTypeSymbol: (result, transform) => {
                const transformed = {
                    type: 'JsdocTypeSymbol',
                    value: result.value
                };
                if (result.element !== undefined) {
                    transformed.element = transform(result.element);
                }
                return transformed;
            },
            JsdocTypeOptional: (result, transform) => ({
                type: 'JsdocTypeOptional',
                element: transform(result.element),
                meta: {
                    position: result.meta.position
                }
            }),
            JsdocTypeObject: (result, transform) => ({
                type: 'JsdocTypeObject',
                meta: {
                    separator: 'comma'
                },
                elements: result.elements.map(transform)
            }),
            JsdocTypeNumber: result => result,
            JsdocTypeNull: result => result,
            JsdocTypeNotNullable: (result, transform) => ({
                type: 'JsdocTypeNotNullable',
                element: transform(result.element),
                meta: {
                    position: result.meta.position
                }
            }),
            JsdocTypeSpecialNamePath: result => result,
            JsdocTypeObjectField: (result, transform) => ({
                type: 'JsdocTypeObjectField',
                key: result.key,
                right: result.right === undefined ? undefined : transform(result.right),
                optional: result.optional,
                readonly: result.readonly,
                meta: result.meta
            }),
            JsdocTypeJsdocObjectField: (result, transform) => ({
                type: 'JsdocTypeJsdocObjectField',
                left: transform(result.left),
                right: transform(result.right)
            }),
            JsdocTypeKeyValue: (result, transform) => ({
                type: 'JsdocTypeKeyValue',
                key: result.key,
                right: result.right === undefined ? undefined : transform(result.right),
                optional: result.optional,
                variadic: result.variadic
            }),
            JsdocTypeImport: (result, transform) => ({
                type: 'JsdocTypeImport',
                element: transform(result.element)
            }),
            JsdocTypeAny: result => result,
            JsdocTypeStringValue: result => result,
            JsdocTypeNamePath: result => result,
            JsdocTypeVariadic: (result, transform) => {
                const transformed = {
                    type: 'JsdocTypeVariadic',
                    meta: {
                        position: result.meta.position,
                        squareBrackets: result.meta.squareBrackets
                    }
                };
                if (result.element !== undefined) {
                    transformed.element = transform(result.element);
                }
                return transformed;
            },
            JsdocTypeTuple: (result, transform) => ({
                type: 'JsdocTypeTuple',
                elements: result.elements.map(transform)
            }),
            JsdocTypeName: result => result,
            JsdocTypeFunction: (result, transform) => {
                const transformed = {
                    type: 'JsdocTypeFunction',
                    arrow: result.arrow,
                    parameters: result.parameters.map(transform),
                    constructor: result.constructor,
                    parenthesis: result.parenthesis
                };
                if (result.returnType !== undefined) {
                    transformed.returnType = transform(result.returnType);
                }
                return transformed;
            },
            JsdocTypeKeyof: (result, transform) => ({
                type: 'JsdocTypeKeyof',
                element: transform(result.element)
            }),
            JsdocTypeParenthesis: (result, transform) => ({
                type: 'JsdocTypeParenthesis',
                element: transform(result.element)
            }),
            JsdocTypeProperty: result => result,
            JsdocTypePredicate: (result, transform) => ({
                type: 'JsdocTypePredicate',
                left: transform(result.left),
                right: transform(result.right)
            }),
            JsdocTypeIndexSignature: (result, transform) => ({
                type: 'JsdocTypeIndexSignature',
                key: result.key,
                right: transform(result.right)
            }),
            JsdocTypeMappedType: (result, transform) => ({
                type: 'JsdocTypeMappedType',
                key: result.key,
                right: transform(result.right)
            }),
            JsdocTypeAsserts: (result, transform) => ({
                type: 'JsdocTypeAsserts',
                left: transform(result.left),
                right: transform(result.right)
            }),
            JsdocTypeReadonlyArray: (result, transform) => ({
                type: 'JsdocTypeReadonlyArray',
                element: transform(result.element)
            }),
            JsdocTypeAssertsPlain: (result, transform) => ({
                type: 'JsdocTypeAssertsPlain',
                element: transform(result.element)
            }),
            JsdocTypeConditional: (result, transform) => ({
                type: 'JsdocTypeConditional',
                checksType: transform(result.checksType),
                extendsType: transform(result.extendsType),
                trueType: transform(result.trueType),
                falseType: transform(result.falseType)
            }),
            JsdocTypeTypeParameter: (result, transform) => ({
                type: 'JsdocTypeTypeParameter',
                name: transform(result.name),
                constraint: result.constraint !== undefined ? transform(result.constraint) : undefined,
                defaultValue: result.defaultValue !== undefined ? transform(result.defaultValue) : undefined
            }),
            JsdocTypeCallSignature: (result, transform) => ({
                type: 'JsdocTypeCallSignature',
                parameters: result.parameters.map(transform),
                returnType: transform(result.returnType)
            }),
            JsdocTypeConstructorSignature: (result, transform) => ({
                type: 'JsdocTypeConstructorSignature',
                parameters: result.parameters.map(transform),
                returnType: transform(result.returnType)
            }),
            JsdocTypeMethodSignature: (result, transform) => ({
                type: 'JsdocTypeMethodSignature',
                name: result.name,
                parameters: result.parameters.map(transform),
                returnType: transform(result.returnType),
                meta: result.meta
            }),
            JsdocTypeIndexedAccessIndex: (result, transform) => ({
                type: 'JsdocTypeIndexedAccessIndex',
                right: transform(result.right)
            }),
            JsdocTypeTemplateLiteral: (result, transform) => ({
                type: 'JsdocTypeTemplateLiteral',
                literals: result.literals,
                interpolations: result.interpolations.map(transform)
            }),
            JsdocTypeComputedProperty: (result, transform) => {
                if (result.value.type.startsWith('JsdocType')) {
                    return {
                        type: 'JsdocTypeComputedProperty',
                        value: transform(result.value)
                    };
                }
                else {
                    return {
                        type: 'JsdocTypeComputedProperty',
                        value: structuredClone(result.value)
                    };
                }
            },
            JsdocTypeComputedMethod: (result, transform) => {
                if (result.value.type.startsWith('JsdocType')) {
                    return {
                        type: 'JsdocTypeComputedMethod',
                        value: transform(result.value),
                        optional: result.optional,
                        parameters: result.parameters.map(transform),
                        returnType: transform(result.returnType)
                    };
                }
                else {
                    return {
                        type: 'JsdocTypeComputedMethod',
                        value: structuredClone(result.value),
                        optional: result.optional,
                        parameters: result.parameters.map(transform),
                        returnType: transform(result.returnType)
                    };
                }
            }
        };
    }

    const visitorKeys = {
        JsdocTypeAny: [],
        JsdocTypeFunction: ['typeParameters', 'parameters', 'returnType'],
        JsdocTypeGeneric: ['left', 'elements'],
        JsdocTypeImport: ['element'],
        JsdocTypeIndexSignature: ['right'],
        JsdocTypeIntersection: ['elements'],
        JsdocTypeKeyof: ['element'],
        JsdocTypeKeyValue: ['right'],
        JsdocTypeMappedType: ['right'],
        JsdocTypeName: [],
        JsdocTypeNamePath: ['left', 'right'],
        JsdocTypeNotNullable: ['element'],
        JsdocTypeNull: [],
        JsdocTypeNullable: ['element'],
        JsdocTypeNumber: [],
        JsdocTypeObject: ['elements'],
        JsdocTypeObjectField: ['key', 'right'],
        JsdocTypeJsdocObjectField: ['left', 'right'],
        JsdocTypeOptional: ['element'],
        JsdocTypeParenthesis: ['element'],
        JsdocTypeSpecialNamePath: [],
        JsdocTypeStringValue: [],
        JsdocTypeSymbol: ['element'],
        JsdocTypeTuple: ['elements'],
        JsdocTypeTypeof: ['element'],
        JsdocTypeUndefined: [],
        JsdocTypeUnion: ['elements'],
        JsdocTypeUnknown: [],
        JsdocTypeVariadic: ['element'],
        JsdocTypeProperty: [],
        JsdocTypePredicate: ['left', 'right'],
        JsdocTypeAsserts: ['left', 'right'],
        JsdocTypeReadonlyArray: ['element'],
        JsdocTypeAssertsPlain: ['element'],
        JsdocTypeConditional: ['checksType', 'extendsType', 'trueType', 'falseType'],
        JsdocTypeTypeParameter: ['name', 'constraint', 'defaultValue'],
        JsdocTypeCallSignature: ['typeParameters', 'parameters', 'returnType'],
        JsdocTypeConstructorSignature: ['typeParameters', 'parameters', 'returnType'],
        JsdocTypeMethodSignature: ['typeParameters', 'parameters', 'returnType'],
        JsdocTypeIndexedAccessIndex: ['right'],
        JsdocTypeTemplateLiteral: ['interpolations'],
        JsdocTypeComputedProperty: ['value'],
        JsdocTypeComputedMethod: ['value', 'typeParameters', 'parameters', 'returnType']
    };

    function _traverse(node, parentNode, property, index, onEnter, onLeave) {
        onEnter === null || onEnter === void 0 ? void 0 : onEnter(node, parentNode, property, index);
        const keysToVisit = visitorKeys[node.type];
        for (const key of keysToVisit) {
            const value = node[key];
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    for (const [index, element] of value.entries()) {
                        _traverse(element, node, key, index, onEnter, onLeave);
                    }
                }
                else if (value !== null && typeof value === 'object' && 'type' in value) {
                    _traverse(value, node, key, undefined, onEnter, onLeave);
                }
            }
        }
        onLeave === null || onLeave === void 0 ? void 0 : onLeave(node, parentNode, property, index);
    }
    /**
     * A function to traverse an AST. It traverses it depth first.
     * @param node the node to start traversing at.
     * @param onEnter node visitor function that will be called on entering the node. This corresponds to preorder traversing.
     * @param onLeave node visitor function that will be called on leaving the node. This corresponds to postorder traversing.
     */
    function traverse(node, onEnter, onLeave) {
        _traverse(node, undefined, undefined, undefined, onEnter, onLeave);
    }

    exports.catharsisTransform = catharsisTransform;
    exports.identityTransformRules = identityTransformRules;
    exports.jtpTransform = jtpTransform;
    exports.parse = parse;
    exports.parseName = parseName;
    exports.parseNamePath = parseNamePath;
    exports.stringify = stringify;
    exports.stringifyRules = stringifyRules;
    exports.transform = transform;
    exports.traverse = traverse;
    exports.tryParse = tryParse;
    exports.visitorKeys = visitorKeys;

}));
