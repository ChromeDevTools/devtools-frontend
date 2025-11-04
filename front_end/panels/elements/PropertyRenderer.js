// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { unescapeCssString } from './StylesSidebarPane.js';
const UIStrings = {
    /**
     * @description Text that is announced by the screen reader when the user focuses on an input field for entering the name of a CSS property in the Styles panel
     * @example {margin} PH1
     */
    cssPropertyName: '`CSS` property name: {PH1}',
    /**
     * @description Text that is announced by the screen reader when the user focuses on an input field for entering the value of a CSS property in the Styles panel
     * @example {10px} PH1
     */
    cssPropertyValue: '`CSS` property value: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/PropertyRenderer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function mergeWithSpacing(nodes, merge) {
    const result = [...nodes];
    if (SDK.CSSPropertyParser.requiresSpace(nodes, merge)) {
        result.push(document.createTextNode(' '));
    }
    result.push(...merge);
    return result;
}
// A mixin to automatically expose the match type on specific renrerers
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function rendererBase(matchT) {
    class RendererBase {
        matchType = matchT;
        render(_match, _context) {
            return [];
        }
    }
    return RendererBase;
}
/**
 * This class implements highlighting for rendered nodes in value traces. On hover, all nodes belonging to the same
 * Match (using object identity) are highlighted.
 **/
export class Highlighting {
    static REGISTRY_NAME = 'css-value-tracing';
    // This holds a stack of active ranges, the top-stack is the currently highlighted set. mouseenter and mouseleave
    // push and pop range sets, respectively.
    #activeHighlights = [];
    // We hold a bidirectional mapping between nodes and matches. A node can belong to multiple matches when matches are
    // nested (via function arguments for instance).
    #nodesForMatches = new Map();
    #matchesForNodes = new Map();
    #registry;
    #boundOnEnter;
    #boundOnExit;
    constructor() {
        const registry = CSS.highlights.get(Highlighting.REGISTRY_NAME);
        this.#registry = registry ?? new Highlight();
        if (!registry) {
            CSS.highlights.set(Highlighting.REGISTRY_NAME, this.#registry);
        }
        this.#boundOnExit = this.#onExit.bind(this);
        this.#boundOnEnter = this.#onEnter.bind(this);
    }
    addMatch(match, nodes) {
        if (nodes.length > 0) {
            const ranges = this.#nodesForMatches.get(match);
            if (ranges) {
                ranges.push(nodes);
            }
            else {
                this.#nodesForMatches.set(match, [nodes]);
            }
        }
        for (const node of nodes) {
            const matches = this.#matchesForNodes.get(node);
            if (matches) {
                matches.push(match);
            }
            else {
                this.#matchesForNodes.set(node, [match]);
            }
            if (node instanceof HTMLElement) {
                node.onmouseenter = this.#boundOnEnter;
                node.onmouseleave = this.#boundOnExit;
                node.onfocus = this.#boundOnEnter;
                node.onblur = this.#boundOnExit;
                node.tabIndex = 0;
            }
        }
    }
    *#nodeRangesHitByMouseEvent(e) {
        for (const node of e.composedPath()) {
            const matches = this.#matchesForNodes.get(node);
            if (matches) {
                for (const match of matches) {
                    yield* this.#nodesForMatches.get(match) ?? [];
                }
                break;
            }
        }
    }
    #onEnter(e) {
        this.#registry.clear();
        this.#activeHighlights.push([]);
        for (const nodeRange of this.#nodeRangesHitByMouseEvent(e)) {
            const range = new Range();
            const begin = nodeRange[0];
            const end = nodeRange[nodeRange.length - 1];
            if (begin.parentNode && end.parentNode) {
                range.setStartBefore(begin);
                range.setEndAfter(end);
                this.#activeHighlights[this.#activeHighlights.length - 1].push(range);
                this.#registry.add(range);
            }
        }
    }
    #onExit() {
        this.#registry.clear();
        this.#activeHighlights.pop();
        if (this.#activeHighlights.length > 0) {
            this.#activeHighlights[this.#activeHighlights.length - 1].forEach(range => this.#registry.add(range));
        }
    }
}
/**
 * This class is used to guide value tracing when passed to the Renderer. Tracing has two phases. First, substitutions
 * such as var() are applied step by step. In each step, all vars in the value are replaced by their definition until no
 * vars remain. In the second phase, we evaluate other functions such as calc() or min() or color-mix(). Which CSS
 * function types are actually substituted or evaluated is not relevant here, rather it is decided by an individual
 * MatchRenderer.
 *
 * Callers don't need to keep track of the tracing depth (i.e., the number of substitution/evaluation steps).
 * TracingContext is stateful and keeps track of the depth, so callers can progressively produce steps by calling
 * TracingContext#nextSubstitution or TracingContext#nextEvaluation. Calling Renderer with the tracing context will then
 * produce the next step of tracing. The tracing depth is passed to the individual MatchRenderers by way of
 * TracingContext#substitution or TracingContext#applyEvaluation/TracingContext#evaluation (see function-level comments
 * about how these two play together), which MatchRenderers call to request a fresh TracingContext for the next level of
 * substitution/evaluation.
 **/
export class TracingContext {
    #substitutionDepth = 0;
    #hasMoreSubstitutions;
    #parent = null;
    #evaluationCount = 0;
    #appliedEvaluations = 0;
    #hasMoreEvaluations = true;
    #longhandOffset;
    #highlighting;
    #parsedValueCache = new Map();
    #root = null;
    #propertyName;
    #asyncEvalCallbacks = [];
    expandPercentagesInShorthands;
    constructor(highlighting, expandPercentagesInShorthands, initialLonghandOffset = 0, matchedResult) {
        this.#highlighting = highlighting;
        this.#hasMoreSubstitutions =
            matchedResult?.hasMatches(SDK.CSSPropertyParserMatchers.VariableMatch, SDK.CSSPropertyParserMatchers.BaseVariableMatch, SDK.CSSPropertyParserMatchers.AttributeMatch, SDK.CSSPropertyParserMatchers.EnvFunctionMatch) ??
                false;
        this.#propertyName = matchedResult?.ast.propertyName ?? null;
        this.#longhandOffset = initialLonghandOffset;
        this.expandPercentagesInShorthands = expandPercentagesInShorthands;
    }
    get highlighting() {
        return this.#highlighting;
    }
    get root() {
        return this.#root;
    }
    get propertyName() {
        return this.#propertyName;
    }
    get longhandOffset() {
        return this.#longhandOffset;
    }
    renderingContext(context) {
        return new RenderingContext(context.ast, context.property, context.renderers, context.matchedResult, context.cssControls, context.options, this);
    }
    nextSubstitution() {
        if (!this.#hasMoreSubstitutions) {
            return false;
        }
        this.#substitutionDepth++;
        this.#hasMoreSubstitutions = false;
        this.#asyncEvalCallbacks = [];
        return true;
    }
    nextEvaluation() {
        if (this.#hasMoreSubstitutions) {
            throw new Error('Need to apply substitutions first');
        }
        if (!this.#hasMoreEvaluations) {
            return false;
        }
        this.#appliedEvaluations = 0;
        this.#hasMoreEvaluations = false;
        this.#evaluationCount++;
        this.#asyncEvalCallbacks = [];
        return true;
    }
    #setHasMoreEvaluations(value) {
        if (this.#parent) {
            this.#parent.#setHasMoreEvaluations(value);
        }
        this.#hasMoreEvaluations = value;
    }
    // Evaluations are applied bottom up, i.e., innermost sub-expressions are evaluated first before evaluating any
    // function call. This function produces TracingContexts for each of the arguments of the function call which should
    // be passed to the Renderer calls for the respective subtrees.
    evaluation(args, root = null) {
        const childContexts = args.map(() => {
            const child = new TracingContext(this.#highlighting, this.expandPercentagesInShorthands);
            child.#parent = this;
            child.#substitutionDepth = this.#substitutionDepth;
            child.#evaluationCount = this.#evaluationCount;
            child.#hasMoreSubstitutions = this.#hasMoreSubstitutions;
            child.#parsedValueCache = this.#parsedValueCache;
            child.#root = root;
            child.#propertyName = this.propertyName;
            return child;
        });
        return childContexts;
    }
    #setAppliedEvaluations(value) {
        if (this.#parent) {
            this.#parent.#setAppliedEvaluations(value);
        }
        this.#appliedEvaluations = Math.max(this.#appliedEvaluations, value);
    }
    // After rendering the arguments of a function call, the TracingContext produced by TracingContext#evaluation need to
    // be passed here to determine whether the "current" function call should be evaluated or not. If so, the
    // evaluation callback is run. The callback should return synchronously an array of Nodes as placeholder to be
    // rendered immediately and optionally a callback for asynchronous updates of the placeholder nodes. The callback
    // returns a boolean indicating whether the update was successful or not.
    applyEvaluation(children, evaluation) {
        if (this.#evaluationCount === 0 || children.some(child => child.#appliedEvaluations >= this.#evaluationCount)) {
            this.#setHasMoreEvaluations(true);
            children.forEach(child => this.#asyncEvalCallbacks.push(...child.#asyncEvalCallbacks));
            return null;
        }
        this.#setAppliedEvaluations(children.map(child => child.#appliedEvaluations).reduce((a, b) => Math.max(a, b), 0) + 1);
        const { placeholder, asyncEvalCallback } = evaluation();
        this.#asyncEvalCallbacks.push(asyncEvalCallback);
        return placeholder;
    }
    #setHasMoreSubstitutions() {
        if (this.#parent) {
            this.#parent.#setHasMoreSubstitutions();
        }
        this.#hasMoreSubstitutions = true;
    }
    // Request a tracing context for the next level of substitutions. If this returns null, no further substitution should
    // be applied on this branch of the AST. Otherwise, the TracingContext should be passed to the Renderer call for the
    // substitution subtree.
    substitution(root = null) {
        if (this.#substitutionDepth <= 0) {
            this.#setHasMoreSubstitutions();
            return null;
        }
        const child = new TracingContext(this.#highlighting, this.expandPercentagesInShorthands);
        child.#parent = this;
        child.#substitutionDepth = this.#substitutionDepth - 1;
        child.#evaluationCount = this.#evaluationCount;
        child.#hasMoreSubstitutions = false;
        child.#parsedValueCache = this.#parsedValueCache;
        child.#root = root;
        // Async evaluation callbacks need to be gathered across substitution contexts so that they bubble to the root. That
        // is not the case for evaluation contexts since `applyEvaluation` conditionally collects callbacks for its subtree
        // already.
        child.#asyncEvalCallbacks = this.#asyncEvalCallbacks;
        child.#longhandOffset =
            this.#longhandOffset + (root?.context.matchedResult.getComputedLonghandName(root?.match.node) ?? 0);
        child.#propertyName = this.propertyName;
        return child;
    }
    cachedParsedValue(declaration, matchedStyles, computedStyles) {
        const cachedValue = this.#parsedValueCache.get(declaration);
        if (cachedValue?.matchedStyles === matchedStyles && cachedValue?.computedStyles === computedStyles) {
            return cachedValue.parsedValue;
        }
        const parsedValue = declaration.parseValue(matchedStyles, computedStyles);
        this.#parsedValueCache.set(declaration, { matchedStyles, computedStyles, parsedValue });
        return parsedValue;
    }
    // If this returns `false`, all evaluations for this trace line have failed.
    async runAsyncEvaluations() {
        const results = await Promise.all(this.#asyncEvalCallbacks.map(callback => callback?.()));
        return results.some(result => result !== false);
    }
}
export class RenderingContext {
    ast;
    property;
    renderers;
    matchedResult;
    cssControls;
    options;
    tracing;
    constructor(ast, property, renderers, matchedResult, cssControls, options = {}, tracing) {
        this.ast = ast;
        this.property = property;
        this.renderers = renderers;
        this.matchedResult = matchedResult;
        this.cssControls = cssControls;
        this.options = options;
        this.tracing = tracing;
    }
    addControl(cssType, control) {
        if (this.cssControls) {
            const controls = this.cssControls.get(cssType);
            if (!controls) {
                this.cssControls.set(cssType, [control]);
            }
            else {
                controls.push(control);
            }
        }
    }
    getComputedLonghandName(node) {
        if (!this.matchedResult.ast.propertyName) {
            return null;
        }
        const longhands = SDK.CSSMetadata.cssMetadata().getLonghands(this.tracing?.propertyName ?? this.matchedResult.ast.propertyName);
        if (!longhands) {
            return null;
        }
        const index = this.matchedResult.getComputedLonghandName(node);
        return longhands[index + (this.tracing?.longhandOffset ?? 0)] ?? null;
    }
    findParent(node, matchType) {
        while (node) {
            const match = this.matchedResult.getMatch(node);
            if (match instanceof matchType) {
                return match;
            }
            node = node.parent;
        }
        if (this.tracing?.root) {
            return this.tracing.root.context.findParent(this.tracing.root.match.node, matchType);
        }
        return null;
    }
}
export class Renderer extends SDK.CSSPropertyParser.TreeWalker {
    #matchedResult;
    #output = [];
    #context;
    constructor(ast, property, renderers, matchedResult, cssControls, options, tracing) {
        super(ast);
        this.#matchedResult = matchedResult;
        this.#context =
            new RenderingContext(this.ast, property, renderers, this.#matchedResult, cssControls, options, tracing);
    }
    static render(nodeOrNodes, context) {
        if (!Array.isArray(nodeOrNodes)) {
            return this.render([nodeOrNodes], context);
        }
        const cssControls = new SDK.CSSPropertyParser.CSSControlMap();
        const renderers = nodeOrNodes.map(node => this.walkExcludingSuccessors(context.ast.subtree(node), context.property, context.renderers, context.matchedResult, cssControls, context.options, context.tracing));
        const nodes = renderers.map(node => node.#output).reduce(mergeWithSpacing, []);
        return { nodes, cssControls };
    }
    static renderInto(nodeOrNodes, context, parent) {
        const { nodes, cssControls } = this.render(nodeOrNodes, context);
        if (parent.lastChild && SDK.CSSPropertyParser.requiresSpace([parent.lastChild], nodes)) {
            parent.appendChild(document.createTextNode(' '));
        }
        nodes.map(n => parent.appendChild(n));
        return { nodes, cssControls };
    }
    renderedMatchForTest(_nodes, _match) {
    }
    enter({ node }) {
        const match = this.#matchedResult.getMatch(node);
        const renderer = match &&
            this.#context.renderers.get(match.constructor);
        if (renderer || match instanceof SDK.CSSPropertyParserMatchers.TextMatch) {
            const output = renderer ? renderer.render(match, this.#context) :
                match.render();
            this.#context.tracing?.highlighting.addMatch(match, output);
            this.renderedMatchForTest(output, match);
            this.#output = mergeWithSpacing(this.#output, output);
            return false;
        }
        return true;
    }
    static renderNameElement(name) {
        const nameElement = document.createElement('span');
        nameElement.setAttribute('jslog', `${VisualLogging.key().track({
            change: true,
            keydown: 'ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape',
        })}`);
        UI.ARIAUtils.setLabel(nameElement, i18nString(UIStrings.cssPropertyName, { PH1: name }));
        nameElement.className = 'webkit-css-property';
        nameElement.textContent = name;
        nameElement.normalize();
        nameElement.tabIndex = -1;
        return nameElement;
    }
    // This function renders a property value as HTML, customizing the presentation with a set of given AST matchers. This
    // comprises the following steps:
    // 1. Build an AST of the property.
    // 2. Apply tree matchers during bottom up traversal.
    // 3. Render the value from left to right into HTML, deferring rendering of matched subtrees to the matchers
    //
    // More general, longer matches take precedence over shorter, more specific matches. Whitespaces are normalized, for
    // unmatched text and around rendered matching results.
    static renderValueElement(property, matchedResult, renderers, tracing) {
        const valueElement = document.createElement('span');
        valueElement.setAttribute('jslog', `${VisualLogging.value().track({
            change: true,
            keydown: 'ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape',
        })}`);
        UI.ARIAUtils.setLabel(valueElement, i18nString(UIStrings.cssPropertyValue, { PH1: property.value }));
        valueElement.className = 'value';
        valueElement.tabIndex = -1;
        const { nodes, cssControls } = this.renderValueNodes(property, matchedResult, renderers, tracing);
        nodes.forEach(node => valueElement.appendChild(node));
        valueElement.normalize();
        return { valueElement, cssControls };
    }
    static renderValueNodes(property, matchedResult, renderers, tracing) {
        if (!matchedResult) {
            return { nodes: [document.createTextNode(property.value)], cssControls: new Map() };
        }
        const rendererMap = new Map();
        for (const renderer of renderers) {
            rendererMap.set(renderer.matchType, renderer);
        }
        const context = new RenderingContext(matchedResult.ast, property instanceof SDK.CSSProperty.CSSProperty ? property : null, rendererMap, matchedResult, undefined, {}, tracing);
        return Renderer.render([matchedResult.ast.tree, ...matchedResult.ast.trailingNodes], context);
    }
}
// clang-format off
export class URLRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.URLMatch) {
    rule;
    node;
    // clang-format on
    constructor(rule, node) {
        super();
        this.rule = rule;
        this.node = node;
    }
    render(match) {
        const url = unescapeCssString(match.url);
        const container = document.createDocumentFragment();
        UI.UIUtils.createTextChild(container, 'url(');
        let hrefUrl = null;
        if (this.rule?.resourceURL()) {
            hrefUrl = Common.ParsedURL.ParsedURL.completeURL(this.rule.resourceURL(), url);
        }
        else if (this.node) {
            hrefUrl = this.node.resolveURL(url);
        }
        const link = ImagePreviewPopover.setImageUrl(Components.Linkifier.Linkifier.linkifyURL(hrefUrl || url, {
            text: url,
            preventClick: false,
            // crbug.com/1027168
            // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
            // so that we don't have to keep two versions (original vs. trimmed) of URL
            // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
            bypassURLTrimming: true,
            showColumnNumber: false,
            inlineFrameIndex: 0,
        }), hrefUrl || url);
        container.appendChild(link);
        UI.UIUtils.createTextChild(container, ')');
        return [container];
    }
}
// clang-format off
export class StringRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.StringMatch) {
    // clang-format on
    render(match) {
        const element = document.createElement('span');
        element.innerText = match.text;
        UI.Tooltip.Tooltip.install(element, unescapeCssString(match.text));
        return [element];
    }
}
// clang-format off
export class BinOpRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.BinOpMatch) {
    // clang-format on
    render(match, context) {
        const [lhs, binop, rhs] = SDK.CSSPropertyParser.ASTUtils.children(match.node).map(child => {
            const span = document.createElement('span');
            Renderer.renderInto(child, context, span);
            return span;
        });
        return [lhs, document.createTextNode(' '), binop, document.createTextNode(' '), rhs];
    }
}
//# sourceMappingURL=PropertyRenderer.js.map