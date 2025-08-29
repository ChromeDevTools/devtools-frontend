import type { Options, Parse } from './types';
/**
 * Creates parse function by comments and statements.
 */
export declare const createParseFunction: <Context>(options: Options<Context>) => Parse<Context>;
export type { Comment, CommentPair, OnCommentError, OnCommentParse, OnGlobalError, OnParse, Options, Parse, ParsedToken, Statement, } from './types';
