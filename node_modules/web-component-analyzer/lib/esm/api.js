import { a as arrayDefined, b as analyzeSourceFile, m as makeContextFromConfig, D as DEFAULT_FEATURE_COLLECTION_CACHE, c as DEFAULT_COMPONENT_DECLARATION_CACHE, d as analyzeComponentDeclaration, C as CustomElementFlavor, A as ALL_COMPONENT_FEATURES } from './chunk-transform-analyzer-result-lpd9XK92.js';
export { J as JsDocFlavor, V as VERSION, f as getExtendsHeritageClauses, i as getExtendsHeritageClausesInChain, j as getJsDoc, k as getJsDocType, e as getMixinHeritageClauses, h as getMixinHeritageClausesInChain, g as getSuperclassHeritageClause, p as parseSimpleJsDocTypeExpression, t as transformAnalyzerResult, v as visitAllHeritageClauses } from './chunk-transform-analyzer-result-lpd9XK92.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import * as tsModule from 'typescript';
import { ScriptKind } from 'typescript';
import 'ts-simple-type';

/**
 * Analyzes components in code
 * @param {IVirtualSourceFile[]|VirtualSourceFile} inputFiles
 * @param config
 */
function analyzeText(inputFiles, config = {}) {
    const ts = config.ts || tsModule;
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
            fileName = fileName.match(/[/\\]/) ? fileName : join(dirname(require.resolve("typescript")), fileName);
        }
        if (existsSync(fileName)) {
            return readFileSync(fileName, "utf8").toString();
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
                return ts.createSourceFile(fileName, sourceText, languageVersion, true, fileName.endsWith(".js") ? ScriptKind.JS : ScriptKind.TS);
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
    const sourceFilesToAnalyze = arrayDefined(files.filter(file => file.analyze !== false).map(file => program.getSourceFile(file.fileName)));
    const results = sourceFilesToAnalyze.map(sf => analyzeSourceFile(sf, { program, ...config }));
    return { checker, program, results, analyzedSourceFiles: sourceFilesToAnalyze };
}

/**
 * This function only analyzes the HTMLElement declaration found in "lib.dom.d.ts" source file provided by Typescript.
 * @param program
 * @param ts
 */
function analyzeHTMLElement(program, ts = tsModule) {
    const endsWithLibDom = "lib.dom.d.ts";
    const domLibSourceFile = program.getSourceFiles().find(sf => sf.fileName.endsWith(endsWithLibDom));
    if (domLibSourceFile == null) {
        return undefined;
        //throw new Error(`Couldn't find '${endsWith}'. Have you included the 'dom' lib in your tsconfig?`);
    }
    return visit(domLibSourceFile, {
        ...makeContextFromConfig({
            program,
            ts,
            flavors: [new CustomElementFlavor()],
            config: {
                analyzeDefaultLib: true,
                features: ALL_COMPONENT_FEATURES
            }
        }),
        cache: {
            featureCollection: DEFAULT_FEATURE_COLLECTION_CACHE,
            componentDeclarationCache: DEFAULT_COMPONENT_DECLARATION_CACHE,
            general: new Map()
        }
    });
}
function visit(node, context) {
    if (context.ts.isInterfaceDeclaration(node) && node.name != null && node.name.text === "HTMLElement") {
        return analyzeComponentDeclaration([node], context);
    }
    return node.forEachChild(child => {
        return visit(child, context);
    });
}

export { ALL_COMPONENT_FEATURES, analyzeHTMLElement, analyzeSourceFile, analyzeText };
