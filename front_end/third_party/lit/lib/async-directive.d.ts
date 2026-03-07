/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

interface DirectiveClass {
    new (part: PartInfo): Directive;
}
/**
 * This utility type extracts the signature of a directive class's render()
 * method so we can use it for the type of the generated directive function.
 */
type DirectiveParameters<C extends Directive> = Parameters<C['render']>;
/**
 * A generated directive function doesn't evaluate the directive, but just
 * returns a DirectiveResult object that captures the arguments.
 */
interface DirectiveResult<C extends DirectiveClass = DirectiveClass> {
}
declare const PartType: {
    readonly ATTRIBUTE: 1;
    readonly CHILD: 2;
    readonly PROPERTY: 3;
    readonly BOOLEAN_ATTRIBUTE: 4;
    readonly EVENT: 5;
    readonly ELEMENT: 6;
};
type PartType = (typeof PartType)[keyof typeof PartType];
interface ChildPartInfo {
    readonly type: typeof PartType.CHILD;
}
interface AttributePartInfo {
    readonly type: typeof PartType.ATTRIBUTE | typeof PartType.PROPERTY | typeof PartType.BOOLEAN_ATTRIBUTE | typeof PartType.EVENT;
    readonly strings?: ReadonlyArray<string>;
    readonly name: string;
    readonly tagName: string;
}
interface ElementPartInfo {
    readonly type: typeof PartType.ELEMENT;
}
/**
 * Information about the part a directive is bound to.
 *
 * This is useful for checking that a directive is attached to a valid part,
 * such as with directive that can only be used on attribute bindings.
 */
type PartInfo = ChildPartInfo | AttributePartInfo | ElementPartInfo;
/**
 * Creates a user-facing directive function from a Directive class. This
 * function has the same parameters as the directive's render() method.
 */
declare const directive: <C extends DirectiveClass>(c: C) => (...values: DirectiveParameters<InstanceType<C>>) => DirectiveResult<C>;
/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
declare abstract class Directive implements Disconnectable {
    constructor(_partInfo: PartInfo);
    get _$isConnected(): boolean;
    abstract render(...props: Array<unknown>): unknown;
    update(_part: Part, props: Array<unknown>): unknown;
}

declare class TrustedHTML {
    private constructor(); // To prevent instantiting with 'new'.
    private brand: true; // To prevent structural typing.
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * A function which can sanitize values that will be written to a specific kind
 * of DOM sink.
 *
 * See SanitizerFactory.
 *
 * @param value The value to sanitize. Will be the actual value passed into
 *     the lit-html template literal, so this could be of any type.
 * @return The value to write to the DOM. Usually the same as the input value,
 *     unless sanitization is needed.
 */
type ValueSanitizer = (value: unknown) => unknown;
/** TemplateResult types */
declare const HTML_RESULT = 1;
declare const SVG_RESULT = 2;
declare const MATHML_RESULT = 3;
type ResultType = typeof HTML_RESULT | typeof SVG_RESULT | typeof MATHML_RESULT;
declare const ATTRIBUTE_PART = 1;
declare const CHILD_PART = 2;
declare const PROPERTY_PART = 3;
declare const BOOLEAN_ATTRIBUTE_PART = 4;
declare const EVENT_PART = 5;
declare const ELEMENT_PART = 6;
declare const COMMENT_PART = 7;
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg} when it hasn't been compiled by @lit-labs/compiler.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 */
type UncompiledTemplateResult<T extends ResultType = ResultType> = {
    ['_$litType$']: T;
    strings: TemplateStringsArray;
    values: unknown[];
};
/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
interface RenderOptions {
    /**
     * An object to use as the `this` value for event listeners. It's often
     * useful to set this to the host component rendering a template.
     */
    host?: object;
    /**
     * A DOM node before which to render content in the container.
     */
    renderBefore?: ChildNode | null;
    /**
     * Node used for cloning the template (`importNode` will be called on this
     * node). This controls the `ownerDocument` of the rendered DOM, along with
     * any inherited context. Defaults to the global `document`.
     */
    creationScope?: {
        importNode(node: Node, deep?: boolean): Node;
    };
    /**
     * The initial connected state for the top-level part being rendered. If no
     * `isConnected` option is set, `AsyncDirective`s will be connected by
     * default. Set to `false` if the initial render occurs in a disconnected tree
     * and `AsyncDirective`s should see `isConnected === false` for their initial
     * render. The `part.setConnected()` method must be used subsequent to initial
     * render to change the connected state of the part.
     */
    isConnected?: boolean;
}
interface DirectiveParent {
    _$parent?: DirectiveParent;
    _$isConnected: boolean;
    __directive?: Directive;
    __directives?: Array<Directive | undefined>;
}
declare class Template {
    parts: Array<TemplatePart>;
    constructor({ strings, ['_$litType$']: type }: UncompiledTemplateResult, options?: RenderOptions);
    /** @nocollapse */
    static createElement(html: TrustedHTML, _options?: RenderOptions): HTMLTemplateElement;
}
interface Disconnectable {
    _$parent?: Disconnectable;
    _$disconnectableChildren?: Set<Disconnectable>;
    _$isConnected: boolean;
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
declare class TemplateInstance implements Disconnectable {
    _$template: Template;
    _$parts: Array<Part | undefined>;
    constructor(template: Template, parent: ChildPart);
    get parentNode(): Node;
    get _$isConnected(): boolean;
    _clone(options: RenderOptions | undefined): Node;
    _update(values: Array<unknown>): void;
}
type AttributeTemplatePart = {
    readonly type: typeof ATTRIBUTE_PART;
    readonly index: number;
    readonly name: string;
    readonly ctor: typeof AttributePart;
    readonly strings: ReadonlyArray<string>;
};
type ChildTemplatePart = {
    readonly type: typeof CHILD_PART;
    readonly index: number;
};
type ElementTemplatePart = {
    readonly type: typeof ELEMENT_PART;
    readonly index: number;
};
type CommentTemplatePart = {
    readonly type: typeof COMMENT_PART;
    readonly index: number;
};
/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart = ChildTemplatePart | AttributeTemplatePart | ElementTemplatePart | CommentTemplatePart;
type Part = ChildPart | AttributePart | PropertyPart | BooleanAttributePart | ElementPart | EventPart;

declare class ChildPart implements Disconnectable {
    readonly type = 2;
    readonly options: RenderOptions | undefined;
    _$committedValue: unknown;
    private _textSanitizer;
    get _$isConnected(): boolean;
    constructor(startNode: ChildNode, endNode: ChildNode | null, parent: TemplateInstance | ChildPart | undefined, options: RenderOptions | undefined);
    /**
     * The parent node into which the part renders its content.
     *
     * A ChildPart's content consists of a range of adjacent child nodes of
     * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
     * `.endNode`).
     *
     * - If both `.startNode` and `.endNode` are non-null, then the part's content
     * consists of all siblings between `.startNode` and `.endNode`, exclusively.
     *
     * - If `.startNode` is non-null but `.endNode` is null, then the part's
     * content consists of all siblings following `.startNode`, up to and
     * including the last child of `.parentNode`. If `.endNode` is non-null, then
     * `.startNode` will always be non-null.
     *
     * - If both `.endNode` and `.startNode` are null, then the part's content
     * consists of all child nodes of `.parentNode`.
     */
    get parentNode(): Node;
    /**
     * The part's leading marker node, if any. See `.parentNode` for more
     * information.
     */
    get startNode(): Node | null;
    /**
     * The part's trailing marker node, if any. See `.parentNode` for more
     * information.
     */
    get endNode(): Node | null;
    _$setValue(value: unknown, directiveParent?: DirectiveParent): void;
    private _insert;
    private _commitNode;
    private _commitText;
    private _commitTemplateResult;
    private _commitIterable;
}
declare class AttributePart implements Disconnectable {
    readonly type: typeof ATTRIBUTE_PART | typeof PROPERTY_PART | typeof BOOLEAN_ATTRIBUTE_PART | typeof EVENT_PART;
    readonly element: HTMLElement;
    readonly name: string;
    readonly options: RenderOptions | undefined;
    /**
     * If this attribute part represents an interpolation, this contains the
     * static strings of the interpolation. For single-value, complete bindings,
     * this is undefined.
     */
    readonly strings?: ReadonlyArray<string>;
    protected _sanitizer: ValueSanitizer | undefined;
    get tagName(): string;
    get _$isConnected(): boolean;
    constructor(element: HTMLElement, name: string, strings: ReadonlyArray<string>, parent: Disconnectable, options: RenderOptions | undefined);
}

declare class PropertyPart extends AttributePart {
    readonly type = 3;
}

declare class BooleanAttributePart extends AttributePart {
    readonly type = 4;
}

declare class EventPart extends AttributePart {
    readonly type = 5;
    constructor(element: HTMLElement, name: string, strings: ReadonlyArray<string>, parent: Disconnectable, options: RenderOptions | undefined);
    handleEvent(event: Event): void;
}

declare class ElementPart implements Disconnectable {
    element: Element;
    readonly type = 6;
    _$committedValue: undefined;
    options: RenderOptions | undefined;
    constructor(element: Element, parent: Disconnectable, options: RenderOptions | undefined);
    get _$isConnected(): boolean;
    _$setValue(value: unknown): void;
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Overview:
 *
 * This module is designed to add support for an async `setValue` API and
 * `disconnected` callback to directives with the least impact on the core
 * runtime or payload when that feature is not used.
 *
 * The strategy is to introduce a `AsyncDirective` subclass of
 * `Directive` that climbs the "parent" tree in its constructor to note which
 * branches of lit-html's "logical tree" of data structures contain such
 * directives and thus need to be crawled when a subtree is being cleared (or
 * manually disconnected) in order to run the `disconnected` callback.
 *
 * The "nodes" of the logical tree include Parts, TemplateInstances (for when a
 * TemplateResult is committed to a value of a ChildPart), and Directives; these
 * all implement a common interface called `DisconnectableChild`. Each has a
 * `_$parent` reference which is set during construction in the core code, and a
 * `_$disconnectableChildren` field which is initially undefined.
 *
 * The sparse tree created by means of the `AsyncDirective` constructor
 * crawling up the `_$parent` tree and placing a `_$disconnectableChildren` Set
 * on each parent that includes each child that contains a
 * `AsyncDirective` directly or transitively via its children. In order to
 * notify connection state changes and disconnect (or reconnect) a tree, the
 * `_$notifyConnectionChanged` API is patched onto ChildParts as a directive
 * climbs the parent tree, which is called by the core when clearing a part if
 * it exists. When called, that method iterates over the sparse tree of
 * Set<DisconnectableChildren> built up by AsyncDirectives, and calls
 * `_$notifyDirectiveConnectionChanged` on any directives that are encountered
 * in that tree, running the required callbacks.
 *
 * A given "logical tree" of lit-html data-structures might look like this:
 *
 *  ChildPart(N1) _$dC=[D2,T3]
 *   ._directive
 *     AsyncDirective(D2)
 *   ._value // user value was TemplateResult
 *     TemplateInstance(T3) _$dC=[A4,A6,N10,N12]
 *      ._$parts[]
 *        AttributePart(A4) _$dC=[D5]
 *         ._directives[]
 *           AsyncDirective(D5)
 *        AttributePart(A6) _$dC=[D7,D8]
 *         ._directives[]
 *           AsyncDirective(D7)
 *           Directive(D8) _$dC=[D9]
 *            ._directive
 *              AsyncDirective(D9)
 *        ChildPart(N10) _$dC=[D11]
 *         ._directive
 *           AsyncDirective(D11)
 *         ._value
 *           string
 *        ChildPart(N12) _$dC=[D13,N14,N16]
 *         ._directive
 *           AsyncDirective(D13)
 *         ._value // user value was iterable
 *           Array<ChildPart>
 *             ChildPart(N14) _$dC=[D15]
 *              ._value
 *                string
 *             ChildPart(N16) _$dC=[D17,T18]
 *              ._directive
 *                AsyncDirective(D17)
 *              ._value // user value was TemplateResult
 *                TemplateInstance(T18) _$dC=[A19,A21,N25]
 *                 ._$parts[]
 *                   AttributePart(A19) _$dC=[D20]
 *                    ._directives[]
 *                      AsyncDirective(D20)
 *                   AttributePart(A21) _$dC=[22,23]
 *                    ._directives[]
 *                      AsyncDirective(D22)
 *                      Directive(D23) _$dC=[D24]
 *                       ._directive
 *                         AsyncDirective(D24)
 *                   ChildPart(N25) _$dC=[D26]
 *                    ._directive
 *                      AsyncDirective(D26)
 *                    ._value
 *                      string
 *
 * Example 1: The directive in ChildPart(N12) updates and returns `nothing`. The
 * ChildPart will _clear() itself, and so we need to disconnect the "value" of
 * the ChildPart (but not its directive). In this case, when `_clear()` calls
 * `_$notifyConnectionChanged()`, we don't iterate all of the
 * _$disconnectableChildren, rather we do a value-specific disconnection: i.e.
 * since the _value was an Array<ChildPart> (because an iterable had been
 * committed), we iterate the array of ChildParts (N14, N16) and run
 * `setConnected` on them (which does recurse down the full tree of
 * `_$disconnectableChildren` below it, and also removes N14 and N16 from N12's
 * `_$disconnectableChildren`). Once the values have been disconnected, we then
 * check whether the ChildPart(N12)'s list of `_$disconnectableChildren` is empty
 * (and would remove it from its parent TemplateInstance(T3) if so), but since
 * it would still contain its directive D13, it stays in the disconnectable
 * tree.
 *
 * Example 2: In the course of Example 1, `setConnected` will reach
 * ChildPart(N16); in this case the entire part is being disconnected, so we
 * simply iterate all of N16's `_$disconnectableChildren` (D17,T18) and
 * recursively run `setConnected` on them. Note that we only remove children
 * from `_$disconnectableChildren` for the top-level values being disconnected
 * on a clear; doing this bookkeeping lower in the tree is wasteful since it's
 * all being thrown away.
 *
 * Example 3: If the LitElement containing the entire tree above becomes
 * disconnected, it will run `childPart.setConnected()` (which calls
 * `childPart._$notifyConnectionChanged()` if it exists); in this case, we
 * recursively run `setConnected()` over the entire tree, without removing any
 * children from `_$disconnectableChildren`, since this tree is required to
 * re-connect the tree, which does the same operation, simply passing
 * `isConnected: true` down the tree, signaling which callback to run.
 */

/**
 * An abstract `Directive` base class whose `disconnected` method will be
 * called when the part containing the directive is cleared as a result of
 * re-rendering, or when the user calls `part.setConnected(false)` on
 * a part that was previously rendered containing the directive (as happens
 * when e.g. a LitElement disconnects from the DOM).
 *
 * If `part.setConnected(true)` is subsequently called on a
 * containing part, the directive's `reconnected` method will be called prior
 * to its next `update`/`render` callbacks. When implementing `disconnected`,
 * `reconnected` should also be implemented to be compatible with reconnection.
 *
 * Note that updates may occur while the directive is disconnected. As such,
 * directives should generally check the `this.isConnected` flag during
 * render/update to determine whether it is safe to subscribe to resources
 * that may prevent garbage collection.
 */
declare abstract class AsyncDirective extends Directive {
    /**
     * The connection state for this Directive.
     */
    isConnected: boolean;
    /**
     * Initialize the part with internal fields
     * @param part
     * @param parent
     * @param attributeIndex
     */
    _$initialize(part: Part, parent: Disconnectable, attributeIndex: number | undefined): void;
    /**
     * Sets the value of the directive's Part outside the normal `update`/`render`
     * lifecycle of a directive.
     *
     * This method should not be called synchronously from a directive's `update`
     * or `render`.
     *
     * @param directive The directive to update
     * @param value The value to set
     */
    setValue(value: unknown): void;
    /**
     * User callbacks for implementing logic to release any resources/subscriptions
     * that may have been retained by this directive. Since directives may also be
     * re-connected, `reconnected` should also be implemented to restore the
     * working state of the directive prior to the next render.
     */
    protected disconnected(): void;
    protected reconnected(): void;
}

export { AsyncDirective, AttributePart, type AttributePartInfo, BooleanAttributePart, ChildPart, type ChildPartInfo, Directive, type DirectiveClass, type DirectiveParameters, type DirectiveResult, ElementPart, type ElementPartInfo, EventPart, type Part, type PartInfo, PartType, PropertyPart, directive };
