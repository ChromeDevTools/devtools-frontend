/// <reference types="trusted-types" />
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
type ResultType = typeof HTML_RESULT | typeof SVG_RESULT;
declare const ATTRIBUTE_PART = 1;
declare const CHILD_PART = 2;
declare const ELEMENT_PART = 6;
declare const COMMENT_PART = 7;
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg}.
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
type TemplateResult<T extends ResultType = ResultType> = {
    ['_$litType$']: T;
    strings: TemplateStringsArray;
    values: unknown[];
};
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
declare const noChange: unique symbol;
/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
declare const nothing: unique symbol;
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
    constructor({ strings, ['_$litType$']: type }: TemplateResult, options?: RenderOptions);
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
    readonly type: 1 | 3 | 4 | 5;
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

/**
 * A key-value set of class names to truthy values.
 */
interface ClassInfo {
    readonly [name: string]: string | boolean | number;
}
declare class ClassMapDirective extends Directive {
    /**
     * Stores the ClassInfo object applied to a given AttributePart.
     * Used to unset existing values when a new ClassInfo object is applied.
     */
    private _previousClasses?;
    private _staticClasses?;
    constructor(partInfo: PartInfo);
    render(classInfo: ClassInfo): string;
    update(part: AttributePart, [classInfo]: DirectiveParameters<this>): string | typeof noChange;
}
/**
 * A directive that applies dynamic CSS classes.
 *
 * This must be used in the `class` attribute and must be the only part used in
 * the attribute. It takes each property in the `classInfo` argument and adds
 * the property name to the element's `classList` if the property value is
 * truthy; if the property value is falsey, the property name is removed from
 * the element's `class`.
 *
 * For example `{foo: bar}` applies the class `foo` if the value of `bar` is
 * truthy.
 *
 * @param classInfo
 */
declare const classMap: (classInfo: ClassInfo) => DirectiveResult<typeof ClassMapDirective>;

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * For AttributeParts, sets the attribute if the value is defined and removes
 * the attribute if the value is undefined.
 *
 * For other part types, this directive is a no-op.
 */
declare const ifDefined: <T>(value: T) => typeof nothing | NonNullable<T>;

declare class LiveDirective extends Directive {
    constructor(partInfo: PartInfo);
    render(value: unknown): unknown;
    update(part: AttributePart, [value]: DirectiveParameters<this>): unknown;
}
/**
 * Checks binding values against live DOM values, instead of previously bound
 * values, when determining whether to update the value.
 *
 * This is useful for cases where the DOM value may change from outside of
 * lit-html, such as with a binding to an `<input>` element's `value` property,
 * a content editable elements text, or to a custom element that changes it's
 * own properties or attributes.
 *
 * In these cases if the DOM value changes, but the value set through lit-html
 * bindings hasn't, lit-html won't know to update the DOM value and will leave
 * it alone. If this is not what you want--if you want to overwrite the DOM
 * value with the bound value no matter what--use the `live()` directive:
 *
 * ```js
 * html`<input .value=${live(x)}>`
 * ```
 *
 * `live()` performs a strict equality check against the live DOM value, and if
 * the new value is equal to the live value, does nothing. This means that
 * `live()` should not be used when the binding will cause a type conversion. If
 * you use `live()` with an attribute binding, make sure that only strings are
 * passed in, or the binding will update every render.
 */
declare const live: (value: unknown) => DirectiveResult<typeof LiveDirective>;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

type KeyFn<T> = (item: T, index: number) => unknown;
type ItemTemplate<T> = (item: T, index: number) => unknown;
declare class RepeatDirective extends Directive {
    private _itemKeys?;
    constructor(partInfo: PartInfo);
    private _getValuesAndKeys;
    render<T>(items: Iterable<T>, template: ItemTemplate<T>): Array<unknown>;
    render<T>(items: Iterable<T>, keyFn: KeyFn<T> | ItemTemplate<T>, template: ItemTemplate<T>): Array<unknown>;
    update<T>(containerPart: ChildPart, [items, keyFnOrTemplate, template]: [
        Iterable<T>,
        KeyFn<T> | ItemTemplate<T>,
        ItemTemplate<T>
    ]): unknown[] | typeof noChange;
}
interface RepeatDirectiveFn {
    <T>(items: Iterable<T>, keyFnOrTemplate: KeyFn<T> | ItemTemplate<T>, template?: ItemTemplate<T>): unknown;
    <T>(items: Iterable<T>, template: ItemTemplate<T>): unknown;
    <T>(items: Iterable<T>, keyFn: KeyFn<T> | ItemTemplate<T>, template: ItemTemplate<T>): unknown;
}
/**
 * A directive that repeats a series of values (usually `TemplateResults`)
 * generated from an iterable, and updates those items efficiently when the
 * iterable changes based on user-provided `keys` associated with each item.
 *
 * Note that if a `keyFn` is provided, strict key-to-DOM mapping is maintained,
 * meaning previous DOM for a given key is moved into the new position if
 * needed, and DOM will never be reused with values for different keys (new DOM
 * will always be created for new keys). This is generally the most efficient
 * way to use `repeat` since it performs minimum unnecessary work for insertions
 * and removals.
 *
 * The `keyFn` takes two parameters, the item and its index, and returns a unique key value.
 *
 * ```js
 * html`
 *   <ol>
 *     ${repeat(this.items, (item) => item.id, (item, index) => {
 *       return html`<li>${index}: ${item.name}</li>`;
 *     })}
 *   </ol>
 * `
 * ```
 *
 * **Important**: If providing a `keyFn`, keys *must* be unique for all items in a
 * given call to `repeat`. The behavior when two or more items have the same key
 * is undefined.
 *
 * If no `keyFn` is provided, this directive will perform similar to mapping
 * items to values, and DOM will be reused against potentially different items.
 */
declare const repeat: RepeatDirectiveFn;

/**
 * A key-value set of CSS properties and values.
 *
 * The key should be either a valid CSS property name string, like
 * `'background-color'`, or a valid JavaScript camel case property name
 * for CSSStyleDeclaration like `backgroundColor`.
 */
interface StyleInfo {
    [name: string]: string | number | undefined | null;
}
declare class StyleMapDirective extends Directive {
    private _previousStyleProperties?;
    constructor(partInfo: PartInfo);
    render(styleInfo: Readonly<StyleInfo>): string;
    update(part: AttributePart, [styleInfo]: DirectiveParameters<this>): string | typeof noChange;
}
/**
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the
 * {@link StyleInfo styleInfo} object and adds the properties to the inline
 * style of the element.
 *
 * Property names with dashes (`-`) are assumed to be valid CSS
 * property names and set on the element's style object using `setProperty()`.
 * Names without dashes are assumed to be camelCased JavaScript property names
 * and set on the element's style object using property assignment, allowing the
 * style object to translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo
 * @see {@link https://lit.dev/docs/templates/directives/#stylemap styleMap code samples on Lit.dev}
 */
declare const styleMap: (styleInfo: Readonly<StyleInfo>) => DirectiveResult<typeof StyleMapDirective>;

declare class UnsafeHTMLDirective extends Directive {
    static directiveName: string;
    static resultType: number;
    private _value;
    private _templateResult?;
    constructor(partInfo: PartInfo);
    render(value: string | typeof nothing | typeof noChange | undefined | null): typeof noChange | typeof nothing | TemplateResult | null | undefined;
}
/**
 * Renders the result as HTML, rather than text.
 *
 * The values `undefined`, `null`, and `nothing`, will all result in no content
 * (empty string) being rendered.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
declare const unsafeHTML: (value: string | typeof noChange | typeof nothing | null | undefined) => DirectiveResult<typeof UnsafeHTMLDirective>;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
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

declare class UntilDirective extends AsyncDirective {
    private __lastRenderedIndex;
    private __values;
    private __weakThis;
    private __pauser;
    render(...args: Array<unknown>): unknown;
    update(_part: Part, args: Array<unknown>): unknown;
    disconnected(): void;
    reconnected(): void;
}
/**
 * Renders one of a series of values, including Promises, to a Part.
 *
 * Values are rendered in priority order, with the first argument having the
 * highest priority and the last argument having the lowest priority. If a
 * value is a Promise, low-priority values will be rendered until it resolves.
 *
 * The priority of values can be used to create placeholder content for async
 * data. For example, a Promise with pending content can be the first,
 * highest-priority, argument, and a non_promise loading indicator template can
 * be used as the second, lower-priority, argument. The loading indicator will
 * render immediately, and the primary content will render when the Promise
 * resolves.
 *
 * Example:
 *
 * ```js
 * const content = fetch('./content.txt').then(r => r.text());
 * html`${until(content, html`<span>Loading...</span>`)}`
 * ```
 */
declare const until: (...values: unknown[]) => DirectiveResult<typeof UntilDirective>;

/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
declare const createRef: <T = Element>() => Ref<T>;
/**
 * An object that holds a ref value.
 */
declare class Ref<T = Element> {
    /**
     * The current Element value of the ref, or else `undefined` if the ref is no
     * longer rendered.
     */
    readonly value?: T;
}

type RefOrCallback<T = Element> = Ref<T> | ((el: T | undefined) => void);
declare class RefDirective extends AsyncDirective {
    private _element?;
    private _ref?;
    private _context?;
    render(_ref?: RefOrCallback): symbol;
    update(part: ElementPart, [ref]: Parameters<this['render']>): symbol;
    private _updateRefValue;
    private get _lastElementForRef();
    disconnected(): void;
    reconnected(): void;
}
/**
 * Sets the value of a Ref object or calls a ref callback with the element it's
 * bound to.
 *
 * A Ref object acts as a container for a reference to an element. A ref
 * callback is a function that takes an element as its only argument.
 *
 * The ref directive sets the value of the Ref object or calls the ref callback
 * during rendering, if the referenced element changed.
 *
 * Note: If a ref callback is rendered to a different element position or is
 * removed in a subsequent render, it will first be called with `undefined`,
 * followed by another call with the new element it was rendered to (if any).
 *
 * ```js
 * // Using Ref object
 * const inputRef = createRef();
 * render(html`<input ${ref(inputRef)}>`, container);
 * inputRef.value.focus();
 *
 * // Using callback
 * const callback = (inputElement) => inputElement.focus();
 * render(html`<input ${ref(callback)}>`, container);
 * ```
 */
declare const ref: (_ref?: RefOrCallback<Element> | undefined) => DirectiveResult<typeof RefDirective>;

export { ClassInfo, ClassMapDirective, ItemTemplate, KeyFn, LiveDirective, Ref, RefDirective, RefOrCallback, RepeatDirective, RepeatDirectiveFn, StyleInfo, StyleMapDirective, UnsafeHTMLDirective, UntilDirective, classMap, createRef, ifDefined, live, ref, repeat, styleMap, unsafeHTML, until };
