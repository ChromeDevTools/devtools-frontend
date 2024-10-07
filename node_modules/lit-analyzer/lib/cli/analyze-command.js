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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCommand = void 0;
var chalk_1 = __importDefault(require("chalk"));
var fs_1 = require("fs");
var default_lit_analyzer_context_js_1 = require("../analyze/default-lit-analyzer-context.js");
var lit_analyzer_js_1 = require("../analyze/lit-analyzer.js");
var lit_analyzer_config_js_1 = require("../analyze/lit-analyzer-config.js");
var analyze_globs_js_1 = require("./analyze-globs.js");
var compile_js_1 = require("./compile.js");
var code_diagnostic_formatter_js_1 = require("./format/code-diagnostic-formatter.js");
var list_diagnostic_formatter_js_1 = require("./format/list-diagnostic-formatter.js");
var markdown_formatter_js_1 = require("./format/markdown-formatter.js");
function printText(text, config) {
    if (config.outFile != null) {
        (0, fs_1.appendFileSync)(config.outFile, text);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(text);
    }
}
/**
 * Executes the configuration and returns a boolean indicating if the command ran successfully.
 * @param globs
 * @param cliConfig
 */
function analyzeCommand(globs, cliConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var program, context, configFromTS, configFromCLI, configSeed, tsPluginConfig, analyzer, stats, formatter, timeMap, statsText, sortedTimeArray;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    program = undefined;
                    context = new default_lit_analyzer_context_js_1.DefaultLitAnalyzerContext({
                        getProgram: function () {
                            return program;
                        }
                    });
                    configFromTS = (0, compile_js_1.readLitAnalyzerConfigFromTsConfig)() || {};
                    configFromCLI = readLitAnalyzerConfigFromCliConfig(cliConfig);
                    configSeed = __assign(__assign(__assign({}, configFromTS), configFromCLI), { 
                        // Also merge rules deep
                        rules: __assign(__assign({}, (configFromTS.rules || {})), (configFromCLI.rules || {})) });
                    tsPluginConfig = (0, lit_analyzer_config_js_1.makeConfig)(configSeed);
                    // Set the config on the context
                    context.updateConfig(tsPluginConfig);
                    // Debug config
                    context.logger.verbose("Lit Analyzer Configuration", tsPluginConfig);
                    analyzer = new lit_analyzer_js_1.LitAnalyzer(context);
                    stats = { errors: 0, warnings: 0, filesWithProblems: 0, totalFiles: 0, diagnostics: 0 };
                    formatter = getFormatter(cliConfig.format || "code");
                    timeMap = new Map();
                    return [4 /*yield*/, (0, analyze_globs_js_1.analyzeGlobs)(globs, cliConfig, {
                            didExpandGlobs: function (filePaths) {
                                if (filePaths.length === 0) {
                                    // eslint-disable-next-line no-console
                                    console.log("\n".concat(chalk_1.default.red("  ✖ Couldn't find any files to analyze")));
                                }
                                else {
                                    // eslint-disable-next-line no-console
                                    console.log("Analyzing ".concat(filePaths.length, " file").concat(filePaths.length === 1 ? "" : "s", "..."));
                                }
                            },
                            willAnalyzeFiles: function (filePaths) {
                                // Prepare output file
                                if (cliConfig.outFile != null) {
                                    (0, fs_1.writeFileSync)(cliConfig.outFile, "");
                                }
                            },
                            analyzeSourceFile: function (file, options) {
                                program = options.program;
                                if (cliConfig.debug) {
                                    // eslint-disable-next-line no-console
                                    console.log("Analyzing ".concat(file.fileName, "..."));
                                }
                                var timeStart = Date.now();
                                // Get all diagnostics in the source file (errors and warnings)
                                var diagnostics = analyzer.getDiagnosticsInFile(file);
                                var time = Date.now() - timeStart;
                                timeMap.set(file.fileName, time);
                                // Filter all diagnostics by "error" if "quiet" option is active
                                diagnostics = cliConfig.quiet ? diagnostics.filter(function (d) { return d.severity === "error"; }) : diagnostics;
                                // Print the diagnostic text based on the formatter
                                var fileDiagnosticsText = formatter.diagnosticTextForFile(file, diagnostics, cliConfig);
                                if (fileDiagnosticsText != null) {
                                    printText(fileDiagnosticsText, cliConfig);
                                }
                                // Calculate stats
                                stats.diagnostics += diagnostics.length;
                                stats.totalFiles += 1;
                                // Add stats if there are more than 0 diagnostics
                                if (diagnostics.length > 0) {
                                    stats.errors += diagnostics.reduce(function (sum, d) { return (d.severity === "error" ? sum + 1 : sum); }, 0);
                                    stats.warnings += diagnostics.reduce(function (sum, d) { return (d.severity === "warning" ? sum + 1 : sum); }, 0);
                                    stats.filesWithProblems += 1;
                                    // Fail fast if "failFast" is true and the command is not successful
                                    if (cliConfig.failFast && !isSuccessful(stats, cliConfig)) {
                                        return false;
                                    }
                                }
                            }
                        })];
                case 1:
                    _a.sent();
                    statsText = formatter.report(stats, cliConfig);
                    if (statsText != null) {
                        printText(statsText, cliConfig);
                    }
                    // Print debugging
                    if (cliConfig.debug) {
                        sortedTimeArray = Array.from(timeMap.entries()).sort(function (_a, _b) {
                            var _c = __read(_a, 2), timeA = _c[1];
                            var _d = __read(_b, 2), timeB = _d[1];
                            return (timeA > timeB ? 1 : -1);
                        });
                        // eslint-disable-next-line no-console
                        console.log(sortedTimeArray.map(function (_a) {
                            var _b = __read(_a, 2), fileName = _b[0], time = _b[1];
                            return "".concat(fileName, ": ").concat(time, "ms");
                        }).join("\n"));
                    }
                    // Return if this command was successful or not
                    return [2 /*return*/, isSuccessful(stats, cliConfig)];
            }
        });
    });
}
exports.analyzeCommand = analyzeCommand;
function getFormatter(format) {
    switch (format) {
        case "list":
            return new list_diagnostic_formatter_js_1.ListDiagnosticFormatter();
        case "code":
            return new code_diagnostic_formatter_js_1.CodeDiagnosticFormatter();
        case "markdown":
            return new markdown_formatter_js_1.MarkdownDiagnosticFormatter();
        default:
            throw new Error("Unknown format: '".concat(format, "'"));
    }
}
/**
 * Returns a boolean based on a "stats" object that indicates if the command is successful or not.
 * @param stats
 * @param config
 */
function isSuccessful(stats, config) {
    var maxErrorCount = 0;
    var maxWarningCount = config.maxWarnings != null ? config.maxWarnings : -1;
    if (stats.errors > maxErrorCount) {
        return false;
    }
    if (maxWarningCount !== -1 && stats.warnings > maxWarningCount) {
        return false;
    }
    return true;
}
function readLitAnalyzerConfigFromCliConfig(cliConfig) {
    var config = {};
    config.rules = cliConfig.rules;
    // Assign "strict" setting from the CLI command (which overwrites tsconfig rules)
    if (cliConfig.strict != null) {
        config.strict = cliConfig.strict;
    }
    // Assign "logging" based on "debug" option from the CLI command
    if (cliConfig.debug != null) {
        config.logging = cliConfig.debug ? "verbose" : "off";
    }
    // Assign "maxProjectImportDepth" setting from the CLI command (which overwrites tsconfig rules)
    if (cliConfig.maxProjectImportDepth != null) {
        config.maxProjectImportDepth = cliConfig.maxProjectImportDepth;
    }
    // Assign "maxNodeModuleImportDepth" setting from the CLI command (which overwrites tsconfig rules)
    if (cliConfig.maxNodeModuleImportDepth != null) {
        config.maxNodeModuleImportDepth = cliConfig.maxNodeModuleImportDepth;
    }
    return config;
}
