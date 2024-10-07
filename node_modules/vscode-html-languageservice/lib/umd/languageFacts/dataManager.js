/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./dataProvider", "./data/webCustomData"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dataProvider_1 = require("./dataProvider");
    var webCustomData_1 = require("./data/webCustomData");
    var HTMLDataManager = /** @class */ (function () {
        function HTMLDataManager(options) {
            this.dataProviders = [];
            this.setDataProviders(options.useDefaultDataProvider !== false, options.customDataProviders || []);
        }
        HTMLDataManager.prototype.setDataProviders = function (builtIn, providers) {
            var _a;
            this.dataProviders = [];
            if (builtIn) {
                this.dataProviders.push(new dataProvider_1.HTMLDataProvider('html5', webCustomData_1.htmlData));
            }
            (_a = this.dataProviders).push.apply(_a, providers);
        };
        HTMLDataManager.prototype.getDataProviders = function () {
            return this.dataProviders;
        };
        return HTMLDataManager;
    }());
    exports.HTMLDataManager = HTMLDataManager;
});
