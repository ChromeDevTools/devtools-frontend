"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHTMLAttr = exports.HtmlNodeAttrKind = void 0;
var HtmlNodeAttrKind;
(function (HtmlNodeAttrKind) {
    HtmlNodeAttrKind["EVENT_LISTENER"] = "EVENT_LISTENER";
    HtmlNodeAttrKind["ATTRIBUTE"] = "ATTRIBUTE";
    HtmlNodeAttrKind["BOOLEAN_ATTRIBUTE"] = "BOOLEAN_ATTRIBUTE";
    HtmlNodeAttrKind["PROPERTY"] = "PROPERTY";
})(HtmlNodeAttrKind || (exports.HtmlNodeAttrKind = HtmlNodeAttrKind = {}));
function isHTMLAttr(obj) {
    return "name" in obj && "location" in obj && "htmlNode" in obj;
}
exports.isHTMLAttr = isHTMLAttr;
