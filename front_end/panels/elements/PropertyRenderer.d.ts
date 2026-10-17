import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export declare function precedingSpace(node: CodeMirror.SyntaxNode, ast: SDK.CSSPropertyParser.SyntaxTree, matchedResult?: SDK.CSSPropertyParser.BottomUpTreeMatching): string;
export type RendererBase<MatchT extends SDK.CSSPropertyParser.Match> = abstract new () => MatchRenderer<MatchT>;
export interface MatchRenderer<MatchT extends SDK.CSSPropertyParser.Match> {
    readonly matchType: Platform.Constructor.Constructor<MatchT>;
    render(match: MatchT, context: RenderingContext): Node[] | LitTemplate;
}
export declare function rendererBase<MatchT extends SDK.CSSPropertyParser.Match>(matchT: Platform.Constructor.Constructor<MatchT>): RendererBase<MatchT>;
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
export declare const CSSControlMap: MapConstructor;
export type CSSControlMap = Map<string, HTMLElement[]>;
/**
 * Tracks the changes that renderers make to the text of the value of a declaration, e.g. because the user picked a
 * color, and puts the text of the value together from them. It wraps a `ComputedText` over the authored text of the
 * declaration, in which a change takes the place of the match that it replaces.
 **/
export declare class ValueUpdateTracking {
    #private;
    constructor(ast: SDK.CSSPropertyParser.SyntaxTree);
    recordEdit(match: SDK.CSSPropertyParser.Match, value: string | (() => string)): void;
    valueText(): string;
    getEdit(match: SDK.CSSPropertyParser.Match): string | undefined;
    textRange(from: CodeMirror.SyntaxNode | undefined, to: CodeMirror.SyntaxNode | undefined): string;
}
export declare class ValueEditEvent extends CustomEvent<string> {
    static readonly eventName = "valueedit";
    constructor(value: string);
}
interface EditableContentViewInput {
    editedValue: string | null;
    onValueEdit: (event: ValueEditEvent) => void;
}
type EditableContentView = (input: EditableContentViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
/**
 * Hosts a value part that can be edited through an inline swatch or icon.
 *
 * The swatch or icon goes into the `icon` slot, and the initial rendered AST nodes go into the default slot. When the
 * swatch or icon dispatches a `ValueEditEvent`, the default slot is replaced with the new text while the `icon` slot
 * stays in place.
 **/
export declare class EditableContent extends UI.Widget.Widget<DocumentFragment> {
    #private;
    constructor(element?: HTMLElement, view?: EditableContentView);
    performUpdate(): void;
}
export declare class RenderingContext {
    readonly ast: SDK.CSSPropertyParser.SyntaxTree;
    readonly property: SDK.CSSProperty.CSSProperty | null;
    readonly renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>;
    readonly matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching;
    readonly cssControls?: CSSControlMap | undefined;
    readonly options: {
        readonly?: boolean;
    };
    readonly tracing?: TracingContext | undefined;
    readonly signal?: AbortSignal | undefined;
    readonly edits?: ValueUpdateTracking | undefined;
    constructor(ast: SDK.CSSPropertyParser.SyntaxTree, property: SDK.CSSProperty.CSSProperty | null, renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching, cssControls?: CSSControlMap | undefined, options?: {
        readonly?: boolean;
    }, tracing?: TracingContext | undefined, signal?: AbortSignal | undefined, edits?: ValueUpdateTracking | undefined);
    recordEdit(match: SDK.CSSPropertyParser.Match, value: string | (() => string)): void;
    addControl(cssType: string, control: HTMLElement): void;
    getComputedLonghandName(node: CodeMirror.SyntaxNode): string | null;
    findParent<MatchT extends SDK.CSSPropertyParser.Match>(node: CodeMirror.SyntaxNode | null, matchType: Platform.Constructor.Constructor<MatchT>): MatchT | null;
}
export declare class Renderer extends SDK.CSSPropertyParser.TreeWalker {
    #private;
    constructor(ast: SDK.CSSPropertyParser.SyntaxTree, property: SDK.CSSProperty.CSSProperty | null, renderers: Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching, cssControls: CSSControlMap, options: {
        readonly?: boolean;
    }, tracing: TracingContext | undefined, signal: AbortSignal | undefined, edits: ValueUpdateTracking | undefined);
    static render(nodeOrNodes: CodeMirror.SyntaxNode | CodeMirror.SyntaxNode[], context: RenderingContext): {
        nodes: LitTemplate;
        cssControls: CSSControlMap;
    };
    static renderInto(nodeOrNodes: CodeMirror.SyntaxNode | CodeMirror.SyntaxNode[], context: RenderingContext, parent: HTMLElement | DocumentFragment): {
        nodes: LitTemplate;
        cssControls: CSSControlMap;
    };
    renderedMatchForTest(_nodes: LitTemplate, _match: SDK.CSSPropertyParser.Match): void;
    protected enter({ node }: SDK.CSSPropertyParser.SyntaxNodeRef): boolean;
    static renderNameElement(name: string): HTMLElement;
    static renderValueElement(property: SDK.CSSProperty.CSSProperty | {
        name: string;
        value: string;
    }, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching | null, renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>, tracing?: TracingContext, signal?: AbortSignal, edits?: ValueUpdateTracking): {
        valueElement: HTMLElement;
        cssControls: CSSControlMap;
    };
    static renderValueNodes(property: SDK.CSSProperty.CSSProperty | {
        name: string;
        value: string;
    }, matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching | null, renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>, tracing?: TracingContext, signal?: AbortSignal, edits?: ValueUpdateTracking): {
        nodes: LitTemplate;
        cssControls: CSSControlMap;
    };
}
declare const URLRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.URLMatch>;
export declare class URLRenderer extends URLRendererBase {
    private readonly rule;
    private readonly node;
    constructor(rule: SDK.CSSRule.CSSRule | null, node: SDK.DOMModel.DOMNode | null);
    render(match: SDK.CSSPropertyParserMatchers.URLMatch): LitTemplate;
}
declare const StringRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.StringMatch>;
export declare class StringRenderer extends StringRendererBase {
    render(match: SDK.CSSPropertyParserMatchers.StringMatch): LitTemplate;
}
declare const BinOpRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.BinOpMatch>;
export declare class BinOpRenderer extends BinOpRendererBase {
    render(match: SDK.CSSPropertyParserMatchers.BinOpMatch, context: RenderingContext): LitTemplate;
}
export {};
