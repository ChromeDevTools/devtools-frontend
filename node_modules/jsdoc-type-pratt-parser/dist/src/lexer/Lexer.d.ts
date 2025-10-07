import type { Token } from './Token.js';
import type { Rule } from './LexerRules.js';
export declare class Lexer {
    private readonly text;
    readonly lexerRules: Rule[];
    readonly current: Token;
    readonly next: Token;
    readonly previous: Token | undefined;
    static create(lexerRules: Rule[], text: string): Lexer;
    private constructor();
    private static read;
    remaining(): string;
    advance(): Lexer;
}
