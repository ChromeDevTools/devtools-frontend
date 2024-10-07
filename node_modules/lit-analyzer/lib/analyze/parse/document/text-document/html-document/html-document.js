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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.HtmlDocument = void 0;
var range_util_js_1 = require("../../../../util/range-util.js");
var text_document_js_1 = require("../text-document.js");
var HtmlDocument = /** @class */ (function (_super) {
    __extends(HtmlDocument, _super);
    function HtmlDocument(virtualDocument, rootNodes) {
        var _this = _super.call(this, virtualDocument) || this;
        _this.rootNodes = rootNodes;
        return _this;
    }
    HtmlDocument.prototype.htmlAttrAreaAtOffset = function (offset) {
        return this.mapFindOne(function (node) {
            var e_1, _a;
            var offsetNum = typeof offset === "number" ? offset : offset.end;
            if (offsetNum > node.location.name.end && (0, range_util_js_1.intersects)(offset, node.location.startTag)) {
                try {
                    // Check if the position intersects any attributes. Break if so.
                    for (var _b = __values(node.attributes), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var htmlAttr = _c.value;
                        if ((0, range_util_js_1.intersects)(offset, htmlAttr.location)) {
                            return undefined;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return node;
            }
            return;
        });
    };
    HtmlDocument.prototype.htmlAttrAssignmentAtOffset = function (offset) {
        return this.findAttr(function (attr) {
            return attr.assignment != null && attr.assignment.location != null ? (0, range_util_js_1.intersects)(offset, attr.assignment.location) : false;
        });
    };
    HtmlDocument.prototype.htmlAttrNameAtOffset = function (offset) {
        return this.findAttr(function (attr) { return (0, range_util_js_1.intersects)(offset, attr.location.name); });
    };
    HtmlDocument.prototype.htmlNodeNameAtOffset = function (offset) {
        return this.findNode(function (node) { return (0, range_util_js_1.intersects)(offset, node.location.name) || (node.location.endTag != null && (0, range_util_js_1.intersects)(offset, node.location.endTag)); });
    };
    HtmlDocument.prototype.htmlNodeOrAttrAtOffset = function (offset) {
        var htmlNode = this.htmlNodeNameAtOffset(offset);
        if (htmlNode != null)
            return htmlNode;
        var htmlAttr = this.htmlAttrNameAtOffset(offset);
        if (htmlAttr != null)
            return htmlAttr;
        return;
    };
    /**
     * Finds the closest node to offset.
     * This method can be used to find out which tag to close in the HTML.
     * @param offset
     */
    HtmlDocument.prototype.htmlNodeClosestToOffset = function (offset) {
        var closestNode = undefined;
        // Use 'findNode' to iterate nodes. Keep track of the closest node.
        this.findNode(function (node) {
            if (offset < node.location.startTag.end) {
                // Break as soon as we find a node that starts AFTER the offset.
                // The closestNode would now be the previous found node.
                return true;
            }
            else if (node.location.endTag == null || offset < node.location.endTag.end) {
                // Save closest node if the node doesn't have an end tag of the node ends AFTER the offset.
                closestNode = node;
            }
            return false;
        });
        return closestNode;
    };
    HtmlDocument.prototype.findAttr = function (test) {
        return this.mapFindOne(function (node) {
            var e_2, _a;
            try {
                for (var _b = __values(node.attributes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var attr = _c.value;
                    if (test(attr))
                        return attr;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return;
        });
    };
    HtmlDocument.prototype.findNode = function (test) {
        return this.mapFindOne(function (node) {
            if (test(node))
                return node;
            return;
        });
    };
    HtmlDocument.prototype.mapNodes = function (map) {
        var items = [];
        function childrenLoop(node) {
            items.push(map(node));
            node.children.forEach(function (childNode) { return childrenLoop(childNode); });
        }
        this.rootNodes.forEach(function (rootNode) { return childrenLoop(rootNode); });
        return items;
    };
    HtmlDocument.prototype.nodes = function (roots) {
        var roots_1, roots_1_1, root, e_3_1;
        var e_3, _a;
        if (roots === void 0) { roots = this.rootNodes; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, 7, 8]);
                    roots_1 = __values(roots), roots_1_1 = roots_1.next();
                    _b.label = 1;
                case 1:
                    if (!!roots_1_1.done) return [3 /*break*/, 5];
                    root = roots_1_1.value;
                    return [4 /*yield*/, root];
                case 2:
                    _b.sent();
                    return [5 /*yield**/, __values(this.nodes(root.children))];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    roots_1_1 = roots_1.next();
                    return [3 /*break*/, 1];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_3_1 = _b.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (roots_1_1 && !roots_1_1.done && (_a = roots_1.return)) _a.call(roots_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    };
    HtmlDocument.prototype.mapFindOne = function (map) {
        var e_4, _a;
        try {
            for (var _b = __values(this.nodes()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var node = _c.value;
                var found = map(node);
                if (found != null) {
                    return found;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return;
    };
    return HtmlDocument;
}(text_document_js_1.TextDocument));
exports.HtmlDocument = HtmlDocument;
