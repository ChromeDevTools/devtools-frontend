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
exports.DefaultAnalyzerDependencyStore = void 0;
var DefaultAnalyzerDependencyStore = /** @class */ (function () {
    function DefaultAnalyzerDependencyStore() {
        this.importedComponentDefinitionsInFile = new Map();
    }
    DefaultAnalyzerDependencyStore.prototype.absorbComponentDefinitionsForFile = function (sourceFile, result) {
        this.importedComponentDefinitionsInFile.set(sourceFile.fileName, result);
    };
    /**
     * Returns if a component for a specific file has been imported.
     * @param fileName
     * @param tagName
     */
    DefaultAnalyzerDependencyStore.prototype.hasTagNameBeenImported = function (fileName, tagName) {
        var e_1, _a;
        try {
            for (var _b = __values(this.importedComponentDefinitionsInFile.get(fileName) || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var file = _c.value;
                if (file.tagName === tagName) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    return DefaultAnalyzerDependencyStore;
}());
exports.DefaultAnalyzerDependencyStore = DefaultAnalyzerDependencyStore;
