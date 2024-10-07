"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
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
exports.converRuleFixToLitCodeFix = void 0;
var ts_module_js_1 = require("../ts-module.js");
var array_util_js_1 = require("./array-util.js");
var range_util_js_1 = require("./range-util.js");
function converRuleFixToLitCodeFix(codeFix) {
    return {
        name: "",
        message: codeFix.message,
        actions: (0, array_util_js_1.arrayFlat)(codeFix.actions.map(ruleFixActionConverter))
    };
}
exports.converRuleFixToLitCodeFix = converRuleFixToLitCodeFix;
function ruleFixActionConverter(action) {
    var _a, _b;
    switch (action.kind) {
        case "changeTagName": {
            var document = action.htmlNode.document;
            var startLocation = action.htmlNode.location.name;
            var endLocation = action.htmlNode.location.endTag;
            return __spreadArray([
                {
                    range: (0, range_util_js_1.documentRangeToSFRange)(document, startLocation),
                    newText: action.newName
                }
            ], __read((endLocation == null
                ? []
                : [
                    {
                        range: (0, range_util_js_1.documentRangeToSFRange)(document, {
                            start: endLocation.start + 2,
                            end: endLocation.end - 1
                        }),
                        newText: action.newName
                    }
                ])), false);
        }
        case "addAttribute": {
            var htmlNode = action.htmlNode;
            return [
                {
                    range: (0, range_util_js_1.documentRangeToSFRange)(htmlNode.document, {
                        start: htmlNode.location.name.end,
                        end: htmlNode.location.name.end
                    }),
                    newText: " ".concat(action.name).concat(action.value == null ? "" : "=\"".concat(action.value, "\""))
                }
            ];
        }
        case "changeAttributeName": {
            return [
                {
                    range: (0, range_util_js_1.rangeFromHtmlNodeAttr)(action.htmlAttr),
                    newText: action.newName
                }
            ];
        }
        case "changeAttributeModifier": {
            var document = action.htmlAttr.document;
            return [
                {
                    // Make a range that includes the modifier.
                    range: (0, range_util_js_1.documentRangeToSFRange)(document, {
                        start: action.htmlAttr.location.start,
                        end: action.htmlAttr.location.name.start
                    }),
                    newText: action.newModifier
                }
            ];
        }
        case "changeAssignment": {
            var assignment = action.assignment;
            if (assignment.location == null) {
                return [];
            }
            return [
                {
                    range: (0, range_util_js_1.documentRangeToSFRange)(assignment.htmlAttr.document, {
                        start: assignment.location.start + 2,
                        end: assignment.location.end - 1 // Offset 1 for '}'
                    }),
                    newText: action.newValue
                }
            ];
        }
        case "import": {
            // Get the import path and the position where it can be placed
            var lastImportIndex = getLastImportIndex(action.file);
            return [
                {
                    range: (0, range_util_js_1.makeSourceFileRange)({
                        start: lastImportIndex,
                        end: lastImportIndex
                    }),
                    newText: "\nimport \"".concat(action.path, "\";")
                }
            ];
        }
        case "changeIdentifier": {
            return [
                {
                    range: (0, range_util_js_1.rangeFromNode)(action.identifier),
                    newText: action.newText
                }
            ];
        }
        case "changeRange": {
            return [
                {
                    range: action.range,
                    newText: action.newText
                }
            ];
        }
        case "extendGlobalDeclaration": {
            if (action.file == null) {
                break;
            }
            var MEMBER_PART = "\n\t\t".concat(action.newMembers.join("\t\t"));
            var DECLARATION_PART = "\n\tinterface ".concat(action.name, " {").concat(MEMBER_PART, "\n\t}");
            var MODULE_PART = "\n\ndeclare global {".concat(DECLARATION_PART, "\n}");
            var existingModuleDeclaration = (_a = action.file.statements) === null || _a === void 0 ? void 0 : _a.find(function (statement) { return ts_module_js_1.tsModule.ts.isModuleDeclaration(statement) && statement.name.text === "global"; });
            var existingModuleBody = existingModuleDeclaration === null || existingModuleDeclaration === void 0 ? void 0 : existingModuleDeclaration.body;
            // If there is no existing "global" module declaration, add an entire global module declaration
            if (existingModuleDeclaration == null) {
                return [
                    {
                        range: (0, range_util_js_1.makeSourceFileRange)({
                            start: action.file.getEnd(),
                            end: action.file.getEnd()
                        }),
                        newText: MODULE_PART
                    }
                ];
            }
            if (existingModuleBody == null || !ts_module_js_1.tsModule.ts.isModuleBlock(existingModuleBody)) {
                return [];
            }
            var existingDeclaration = (_b = existingModuleBody.statements) === null || _b === void 0 ? void 0 : _b.find(function (statement) { return ts_module_js_1.tsModule.ts.isInterfaceDeclaration(statement) && statement.name.text === action.name; });
            // If there is no existing declaration with "action.name", add a new declaration inside the module block
            if (existingDeclaration == null) {
                return [
                    {
                        range: (0, range_util_js_1.makeSourceFileRange)({
                            start: existingModuleBody.getStart() + 1,
                            end: existingModuleBody.getStart() + 1
                        }),
                        newText: DECLARATION_PART
                    }
                ];
            }
            // If there is an existing declaration with "action.name", add members to it
            return [
                {
                    range: (0, range_util_js_1.makeSourceFileRange)({
                        start: existingDeclaration.name.getEnd() + 2,
                        end: existingDeclaration.name.getEnd() + 2
                    }),
                    newText: MEMBER_PART
                }
            ];
        }
    }
    return [];
}
/**
 * Returns the position of the last import line.
 * @param sourceFile
 */
function getLastImportIndex(sourceFile) {
    var e_1, _a;
    var lastImportIndex = 0;
    try {
        for (var _b = __values(sourceFile.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
            var statement = _c.value;
            if (ts_module_js_1.tsModule.ts.isImportDeclaration(statement)) {
                lastImportIndex = statement.getEnd();
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
    return lastImportIndex;
}
