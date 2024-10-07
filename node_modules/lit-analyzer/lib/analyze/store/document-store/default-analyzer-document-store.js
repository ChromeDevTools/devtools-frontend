"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAnalyzerDocumentStore = void 0;
var parse_documents_in_source_file_js_1 = require("../../parse/document/parse-documents-in-source-file.js");
var DefaultAnalyzerDocumentStore = /** @class */ (function () {
    function DefaultAnalyzerDocumentStore() {
    }
    DefaultAnalyzerDocumentStore.prototype.getDocumentAtPosition = function (sourceFile, position, options) {
        return (0, parse_documents_in_source_file_js_1.parseDocumentsInSourceFile)(sourceFile, {
            htmlTags: options.htmlTemplateTags,
            cssTags: options.cssTemplateTags
        }, position);
    };
    DefaultAnalyzerDocumentStore.prototype.getDocumentsInFile = function (sourceFile, config) {
        return (0, parse_documents_in_source_file_js_1.parseDocumentsInSourceFile)(sourceFile, {
            htmlTags: config.htmlTemplateTags,
            cssTags: config.cssTemplateTags
        });
    };
    return DefaultAnalyzerDocumentStore;
}());
exports.DefaultAnalyzerDocumentStore = DefaultAnalyzerDocumentStore;
