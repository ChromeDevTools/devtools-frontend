import { getPreparedOptions } from './getPreparedOptions.js';
/**
 * Creates parse function by comments and statements.
 */
export const createParseFunction = (options) => {
    var { commentsKeys, nextStatementRegExp, onError: onGlobalError, preparedComments, preparedStatements, statementsKeys, } = getPreparedOptions(options);
    const parse = (context, source) => {
        var _a, _b, _c, _d, _e, _f;
        var index = 0;
        var parsedComments;
        var previousIndex;
        findNextStatement: while (index < source.length) {
            if (index === previousIndex) {
                index += 1;
                continue findNextStatement;
            }
            previousIndex = index;
            nextStatementRegExp.lastIndex = index;
            const nextStatementMatch = nextStatementRegExp.exec(source);
            if (nextStatementMatch === null) {
                return;
            }
            for (const key of statementsKeys) {
                const token = (_a = nextStatementMatch.groups) === null || _a === void 0 ? void 0 : _a[key];
                if (token === undefined) {
                    continue;
                }
                const parsedTokens = [];
                const { onError, onParse, tokens } = preparedStatements[key];
                index = nextStatementRegExp.lastIndex;
                let lastParsedToken = {
                    start: nextStatementMatch.index,
                    end: index,
                    match: nextStatementMatch,
                    token,
                };
                parsedTokens.push(lastParsedToken);
                for (const { nextTokenRegExp, nextTokenKey } of tokens) {
                    let previousTokensIndex;
                    let tokensIndex = index;
                    findNextToken: while (tokensIndex < source.length) {
                        if (tokensIndex === previousTokensIndex) {
                            tokensIndex += 1;
                            continue findNextToken;
                        }
                        previousTokensIndex = tokensIndex;
                        nextTokenRegExp.lastIndex = tokensIndex;
                        const nextTokenMatch = nextTokenRegExp.exec(source);
                        if (nextTokenMatch === null) {
                            if (parsedComments === undefined) {
                                parsedComments = {};
                                for (const commentPair of lastParsedToken.comments || emptyComments) {
                                    parsedComments[commentPair[0].start] = commentPair;
                                }
                            }
                            delete lastParsedToken.comments;
                            const maybeIndex = onError === null || onError === void 0 ? void 0 : onError(context, source, ...parsedTokens);
                            if (maybeIndex !== undefined) {
                                index = maybeIndex;
                            }
                            continue findNextStatement;
                        }
                        const nextToken = (_b = nextTokenMatch.groups) === null || _b === void 0 ? void 0 : _b[nextTokenKey];
                        if (nextToken !== undefined) {
                            index = nextTokenRegExp.lastIndex;
                            lastParsedToken = {
                                start: nextTokenMatch.index,
                                end: index,
                                match: nextTokenMatch,
                                token: nextToken,
                            };
                            parsedTokens.push(lastParsedToken);
                            break findNextToken;
                        }
                        for (const commentKey of commentsKeys) {
                            const commentToken = (_c = nextTokenMatch.groups) === null || _c === void 0 ? void 0 : _c[commentKey];
                            if (commentToken === undefined) {
                                continue;
                            }
                            if (parsedComments !== undefined) {
                                const commentPair = parsedComments[nextTokenMatch.index];
                                if (commentPair === undefined) {
                                    onGlobalError === null || onGlobalError === void 0 ? void 0 : onGlobalError(context, source, `Cannot find already parsed comment in statement ${token} with token ${commentToken}`, nextTokenMatch.index);
                                }
                                else {
                                    tokensIndex = commentPair[1].end;
                                    (_d = lastParsedToken.comments) !== null && _d !== void 0 ? _d : (lastParsedToken.comments = []);
                                    lastParsedToken.comments.push(commentPair);
                                    continue findNextToken;
                                }
                            }
                            const { closeRegExp, onError: onCommentError, onParse: onCommentParse, } = preparedComments[commentKey];
                            tokensIndex = nextTokenRegExp.lastIndex;
                            const openToken = {
                                start: nextTokenMatch.index,
                                end: tokensIndex,
                                match: nextTokenMatch,
                                token: commentToken,
                            };
                            closeRegExp.lastIndex = tokensIndex;
                            const closeMatch = closeRegExp.exec(source);
                            if (closeMatch === null) {
                                onCommentError === null || onCommentError === void 0 ? void 0 : onCommentError(context, source, openToken);
                                onError === null || onError === void 0 ? void 0 : onError(context, source, ...parsedTokens);
                                return;
                            }
                            tokensIndex = closeRegExp.lastIndex;
                            const closeToken = {
                                start: closeMatch.index,
                                end: tokensIndex,
                                match: closeMatch,
                                token: closeMatch[0],
                            };
                            (_e = lastParsedToken.comments) !== null && _e !== void 0 ? _e : (lastParsedToken.comments = []);
                            lastParsedToken.comments.push([openToken, closeToken]);
                            onCommentParse === null || onCommentParse === void 0 ? void 0 : onCommentParse(context, source, openToken, closeToken);
                            continue findNextToken;
                        }
                        onGlobalError === null || onGlobalError === void 0 ? void 0 : onGlobalError(context, source, `Cannot find next part of statement ${token} or comments by regexp ${nextTokenRegExp}`, tokensIndex);
                        tokensIndex = nextTokenRegExp.lastIndex;
                    }
                    if (tokensIndex >= source.length) {
                        if (parsedComments === undefined) {
                            parsedComments = {};
                            for (const commentPair of lastParsedToken.comments || emptyComments) {
                                parsedComments[commentPair[0].start] = commentPair;
                            }
                        }
                        delete lastParsedToken.comments;
                        const maybeIndex = onError === null || onError === void 0 ? void 0 : onError(context, source, ...parsedTokens);
                        if (maybeIndex !== undefined) {
                            index = maybeIndex;
                        }
                        continue findNextStatement;
                    }
                }
                const maybeIndex = onParse === null || onParse === void 0 ? void 0 : onParse(context, source, ...parsedTokens);
                if (maybeIndex !== undefined) {
                    index = maybeIndex;
                }
                continue findNextStatement;
            }
            for (const key of commentsKeys) {
                const token = (_f = nextStatementMatch.groups) === null || _f === void 0 ? void 0 : _f[key];
                if (token === undefined) {
                    continue;
                }
                if (parsedComments !== undefined) {
                    const commentPair = parsedComments[nextStatementMatch.index];
                    if (commentPair === undefined) {
                        onGlobalError === null || onGlobalError === void 0 ? void 0 : onGlobalError(context, source, `Cannot find already parsed comment with token ${token}`, nextStatementMatch.index);
                    }
                    else {
                        index = commentPair[1].end;
                        continue findNextStatement;
                    }
                }
                const { closeRegExp, onError, onParse } = preparedComments[key];
                index = nextStatementRegExp.lastIndex;
                const openToken = {
                    start: nextStatementMatch.index,
                    end: index,
                    match: nextStatementMatch,
                    token,
                };
                closeRegExp.lastIndex = index;
                const closeMatch = closeRegExp.exec(source);
                if (closeMatch === null) {
                    onError === null || onError === void 0 ? void 0 : onError(context, source, openToken);
                    return;
                }
                index = closeRegExp.lastIndex;
                const closeToken = {
                    start: closeMatch.index,
                    end: index,
                    match: closeMatch,
                    token: closeMatch[0],
                };
                onParse === null || onParse === void 0 ? void 0 : onParse(context, source, openToken, closeToken);
                continue findNextStatement;
            }
            onGlobalError === null || onGlobalError === void 0 ? void 0 : onGlobalError(context, source, `Cannot find statements or comments by regexp ${nextStatementRegExp}`, index);
            index = nextStatementRegExp.lastIndex;
        }
    };
    return parse;
};
/**
 * Empty comments array to skip `for-or` cycle.
 */
const emptyComments = [];
