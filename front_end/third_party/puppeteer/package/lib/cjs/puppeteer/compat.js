"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.puppeteerDirname = void 0;
const path_1 = require("path");
/**
 * @internal
 */
let puppeteerDirname;
exports.puppeteerDirname = puppeteerDirname;
try {
    // In some environments, like esbuild, this will throw an error.
    // We suppress the error since the bundled binary is not expected
    // to be used or installed in this case and, therefore, the
    // root directory does not have to be known.
    exports.puppeteerDirname = puppeteerDirname = (0, path_1.dirname)(require.resolve('./compat'));
}
catch (error) {
    // Fallback to __dirname.
    exports.puppeteerDirname = puppeteerDirname = __dirname;
}
//# sourceMappingURL=compat.js.map