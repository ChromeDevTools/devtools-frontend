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
        define(["require", "exports", "../utils/markup"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var markup_1 = require("../utils/markup");
    var HTMLDataProvider = /** @class */ (function () {
        /**
         * Currently, unversioned data uses the V1 implementation
         * In the future when the provider handles multiple versions of HTML custom data,
         * use the latest implementation for unversioned data
         */
        function HTMLDataProvider(id, customData) {
            var _this = this;
            this.id = id;
            this._tags = [];
            this._tagMap = {};
            this._attributeMap = {};
            this._valueSetMap = {};
            this._tags = customData.tags || [];
            this._globalAttributes = customData.globalAttributes || [];
            this._tags.forEach(function (t) {
                _this._tagMap[t.name] = t;
                if (t.attributes) {
                    t.attributes.forEach(function (a) {
                        _this._attributeMap[a.name] = a;
                    });
                }
            });
            this._globalAttributes.forEach(function (a) {
                _this._attributeMap[a.name] = a;
            });
            if (customData.valueSets) {
                customData.valueSets.forEach(function (vs) {
                    _this._valueSetMap[vs.name] = vs.values;
                });
            }
        }
        HTMLDataProvider.prototype.isApplicable = function () {
            return true;
        };
        HTMLDataProvider.prototype.getId = function () {
            return this.id;
        };
        HTMLDataProvider.prototype.provideTags = function () {
            return this._tags;
        };
        HTMLDataProvider.prototype.provideAttributes = function (tag) {
            var attributes = [];
            var processAttribute = function (a) {
                attributes.push(a);
            };
            if (this._tagMap[tag]) {
                this._tagMap[tag].attributes.forEach(function (a) {
                    processAttribute(a);
                });
            }
            this._globalAttributes.forEach(function (ga) {
                processAttribute(ga);
            });
            return attributes;
        };
        HTMLDataProvider.prototype.provideValues = function (tag, attribute) {
            var _this = this;
            var values = [];
            var processAttributes = function (attributes) {
                attributes.forEach(function (a) {
                    if (a.name === attribute) {
                        if (a.values) {
                            a.values.forEach(function (v) {
                                values.push(v);
                            });
                        }
                        if (a.valueSet) {
                            if (_this._valueSetMap[a.valueSet]) {
                                _this._valueSetMap[a.valueSet].forEach(function (v) {
                                    values.push(v);
                                });
                            }
                        }
                    }
                });
            };
            if (!this._tagMap[tag]) {
                return [];
            }
            processAttributes(this._tagMap[tag].attributes);
            processAttributes(this._globalAttributes);
            return values;
        };
        return HTMLDataProvider;
    }());
    exports.HTMLDataProvider = HTMLDataProvider;
    /**
     * Generate Documentation used in hover/complete
     * From `documentation` and `references`
     */
    function generateDocumentation(item, doesSupportMarkdown) {
        var result = {
            kind: doesSupportMarkdown ? 'markdown' : 'plaintext',
            value: ''
        };
        if (item.description) {
            var normalizedDescription = markup_1.normalizeMarkupContent(item.description);
            if (normalizedDescription) {
                result.value += normalizedDescription.value;
            }
        }
        if (item.references && item.references.length > 0) {
            result.value += "\n\n";
            if (doesSupportMarkdown) {
                result.value += item.references.map(function (r) {
                    return "[" + r.name + "](" + r.url + ")";
                }).join(' | ');
            }
            else {
                result.value += item.references.map(function (r) {
                    return r.name + ": " + r.url;
                }).join('\n');
            }
        }
        if (result.value === '') {
            return undefined;
        }
        return result;
    }
    exports.generateDocumentation = generateDocumentation;
});
