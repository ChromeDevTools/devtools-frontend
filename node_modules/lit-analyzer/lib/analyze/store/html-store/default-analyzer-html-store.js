"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAnalyzerHtmlStore = void 0;
var html_node_attr_types_js_1 = require("../../types/html-node/html-node-attr-types.js");
var html_data_source_merged_js_1 = require("./html-data-source-merged.js");
var DefaultAnalyzerHtmlStore = /** @class */ (function () {
    function DefaultAnalyzerHtmlStore() {
        this.dataSource = new html_data_source_merged_js_1.HtmlDataSourceMerged();
    }
    DefaultAnalyzerHtmlStore.prototype.absorbSubclassExtension = function (name, extension) {
        this.dataSource.absorbSubclassExtension(name, extension);
    };
    DefaultAnalyzerHtmlStore.prototype.absorbCollection = function (collection, register) {
        this.dataSource.absorbCollection(collection, register);
    };
    DefaultAnalyzerHtmlStore.prototype.forgetCollection = function (collection, register) {
        this.dataSource.forgetCollection(collection, register);
    };
    DefaultAnalyzerHtmlStore.prototype.getHtmlTag = function (htmlNode) {
        return this.dataSource.getHtmlTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName);
    };
    DefaultAnalyzerHtmlStore.prototype.getGlobalTags = function () {
        return this.dataSource.globalTags.values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllAttributesForTag = function (htmlNode) {
        return this.dataSource.getAllAttributesForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllPropertiesForTag = function (htmlNode) {
        return this.dataSource.getAllPropertiesForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllEventsForTag = function (htmlNode) {
        return this.dataSource.getAllEventsForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllSlotsForTag = function (htmlNode) {
        return this.dataSource.getAllSlotForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllCssPartsForTag = function (htmlNode) {
        return this.dataSource.getAllCssPartsForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getAllCssPropertiesForTag = function (htmlNode) {
        return this.dataSource.getAllCssPropertiesForTag(typeof htmlNode === "string" ? htmlNode : htmlNode.tagName).values();
    };
    DefaultAnalyzerHtmlStore.prototype.getHtmlAttrTarget = function (htmlNodeAttr) {
        var name = htmlNodeAttr.name.toLowerCase();
        switch (htmlNodeAttr.kind) {
            case html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER:
                return this.dataSource.getAllEventsForTag(htmlNodeAttr.htmlNode.tagName).get(name);
            case html_node_attr_types_js_1.HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE:
            case html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE:
                return this.dataSource.getAllAttributesForTag(htmlNodeAttr.htmlNode.tagName).get(name);
            case html_node_attr_types_js_1.HtmlNodeAttrKind.PROPERTY:
                return this.dataSource.getAllPropertiesForTag(htmlNodeAttr.htmlNode.tagName).get(name);
        }
    };
    return DefaultAnalyzerHtmlStore;
}());
exports.DefaultAnalyzerHtmlStore = DefaultAnalyzerHtmlStore;
