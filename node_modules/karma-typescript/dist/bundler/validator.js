"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var acorn = require("acorn");
var os = require("os");
var Validator = /** @class */ (function () {
    function Validator(config) {
        this.config = config;
    }
    Validator.prototype.validate = function (bundle, filename) {
        if (this.config.bundlerOptions.validateSyntax) {
            try {
                acorn.parse(bundle);
            }
            catch (error) {
                var possibleFix = "";
                if (error.message.indexOf("'import' and 'export' may only appear at the top level") !== -1) {
                    possibleFix = "Possible fix: configure karma-typescript to compile " +
                        "es6 modules with karma-typescript-es6-transform";
                }
                throw new Error("Invalid syntax in bundle: " + error.message + os.EOL +
                    "in " + filename + os.EOL +
                    "at line " + error.loc.line + ", column " + error.loc.column + ":" + os.EOL + os.EOL +
                    "... " + bundle.slice(error.pos, error.pos + 50) + " ..." + os.EOL + os.EOL +
                    possibleFix + (possibleFix ? os.EOL : ""));
            }
        }
    };
    return Validator;
}());
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map