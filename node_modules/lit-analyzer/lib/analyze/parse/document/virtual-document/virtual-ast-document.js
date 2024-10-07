"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualAstDocument = void 0;
var ts_module_js_1 = require("../../../ts-module.js");
var range_util_js_1 = require("../../../util/range-util.js");
function getPartLength(part) {
    var end = part.parent && ts_module_js_1.tsModule.ts.isTemplateSpan(part.parent) ? part.parent.literal.getStart() : part.getEnd();
    return end - part.getFullStart();
}
var VirtualAstDocument = /** @class */ (function () {
    function VirtualAstDocument(astNodeOrParts, location, fileName) {
        var _this = this;
        if (Array.isArray(astNodeOrParts)) {
            this.parts = astNodeOrParts.map(function (p, i) {
                return typeof p === "string" ? "".concat(i !== 0 ? "}" : "").concat(p).concat(i !== astNodeOrParts.length - 1 ? "${" : "") : p;
            });
            this.location = location;
            this.fileName = fileName;
        }
        else {
            var _a = getPartsFromTaggedTemplate(astNodeOrParts), expressionParts_1 = _a.expressionParts, literalParts = _a.literalParts;
            // Text contains both the ` of the template string and ${  +  }.
            // Strip these chars and make it possible to substitute even ${ and }!
            this.parts = [];
            literalParts.forEach(function (p, i) {
                var expressionPart = expressionParts_1[i];
                _this.parts.push(p.getText().slice(i === 0 ? 1 : 0, expressionPart == null ? -1 : undefined));
                if (expressionPart != null)
                    _this.parts.push(expressionPart);
            });
            this.location = (0, range_util_js_1.makeSourceFileRange)({
                start: astNodeOrParts.template.getStart() + 1,
                end: astNodeOrParts.template.getEnd() - 1
            });
            this.fileName = this.fileName = astNodeOrParts.getSourceFile().fileName;
        }
    }
    Object.defineProperty(VirtualAstDocument.prototype, "text", {
        get: function () {
            var _this = this;
            if (this._text == null) {
                var str_1 = "";
                var prevPart_1 = "";
                this.parts.forEach(function (part, i) {
                    var isLastPart = i >= _this.parts.length - 1;
                    if (typeof part === "string") {
                        str_1 += part.substring(i === 0 ? 0 : 1, part.length - (isLastPart ? 0 : 2));
                        prevPart_1 = part;
                    }
                    else {
                        var length = getPartLength(part) + 3;
                        var expressionIndex = (i - 1) / 2;
                        var substitution = _this.substituteExpression(length, part, prevPart_1, _this.parts[i + 1], expressionIndex);
                        str_1 += substitution;
                    }
                });
                this._text = str_1;
            }
            return this._text;
        },
        enumerable: false,
        configurable: true
    });
    VirtualAstDocument.prototype.getPartsAtDocumentRange = function (range) {
        var _this = this;
        if (range == null) {
            return this.parts;
        }
        var resultParts = [];
        var offset = 0;
        this.parts.forEach(function (part, i) {
            var isLastPart = i >= _this.parts.length - 1;
            var startOffset = offset;
            if (typeof part === "string") {
                var startPadding = i === 0 ? 0 : 1;
                var endPadding = isLastPart ? 0 : 2;
                offset += part.length;
                var literalPartRange = {
                    start: startOffset + startPadding,
                    end: offset - endPadding
                };
                if ((range.start < literalPartRange.start && range.end > literalPartRange.end) ||
                    (0, range_util_js_1.intersects)(range.start + 1, literalPartRange) ||
                    (0, range_util_js_1.intersects)(range.end - 1, literalPartRange)) {
                    var strStart = Math.max(literalPartRange.start, range.start);
                    var strEnd = Math.min(literalPartRange.end, range.end);
                    var substr = _this.text.substring(strStart, strEnd);
                    resultParts.push(substr);
                }
            }
            else {
                offset += getPartLength(part);
                var expressionPartRange = {
                    start: startOffset,
                    end: offset
                };
                if ((0, range_util_js_1.intersects)(expressionPartRange, range)) {
                    resultParts.push(part);
                }
            }
        });
        return resultParts;
    };
    VirtualAstDocument.prototype.sfPositionToDocumentOffset = function (position) {
        return position - this.location.start;
    };
    VirtualAstDocument.prototype.documentOffsetToSFPosition = function (offset) {
        return this.location.start + offset;
    };
    VirtualAstDocument.prototype.substituteExpression = function (length, expression, prev, next, index) {
        if (length < 4) {
            throw new Error("Internal error: unexpected expression length: " + length);
        }
        var indexString = index.toString(36);
        if (indexString.length > length - 2) {
            throw new Error("Too many expressions in this template: " + indexString);
        }
        // To support element expressions, where we substitute into attribute name
        // position, we create a unique substitution by using the expression index
        //
        // We need this substitution to be valid in HTML for all valid lit-html
        // expression positions - so it must be a valid unquoted attribute value,
        // attribute name, and text content. Ideally the substitution would also
        // be a valid tag name to support some analysis of Lit 2 static templates.
        //
        // Example substitution:
        //
        //     html`<a href=${u}>${text}</a>`
        //
        // becomes:
        //
        //     html`<a href=__0_>_____1_</a>`
        return "_".repeat(length - indexString.length - 1) + indexString + "_";
    };
    return VirtualAstDocument;
}());
exports.VirtualAstDocument = VirtualAstDocument;
function getPartsFromTaggedTemplate(astNode) {
    var e_1, _a;
    var expressionParts = [];
    var literalParts = [];
    var template = astNode.template;
    if (ts_module_js_1.tsModule.ts.isTemplateExpression(template)) {
        literalParts.push(template.head);
        try {
            for (var _b = __values(template.templateSpans), _c = _b.next(); !_c.done; _c = _b.next()) {
                var templateSpan = _c.value;
                var expression = templateSpan.expression;
                expressionParts.push(expression);
                literalParts.push(templateSpan.literal);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    else if (ts_module_js_1.tsModule.ts.isNoSubstitutionTemplateLiteral(template)) {
        literalParts.push(template);
    }
    return { expressionParts: expressionParts, literalParts: literalParts };
}
