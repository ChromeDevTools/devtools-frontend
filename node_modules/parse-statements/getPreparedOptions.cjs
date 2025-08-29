'use strict';
exports.getPreparedOptions = undefined;
/**
 * Get internal prepared options from public options.
 */
const getPreparedOptions = exports.getPreparedOptions = ({ comments = [], onError, statements = [], }) => {
    const commentsKeys = [];
    const firstTokens = [];
    const firstTokensAfterComments = [];
    let keyIndex = 1;
    const openTokens = [];
    const preparedComments = { __proto__: null };
    const preparedStatements = { __proto__: null };
    const statementsKeys = [];
    for (const { onError, onParse, tokens: [open, close], } of comments) {
        const closeRegExp = createRegExp(['', close]);
        const key = `parseStatementsPackageComment${keyIndex++}`;
        commentsKeys.push(key);
        openTokens.push([key, open]);
        preparedComments[key] = { closeRegExp, onError, onParse };
    }
    for (const { canIncludeComments, onError, onParse, tokens: [firstToken, ...restTokens], shouldSearchBeforeComments, } of statements) {
        const statementKey = `parseStatementsPackageStatement${keyIndex++}`;
        const tokens = [];
        (shouldSearchBeforeComments ? firstTokens : firstTokensAfterComments).push([
            statementKey,
            firstToken,
        ]);
        statementsKeys.push(statementKey);
        for (const nextToken of restTokens) {
            const nextTokenKey = `parseStatementsPackageStatementPart${keyIndex++}`;
            const regexpTokens = [[nextTokenKey, nextToken]];
            if (canIncludeComments) {
                regexpTokens[shouldSearchBeforeComments ? 'push' : 'unshift'](...openTokens);
            }
            const nextTokenRegExp = createRegExp(...regexpTokens);
            tokens.push({ nextTokenKey, nextTokenRegExp });
        }
        preparedStatements[statementKey] = { onError, onParse, tokens };
    }
    const nextStatementRegExp = createRegExp(...firstTokens, ...openTokens, ...firstTokensAfterComments);
    return {
        commentsKeys,
        nextStatementRegExp,
        onError,
        preparedComments,
        preparedStatements,
        statementsKeys,
    };
};
/**
 * Creates regexp by tokens.
 */
const createRegExp = (...tokens) => {
    if (!tokens[0]) {
        return emptyRegExp;
    }
    let source = tokens[0][1];
    if (tokens[0][0] !== '') {
        source = tokens.map(([key, token]) => `(?<${key}>${token})`).join('|');
    }
    return new RegExp(source, 'gmu');
};
/**
 * Empty regexp that match only the empty string.
 */
const emptyRegExp = /^$/g;
