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
exports.DefaultAnalyzerDefinitionStore = void 0;
var web_component_analyzer_1 = require("web-component-analyzer");
var component_util_js_1 = require("../../util/component-util.js");
var DefaultAnalyzerDefinitionStore = /** @class */ (function () {
    function DefaultAnalyzerDefinitionStore() {
        this.analysisResultForFile = new Map();
        this.definitionForTagName = new Map();
        this.intersectingDefinitionsForFile = new Map();
    }
    DefaultAnalyzerDefinitionStore.prototype.absorbAnalysisResult = function (sourceFile, result) {
        var _this = this;
        this.analysisResultForFile.set(sourceFile.fileName, result);
        result.componentDefinitions.forEach(function (definition) {
            var _a;
            _this.definitionForTagName.set(definition.tagName, definition);
            addToSetInMap(_this.intersectingDefinitionsForFile, definition.sourceFile.fileName, definition);
            if (definition.declaration == null) {
                return;
            }
            addToSetInMap(_this.intersectingDefinitionsForFile, (_a = definition.declaration) === null || _a === void 0 ? void 0 : _a.sourceFile.fileName, definition);
            (0, web_component_analyzer_1.visitAllHeritageClauses)(definition.declaration, function (clause) {
                if (clause.declaration != null) {
                    addToSetInMap(_this.intersectingDefinitionsForFile, clause.declaration.sourceFile.fileName, definition);
                }
            });
        });
    };
    DefaultAnalyzerDefinitionStore.prototype.forgetAnalysisResultForFile = function (sourceFile) {
        var _this = this;
        var result = this.analysisResultForFile.get(sourceFile.fileName);
        if (result == null)
            return;
        result.componentDefinitions.forEach(function (definition) {
            var _a, _b, _c;
            _this.definitionForTagName.delete(definition.tagName);
            (_a = _this.intersectingDefinitionsForFile.get(definition.sourceFile.fileName)) === null || _a === void 0 ? void 0 : _a.delete(definition);
            if (definition.declaration == null) {
                return;
            }
            (_c = _this.intersectingDefinitionsForFile.get((_b = definition.declaration) === null || _b === void 0 ? void 0 : _b.sourceFile.fileName)) === null || _c === void 0 ? void 0 : _c.delete(definition);
            (0, web_component_analyzer_1.visitAllHeritageClauses)(definition.declaration, function (clause) {
                var _a;
                if (clause.declaration != null) {
                    (_a = _this.intersectingDefinitionsForFile.get(clause.declaration.sourceFile.fileName)) === null || _a === void 0 ? void 0 : _a.delete(definition);
                }
            });
        });
        this.analysisResultForFile.delete(sourceFile.fileName);
    };
    DefaultAnalyzerDefinitionStore.prototype.getAnalysisResultForFile = function (sourceFile) {
        return this.analysisResultForFile.get(sourceFile.fileName);
    };
    DefaultAnalyzerDefinitionStore.prototype.getDefinitionsWithDeclarationInFile = function (sourceFile) {
        return Array.from(this.intersectingDefinitionsForFile.get(sourceFile.fileName) || []);
    };
    DefaultAnalyzerDefinitionStore.prototype.getComponentDeclarationsInFile = function (sourceFile) {
        var e_1, _a, e_2, _b;
        var declarations = new Set();
        try {
            for (var _c = __values(this.intersectingDefinitionsForFile.get(sourceFile.fileName) || []), _d = _c.next(); !_d.done; _d = _c.next()) {
                var definition = _d.value;
                try {
                    for (var _e = (e_2 = void 0, __values((0, component_util_js_1.getDeclarationsInFile)(definition, sourceFile))), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var declaration = _f.value;
                        declarations.add(declaration);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return Array.from(declarations);
    };
    DefaultAnalyzerDefinitionStore.prototype.getDefinitionForTagName = function (tagName) {
        return this.definitionForTagName.get(tagName);
    };
    DefaultAnalyzerDefinitionStore.prototype.getDefinitionsInFile = function (sourceFile) {
        var result = this.analysisResultForFile.get(sourceFile.fileName);
        return (result != null && result.componentDefinitions) || [];
    };
    return DefaultAnalyzerDefinitionStore;
}());
exports.DefaultAnalyzerDefinitionStore = DefaultAnalyzerDefinitionStore;
function addToSetInMap(map, key, value) {
    var set = map.get(key) || new Set();
    set.add(value);
    map.set(key, set);
}
