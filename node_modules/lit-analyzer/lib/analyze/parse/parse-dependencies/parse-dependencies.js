"use strict";
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
exports.parseAllIndirectImports = exports.parseDependencies = void 0;
var visit_dependencies_js_1 = require("./visit-dependencies.js");
// A cache used to prevent traversing through entire source files multiple times to find direct imports
var DIRECT_IMPORT_CACHE = new WeakMap();
// Two caches used to return the result of of a known source file right away
var RESULT_CACHE = new WeakMap();
var IMPORTED_SOURCE_FILES_CACHE = new WeakMap();
/**
 * Returns a map of imported component definitions in each file encountered from a source file recursively.
 * @param sourceFile
 * @param context
 */
function parseDependencies(sourceFile, context) {
    var e_1, _a, e_2, _b, e_3, _c;
    if (RESULT_CACHE.has(sourceFile)) {
        var invalidate = false;
        try {
            // Check if the cache has been invalidated
            for (var _d = __values(IMPORTED_SOURCE_FILES_CACHE.get(sourceFile) || []), _e = _d.next(); !_e.done; _e = _d.next()) {
                var file = _e.value;
                // If we get a SourceFile with a certain fileName but it's not the same reference, the file has been updated
                if (context.program.getSourceFile(file.fileName) !== file) {
                    invalidate = true;
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (invalidate) {
            RESULT_CACHE.delete(sourceFile);
            IMPORTED_SOURCE_FILES_CACHE.delete(sourceFile);
        }
        else {
            return RESULT_CACHE.get(sourceFile);
        }
    }
    // Get all indirectly imported source files from this the source file
    var importedSourceFiles = parseAllIndirectImports(sourceFile, context);
    IMPORTED_SOURCE_FILES_CACHE.set(sourceFile, importedSourceFiles);
    // Get component definitions from all these source files
    var definitions = new Set();
    try {
        for (var importedSourceFiles_1 = __values(importedSourceFiles), importedSourceFiles_1_1 = importedSourceFiles_1.next(); !importedSourceFiles_1_1.done; importedSourceFiles_1_1 = importedSourceFiles_1.next()) {
            var file = importedSourceFiles_1_1.value;
            try {
                for (var _f = (e_3 = void 0, __values(context.definitionStore.getDefinitionsInFile(file))), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var def = _g.value;
                    definitions.add(def);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (importedSourceFiles_1_1 && !importedSourceFiles_1_1.done && (_b = importedSourceFiles_1.return)) _b.call(importedSourceFiles_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    // Cache the result
    var result = Array.from(definitions);
    RESULT_CACHE.set(sourceFile, result);
    return result;
}
exports.parseDependencies = parseDependencies;
/**
 * Returns a map of component declarations in each file encountered from a source file recursively.
 * @param sourceFile
 * @param context
 * @param maxExternalDepth
 * @param minExternalDepth
 */
function parseAllIndirectImports(sourceFile, context, _a) {
    var _b = _a === void 0 ? {} : _a, maxExternalDepth = _b.maxExternalDepth, maxInternalDepth = _b.maxInternalDepth;
    var importedSourceFiles = new Set();
    (0, visit_dependencies_js_1.visitIndirectImportsFromSourceFile)(sourceFile, {
        project: context.project,
        program: context.program,
        ts: context.ts,
        directImportCache: DIRECT_IMPORT_CACHE,
        maxExternalDepth: maxExternalDepth !== null && maxExternalDepth !== void 0 ? maxExternalDepth : context.config.maxNodeModuleImportDepth,
        maxInternalDepth: maxInternalDepth !== null && maxInternalDepth !== void 0 ? maxInternalDepth : context.config.maxProjectImportDepth,
        emitIndirectImport: function (file) {
            if (importedSourceFiles.has(file)) {
                return false;
            }
            importedSourceFiles.add(file);
            return true;
        }
    });
    return importedSourceFiles;
}
exports.parseAllIndirectImports = parseAllIndirectImports;
