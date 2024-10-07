"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var is_valid_name_js_1 = require("../analyze/util/is-valid-name.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule makes sure that all custom elements used are imported in a given file.
 */
var rule = {
    id: "no-missing-import",
    meta: {
        priority: "low"
    },
    visitHtmlNode: function (htmlNode, context) {
        var htmlStore = context.htmlStore, config = context.config, definitionStore = context.definitionStore, dependencyStore = context.dependencyStore, file = context.file;
        // Return if the html tag doesn't exists or if the html tag doesn't have a declaration
        var htmlTag = htmlStore.getHtmlTag(htmlNode);
        if (htmlTag == null)
            return;
        // Only check if custom elements have been imported.
        var isCustomElement = (0, is_valid_name_js_1.isCustomElementTagName)(htmlNode.tagName);
        if (!isCustomElement)
            return;
        // Don't continue if this tag name doesn't have a definition.
        // If the html tag doesn't have a definition we won't know how to import it.
        var definition = definitionStore.getDefinitionForTagName(htmlNode.tagName);
        if (definition == null)
            return;
        // Check if the tag name has been imported in the file of the template.
        var isDefinitionImported = dependencyStore.hasTagNameBeenImported(file.fileName, htmlNode.tagName);
        // Report diagnostic if the html tag hasn't been imported.
        if (!isDefinitionImported) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
                message: "Missing import for <".concat(htmlNode.tagName, ">"),
                suggestion: config.dontSuggestConfigChanges ? undefined : "You can disable this check by disabling the 'no-missing-import' rule.",
                fix: function () {
                    var importPath = getRelativePathForImport(file.fileName, definition.sourceFile.fileName);
                    return {
                        message: "Import <".concat(definition.tagName, "> from module \"").concat(importPath, "\""),
                        actions: [
                            {
                                kind: "import",
                                path: importPath,
                                file: context.file
                            }
                        ]
                    };
                }
            });
        }
    }
};
exports.default = rule;
/**
 * Returns a relative path from a file path to another file path.
 * This path can be used in an import statement.
 * @param fromFileName
 * @param toFileName
 */
function getRelativePathForImport(fromFileName, toFileName) {
    var path = path_1.posix.relative((0, path_1.dirname)(fromFileName), (0, path_1.dirname)(toFileName));
    var filenameWithoutExt = (0, path_1.basename)(toFileName).replace(/\.[^/.]+$/, "");
    var prefix = path.startsWith("../") ? "" : "./";
    var importPath = "".concat(prefix).concat(path ? "".concat(path, "/") : "").concat(filenameWithoutExt);
    return importPath
        .replace(/^.*node_modules\//, "")
        .replace(/\.d$/, "")
        .replace(/\/index$/, "");
}
