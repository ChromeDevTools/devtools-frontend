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
exports.RuleCollection = void 0;
var lit_analyzer_config_js_1 = require("./lit-analyzer-config.js");
var html_node_types_js_1 = require("./types/html-node/html-node-types.js");
var RuleCollection = /** @class */ (function () {
    function RuleCollection() {
        this.rules = [];
    }
    RuleCollection.prototype.push = function () {
        var _a;
        var rule = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rule[_i] = arguments[_i];
        }
        (_a = this.rules).push.apply(_a, __spreadArray([], __read(rule), false));
        // Sort rules by most important first
        this.rules.sort(function (ruleA, ruleB) { return (getPriorityValue(ruleA) > getPriorityValue(ruleB) ? -1 : 1); });
    };
    RuleCollection.prototype.invokeRules = function (functionName, parameter, report, baseContext) {
        var e_1, _a;
        var shouldBreak = false;
        var config = baseContext.config, htmlStore = baseContext.htmlStore, program = baseContext.program, definitionStore = baseContext.definitionStore, dependencyStore = baseContext.dependencyStore, documentStore = baseContext.documentStore, logger = baseContext.logger, ts = baseContext.ts;
        var currentRuleId = undefined;
        var context = {
            config: config,
            htmlStore: htmlStore,
            program: program,
            definitionStore: definitionStore,
            dependencyStore: dependencyStore,
            documentStore: documentStore,
            logger: logger,
            ts: ts,
            file: baseContext.currentFile,
            report: function (diagnostic) {
                if (currentRuleId != null) {
                    report({ diagnostic: diagnostic, source: currentRuleId });
                }
                shouldBreak = true;
            },
            break: function () {
                shouldBreak = true;
            }
        };
        try {
            for (var _b = __values(this.rules), _c = _b.next(); !_c.done; _c = _b.next()) {
                var rule = _c.value;
                if ((0, lit_analyzer_config_js_1.isRuleEnabled)(context.config, rule.id)) {
                    var func = rule[functionName];
                    if (func != null) {
                        currentRuleId = rule.id;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        func(parameter, context);
                    }
                }
                if (shouldBreak) {
                    break;
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
    };
    RuleCollection.prototype.getDiagnosticsFromDeclaration = function (declaration, baseContext) {
        var e_2, _a;
        var file = baseContext.currentFile;
        var diagnostics = [];
        this.invokeRules("visitComponentDeclaration", declaration, function (d) { return diagnostics.push(d); }, baseContext);
        try {
            for (var _b = __values(declaration.members), _c = _b.next(); !_c.done; _c = _b.next()) {
                var member = _c.value;
                if (member.node.getSourceFile() === file) {
                    this.invokeRules("visitComponentMember", member, function (d) { return diagnostics.push(d); }, baseContext);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return diagnostics;
    };
    RuleCollection.prototype.getDiagnosticsFromDefinition = function (definition, baseContext) {
        var file = baseContext.currentFile;
        var diagnostics = [];
        if (definition.sourceFile === file) {
            this.invokeRules("visitComponentDefinition", definition, function (d) { return diagnostics.push(d); }, baseContext);
        }
        return diagnostics;
    };
    RuleCollection.prototype.getDiagnosticsFromDocument = function (htmlDocument, baseContext) {
        var _this = this;
        var diagnostics = [];
        var iterateNodes = function (nodes) {
            var e_3, _a;
            try {
                for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var childNode = nodes_1_1.value;
                    // Don't check SVG yet. We don't yet have all the data for it, and it hasn't been tested fully.
                    if (childNode.kind === html_node_types_js_1.HtmlNodeKind.SVG) {
                        continue;
                    }
                    _this.invokeRules("visitHtmlNode", childNode, function (d) { return diagnostics.push(d); }, baseContext);
                    var iterateAttrs = function (attrs) {
                        var e_4, _a;
                        try {
                            for (var attrs_1 = (e_4 = void 0, __values(attrs)), attrs_1_1 = attrs_1.next(); !attrs_1_1.done; attrs_1_1 = attrs_1.next()) {
                                var attr = attrs_1_1.value;
                                _this.invokeRules("visitHtmlAttribute", attr, function (d) { return diagnostics.push(d); }, baseContext);
                                if (attr.assignment != null) {
                                    _this.invokeRules("visitHtmlAssignment", attr.assignment, function (d) { return diagnostics.push(d); }, baseContext);
                                }
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (attrs_1_1 && !attrs_1_1.done && (_a = attrs_1.return)) _a.call(attrs_1);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    };
                    iterateAttrs(childNode.attributes);
                    iterateNodes(childNode.children);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        iterateNodes(htmlDocument.rootNodes);
        return diagnostics;
    };
    return RuleCollection;
}());
exports.RuleCollection = RuleCollection;
function getPriorityValue(rule) {
    var _a, _b;
    if (((_a = rule.meta) === null || _a === void 0 ? void 0 : _a.priority) != null) {
        switch ((_b = rule.meta) === null || _b === void 0 ? void 0 : _b.priority) {
            case "low":
                return 0;
            case "medium":
                return 1;
            case "high":
                return 2;
        }
    }
    return 0;
}
