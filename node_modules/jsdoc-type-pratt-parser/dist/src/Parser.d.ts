import type { Lexer } from './lexer/Lexer.js';
import type { Grammar } from './grammars/Grammar.js';
import { Precedence } from './Precedence.js';
import type { RootResult } from './result/RootResult.js';
import type { IntermediateResult } from './result/IntermediateResult.js';
import type { TokenType } from './lexer/Token.js';
export declare class Parser {
    readonly grammar: Grammar;
    private _lexer;
    readonly baseParser?: Parser;
    readonly externalParsers?: Record<string, ((text: string, options?: any) => unknown) | undefined>;
    readonly module?: boolean;
    readonly strictMode?: boolean;
    readonly asyncFunctionBody?: boolean;
    readonly classContext?: boolean;
    constructor(grammar: Grammar, lexer: Lexer, baseParser?: Parser, { module, strictMode, asyncFunctionBody, classContext, externalParsers }?: {
        module?: boolean;
        strictMode?: boolean;
        asyncFunctionBody?: boolean;
        classContext?: boolean;
        externalParsers?: Record<string, ((text: string, options?: any) => unknown) | undefined>;
    });
    get lexer(): Lexer;
    /**
     * Parses a given string and throws an error if the parse ended before the end of the string.
     */
    parse(): RootResult;
    /**
     * Parses with the current lexer and asserts that the result is a {@link RootResult}.
     */
    parseType(precedence: Precedence): RootResult;
    /**
     * The main parsing function. First it tries to parse the current state in the prefix step, and then it continues
     * to parse the state in the infix step.
     */
    parseIntermediateType(precedence: Precedence): IntermediateResult;
    /**
     * In the infix parsing step the parser continues to parse the current state with all parslets until none returns
     * a result.
     */
    parseInfixIntermediateType(left: IntermediateResult, precedence: Precedence): IntermediateResult;
    /**
     * Tries to parse the current state with all parslets in the grammar and returns the first non null result.
     */
    private tryParslets;
    /**
     * If the given type equals the current type of the {@link Lexer} advance the lexer. Return true if the lexer was
     * advanced.
     */
    consume(types: TokenType | TokenType[]): boolean;
    acceptLexerState(parser: Parser): void;
}
