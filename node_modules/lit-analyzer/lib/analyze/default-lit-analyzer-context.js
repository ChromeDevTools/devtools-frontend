"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
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
exports.DefaultLitAnalyzerContext = void 0;
var tsMod = __importStar(require("typescript"));
var web_component_analyzer_1 = require("web-component-analyzer");
var all_rules_js_1 = require("../rules/all-rules.js");
var constants_js_1 = require("./constants.js");
var get_built_in_html_collection_js_1 = require("./data/get-built-in-html-collection.js");
var get_user_config_html_collection_js_1 = require("./data/get-user-config-html-collection.js");
var lit_analyzer_config_js_1 = require("./lit-analyzer-config.js");
var lit_analyzer_logger_js_1 = require("./lit-analyzer-logger.js");
var convert_component_definitions_to_html_collection_js_1 = require("./parse/convert-component-definitions-to-html-collection.js");
var parse_dependencies_js_1 = require("./parse/parse-dependencies/parse-dependencies.js");
var rule_collection_js_1 = require("./rule-collection.js");
var default_analyzer_definition_store_js_1 = require("./store/definition-store/default-analyzer-definition-store.js");
var default_analyzer_dependency_store_js_1 = require("./store/dependency-store/default-analyzer-dependency-store.js");
var default_analyzer_document_store_js_1 = require("./store/document-store/default-analyzer-document-store.js");
var default_analyzer_html_store_js_1 = require("./store/html-store/default-analyzer-html-store.js");
var html_data_source_merged_js_1 = require("./store/html-store/html-data-source-merged.js");
var changed_source_file_iterator_js_1 = require("./util/changed-source-file-iterator.js");
var DefaultLitAnalyzerContext = /** @class */ (function () {
    function DefaultLitAnalyzerContext(handler) {
        this.handler = handler;
        this.componentSourceFileIterator = (0, changed_source_file_iterator_js_1.changedSourceFileIterator)();
        this.hasAnalyzedSubclassExtensions = false;
        this._config = (0, lit_analyzer_config_js_1.makeConfig)({});
        this._currentStartTime = Date.now();
        this._currentTimeout = constants_js_1.MAX_RUNNING_TIME_PER_OPERATION;
        this._currentCancellationToken = undefined;
        this._hasRequestedCancellation = false;
        this._throwOnRequestedCancellation = false;
        this.htmlStore = new default_analyzer_html_store_js_1.DefaultAnalyzerHtmlStore();
        this.dependencyStore = new default_analyzer_dependency_store_js_1.DefaultAnalyzerDependencyStore();
        this.documentStore = new default_analyzer_document_store_js_1.DefaultAnalyzerDocumentStore();
        this.definitionStore = new default_analyzer_definition_store_js_1.DefaultAnalyzerDefinitionStore();
        this.logger = new lit_analyzer_logger_js_1.DefaultLitAnalyzerLogger();
        // Add all HTML5 tags and attributes
        var builtInCollection = (0, get_built_in_html_collection_js_1.getBuiltInHtmlCollection)();
        this.htmlStore.absorbCollection(builtInCollection, html_data_source_merged_js_1.HtmlDataSourceKind.BUILT_IN);
    }
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "ts", {
        get: function () {
            return this.handler.ts || tsMod;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "program", {
        get: function () {
            return this.handler.getProgram();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "project", {
        get: function () {
            return this.handler.getProject != null ? this.handler.getProject() : undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "config", {
        get: function () {
            return this._config;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "currentRunningTime", {
        get: function () {
            return Date.now() - this._currentStartTime;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "isCancellationRequested", {
        get: function () {
            var _a;
            if (this._hasRequestedCancellation) {
                return true;
            }
            if (this._currentCancellationToken == null) {
                // Never cancel if "cancellation token" is not present
                // This means that we are in a CLI context, and are willing to wait for the operation to finish for correctness reasons
                return false;
            }
            if ((_a = this._currentCancellationToken) === null || _a === void 0 ? void 0 : _a.isCancellationRequested()) {
                if (!this._hasRequestedCancellation) {
                    this.logger.error("Cancelling current operation because project host has requested cancellation");
                }
                this._hasRequestedCancellation = true;
            }
            if (this.currentRunningTime > this._currentTimeout) {
                if (!this._hasRequestedCancellation) {
                    this.logger.error("Cancelling current operation because it has been running for more than ".concat(this._currentTimeout, "ms (").concat(this.currentRunningTime, "ms)"));
                }
                this._hasRequestedCancellation = true;
            }
            // Throw if necessary
            if (this._hasRequestedCancellation && this._throwOnRequestedCancellation) {
                throw new this.ts.OperationCanceledException();
            }
            return this._hasRequestedCancellation;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "currentFile", {
        get: function () {
            if (this._currentFile == null) {
                throw new Error("Current file is not set");
            }
            return this._currentFile;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "rules", {
        get: function () {
            var _a;
            if (this._rules == null) {
                this._rules = new rule_collection_js_1.RuleCollection();
                (_a = this._rules).push.apply(_a, __spreadArray([], __read(all_rules_js_1.ALL_RULES), false));
            }
            return this._rules;
        },
        enumerable: false,
        configurable: true
    });
    DefaultLitAnalyzerContext.prototype.setContextBase = function (_a) {
        var _b;
        var file = _a.file, timeout = _a.timeout, throwOnCancellation = _a.throwOnCancellation;
        this._currentFile = file;
        this._currentStartTime = Date.now();
        this._currentTimeout = timeout !== null && timeout !== void 0 ? timeout : constants_js_1.MAX_RUNNING_TIME_PER_OPERATION;
        this._currentCancellationToken = (_b = this.project) === null || _b === void 0 ? void 0 : _b.getCancellationToken();
        this._throwOnRequestedCancellation = throwOnCancellation !== null && throwOnCancellation !== void 0 ? throwOnCancellation : false;
        this._hasRequestedCancellation = false;
    };
    DefaultLitAnalyzerContext.prototype.updateConfig = function (config) {
        this._config = config;
        this.logger.level = (function () {
            switch (config.logging) {
                case "off":
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.OFF;
                case "error":
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.ERROR;
                case "warn":
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.WARN;
                case "debug":
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.DEBUG;
                case "verbose":
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.VERBOSE;
                default:
                    return lit_analyzer_logger_js_1.LitAnalyzerLoggerLevel.OFF;
            }
        })();
        // Add user configured HTML5 collection
        var collection = (0, get_user_config_html_collection_js_1.getUserConfigHtmlCollection)(config);
        this.htmlStore.absorbCollection(collection, html_data_source_merged_js_1.HtmlDataSourceKind.USER);
    };
    DefaultLitAnalyzerContext.prototype.updateDependencies = function (file) {
        this.findDependenciesInFile(file);
    };
    DefaultLitAnalyzerContext.prototype.updateComponents = function (file) {
        this.findInvalidatedComponents();
        this.analyzeSubclassExtensions();
    };
    Object.defineProperty(DefaultLitAnalyzerContext.prototype, "checker", {
        get: function () {
            return this.program.getTypeChecker();
        },
        enumerable: false,
        configurable: true
    });
    DefaultLitAnalyzerContext.prototype.findInvalidatedComponents = function () {
        var e_1, _a, e_2, _b;
        var _this = this;
        var startTime = Date.now();
        var seenFiles = new Set();
        var invalidatedFiles = new Set();
        var getRunningTime = function () {
            return Date.now() - startTime;
        };
        try {
            // Find components in all changed files
            for (var _c = __values(this.componentSourceFileIterator(this.program.getSourceFiles())), _d = _c.next(); !_d.done; _d = _c.next()) {
                var sourceFile = _d.value;
                if (this.isCancellationRequested) {
                    break;
                }
                seenFiles.add(sourceFile);
                // All components definitions that use this file must be invidalited
                this.definitionStore.getDefinitionsWithDeclarationInFile(sourceFile).forEach(function (definition) {
                    var sf = _this.program.getSourceFile(definition.sourceFile.fileName);
                    if (sf != null) {
                        invalidatedFiles.add(sf);
                    }
                });
                this.logger.debug("Analyzing components in ".concat(sourceFile.fileName, " (changed) (").concat(getRunningTime(), "ms total)"));
                this.findComponentsInFile(sourceFile);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var invalidatedFiles_1 = __values(invalidatedFiles), invalidatedFiles_1_1 = invalidatedFiles_1.next(); !invalidatedFiles_1_1.done; invalidatedFiles_1_1 = invalidatedFiles_1.next()) {
                var sourceFile = invalidatedFiles_1_1.value;
                if (this.isCancellationRequested) {
                    break;
                }
                if (!seenFiles.has(sourceFile)) {
                    seenFiles.add(sourceFile);
                    this.logger.debug("Analyzing components in ".concat(sourceFile.fileName, " (invalidated) (").concat(getRunningTime(), "ms total)"));
                    this.findComponentsInFile(sourceFile);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (invalidatedFiles_1_1 && !invalidatedFiles_1_1.done && (_b = invalidatedFiles_1.return)) _b.call(invalidatedFiles_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.logger.verbose("Analyzed ".concat(seenFiles.size, " files (").concat(invalidatedFiles.size, " invalidated) in ").concat(getRunningTime(), "ms"));
    };
    DefaultLitAnalyzerContext.prototype.findComponentsInFile = function (sourceFile) {
        var _a, _b, _c, _d, _e, _f;
        var isDefaultLibrary = this.program.isSourceFileDefaultLibrary(sourceFile);
        var isExternalLibrary = this.program.isSourceFileFromExternalLibrary(sourceFile);
        // Only analyzing specific default libs of interest can save us up to 500ms in startup time
        if ((isDefaultLibrary && sourceFile.fileName.match(/(lib\.dom\.d\.ts)/) == null) ||
            (isExternalLibrary && sourceFile.fileName.match(/(@types\/node)/) != null)) {
            return;
        }
        var analyzeResult = (0, web_component_analyzer_1.analyzeSourceFile)(sourceFile, {
            program: this.program,
            ts: this.ts,
            config: {
                features: ["event", "member", "slot", "csspart", "cssproperty"],
                analyzeGlobalFeatures: !isDefaultLibrary,
                analyzeDefaultLib: true,
                analyzeDependencies: true,
                analyzeAllDeclarations: false,
                excludedDeclarationNames: ["HTMLElement"]
            }
        });
        var reg = isDefaultLibrary ? html_data_source_merged_js_1.HtmlDataSourceKind.BUILT_IN_DECLARED : html_data_source_merged_js_1.HtmlDataSourceKind.DECLARED;
        // Forget
        var existingResult = this.definitionStore.getAnalysisResultForFile(sourceFile);
        if (existingResult != null) {
            this.htmlStore.forgetCollection({
                tags: existingResult.componentDefinitions.map(function (d) { return d.tagName; }),
                global: {
                    events: (_a = existingResult.globalFeatures) === null || _a === void 0 ? void 0 : _a.events.map(function (e) { return e.name; }),
                    slots: (_b = existingResult.globalFeatures) === null || _b === void 0 ? void 0 : _b.slots.map(function (s) { return s.name || ""; }),
                    cssParts: (_c = existingResult.globalFeatures) === null || _c === void 0 ? void 0 : _c.cssParts.map(function (s) { return s.name || ""; }),
                    cssProperties: (_d = existingResult.globalFeatures) === null || _d === void 0 ? void 0 : _d.cssProperties.map(function (s) { return s.name || ""; }),
                    attributes: (_e = existingResult.globalFeatures) === null || _e === void 0 ? void 0 : _e.members.filter(function (m) { return m.kind === "attribute"; }).map(function (m) { return m.attrName || ""; }),
                    properties: (_f = existingResult.globalFeatures) === null || _f === void 0 ? void 0 : _f.members.filter(function (m) { return m.kind === "property"; }).map(function (m) { return m.propName || ""; })
                }
            }, reg);
            this.definitionStore.forgetAnalysisResultForFile(sourceFile);
        }
        // Absorb
        this.definitionStore.absorbAnalysisResult(sourceFile, analyzeResult);
        var htmlCollection = (0, convert_component_definitions_to_html_collection_js_1.convertAnalyzeResultToHtmlCollection)(analyzeResult, {
            checker: this.checker,
            addDeclarationPropertiesAsAttributes: this.program.isSourceFileFromExternalLibrary(sourceFile)
        });
        this.htmlStore.absorbCollection(htmlCollection, reg);
    };
    DefaultLitAnalyzerContext.prototype.analyzeSubclassExtensions = function () {
        if (this.hasAnalyzedSubclassExtensions)
            return;
        var result = (0, web_component_analyzer_1.analyzeHTMLElement)(this.program, this.ts);
        if (result != null) {
            var extension = (0, convert_component_definitions_to_html_collection_js_1.convertComponentDeclarationToHtmlTag)(result, undefined, { checker: this.checker });
            this.htmlStore.absorbSubclassExtension("HTMLElement", extension);
            this.hasAnalyzedSubclassExtensions = true;
        }
    };
    DefaultLitAnalyzerContext.prototype.findDependenciesInFile = function (file) {
        if ((0, lit_analyzer_config_js_1.isRuleDisabled)(this.config, "no-missing-import"))
            return;
        // Build a graph of component dependencies
        var res = (0, parse_dependencies_js_1.parseDependencies)(file, this);
        this.dependencyStore.absorbComponentDefinitionsForFile(file, res);
    };
    return DefaultLitAnalyzerContext;
}());
exports.DefaultLitAnalyzerContext = DefaultLitAnalyzerContext;
