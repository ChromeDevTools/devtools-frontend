"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHTMLNode = exports.HtmlNodeKind = void 0;
var HtmlNodeKind;
(function (HtmlNodeKind) {
    HtmlNodeKind["NODE"] = "NODE";
    HtmlNodeKind["SVG"] = "SVG";
    HtmlNodeKind["STYLE"] = "STYLE";
})(HtmlNodeKind || (exports.HtmlNodeKind = HtmlNodeKind = {}));
function isHTMLNode(obj) {
    return "tagName" in obj && "location" in obj && "attributes" in obj;
}
exports.isHTMLNode = isHTMLNode;
