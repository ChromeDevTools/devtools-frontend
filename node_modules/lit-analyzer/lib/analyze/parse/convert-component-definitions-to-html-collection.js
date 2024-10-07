"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.convertComponentFeaturesToHtml = exports.convertComponentDeclarationToHtmlTag = exports.convertAnalyzeResultToHtmlCollection = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var general_util_js_1 = require("../util/general-util.js");
function convertAnalyzeResultToHtmlCollection(result, options) {
    var tags = result.componentDefinitions.map(function (definition) { return convertComponentDeclarationToHtmlTag(definition.declaration, definition, options); });
    var global = result.globalFeatures == null ? {} : convertComponentFeaturesToHtml(result.globalFeatures, { checker: options.checker });
    return {
        tags: tags,
        global: global
    };
}
exports.convertAnalyzeResultToHtmlCollection = convertAnalyzeResultToHtmlCollection;
function convertComponentDeclarationToHtmlTag(declaration, definition, _a) {
    var e_1, _b;
    var _c, _d;
    var checker = _a.checker, addDeclarationPropertiesAsAttributes = _a.addDeclarationPropertiesAsAttributes;
    var tagName = (_c = definition === null || definition === void 0 ? void 0 : definition.tagName) !== null && _c !== void 0 ? _c : "";
    var builtIn = definition == null || ((declaration === null || declaration === void 0 ? void 0 : declaration.sourceFile) || definition.sourceFile).fileName.endsWith("lib.dom.d.ts");
    if (declaration == null) {
        return {
            tagName: tagName,
            builtIn: builtIn,
            attributes: [],
            events: [],
            properties: [],
            slots: [],
            cssParts: [],
            cssProperties: []
        };
    }
    var htmlTag = __assign({ declaration: declaration, tagName: tagName, builtIn: builtIn, description: (_d = declaration.jsDoc) === null || _d === void 0 ? void 0 : _d.description }, convertComponentFeaturesToHtml(declaration, { checker: checker, builtIn: builtIn, fromTagName: tagName }));
    if (addDeclarationPropertiesAsAttributes && !builtIn) {
        try {
            for (var _e = __values(htmlTag.properties), _f = _e.next(); !_f.done; _f = _e.next()) {
                var htmlProp = _f.value;
                if (htmlProp.declaration != null && htmlProp.declaration.attrName == null && htmlProp.declaration.node.getSourceFile().isDeclarationFile) {
                    htmlTag.attributes.push(__assign(__assign({}, htmlProp), { kind: "attribute" }));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return htmlTag;
}
exports.convertComponentDeclarationToHtmlTag = convertComponentDeclarationToHtmlTag;
function convertComponentFeaturesToHtml(features, _a) {
    var e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f;
    var _g, _h, _j, _k, _l, _m, _o, _p;
    var checker = _a.checker, builtIn = _a.builtIn, fromTagName = _a.fromTagName;
    var result = {
        attributes: [],
        events: [],
        properties: [],
        slots: [],
        cssParts: [],
        cssProperties: []
    };
    var _loop_1 = function (event) {
        result.events.push({
            declaration: event,
            description: (_g = event.jsDoc) === null || _g === void 0 ? void 0 : _g.description,
            name: event.name,
            getType: (0, general_util_js_1.lazy)(function () {
                var _a;
                var type = (_a = event.type) === null || _a === void 0 ? void 0 : _a.call(event);
                if (type == null) {
                    return { kind: "ANY" };
                }
                return (0, ts_simple_type_1.isSimpleType)(type) ? type : (0, ts_simple_type_1.toSimpleType)(type, checker);
            }),
            fromTagName: fromTagName,
            builtIn: builtIn
        });
        result.attributes.push({
            kind: "attribute",
            name: "on".concat(event.name),
            description: (_h = event.jsDoc) === null || _h === void 0 ? void 0 : _h.description,
            getType: (0, general_util_js_1.lazy)(function () { return ({ kind: "STRING" }); }),
            declaration: {
                attrName: "on".concat(event.name),
                jsDoc: event.jsDoc,
                kind: "attribute",
                node: event.node,
                type: function () { return ({ kind: "ANY" }); }
            },
            builtIn: builtIn,
            fromTagName: fromTagName
        });
    };
    try {
        for (var _q = __values(features.events), _r = _q.next(); !_r.done; _r = _q.next()) {
            var event = _r.value;
            _loop_1(event);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_r && !_r.done && (_b = _q.return)) _b.call(_q);
        }
        finally { if (e_2) throw e_2.error; }
    }
    try {
        for (var _s = __values(features.cssParts), _t = _s.next(); !_t.done; _t = _s.next()) {
            var cssPart = _t.value;
            result.cssParts.push({
                declaration: cssPart,
                description: (_j = cssPart.jsDoc) === null || _j === void 0 ? void 0 : _j.description,
                name: cssPart.name || "",
                fromTagName: fromTagName
            });
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_t && !_t.done && (_c = _s.return)) _c.call(_s);
        }
        finally { if (e_3) throw e_3.error; }
    }
    try {
        for (var _u = __values(features.cssProperties), _v = _u.next(); !_v.done; _v = _u.next()) {
            var cssProp = _v.value;
            result.cssProperties.push({
                declaration: cssProp,
                description: (_k = cssProp.jsDoc) === null || _k === void 0 ? void 0 : _k.description,
                name: cssProp.name || "",
                typeHint: cssProp.typeHint,
                fromTagName: fromTagName
            });
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_v && !_v.done && (_d = _u.return)) _d.call(_u);
        }
        finally { if (e_4) throw e_4.error; }
    }
    try {
        for (var _w = __values(features.slots), _x = _w.next(); !_x.done; _x = _w.next()) {
            var slot = _x.value;
            result.slots.push({
                declaration: slot,
                description: (_l = slot.jsDoc) === null || _l === void 0 ? void 0 : _l.description,
                name: slot.name || "",
                fromTagName: fromTagName
            });
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_x && !_x.done && (_e = _w.return)) _e.call(_w);
        }
        finally { if (e_5) throw e_5.error; }
    }
    var _loop_2 = function (member) {
        // Only add public members
        if (member.visibility != null && member.visibility !== "public") {
            return "continue";
        }
        // Only add non-static members
        if ((_m = member.modifiers) === null || _m === void 0 ? void 0 : _m.has("static")) {
            return "continue";
        }
        // Only add writable members
        if ((_o = member.modifiers) === null || _o === void 0 ? void 0 : _o.has("readonly")) {
            return "continue";
        }
        var base = {
            declaration: member,
            description: (_p = member.jsDoc) === null || _p === void 0 ? void 0 : _p.description,
            getType: (0, general_util_js_1.lazy)(function () {
                var _a;
                var type = (_a = member.type) === null || _a === void 0 ? void 0 : _a.call(member);
                if (type == null) {
                    return { kind: "ANY" };
                }
                return (0, ts_simple_type_1.isSimpleType)(type) ? type : (0, ts_simple_type_1.toSimpleType)(type, checker);
            }),
            builtIn: builtIn,
            fromTagName: fromTagName
        };
        if (member.kind === "property") {
            result.properties.push(__assign(__assign({}, base), { kind: "property", name: member.propName, required: member.required }));
        }
        if ("attrName" in member && member.attrName != null) {
            result.attributes.push(__assign(__assign({}, base), { kind: "attribute", name: member.attrName, required: member.required }));
        }
    };
    try {
        for (var _y = __values(features.members), _z = _y.next(); !_z.done; _z = _y.next()) {
            var member = _z.value;
            _loop_2(member);
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_z && !_z.done && (_f = _y.return)) _f.call(_y);
        }
        finally { if (e_6) throw e_6.error; }
    }
    return result;
}
exports.convertComponentFeaturesToHtml = convertComponentFeaturesToHtml;
