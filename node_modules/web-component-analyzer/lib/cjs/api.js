'use strict';

var transformAnalyzerResult = require('./chunk-transform-analyzer-result-jzWAvD19.js');
var fs = require('fs');
var path = require('path');
var tsModule = require('typescript');
require('ts-simple-type');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var tsModule__namespace = /*#__PURE__*/_interopNamespaceDefault(tsModule);

/**
 * Analyzes components in code
 * @param {IVirtualSourceFile[]|VirtualSourceFile} inputFiles
 * @param config
 */
function analyzeText(inputFiles, config = {}) {
    const ts = config.ts || tsModule__namespace;
    // "sys" can be undefined when running in the browser
    const system = ts.sys;
    // Convert arguments into virtual source files
    const files = (Array.isArray(inputFiles) ? inputFiles : [inputFiles])
        .map(file => typeof file === "string"
        ? {
            text: file,
            fileName: `auto-generated-${Math.floor(Math.random() * 100000)}.ts`,
            entry: true
        }
        : file)
        .map(file => ({ ...file, fileName: file.fileName }));
    const includeLib = files.some(file => file.includeLib);
    const readFile = (fileName) => {
        const matchedFile = files.find(currentFile => currentFile.fileName === fileName);
        if (matchedFile != null) {
            return matchedFile.text;
        }
        if (includeLib) {
            // TODO: find better method of finding the current typescript module path
            fileName = fileName.match(/[/\\]/) ? fileName : path.join(path.dirname(require.resolve("typescript")), fileName);
        }
        if (fs.existsSync(fileName)) {
            return fs.readFileSync(fileName, "utf8").toString();
        }
        return undefined;
    };
    const fileExists = (fileName) => {
        return files.some(currentFile => currentFile.fileName === fileName);
    };
    const compilerOptions = {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        allowJs: true,
        sourceMap: false,
        strictNullChecks: true
    };
    const program = ts.createProgram({
        rootNames: files.map(file => file.fileName),
        options: compilerOptions,
        host: {
            writeFile: () => { },
            readFile,
            fileExists,
            getSourceFile(fileName, languageVersion) {
                const sourceText = this.readFile(fileName);
                if (sourceText == null)
                    return undefined;
                return ts.createSourceFile(fileName, sourceText, languageVersion, true, fileName.endsWith(".js") ? tsModule.ScriptKind.JS : tsModule.ScriptKind.TS);
            },
            getCurrentDirectory() {
                return ".";
            },
            getDirectories(directoryName) {
                var _a;
                return (_a = system === null || system === void 0 ? void 0 : system.getDirectories(directoryName)) !== null && _a !== void 0 ? _a : [];
            },
            getDefaultLibFileName(options) {
                return ts.getDefaultLibFileName(options);
            },
            getCanonicalFileName(fileName) {
                return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
            },
            getNewLine() {
                var _a;
                return (_a = system === null || system === void 0 ? void 0 : system.newLine) !== null && _a !== void 0 ? _a : "\n";
            },
            useCaseSensitiveFileNames() {
                var _a;
                return (_a = system === null || system === void 0 ? void 0 : system.useCaseSensitiveFileNames) !== null && _a !== void 0 ? _a : false;
            }
        }
    });
    const checker = program.getTypeChecker();
    // Analyze source files
    const sourceFilesToAnalyze = transformAnalyzerResult.arrayDefined(files.filter(file => file.analyze !== false).map(file => program.getSourceFile(file.fileName)));
    const results = sourceFilesToAnalyze.map(sf => transformAnalyzerResult.analyzeSourceFile(sf, { program, ...config }));
    return { checker, program, results, analyzedSourceFiles: sourceFilesToAnalyze };
}

/**
 * This function only analyzes the HTMLElement declaration found in "lib.dom.d.ts" source file provided by Typescript.
 * @param program
 * @param ts
 */
function analyzeHTMLElement(program, ts = tsModule__namespace) {
    const endsWithLibDom = "lib.dom.d.ts";
    const domLibSourceFile = program.getSourceFiles().find(sf => sf.fileName.endsWith(endsWithLibDom));
    if (domLibSourceFile == null) {
        return undefined;
        //throw new Error(`Couldn't find '${endsWith}'. Have you included the 'dom' lib in your tsconfig?`);
    }
    return visit(domLibSourceFile, {
        ...transformAnalyzerResult.makeContextFromConfig({
            program,
            ts,
            flavors: [new transformAnalyzerResult.CustomElementFlavor()],
            config: {
                analyzeDefaultLib: true,
                features: transformAnalyzerResult.ALL_COMPONENT_FEATURES
            }
        }),
        cache: {
            featureCollection: transformAnalyzerResult.DEFAULT_FEATURE_COLLECTION_CACHE,
            componentDeclarationCache: transformAnalyzerResult.DEFAULT_COMPONENT_DECLARATION_CACHE,
            general: new Map()
        }
    });
}
function visit(node, context) {
    if (context.ts.isInterfaceDeclaration(node) && node.name != null && node.name.text === "HTMLElement") {
        return transformAnalyzerResult.analyzeComponentDeclaration([node], context);
    }
    return node.forEachChild(child => {
        return visit(child, context);
    });
}

exports.ALL_COMPONENT_FEATURES = transformAnalyzerResult.ALL_COMPONENT_FEATURES;
exports.JsDocFlavor = transformAnalyzerResult.JsDocFlavor;
exports.VERSION = transformAnalyzerResult.VERSION;
exports.analyzeSourceFile = transformAnalyzerResult.analyzeSourceFile;
exports.getExtendsHeritageClauses = transformAnalyzerResult.getExtendsHeritageClauses;
exports.getExtendsHeritageClausesInChain = transformAnalyzerResult.getExtendsHeritageClausesInChain;
exports.getJsDoc = transformAnalyzerResult.getJsDoc;
exports.getJsDocType = transformAnalyzerResult.getJsDocType;
exports.getMixinHeritageClauses = transformAnalyzerResult.getMixinHeritageClauses;
exports.getMixinHeritageClausesInChain = transformAnalyzerResult.getMixinHeritageClausesInChain;
exports.getSuperclassHeritageClause = transformAnalyzerResult.getSuperclassHeritageClause;
exports.parseSimpleJsDocTypeExpression = transformAnalyzerResult.parseSimpleJsDocTypeExpression;
exports.transformAnalyzerResult = transformAnalyzerResult.transformAnalyzerResult;
exports.visitAllHeritageClauses = transformAnalyzerResult.visitAllHeritageClauses;
exports.analyzeHTMLElement = analyzeHTMLElement;
exports.analyzeText = analyzeText;
