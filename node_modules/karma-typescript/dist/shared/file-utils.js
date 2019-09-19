"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var FileUtils = /** @class */ (function () {
    function FileUtils() {
    }
    FileUtils.getRelativePath = function (filename, basePath) {
        var relativePath = path.isAbsolute(filename) ?
            path.relative(basePath, filename) :
            filename;
        return path.normalize(relativePath);
    };
    return FileUtils;
}());
exports.FileUtils = FileUtils;
//# sourceMappingURL=file-utils.js.map