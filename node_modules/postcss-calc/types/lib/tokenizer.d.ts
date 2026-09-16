export type TokenType = 'number' | 'dimension' | 'ident' | 'punct' | 'eof';
export type Token = {
    type: TokenType;
    value: string;
    /**
     * Present on `dimension` tokens; `%` for percentages.
     */
    unit?: string;
    pos: number;
    /**
     * Whitespace immediately before — drives the §10.1 `+`/`-` rule.
     */
    ws: boolean;
};
/**
 * @param {string} input
 * @return {Token[]}
 */
declare function tokenize(input: string): Token[];
/**
 * Convert a slice of an existing CSS token stream into the token subset used
 * by the calculation parser. Token positions remain relative to the original
 * source text, which keeps parse errors useful to adapter callers.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} cssTokens
 * @param {number} eofPosition
 * @param {number} [start]
 * @param {number} [end]
 * @return {Token[]}
 */
declare function tokenizeTokens(cssTokens: import('@csstools/css-tokenizer').CSSToken[], eofPosition: number, start?: number, end?: number): Token[];
export { tokenize, tokenizeTokens };
