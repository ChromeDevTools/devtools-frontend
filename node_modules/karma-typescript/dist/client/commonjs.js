(function (global) {
    "use strict";
    global.__karmaTypescriptModules__ = {};
    var fn = 0;
    var id = 1;
    var map = 2;
    var require = function (filename, requiring, required) {
        var wrapper;
        var module = global.__karmaTypescriptModules__[filename];
        if (!module) {
            wrapper = global.wrappers[filename];
            if (!wrapper) {
                throw new Error("Can't find " + required + " [" + filename + "] (required by " + requiring + ")");
            }
            module = { exports: {}, id: wrapper[id], uri: filename };
            global.__karmaTypescriptModules__[filename] = module;
            wrapper[fn].call(module.exports, function (dependency) {
                return require(wrapper[map][dependency], filename, dependency);
            }, module, module.exports, filename.slice(0, filename.lastIndexOf("/")), filename);
            if (module.exports && isExtensible(module.exports) && ((typeof module.exports === "function" && module.exports !== module.exports.default)
                || !module.exports.default)) {
                if (!module.exports.__esModule) {
                    Object.defineProperty(module.exports, "__esModule", {
                        configurable: true, enumerable: false, value: true, writable: true
                    });
                }
                Object.defineProperty(module.exports, "default", {
                    configurable: true, enumerable: false, value: module.exports, writable: true
                });
            }
        }
        return module.exports;
    };
    var isExtensible = function (obj) {
        return (typeof obj === "function" || typeof obj === "object") && Object.isExtensible(obj);
    };
    (global.entrypointFilenames || []).forEach(function (filename) {
        require(filename, "commonjs.js", "entrypoint");
    });
})(this);
//# sourceMappingURL=commonjs.js.map