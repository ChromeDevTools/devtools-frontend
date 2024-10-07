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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readLitAnalyzerConfigFromTsConfig = exports.resolveTsConfigCompilerOptions = exports.getCompilerOptions = exports.compileTypescript = void 0;
var fs_1 = require("fs");
var typescript_1 = require("typescript");
var requiredCompilerOptions = {
    noEmitOnError: false,
    noEmit: true,
    allowJs: true,
    //maxNodeModuleJsDepth: 3,
    strictNullChecks: true,
    skipLibCheck: true
};
/**
 * The most general version of compiler options.
 */
var defaultCompilerOptions = __assign(__assign({}, requiredCompilerOptions), { experimentalDecorators: true, target: typescript_1.ScriptTarget.Latest, downlevelIteration: true, module: typescript_1.ModuleKind.ESNext, 
    //module: ModuleKind.CommonJS,
    esModuleInterop: true, allowSyntheticDefaultImports: true, allowUnreachableCode: true, allowUnusedLabels: true, lib: ["lib.esnext.d.ts", "lib.dom.d.ts"] });
/**
 * Compiles an array of file paths using typescript.
 * @param filePaths
 */
function compileTypescript(filePaths) {
    var options = getCompilerOptions();
    filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
    var program = (0, typescript_1.createProgram)(filePaths, options);
    var files = program
        .getSourceFiles()
        .filter(function (sf) { return filePaths.includes(sf.fileName); })
        .sort(function (sfA, sfB) { return (sfA.fileName > sfB.fileName ? 1 : -1); });
    return { program: program, files: files };
}
exports.compileTypescript = compileTypescript;
/**
 * Returns compiler options to be used
 */
function getCompilerOptions() {
    // Get compiler options from files
    var compilerOptions = resolveTsConfigCompilerOptions();
    // If we found existing compiler options, merged "required compiler options" into it.
    if (compilerOptions != null) {
        var options = __assign(__assign({}, compilerOptions), requiredCompilerOptions);
        // set module resolution to nodejs if it is classic
        // but if the user has set it to something else, don't override it
        if (!options.moduleResolution || options.moduleResolution === typescript_1.ModuleResolutionKind.Classic) {
            options.moduleResolution = typescript_1.ModuleResolutionKind.NodeJs;
        }
        return options;
    }
    // Return default compiler options if no compiler options were found
    return defaultCompilerOptions;
}
exports.getCompilerOptions = getCompilerOptions;
/**
 * Resolves "tsconfig.json" file and returns its CompilerOptions
 */
function resolveTsConfigCompilerOptions() {
    // Find the nearest tsconfig.json file if possible
    var tsConfigFilePath = (0, typescript_1.findConfigFile)(process.cwd(), fs_1.existsSync, "tsconfig.json");
    if (tsConfigFilePath != null) {
        // Read the tsconfig.json file
        var parsedConfig = (0, typescript_1.readConfigFile)(tsConfigFilePath, function (path) { return (0, fs_1.readFileSync)(path, "utf8"); });
        if (parsedConfig != null && parsedConfig.config != null) {
            // Parse the tsconfig.json file
            var parsedJson = (0, typescript_1.parseJsonConfigFileContent)(parsedConfig.config, typescript_1.sys, process.cwd());
            return parsedJson === null || parsedJson === void 0 ? void 0 : parsedJson.options;
        }
    }
    return undefined;
}
exports.resolveTsConfigCompilerOptions = resolveTsConfigCompilerOptions;
/**
 * Resolves the nearest tsconfig.json and returns the configuration seed within the plugins section for "ts-lit-plugin"
 */
function readLitAnalyzerConfigFromTsConfig() {
    var compilerOptions = resolveTsConfigCompilerOptions();
    // Finds the plugin section
    if (compilerOptions != null && "plugins" in compilerOptions) {
        var plugins = compilerOptions.plugins;
        var tsLitPluginOptions = plugins.find(function (plugin) { return plugin.name === "ts-lit-plugin"; });
        if (tsLitPluginOptions != null) {
            return tsLitPluginOptions;
        }
    }
    return undefined;
}
exports.readLitAnalyzerConfigFromTsConfig = readLitAnalyzerConfigFromTsConfig;
