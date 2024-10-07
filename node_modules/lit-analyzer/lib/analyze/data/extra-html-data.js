"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRA_HTML5_EVENTS = exports.html5TagAttrType = exports.hasTypeForAttrName = void 0;
var type_util_js_1 = require("../util/type-util.js");
var HTML_5_ATTR_TYPES = {
    onafterprint: "string",
    onbeforeprint: "string",
    onbeforeunload: "string",
    onhashchange: "string",
    onlanguagechange: "string",
    onmessage: "string",
    onoffline: "string",
    ononline: "string",
    onpagehide: "string",
    onpageshow: "string",
    onpopstate: "string",
    onstorage: "string",
    onunload: "string",
    onslotchange: "string",
    "aria-activedescendant": "",
    "aria-colcount": "",
    "aria-colindex": "",
    "aria-colspan": "",
    "aria-controls": "",
    "aria-describedat": "",
    "aria-describedby": "",
    "aria-errormessage": "",
    "aria-flowto": "",
    "aria-kbdshortcuts": "",
    "aria-label": "",
    "aria-labelledby": "",
    "aria-level": "",
    "aria-owns": "",
    "aria-placeholder": "",
    "aria-posinset": "",
    "aria-roledescription": "",
    "aria-rowcount": "",
    "aria-rowindex": "",
    "aria-rowspan": "",
    "aria-setsize": "",
    "aria-valuemax": "",
    "aria-valuemin": "",
    "aria-valuenow": "",
    "aria-valuetext": "",
    accesskey: "string",
    translate: ["yes", "no", ""],
    autocapitalize: ["off", "none", "on", "sentences", "words", "characters"],
    class: "string",
    contextmenu: "string",
    dropzone: ["copy", "move", "link"],
    id: "string",
    itemid: "",
    itemprop: "",
    itemref: "",
    itemtype: "",
    lang: "string",
    style: "string",
    tabindex: "number",
    title: "string",
    manifest: "",
    href: "string",
    target: 'string|"_blank"|"_parent"|"_self"|"_top"',
    rel: "",
    media: "",
    hreflang: "",
    type: "",
    sizes: "",
    name: "string",
    "http-equiv": "",
    content: "",
    charset: "",
    nonce: "",
    cite: "",
    start: "",
    value: "string",
    download: "boolean|string",
    ping: "",
    datetime: "",
    alt: "string",
    src: "string",
    srcset: "",
    usemap: "",
    width: "number|string",
    height: "number|string",
    srcdoc: "",
    data: "",
    form: "string",
    poster: "string",
    mediagroup: "",
    label: "string",
    srclang: "string",
    coords: "string",
    border: ["0", "1"],
    span: "number",
    colspan: "number",
    rowspan: "number",
    headers: "string",
    sorted: "",
    abbr: "string",
    "accept-charset": "string",
    action: "string",
    for: "string",
    accept: "string",
    dirname: "string",
    formaction: "string",
    formtarget: ["_self", "_blank", "_parent", "_top"],
    list: "string",
    max: "number|string",
    maxlength: "number",
    min: "number|string",
    minlength: "number",
    pattern: "string",
    placeholder: "string",
    size: "number",
    step: "number",
    cols: "number",
    rows: "number",
    low: "number",
    high: "number",
    optimum: "number",
    slot: "string",
    part: "string",
    exportparts: "string",
    theme: "string",
    controlslist: [["nodownload", "nofullscreen", "noremoteplayback"]],
    role: [
        [
            "alert",
            "alertdialog",
            "button",
            "checkbox",
            "dialog",
            "gridcell",
            "link",
            "log",
            "marquee",
            "menuitem",
            "menuitemcheckbox",
            "menuitemradio",
            "option",
            "progressbar",
            "radio",
            "scrollbar",
            "searchbox",
            "slider",
            "spinbutton",
            "status",
            "switch",
            "tab",
            "tabpanel",
            "textbox",
            "timer",
            "tooltip",
            "treeitem",
            "combobox",
            "grid",
            "listbox",
            "menu",
            "menubar",
            "radiogroup",
            "tablist",
            "tree",
            "treegrid",
            "application",
            "article",
            "cell",
            "columnheader",
            "definition",
            "directory",
            "document",
            "feed",
            "figure",
            "group",
            "heading",
            "img",
            "list",
            "listitem",
            "math",
            "none",
            "note",
            "presentation",
            "region",
            "row",
            "rowgroup",
            "rowheader",
            "separator",
            "table",
            "term",
            "text",
            "toolbar",
            "banner",
            "complementary",
            "contentinfo",
            "form",
            "main",
            "navigation",
            "region",
            "search",
            "doc-abstract",
            "doc-acknowledgments",
            "doc-afterword",
            "doc-appendix",
            "doc-backlink",
            "doc-biblioentry",
            "doc-bibliography",
            "doc-biblioref",
            "doc-chapter",
            "doc-colophon",
            "doc-conclusion",
            "doc-cover",
            "doc-credit",
            "doc-credits",
            "doc-dedication",
            "doc-endnote",
            "doc-endnotes",
            "doc-epigraph",
            "doc-epilogue",
            "doc-errata",
            "doc-example",
            "doc-footnote",
            "doc-foreword",
            "doc-glossary",
            "doc-glossref",
            "doc-index",
            "doc-introduction",
            "doc-noteref",
            "doc-notice",
            "doc-pagebreak",
            "doc-pagelist",
            "doc-part",
            "doc-preface",
            "doc-prologue",
            "doc-pullquote",
            "doc-qna",
            "doc-subtitle",
            "doc-tip",
            "doc-toc"
        ]
    ]
};
function hasTypeForAttrName(attrName) {
    return HTML_5_ATTR_TYPES[attrName] != null && HTML_5_ATTR_TYPES[attrName].length > 0;
}
exports.hasTypeForAttrName = hasTypeForAttrName;
function html5TagAttrType(attrName) {
    return stringToSimpleType(HTML_5_ATTR_TYPES[attrName] || "", attrName);
}
exports.html5TagAttrType = html5TagAttrType;
function stringToSimpleType(typeString, name) {
    if (Array.isArray(typeString)) {
        if (Array.isArray(typeString[0])) {
            return (0, type_util_js_1.makePrimitiveArrayType)(stringToSimpleType(typeString[0]));
        }
        return {
            kind: "UNION",
            types: typeString.map(function (value) { return ({ kind: "STRING_LITERAL", value: value }); })
        };
    }
    if (typeString.includes("|")) {
        return {
            kind: "UNION",
            types: typeString.split("|").map(function (typeStr) { return stringToSimpleType(typeStr); })
        };
    }
    switch (typeString) {
        case "number":
            return { kind: "NUMBER", name: name };
        case "boolean":
            return { kind: "BOOLEAN", name: name };
        case "string":
            return { kind: "STRING", name: name };
        default:
            return { kind: "ANY", name: name };
    }
}
/**
 * Data from vscode-html-languageservice
 */
exports.EXTRA_HTML5_EVENTS = [
    {
        name: "onanimationend",
        description: "A CSS animation has completed."
    },
    {
        name: "onanimationiteration",
        description: "A CSS animation is repeated."
    },
    {
        name: "onanimationstart",
        description: "A CSS animation has started."
    },
    {
        name: "oncopy",
        description: "The text selection has been added to the clipboard."
    },
    {
        name: "oncut",
        description: "The text selection has been removed from the document and added to the clipboard."
    },
    {
        name: "ondragstart",
        description: "The user starts dragging an element or text selection."
    },
    {
        name: "onfocusin",
        description: "An element is about to receive focus (bubbles)."
    },
    {
        name: "onfocusout",
        description: "An element is about to lose focus (bubbles)."
    },
    {
        name: "onfullscreenchange",
        description: "An element was turned to fullscreen mode or back to normal mode."
    },
    {
        name: "onfullscreenerror",
        description: "It was impossible to switch to fullscreen mode for technical reasons or because the permission was denied."
    },
    {
        name: "ongotpointercapture",
        description: "Element receives pointer capture."
    },
    {
        name: "onlostpointercapture",
        description: "Element lost pointer capture."
    },
    {
        name: "onoffline",
        description: "The browser has lost access to the network."
    },
    {
        name: "ononline",
        description: "The browser has gained access to the network (but particular websites might be unreachable)."
    },
    {
        name: "onpaste",
        description: "Data has been transferred from the system clipboard to the document."
    },
    {
        name: "onpointercancel",
        description: "The pointer is unlikely to produce any more events."
    },
    {
        name: "onpointerdown",
        description: "The pointer enters the active buttons state."
    },
    {
        name: "onpointerenter",
        description: "Pointing device is moved inside the hit-testing boundary."
    },
    {
        name: "onpointerleave",
        description: "Pointing device is moved out of the hit-testing boundary."
    },
    {
        name: "onpointerlockchange",
        description: "The pointer was locked or released."
    },
    {
        name: "onpointerlockerror",
        description: "It was impossible to lock the pointer for technical reasons or because the permission was denied."
    },
    {
        name: "onpointermove",
        description: "The pointer changed coordinates."
    },
    {
        name: "onpointerout",
        description: "The pointing device moved out of hit-testing boundary or leaves detectable hover range."
    },
    {
        name: "onpointerover",
        description: "The pointing device is moved into the hit-testing boundary."
    },
    {
        name: "onpointerup",
        description: "The pointer leaves the active buttons state."
    },
    {
        name: "onratechange",
        description: "The playback rate has changed."
    },
    {
        name: "onselectstart",
        description: "A selection just started."
    },
    {
        name: "onselectionchange",
        description: "The selection in the document has been changed."
    },
    {
        name: "ontouchcancel",
        description: "A touch point has been disrupted in an implementation-specific manners (too many touch points for example)."
    },
    {
        name: "ontouchend",
        description: "A touch point is removed from the touch surface."
    },
    {
        name: "ontouchmove",
        description: "A touch point is moved along the touch surface."
    },
    {
        name: "ontouchstart",
        description: "A touch point is placed on the touch surface."
    },
    {
        name: "ontransitionend",
        description: "A CSS transition has completed."
    },
    {
        name: "onwheel",
        description: "A wheel button of a pointing device is rotated in any direction."
    }
];
