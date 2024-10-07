"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameLocationsAtOffset = void 0;
var html_node_types_js_1 = require("../../../types/html-node/html-node-types.js");
var rename_locations_for_tag_name_js_1 = require("./rename-locations-for-tag-name.js");
function renameLocationsAtOffset(document, offset, context) {
    var hit = document.htmlNodeOrAttrAtOffset(offset);
    if (hit == null)
        return [];
    if ((0, html_node_types_js_1.isHTMLNode)(hit)) {
        return (0, rename_locations_for_tag_name_js_1.renameLocationsForTagName)(hit.tagName, context);
    }
    return [];
}
exports.renameLocationsAtOffset = renameLocationsAtOffset;
