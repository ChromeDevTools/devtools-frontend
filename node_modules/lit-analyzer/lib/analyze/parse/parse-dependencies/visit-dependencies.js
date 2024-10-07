"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFacadeModule = exports.visitIndirectImportsFromSourceFile = void 0;
var tsModule = __importStar(require("typescript"));
/**
 * Visits all indirect imports from a source file
 * Emits them using "emitIndirectImport" callback
 * @param sourceFile
 * @param context
 */
function visitIndirectImportsFromSourceFile(sourceFile, context) {
    var e_1, _a, e_2, _b;
    var _c, _d, _e;
    var currentDepth = (_c = context.depth) !== null && _c !== void 0 ? _c : 0;
    // Emit a visit. If this file has been seen already, the function will return false, and traversal will stop
    if (!context.emitIndirectImport(sourceFile)) {
        return;
    }
    var inExternal = context.program.isSourceFileFromExternalLibrary(sourceFile);
    // Check if we have traversed too deep
    if (inExternal && currentDepth >= ((_d = context.maxExternalDepth) !== null && _d !== void 0 ? _d : Infinity)) {
        return;
    }
    else if (!inExternal && currentDepth >= ((_e = context.maxInternalDepth) !== null && _e !== void 0 ? _e : Infinity)) {
        return;
    }
    // Get all direct imports from the cache
    var directImports = context.directImportCache.get(sourceFile);
    if (directImports == null) {
        // If the cache didn't have all direct imports, build up using the visitor function
        directImports = new Set();
        var newContext = __assign(__assign({}, context), { emitDirectImport: function (file) {
                directImports.add(file);
            } });
        // Emit all direct imports
        visitDirectImports(sourceFile, newContext);
        // Cache the result
        context.directImportCache.set(sourceFile, directImports);
    }
    else {
        // Updated references to newest source files
        var updatedImports = new Set();
        try {
            for (var directImports_1 = __values(directImports), directImports_1_1 = directImports_1.next(); !directImports_1_1.done; directImports_1_1 = directImports_1.next()) {
                var sf = directImports_1_1.value;
                var updatedSf = context.program.getSourceFile(sf.fileName);
                if (updatedSf != null) {
                    updatedImports.add(updatedSf);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (directImports_1_1 && !directImports_1_1.done && (_a = directImports_1.return)) _a.call(directImports_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        directImports = updatedImports;
    }
    try {
        // Call this function recursively on all direct imports from this source file
        for (var directImports_2 = __values(directImports), directImports_2_1 = directImports_2.next(); !directImports_2_1.done; directImports_2_1 = directImports_2.next()) {
            var file = directImports_2_1.value;
            var toExternal = context.program.isSourceFileFromExternalLibrary(file);
            var fromProjectToExternal = !inExternal && toExternal;
            // It's possible to only follow external dependencies from the source file of interest (depth 0)
            /*if (fromProjectToExternal && currentDepth !== 0) {
             continue;
             }*/
            // Calculate new depth. Reset depth to 1 if we go from a project module to an external module.
            // This will make sure that we always go X modules deep into external modules
            var newDepth = void 0;
            if (fromProjectToExternal) {
                newDepth = 1;
            }
            else {
                newDepth = currentDepth + 1;
            }
            if (isFacadeModule(file, context.ts)) {
                // Facade modules are ignored when calculating depth
                newDepth--;
            }
            // Visit direct imported source files recursively
            visitIndirectImportsFromSourceFile(file, __assign(__assign({}, context), { depth: newDepth }));
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (directImports_2_1 && !directImports_2_1.done && (_b = directImports_2.return)) _b.call(directImports_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
exports.visitIndirectImportsFromSourceFile = visitIndirectImportsFromSourceFile;
/**
 * Visits all direct imports in an AST.
 * Emits them using "emitDirectImport"
 * @param node
 * @param context
 */
function visitDirectImports(node, context) {
    var _a;
    if (node == null)
        return;
    // Handle top level imports/exports: (import "..."), (import { ... } from "..."), (export * from "...")
    if ((context.ts.isImportDeclaration(node) && !((_a = node.importClause) === null || _a === void 0 ? void 0 : _a.isTypeOnly)) || (context.ts.isExportDeclaration(node) && !node.isTypeOnly)) {
        if (node.moduleSpecifier != null && context.ts.isStringLiteral(node.moduleSpecifier) && context.ts.isSourceFile(node.parent)) {
            // Potentially ignore all imports/exports with named imports/exports because importing an interface would not
            //    necessarily result in the custom element being defined. An even better solution would be to ignore all
            //    import declarations with only interface-like/type-alias imports.
            /*if (("importClause" in node && node.importClause != null) || ("exportClause" in node && node.exportClause != null)) {
             return;
             }*/
            emitDirectModuleImportWithName(node.moduleSpecifier.text, node, context);
        }
    }
    // Handle async imports (await import(...))
    else if (context.ts.isCallExpression(node) && node.expression.kind === context.ts.SyntaxKind.ImportKeyword) {
        var moduleSpecifier = node.arguments[0];
        if (moduleSpecifier != null && context.ts.isStringLiteralLike(moduleSpecifier)) {
            emitDirectModuleImportWithName(moduleSpecifier.text, node, context);
        }
    }
    node.forEachChild(function (child) { return visitDirectImports(child, context); });
}
/**
 * Resolves and emits a direct imported module
 * @param moduleSpecifier
 * @param node
 * @param context
 */
function emitDirectModuleImportWithName(moduleSpecifier, node, context) {
    var _a, _b, _c, _d;
    var fromSourceFile = node.getSourceFile();
    // Resolve the imported string
    var result;
    if (context.project && "getResolvedModuleWithFailedLookupLocationsFromCache" in context.project) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = context.project.getResolvedModuleWithFailedLookupLocationsFromCache(moduleSpecifier, fromSourceFile.fileName);
    }
    else if ("getResolvedModuleWithFailedLookupLocationsFromCache" in context.program) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = context.program["getResolvedModuleWithFailedLookupLocationsFromCache"](moduleSpecifier, fromSourceFile.fileName);
    }
    else {
        var cache = (_b = (_a = context.program).getModuleResolutionCache) === null || _b === void 0 ? void 0 : _b.call(_a);
        var mode = undefined;
        if (context.ts.isImportDeclaration(node) || context.ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier != null && context.ts.isStringLiteral(node.moduleSpecifier) && context.ts.isSourceFile(node.parent)) {
                mode = tsModule.getModeForUsageLocation(fromSourceFile, node.moduleSpecifier);
            }
        }
        if (cache != null) {
            result = context.ts.resolveModuleNameFromCache(moduleSpecifier, node.getSourceFile().fileName, cache, mode);
        }
        if (result == null) {
            // Result could not be found from the cache, try and resolve module without using the
            // cache.
            result = context.ts.resolveModuleName(moduleSpecifier, node.getSourceFile().fileName, context.program.getCompilerOptions(), context.ts.createCompilerHost(context.program.getCompilerOptions()));
        }
    }
    if (((_c = result === null || result === void 0 ? void 0 : result.resolvedModule) === null || _c === void 0 ? void 0 : _c.resolvedFileName) != null) {
        var resolvedModule = result.resolvedModule;
        var sourceFile = context.program.getSourceFile(resolvedModule.resolvedFileName);
        if (sourceFile != null) {
            (_d = context.emitDirectImport) === null || _d === void 0 ? void 0 : _d.call(context, sourceFile);
        }
    }
}
/**
 * Returns whether a SourceFile is a Facade Module.
 * A Facade Module only consists of import and export declarations.
 * @param sourceFile
 * @param ts
 */
function isFacadeModule(sourceFile, ts) {
    var statements = sourceFile.statements;
    var isFacade = statements.every(function (statement) {
        return ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement);
    });
    return isFacade;
}
exports.isFacadeModule = isFacadeModule;
