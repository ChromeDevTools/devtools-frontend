"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async = require("async");
var lodash = require("lodash");
var os = require("os");
var bundle_item_1 = require("./bundle-item");
var Globals = /** @class */ (function () {
    function Globals(config, resolver) {
        this.config = config;
        this.resolver = resolver;
    }
    Globals.prototype.add = function (buffer, entrypoints, onGlobalsAdded) {
        var _this = this;
        var items = [];
        this.addConstants(items);
        this.addNodeGlobals(items);
        async.eachSeries(items, function (item, onGlobalResolved) {
            async.eachSeries(item.dependencies, function (dependency, onModuleResolved) {
                _this.resolver.resolveModule(item.filename, dependency, buffer, function () {
                    onModuleResolved();
                });
            }, function () {
                buffer.unshift(item);
                entrypoints.unshift(item.filename);
                onGlobalResolved();
            });
        }, onGlobalsAdded);
    };
    Globals.prototype.addNodeGlobals = function (items) {
        if (this.config.bundlerOptions.addNodeGlobals) {
            var name_1 = "bundle/node-globals";
            items.push(new bundle_item_1.BundleItem(name_1, name_1, os.EOL + "global.process=require('_process');" +
                os.EOL + "global.Buffer=require('buffer').Buffer;", undefined, [
                new bundle_item_1.BundleItem("_process"),
                new bundle_item_1.BundleItem("buffer")
            ]));
        }
    };
    Globals.prototype.addConstants = function (items) {
        var _this = this;
        var source = "";
        var name = "bundle/constants";
        Object.keys(this.config.bundlerOptions.constants).forEach(function (key) {
            var value = _this.config.bundlerOptions.constants[key];
            if (!lodash.isString(value)) {
                value = JSON.stringify(value);
            }
            source += os.EOL + "global." + key + "=" + value + ";";
        });
        if (source) {
            items.push(new bundle_item_1.BundleItem(name, name, source, undefined, []));
        }
    };
    return Globals;
}());
exports.Globals = Globals;
//# sourceMappingURL=globals.js.map