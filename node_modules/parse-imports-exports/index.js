import { onGlobalError } from './onErrors.js';
import { comments, getStatements } from './statements.js';
import { CONTEXT_KEY, createParseFunction, getCacheKey, removeErrorsCausedByOverloading, } from './utils.js';
/**
 * Parses `import`/`export` in ECMAScript/TypeScript syntax.
 */
export const parseImportsExports = (source, options) => {
    const cacheKey = getCacheKey(options);
    const importsExports = {
        namedImports: undefined,
        namespaceImports: undefined,
        dynamicImports: undefined,
        requires: undefined,
        typeNamedImports: undefined,
        typeNamespaceImports: undefined,
        typeDynamicImports: undefined,
        namedReexports: undefined,
        namespaceReexports: undefined,
        starReexports: undefined,
        typeNamedReexports: undefined,
        typeNamespaceReexports: undefined,
        typeStarReexports: undefined,
        defaultExport: undefined,
        namedExports: undefined,
        declarationExports: undefined,
        typeNamedExports: undefined,
        typeExports: undefined,
        interfaceExports: undefined,
        namespaceExports: undefined,
        commonJsNamespaceExport: undefined,
        commonJsExports: undefined,
        errors: undefined,
        [CONTEXT_KEY]: { lineColumnCache: undefined, linesIndexes: undefined, options, source },
    };
    var parse = parseCache[cacheKey];
    if (parse === undefined) {
        const statements = getStatements(options);
        parse = createParseFunction({ ...baseParseOptions, statements });
        parseCache[cacheKey] = parse;
    }
    parse(importsExports, source);
    removeErrorsCausedByOverloading(importsExports);
    importsExports[CONTEXT_KEY] = undefined;
    return importsExports;
};
/**
 * Base options of parse function.
 */
const baseParseOptions = { comments, onError: onGlobalError };
/**
 * Cache of parse functions with different options.
 */
const parseCache = { __proto__: null };
