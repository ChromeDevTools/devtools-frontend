import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
export interface MatchRenderer<MatchT extends SDK.CSSPropertyParser.Match> {
    readonly matchType: Platform.Constructor.Constructor<MatchT>;
    render(match: MatchT, context: RenderingContext): Node[];
}
export declare function rendererBase<MatchT extends SDK.CSSPropertyParser.Match>(matchT: Platform.Constructor.Constructor<MatchT>): abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<MatchT, any[]>;
    render(_match: MatchT, _context: RenderingContext): Node[];
};
/**
 * This class implements highlighting for rendered nodes in value traces. On hover, all nodes belonging to the same
 * Match (using object identity) are highlighted.
 **/
export declare class Highlighting {
    #private;
    static readonly REGISTRY_NAME = "css-value-tracing";
    constructor();
    addMatch(match: SDK.CSSPropertyParser.Match, nodes: Node[]): void;
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
export declare class TracingContext {
    #private;
    readonly expandPercentagesInShorthands: boolean;
    constructor(highlighting: Highlighting, expandPercentagesInShorthands: boolean, initialLonghandOffset?: number, matchedResult?: SDK.CSSPropertyParser.BottomUpTreeMatching);
    get highlighting(): Highlighting;
    get root(): {
        match: SDK.CSSPropertyParser.Match;
        context: RenderingContext;
    } | null;
    get propertyName(): string | null;
    get longhandOffset(): number;
    renderingContext(context: RenderingContext): RenderingContext;
    nextSubstitution(): boolean;
    nextEvaluation(): boolean;
    evaluation(args: unknown[], root?: {
        match: SDK.CSSPropertyParser.Match;
        context: RenderingContext;
    } | null): TracingContext[] | null;
    applyEvaluation(children: TracingContext[], evaluation: () => ({
        placeholder: Node[];
        asyncEvalCallback?: () => Promise<boolean>;
    })): Node[] | null;
    substitution(root?: {
        match: SDK.CSSPropertyParser.Match;
        context: RenderingContext;
    } | null): TracingContext | null;
    cachedParsedValue(declaration: SDK.CSSProperty.CSSProperty | SDK.CSSMatchedStyles.CSSRegisteredProperty, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>): SDK.CSSPropertyParser.BottomUpTreeMatching | null;
    runAsyncEvaluations(): Promise<boolean>;
}
export declare class RenderingContext {
    readonly ast: SDK.CSSPropertyParser.SyntaxTree;
    readonly property: SDK.CSSProperty.CSSProperty | null;
    readonly renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>;
    readonly matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching;
    readonly cssControls?: SDK.CSSPropertyParser.CSSControlMap | undefined;
    readonly options: {
        readonly?: boolean;
    };
    readonly tracing?: TracingContext | undefined;
    constructor(ast: SDK.CSSPropertyParser.SyntaxTree, property: SDK.CSSProperty.CSSProperty | null, renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching, cssControls?: SDK.CSSPropertyParser.CSSControlMap | undefined, options?: {
        readonly?: boolean;
    }, tracing?: TracingContext | undefined);
    addControl(cssType: string, control: HTMLElement): void;
    getComputedLonghandName(node: CodeMirror.SyntaxNode): string | null;
    findParent<MatchT extends SDK.CSSPropertyParser.Match>(node: CodeMirror.SyntaxNode | null, matchType: Platform.Constructor.Constructor<MatchT>): MatchT | null;
}
export declare class Renderer extends SDK.CSSPropertyParser.TreeWalker {
    #private;
    constructor(ast: SDK.CSSPropertyParser.SyntaxTree, property: SDK.CSSProperty.CSSProperty | null, renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching, cssControls: SDK.CSSPropertyParser.CSSControlMap, options: {
        readonly?: boolean;
    }, tracing: TracingContext | undefined);
    static render(nodeOrNodes: CodeMirror.SyntaxNode | CodeMirror.SyntaxNode[], context: RenderingContext): {
        nodes: Node[];
        cssControls: SDK.CSSPropertyParser.CSSControlMap;
    };
    static renderInto(nodeOrNodes: CodeMirror.SyntaxNode | CodeMirror.SyntaxNode[], context: RenderingContext, parent: Node): {
        nodes: Node[];
        cssControls: SDK.CSSPropertyParser.CSSControlMap;
    };
    renderedMatchForTest(_nodes: Node[], _match: SDK.CSSPropertyParser.Match): void;
    protected enter({ node }: SDK.CSSPropertyParser.SyntaxNodeRef): boolean;
    static renderNameElement(name: string): HTMLElement;
    static renderValueElement(property: SDK.CSSProperty.CSSProperty | {
        name: string;
        value: string;
    }, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching | null, renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>, tracing?: TracingContext): {
        valueElement: HTMLElement;
        cssControls: SDK.CSSPropertyParser.CSSControlMap;
    };
    static renderValueNodes(property: SDK.CSSProperty.CSSProperty | {
        name: string;
        value: string;
    }, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching | null, renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>, tracing?: TracingContext): {
        nodes: Node[];
        cssControls: SDK.CSSPropertyParser.CSSControlMap;
    };
}
declare const URLRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.URLMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.URLMatch, _context: RenderingContext): Node[];
};
export declare class URLRenderer extends URLRenderer_base {
    private readonly rule;
    private readonly node;
    constructor(rule: SDK.CSSRule.CSSRule | null, node: SDK.DOMModel.DOMNode | null);
    render(match: SDK.CSSPropertyParserMatchers.URLMatch): Node[];
}
declare const StringRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.StringMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.StringMatch, _context: RenderingContext): Node[];
};
export declare class StringRenderer extends StringRenderer_base {
    render(match: SDK.CSSPropertyParserMatchers.StringMatch): Node[];
}
declare const BinOpRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.BinOpMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.BinOpMatch, _context: RenderingContext): Node[];
};
export declare class BinOpRenderer extends BinOpRenderer_base {
    render(match: SDK.CSSPropertyParserMatchers.BinOpMatch, context: RenderingContext): Node[];
}
export {};
