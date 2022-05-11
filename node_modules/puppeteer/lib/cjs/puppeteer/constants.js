"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootDirname = void 0;
const path_1 = require("path");
const compat_js_1 = require("./compat.js");
exports.rootDirname = (0, path_1.dirname)((0, path_1.dirname)((0, path_1.dirname)(compat_js_1.puppeteerDirname)));
//# sourceMappingURL=constants.js.map