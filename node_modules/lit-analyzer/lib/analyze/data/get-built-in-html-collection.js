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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuiltInHtmlCollection = void 0;
var browsers_html_data_json_1 = __importDefault(require("@vscode/web-custom-data/data/browsers.html-data.json"));
var parse_vscode_html_data_js_1 = require("../parse/parse-html-data/parse-vscode-html-data.js");
var general_util_js_1 = require("../util/general-util.js");
var extra_html_data_js_1 = require("./extra-html-data.js");
function getBuiltInHtmlCollection() {
    var e_1, _a;
    var _b, _c, _d;
    var vscodeHtmlData = browsers_html_data_json_1.default;
    var version = vscodeHtmlData.version;
    var globalAttributes = __spreadArray([], __read(((_b = vscodeHtmlData.globalAttributes) !== null && _b !== void 0 ? _b : [])), false);
    // Modify valueSets
    var valueSets = (vscodeHtmlData.valueSets || []).map(function (valueSet) {
        // It seems like the autocompletion value map for <select>, <textarea> and <input> needs "on" and "off" values
        if (valueSet.name === "inputautocomplete") {
            return __assign(__assign({}, valueSet), { values: __spreadArray([{ name: "on" }, { name: "off" }], __read(valueSet.values), false) });
        }
        return valueSet;
    });
    // Modify tags
    var tags = (vscodeHtmlData.tags || []).map(function (tag) {
        switch (tag.name) {
            case "audio":
                return __assign(__assign({}, tag), { attributes: __spreadArray(__spreadArray([], __read(tag.attributes), false), [
                        {
                            name: "controlslist",
                            description: ""
                        }
                    ], false) });
            case "video":
                return __assign(__assign({}, tag), { attributes: __spreadArray(__spreadArray([], __read(tag.attributes), false), [
                        {
                            name: "controlslist",
                            description: ""
                        },
                        {
                            name: "disablepictureinpicture",
                            valueSet: "v" // "v" is the undocumented boolean type
                        },
                        {
                            name: "playsinline",
                            description: 'The playsinline attribute is a boolean attribute. If present, it serves as a hint to the user agent that the video ought to be displayed "inline" in the document by default, constrained to the element\'s playback area, instead of being displayed fullscreen or in an independent resizable window.',
                            valueSet: "v" // "v" is the undocumented boolean type
                        }
                    ], false) });
        }
        return tag;
    });
    // Add missing html tags
    tags.push({
        name: "svg",
        attributes: []
    }, {
        name: "slot",
        description: "",
        attributes: [
            {
                name: "name",
                description: ""
            },
            {
                name: "onslotchange",
                description: "The slotchange event is fired on an HTMLSlotElement instance (<slot> element) when the node(s) contained in that slot change.\n\nNote: the slotchange event doesn't fire if the children of a slotted node change — only if you change (e.g. add or delete) the actual nodes themselves."
            }
        ]
    });
    // Add missing global attributes
    globalAttributes.push.apply(globalAttributes, __spreadArray(__spreadArray([], __read(extra_html_data_js_1.EXTRA_HTML5_EVENTS.filter(function (evt) { return globalAttributes.some(function (existingEvt) { return existingEvt.name === evt.name; }); })), false), [{
            name: "tabindex",
            description: ""
        },
        {
            name: "slot",
            description: ""
        },
        {
            name: "part",
            description: "This attribute specifies a \"styleable\" part on the element in your shadow tree."
        },
        {
            name: "theme",
            description: "This attribute specifies a global \"styleable\" part on the element."
        },
        {
            name: "exportparts",
            description: "This attribute is used to explicitly forward a child\u2019s part to be styleable outside of the parent\u2019s shadow tree.\n\nThe value must be a comma-separated list of part mappings:\n  - \"some-box, some-input\"\n  - \"some-input: foo-input\"\n"
        }], false));
    // Parse vscode html data
    var result = (0, parse_vscode_html_data_js_1.parseVscodeHtmlData)({
        version: version,
        globalAttributes: globalAttributes,
        tags: tags,
        valueSets: valueSets
    }, {
        builtIn: true
    });
    try {
        // Add missing properties to the result, because they are not included in vscode html data
        for (var _e = __values(result.tags), _f = _e.next(); !_f.done; _f = _e.next()) {
            var tag = _f.value;
            switch (tag.tagName) {
                case "textarea":
                    tag.properties.push({
                        kind: "property",
                        name: "value",
                        builtIn: true,
                        fromTagName: "textarea",
                        getType: (0, general_util_js_1.lazy)(function () {
                            return ({
                                kind: "UNION",
                                types: [{ kind: "STRING" }, { kind: "NULL" }]
                            });
                        })
                    });
                    break;
                case "img":
                    tag.attributes.push({
                        kind: "attribute",
                        name: "loading",
                        builtIn: true,
                        fromTagName: "img",
                        getType: (0, general_util_js_1.lazy)(function () {
                            return ({
                                kind: "UNION",
                                types: [
                                    {
                                        kind: "STRING_LITERAL",
                                        value: "lazy"
                                    },
                                    {
                                        kind: "STRING_LITERAL",
                                        value: "auto"
                                    },
                                    { kind: "STRING_LITERAL", value: "eager" }
                                ]
                            });
                        })
                    });
                    break;
                case "input":
                    tag.properties.push({
                        kind: "property",
                        name: "value",
                        builtIn: true,
                        fromTagName: "input",
                        getType: (0, general_util_js_1.lazy)(function () {
                            return ({
                                kind: "UNION",
                                types: [{ kind: "STRING" }, { kind: "NULL" }]
                            });
                        })
                    });
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // Add missing global properties to the result
    result.global.properties = __spreadArray(__spreadArray([], __read((result.global.properties || [])), false), [
        {
            builtIn: true,
            description: "This attribute specifies a \"styleable\" part on the element in your shadow tree.",
            getType: function () { return ({ kind: "STRING" }); },
            kind: "property",
            name: "part"
        }
    ], false);
    return __assign(__assign({}, result), { tags: result.tags.map(function (tag) { return (__assign(__assign({}, tag), { builtIn: true, attributes: addMissingAttrTypes(tag.attributes.map(function (attr) { return (__assign(__assign({}, attr), { builtIn: true })); })) })); }), global: __assign(__assign({}, result.global), { attributes: addMissingAttrTypes(((_c = result.global.attributes) === null || _c === void 0 ? void 0 : _c.map(function (attr) { return (__assign(__assign({}, attr), { builtIn: true })); })) || []), events: (_d = result.global.events) === null || _d === void 0 ? void 0 : _d.map(function (event) { return (__assign(__assign({}, event), { builtIn: true })); }) }) });
}
exports.getBuiltInHtmlCollection = getBuiltInHtmlCollection;
function addMissingAttrTypes(attrs) {
    return attrs.map(function (attr) {
        if ((0, extra_html_data_js_1.hasTypeForAttrName)(attr.name) || attr.getType().kind === "ANY") {
            var newType_1 = (0, extra_html_data_js_1.html5TagAttrType)(attr.name);
            return __assign(__assign({}, attr), { getType: (0, general_util_js_1.lazy)(function () { return newType_1; }) });
        }
        return attr;
    });
}
