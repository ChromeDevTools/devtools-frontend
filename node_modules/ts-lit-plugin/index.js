// A TypeScript compiler plugin must do a CJS style default export, but
// we can't express that in proper ESM, so this hand-written JS
// file bridges the difference.

module.exports = require("./lib/index").init;
