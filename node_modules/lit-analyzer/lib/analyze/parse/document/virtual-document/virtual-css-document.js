"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualAstCssDocument = void 0;
var virtual_ast_document_js_1 = require("./virtual-ast-document.js");
var VirtualAstCssDocument = /** @class */ (function (_super) {
    __extends(VirtualAstCssDocument, _super);
    function VirtualAstCssDocument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VirtualAstCssDocument.prototype.substituteExpression = function (length, expression, prev, next, _index) {
        var hasLeftColon = prev.match(/:[^;{]*\${$/) != null;
        var hasRightColon = next != null && next.match(/^}\s*:\s+/) != null;
        var hasRightSemicolon = next != null && next.match(/^}\s*;/) != null;
        var hasRightPercentage = next != null && next.match(/^}%/) != null;
        // Inspired by https://github.com/Microsoft/typescript-styled-plugin/blob/909d4f17d61562fe77f24587ea443713b8da851d/src/_substituter.ts#L62
        // If this substitution contains both a property and a key, replace it with "$_:_"
        //   Example:
        //     div {
        //       ${unsafeCSS("color: red)};
        //     }
        if (hasRightSemicolon && !hasLeftColon) {
            var prefix = "$_:_";
            return "".concat(prefix).concat("_".repeat(Math.max(0, length - prefix.length))).slice(0, length);
        }
        // If there is "%" to the right of this substitution, replace with a number, because the parser expects a number unit
        //    Example:
        //	    div {
        //        transform-origin: ${x}% ${y}%;
        //      }
        else if (hasRightPercentage) {
            return "0".repeat(length);
        }
        // If there is a ": " to the right of this substitution, replace it with an identifier
        //     Example:
        //       div {
        //         ${unsafeCSS("color")}: red
        //       }
        else if (hasRightColon) {
            return "$".concat("_".repeat(length - 1));
        }
        // Else replace with an identifier "_"
        return "_".repeat(length);
    };
    return VirtualAstCssDocument;
}(virtual_ast_document_js_1.VirtualAstDocument));
exports.VirtualAstCssDocument = VirtualAstCssDocument;
