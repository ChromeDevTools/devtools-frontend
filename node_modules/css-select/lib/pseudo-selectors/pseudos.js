"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPseudoArgs = exports.pseudos = void 0;
var isLinkTag = namePseudo(["a", "area", "link"]);
// While filters are precompiled, pseudos get called when they are needed
exports.pseudos = {
    empty: function (elem, _a) {
        var adapter = _a.adapter;
        return !adapter.getChildren(elem).some(function (elem) {
            // FIXME: `getText` call is potentially expensive.
            return adapter.isTag(elem) || adapter.getText(elem) !== "";
        });
    },
    "first-child": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var firstChild = adapter
            .getSiblings(elem)
            .find(function (elem) { return adapter.isTag(elem); });
        return firstChild != null && equals(elem, firstChild);
    },
    "last-child": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var siblings = adapter.getSiblings(elem);
        for (var i = siblings.length - 1; i >= 0; i--) {
            if (equals(elem, siblings[i]))
                return true;
            if (adapter.isTag(siblings[i]))
                break;
        }
        return false;
    },
    "first-of-type": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var siblings = adapter.getSiblings(elem);
        var elemName = adapter.getName(elem);
        for (var i = 0; i < siblings.length; i++) {
            var currentSibling = siblings[i];
            if (equals(elem, currentSibling))
                return true;
            if (adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName) {
                break;
            }
        }
        return false;
    },
    "last-of-type": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var siblings = adapter.getSiblings(elem);
        var elemName = adapter.getName(elem);
        for (var i = siblings.length - 1; i >= 0; i--) {
            var currentSibling = siblings[i];
            if (equals(elem, currentSibling))
                return true;
            if (adapter.isTag(currentSibling) &&
                adapter.getName(currentSibling) === elemName) {
                break;
            }
        }
        return false;
    },
    "only-of-type": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var elemName = adapter.getName(elem);
        return adapter
            .getSiblings(elem)
            .every(function (sibling) {
            return equals(elem, sibling) ||
                !adapter.isTag(sibling) ||
                adapter.getName(sibling) !== elemName;
        });
    },
    "only-child": function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        return adapter
            .getSiblings(elem)
            .every(function (sibling) { return equals(elem, sibling) || !adapter.isTag(sibling); });
    },
    // :matches(a, area, link)[href]
    "any-link": function (elem, options) {
        return (isLinkTag(elem, options) && options.adapter.hasAttrib(elem, "href"));
    },
    // :any-link:not(:visited)
    link: function (elem, options) {
        var _a, _b;
        return (((_b = (_a = options.adapter).isVisited) === null || _b === void 0 ? void 0 : _b.call(_a, elem)) !== true &&
            exports.pseudos["any-link"](elem, options));
    },
    /*
     * Forms
     * to consider: :target
     */
    // :matches([selected], select:not([multiple]):not(> option[selected]) > option:first-of-type)
    selected: function (elem, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        if (adapter.hasAttrib(elem, "selected"))
            return true;
        else if (adapter.getName(elem) !== "option")
            return false;
        // The first <option> in a <select> is also selected
        var parent = adapter.getParent(elem);
        if (!parent ||
            !adapter.isTag(parent) ||
            adapter.getName(parent) !== "select" ||
            adapter.hasAttrib(parent, "multiple")) {
            return false;
        }
        var siblings = adapter.getChildren(parent);
        var sawElem = false;
        for (var i = 0; i < siblings.length; i++) {
            var currentSibling = siblings[i];
            if (adapter.isTag(currentSibling)) {
                if (equals(elem, currentSibling)) {
                    sawElem = true;
                }
                else if (!sawElem) {
                    return false;
                }
                else if (adapter.hasAttrib(currentSibling, "selected")) {
                    return false;
                }
            }
        }
        return sawElem;
    },
    /*
     * https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
     * :matches(
     *   :matches(button, input, select, textarea, menuitem, optgroup, option)[disabled],
     *   optgroup[disabled] > option),
     *  fieldset[disabled] * //TODO not child of first <legend>
     * )
     */
    disabled: function (elem, _a) {
        var adapter = _a.adapter;
        return adapter.hasAttrib(elem, "disabled");
    },
    enabled: function (elem, _a) {
        var adapter = _a.adapter;
        return !adapter.hasAttrib(elem, "disabled");
    },
    // :matches(:matches(:radio, :checkbox)[checked], :selected) (TODO menuitem)
    checked: function (elem, options) {
        return (options.adapter.hasAttrib(elem, "checked") ||
            exports.pseudos.selected(elem, options));
    },
    // :matches(input, select, textarea)[required]
    required: function (elem, _a) {
        var adapter = _a.adapter;
        return adapter.hasAttrib(elem, "required");
    },
    // :matches(input, select, textarea):not([required])
    optional: function (elem, _a) {
        var adapter = _a.adapter;
        return !adapter.hasAttrib(elem, "required");
    },
    // JQuery extensions
    // :not(:empty)
    parent: function (elem, options) {
        return !exports.pseudos.empty(elem, options);
    },
    // :matches(h1, h2, h3, h4, h5, h6)
    header: namePseudo(["h1", "h2", "h3", "h4", "h5", "h6"]),
    // :matches(button, input[type=button])
    button: function (elem, _a) {
        var adapter = _a.adapter;
        var name = adapter.getName(elem);
        return (name === "button" ||
            (name === "input" &&
                adapter.getAttributeValue(elem, "type") === "button"));
    },
    // :matches(input, textarea, select, button)
    input: namePseudo(["input", "textarea", "select", "button"]),
    // `input:matches(:not([type!='']), [type='text' i])`
    text: function (elem, _a) {
        var adapter = _a.adapter;
        var type = adapter.getAttributeValue(elem, "type");
        return (adapter.getName(elem) === "input" &&
            (!type || type.toLowerCase() === "text"));
    },
};
function namePseudo(names) {
    if (typeof Set !== "undefined") {
        var nameSet_1 = new Set(names);
        return function (elem, _a) {
            var adapter = _a.adapter;
            return nameSet_1.has(adapter.getName(elem));
        };
    }
    return function (elem, _a) {
        var adapter = _a.adapter;
        return names.includes(adapter.getName(elem));
    };
}
function verifyPseudoArgs(func, name, subselect) {
    if (subselect === null) {
        if (func.length > 2 && name !== "scope") {
            throw new Error("pseudo-selector :" + name + " requires an argument");
        }
    }
    else {
        if (func.length === 2) {
            throw new Error("pseudo-selector :" + name + " doesn't have any arguments");
        }
    }
}
exports.verifyPseudoArgs = verifyPseudoArgs;
