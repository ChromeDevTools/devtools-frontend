export type Token = import('./tokenizer.js').Token;
export type TokenType = import('./tokenizer.js').TokenType;
export type Node = import('./node.js').Node;
export type PrefixParselet = (p: Parser, token: Token) => Node;
declare class Parser {
    /** @private */
    i;
    /** @private @readonly */
    tokens;
    /**
     * @param {Token[]} tokens
     */
    constructor(tokens: Token[]);
    /** @return {Token} */
    peek(): Token;
    /** @return {Token} */
    next(): Token;
    /**
     * @param {TokenType} type
     * @param {string} [value]
     * @return {Token}
     */
    expect(type: TokenType, value?: string): Token;
    /**
     * @param {string} value
     * @param {string} [value2]
     * @return {boolean}
     */
    isPunct(value: string, value2?: string): boolean;
    /**
     * @param {string} value
     * @return {boolean}
     */
    matchPunct(value: string): boolean;
    /**
     * @param {string} value
     * @return {Token}
     */
    expectPunct(value: string): Token;
    /**
     * @param {number} [minBp]
     * @return {Node}
     */
    parseExpr(minBp?: number): Node;
}
/**
 * @param {Token[]} tokens
 * @return {Node}
 */
declare function parse(tokens: Token[]): Node;
export { parse };
