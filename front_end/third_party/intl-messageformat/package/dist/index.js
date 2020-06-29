"use strict";
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var intl_messageformat_parser_1 = require("intl-messageformat-parser");
var core_1 = require("./core");
core_1.default.__parse = intl_messageformat_parser_1.default.parse;
__export(require("./core"));
exports.default = core_1.default;
//# sourceMappingURL=index.js.map