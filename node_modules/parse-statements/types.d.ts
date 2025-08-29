/**
 * Description of comment as the callback handlers and open and close tokens.
 */
export type Comment<Context> = Readonly<{
    /**
     * An optional callback handler for comment parsing errors.
     */
    onError?: OnCommentError<Context>;
    /**
     * An optional callback handler of comment.
     */
    onParse?: OnCommentParse<Context>;
    /**
     * Pair of the comment open and close raw tokens.
     */
    tokens: CommentPair<string>;
}>;
/**
 * Pair of the comment open and close tokens (raw or parsed).
 */
export type CommentPair<Token = ParsedToken> = readonly [open: Token, close: Token];
/**
 * Key of regexp (name of named capturing groups).
 */
export type Key = string;
/**
 * Returns a copy of the object type with mutable properties.
 * `Mutable<{readonly foo: string}>` = `{foo: string}`.
 */
export type Mutable<Type> = {
    -readonly [Key in keyof Type]: Type[Key];
};
/**
 * `onError` callback handler for error on comment parsing.
 */
export type OnCommentError<Context> = Callback<Context, [open: ParsedToken]>;
/**
 * `onParse` callback handler of comment.
 */
export type OnCommentParse<Context> = Callback<Context, CommentPair>;
/**
 * Global `onError` callback handler for error on parsing.
 */
export type OnGlobalError<Context> = Callback<Context, [message: string, index: number]>;
/**
 * `onParse` callback handler of statement with concrete length (number of tokens).
 */
export type OnParse<Context = any, Length extends keyof AllLength | 0 = 0> = Callback<Context, Length extends keyof AllLength ? [...AllLength[Length], ParsedToken] : ParsedTokens, void | number>;
/**
 * Options of `createParseFunction` function.
 */
export type Options<Context> = Readonly<{
    /**
     * An optional array of comments as token pairs with optional callbacks.
     */
    comments?: readonly Comment<Context>[];
    /**
     * An optional callback for global parsing errors.
     */
    onError?: OnGlobalError<Context>;
    /**
     * An optional array of statements as a non-empty array of tokens with optional callbacks.
     */
    statements?: readonly Statement<Context>[];
}>;
/**
 * Parse function.
 */
export type Parse<Context> = Callback<Context, []>;
/**
 * The result of parsing the token.
 */
export type ParsedToken = Readonly<{
    /**
     * Index of token start (in source code).
     */
    start: number;
    /**
     * Index of token end (in source code).
     */
    end: number;
    /**
     * The result of calling the `exec` method in which this token was found.
     */
    match: RegExpExecArray;
    /**
     * The found token as a substring of the source code.
     */
    token: string;
}>;
/**
 * The result of parsing the statement.
 */
export type ParsedTokens = [...ParsedTokenWithComments[], ParsedToken];
/**
 * The result of parsing a statement token with parsed comment tokens
 * in the code between this token and the next token of statement.
 */
export type ParsedTokenWithComments = ParsedToken & {
    readonly comments?: readonly CommentPair[];
};
/**
 * Internal prepared description of comment.
 */
export type PreparedComment<Context> = Readonly<{
    closeRegExp: RegExp;
    onError: Comment<Context>['onError'];
    onParse: Comment<Context>['onParse'];
}>;
/**
 * Internal prepared options of parse function.
 */
export type PreparedOptions<Context> = Readonly<{
    commentsKeys: readonly Key[];
    nextStatementRegExp: RegExp;
    onError: Options<Context>['onError'];
    preparedComments: Readonly<Record<Key, PreparedComment<Context>>>;
    preparedStatements: Readonly<Record<Key, PreparedStatement<Context>>>;
    statementsKeys: readonly Key[];
}>;
/**
 * Internal prepared description of statement.
 */
export type PreparedStatement<Context> = Readonly<{
    onError: Statement<Context>['onError'];
    onParse: Statement<Context>['onParse'];
    tokens: readonly PreparedToken[];
}>;
/**
 * Internal prepared description of token.
 */
export type PreparedToken = Readonly<{
    nextTokenKey: Key;
    nextTokenRegExp: RegExp;
}>;
/**
 * Description of statement as the callback handlers and a sequence of tokens.
 */
export type Statement<Context> = Readonly<{
    /**
     * If `true`, then we parse comments inside the statement (between its parts).
     */
    canIncludeComments: boolean;
    /**
     * An optional callback handler for statement parsing errors.
     */
    onError?: OnParse<Context>;
    /**
     * An optional callback handler of statement.
     */
    onParse?: OnParse<Context>;
    /**
     * Not-empty array of statement raw tokens.
     */
    tokens: readonly [string, ...string[]];
    /**
     * If `true`, then the statement first token is searched before the comment tokens, otherwise after.
     */
    shouldSearchBeforeComments: boolean;
}>;
/**
 * Pair of the token and his regexp key.
 */
export type TokenWithKey = readonly [key: Key, token: string];
/**
 * Supported number of tokens in statements.
 */
type AllLength<P = ParsedTokenWithComments> = {
    1: [];
    2: [P];
    3: [P, P];
    4: [P, P, P];
    5: [P, P, P, P];
    6: [P, P, P, P, P];
    7: [P, P, P, P, P, P];
    8: [P, P, P, P, P, P, P];
    9: [P, P, P, P, P, P, P, P];
    10: [P, P, P, P, P, P, P, P, P];
    11: [P, P, P, P, P, P, P, P, P, P];
    12: [P, P, P, P, P, P, P, P, P, P, P];
    13: [P, P, P, P, P, P, P, P, P, P, P, P];
    14: [P, P, P, P, P, P, P, P, P, P, P, P, P];
    15: [P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    16: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    17: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    18: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    19: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    20: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    21: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    22: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    23: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    24: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    25: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    26: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    27: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    28: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    29: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    30: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    31: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
    32: [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P];
};
/**
 * A callback handler called on successful parsing of a statement or on an error during parsing.
 */
type Callback<Context, Arguments extends readonly unknown[], Return = void> = (this: void, context: Context, source: string, ...args: Arguments) => Return;
export {};
