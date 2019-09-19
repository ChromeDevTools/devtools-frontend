"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash = require("lodash");
var PathTool = require("./path-tool");
var Extender = /** @class */ (function () {
    function Extender() {
    }
    Extender.extend = function (key, tsconfig, karmaTypescriptConfig) {
        var extendable = karmaTypescriptConfig[key];
        if (Array.isArray(extendable)) {
            var list = lodash.union(tsconfig[key], extendable);
            tsconfig[key] = this.fixWindowsPaths(list);
        }
        if (lodash.isObject(extendable)) {
            if (extendable.mode === "replace") {
                tsconfig[key] = extendable.values;
            }
            if (extendable.mode === "merge") {
                var list = lodash.union(tsconfig[key], extendable.values);
                tsconfig[key] = this.fixWindowsPaths(list);
            }
            return;
        }
    };
    Extender.fixWindowsPaths = function (list) {
        if (list && list.length) {
            return list.map(function (item) {
                return PathTool.fixWindowsPath(item);
            });
        }
        return [];
    };
    return Extender;
}());
exports.Extender = Extender;
//# sourceMappingURL=extender.js.map