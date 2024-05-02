/// <reference types="trusted-types" />
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Whether the current browser supports `adoptedStyleSheets`.
 */
declare const supportsAdoptingStyleSheets: boolean;
/**
 * A CSSResult or native CSSStyleSheet.
 *
 * In browsers that support constructible CSS style sheets, CSSStyleSheet
 * object can be used for styling along side CSSResult from the `css`
 * template tag.
 */
type CSSResultOrNative = CSSResult | CSSStyleSheet;
type CSSResultArray = Array<CSSResultOrNative | CSSResultArray>;
/**
 * A single CSSResult, CSSStyleSheet, or an array or nested arrays of those.
 */
type CSSResultGroup = CSSResultOrNative | CSSResultArray;
/**
 * A container for a string of CSS text, that may be used to create a CSSStyleSheet.
 *
 * CSSResult is the return value of `css`-tagged template literals and
 * `unsafeCSS()`. In order to ensure that CSSResults are only created via the
 * `css` tag and `unsafeCSS()`, CSSResult cannot be constructed directly.
 */
declare class CSSResult {
    ['_$cssResult$']: boolean;
    readonly cssText: string;
    private _styleSheet?;
    private _strings;
    private constructor();
    get styleSheet(): CSSStyleSheet | undefined;
    toString(): string;
}
/**
 * Wrap a value for interpolation in a {@linkcode css} tagged template literal.
 *
 * This is unsafe because untrusted CSS text can be used to phone home
 * or exfiltrate data to an attacker controlled site. Take care to only use
 * this with trusted input.
 */
declare const unsafeCSS: (value: unknown) => CSSResult;
/**
 * A template literal tag which can be used with LitElement's
 * {@linkcode LitElement.styles} property to set element styles.
 *
 * For security reasons, only literal string values and number may be used in
 * embedded expressions. To incorporate non-literal values {@linkcode unsafeCSS}
 * may be used inside an expression.
 */
declare const css: (strings: TemplateStringsArray, ...values: (CSSResultGroup | number)[]) => CSSResult;
/**
 * Applies the given styles to a `shadowRoot`. When Shadow DOM is
 * available but `adoptedStyleSheets` is not, styles are appended to the
 * `shadowRoot` to [mimic spec behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
 * Note, when shimming is used, any styles that are subsequently placed into
 * the shadowRoot should be placed *before* any shimmed adopted styles. This
 * will match spec behavior that gives adopted sheets precedence over styles in
 * shadowRoot.
 */
declare const adoptStyles: (renderRoot: ShadowRoot, styles: Array<CSSResultOrNative>) => void;
declare const getCompatibleStyle: (s: CSSResultOrNative) => CSSResultOrNative;

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * An object that can host Reactive Controllers and call their lifecycle
 * callbacks.
 */
interface ReactiveControllerHost {
    /**
     * Adds a controller to the host, which sets up the controller's lifecycle
     * methods to be called with the host's lifecycle.
     */
    addController(controller: ReactiveController): void;
    /**
     * Removes a controller from the host.
     */
    removeController(controller: ReactiveController): void;
    /**
     * Requests a host update which is processed asynchronously. The update can
     * be waited on via the `updateComplete` property.
     */
    requestUpdate(): void;
    /**
     * Returns a Promise that resolves when the host has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * @return A promise of a boolean that indicates if the update resolved
     *     without triggering another update.
     */
    readonly updateComplete: Promise<boolean>;
}
/**
 * A Reactive Controller is an object that enables sub-component code
 * organization and reuse by aggregating the state, behavior, and lifecycle
 * hooks related to a single feature.
 *
 * Controllers are added to a host component, or other object that implements
 * the `ReactiveControllerHost` interface, via the `addController()` method.
 * They can hook their host components's lifecycle by implementing one or more
 * of the lifecycle callbacks, or initiate an update of the host component by
 * calling `requestUpdate()` on the host.
 */
interface ReactiveController {
    /**
     * Called when the host is connected to the component tree. For custom
     * element hosts, this corresponds to the `connectedCallback()` lifecycle,
     * which is only called when the component is connected to the document.
     */
    hostConnected?(): void;
    /**
     * Called when the host is disconnected from the component tree. For custom
     * element hosts, this corresponds to the `disconnectedCallback()` lifecycle,
     * which is called the host or an ancestor component is disconnected from the
     * document.
     */
    hostDisconnected?(): void;
    /**
     * Called during the client-side host update, just before the host calls
     * its own update.
     *
     * Code in `update()` can depend on the DOM as it is not called in
     * server-side rendering.
     */
    hostUpdate?(): void;
    /**
     * Called after a host update, just before the host calls firstUpdated and
     * updated. It is not called in server-side rendering.
     *
     */
    hostUpdated?(): void;
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Contains types that are part of the unstable debug API.
 *
 * Everything in this API is not stable and may change or be removed in the future,
 * even on patch releases.
 */
declare namespace ReactiveUnstable {
    /**
     * When Lit is running in dev mode and `window.emitLitDebugLogEvents` is true,
     * we will emit 'lit-debug' events to window, with live details about the update and render
     * lifecycle. These can be useful for writing debug tooling and visualizations.
     *
     * Please be aware that running with window.emitLitDebugLogEvents has performance overhead,
     * making certain operations that are normally very cheap (like a no-op render) much slower,
     * because we must copy data and dispatch events.
     */
    namespace DebugLog {
        type Entry = Update;
        interface Update {
            kind: 'update';
        }
    }
}
/**
 * Converts property values to and from attribute values.
 */
interface ComplexAttributeConverter<Type = unknown, TypeHint = unknown> {
    /**
     * Called to convert an attribute value to a property
     * value.
     */
    fromAttribute?(value: string | null, type?: TypeHint): Type;
    /**
     * Called to convert a property value to an attribute
     * value.
     *
     * It returns unknown instead of string, to be compatible with
     * https://github.com/WICG/trusted-types (and similar efforts).
     */
    toAttribute?(value: Type, type?: TypeHint): unknown;
}
type AttributeConverter<Type = unknown, TypeHint = unknown> = ComplexAttributeConverter<Type> | ((value: string | null, type?: TypeHint) => Type);
/**
 * Defines options for a property accessor.
 */
interface PropertyDeclaration<Type = unknown, TypeHint = unknown> {
    /**
     * When set to `true`, indicates the property is internal private state. The
     * property should not be set by users. When using TypeScript, this property
     * should be marked as `private` or `protected`, and it is also a common
     * practice to use a leading `_` in the name. The property is not added to
     * `observedAttributes`.
     */
    readonly state?: boolean;
    /**
     * Indicates how and whether the property becomes an observed attribute.
     * If the value is `false`, the property is not added to `observedAttributes`.
     * If true or absent, the lowercased property name is observed (e.g. `fooBar`
     * becomes `foobar`). If a string, the string value is observed (e.g
     * `attribute: 'foo-bar'`).
     */
    readonly attribute?: boolean | string;
    /**
     * Indicates the type of the property. This is used only as a hint for the
     * `converter` to determine how to convert the attribute
     * to/from a property.
     */
    readonly type?: TypeHint;
    /**
     * Indicates how to convert the attribute to/from a property. If this value
     * is a function, it is used to convert the attribute value a the property
     * value. If it's an object, it can have keys for `fromAttribute` and
     * `toAttribute`. If no `toAttribute` function is provided and
     * `reflect` is set to `true`, the property value is set directly to the
     * attribute. A default `converter` is used if none is provided; it supports
     * `Boolean`, `String`, `Number`, `Object`, and `Array`. Note,
     * when a property changes and the converter is used to update the attribute,
     * the property is never updated again as a result of the attribute changing,
     * and vice versa.
     */
    readonly converter?: AttributeConverter<Type, TypeHint>;
    /**
     * Indicates if the property should reflect to an attribute.
     * If `true`, when the property is set, the attribute is set using the
     * attribute name determined according to the rules for the `attribute`
     * property option and the value of the property converted using the rules
     * from the `converter` property option.
     */
    readonly reflect?: boolean;
    /**
     * A function that indicates if a property should be considered changed when
     * it is set. The function should take the `newValue` and `oldValue` and
     * return `true` if an update should be requested.
     */
    hasChanged?(value: Type, oldValue: Type): boolean;
    /**
     * Indicates whether an accessor will be created for this property. By
     * default, an accessor will be generated for this property that requests an
     * update when set. If this flag is `true`, no accessor will be created, and
     * it will be the user's responsibility to call
     * `this.requestUpdate(propertyName, oldValue)` to request an update when
     * the property changes.
     */
    readonly noAccessor?: boolean;
}
/**
 * Map of properties to PropertyDeclaration options. For each property an
 * accessor is made, and the property is processed according to the
 * PropertyDeclaration options.
 */
interface PropertyDeclarations {
    readonly [key: string]: PropertyDeclaration;
}
type PropertyDeclarationMap = Map<PropertyKey, PropertyDeclaration>;
/**
 * A Map of property keys to values.
 *
 * Takes an optional type parameter T, which when specified as a non-any,
 * non-unknown type, will make the Map more strongly-typed, associating the map
 * keys with their corresponding value type on T.
 *
 * Use `PropertyValues<this>` when overriding ReactiveElement.update() and
 * other lifecycle methods in order to get stronger type-checking on keys
 * and values.
 */
type PropertyValues<T = any> = T extends object ? PropertyValueMap<T> : Map<PropertyKey, unknown>;
/**
 * Do not use, instead prefer {@linkcode PropertyValues}.
 */
interface PropertyValueMap<T> extends Map<PropertyKey, unknown> {
    get<K extends keyof T>(k: K): T[K] | undefined;
    set<K extends keyof T>(key: K, value: T[K]): this;
    has<K extends keyof T>(k: K): boolean;
    delete<K extends keyof T>(k: K): boolean;
}
declare const defaultConverter: ComplexAttributeConverter;
interface HasChanged {
    (value: unknown, old: unknown): boolean;
}
/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */
declare const notEqual: HasChanged;
/**
 * A string representing one of the supported dev mode warning categories.
 */
type WarningKind = 'change-in-update' | 'migration' | 'async-perform-update';
type Initializer = (element: ReactiveElement) => void;
declare global {
    interface SymbolConstructor {
        readonly metadata: unique symbol;
    }
}
declare global {
    var litPropertyMetadata: WeakMap<object, Map<PropertyKey, PropertyDeclaration>>;
}
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclasses to render updates as desired.
 * @noInheritDoc
 */
declare abstract class ReactiveElement extends HTMLElement implements ReactiveControllerHost {
    /**
     * Read or set all the enabled warning categories for this class.
     *
     * This property is only used in development builds.
     *
     * @nocollapse
     * @category dev-mode
     */
    static enabledWarnings?: WarningKind[];
    /**
     * Enable the given warning category for this class.
     *
     * This method only exists in development builds, so it should be accessed
     * with a guard like:
     *
     * ```ts
     * // Enable for all ReactiveElement subclasses
     * ReactiveElement.enableWarning?.('migration');
     *
     * // Enable for only MyElement and subclasses
     * MyElement.enableWarning?.('migration');
     * ```
     *
     * @nocollapse
     * @category dev-mode
     */
    static enableWarning?: (warningKind: WarningKind) => void;
    /**
     * Disable the given warning category for this class.
     *
     * This method only exists in development builds, so it should be accessed
     * with a guard like:
     *
     * ```ts
     * // Disable for all ReactiveElement subclasses
     * ReactiveElement.disableWarning?.('migration');
     *
     * // Disable for only MyElement and subclasses
     * MyElement.disableWarning?.('migration');
     * ```
     *
     * @nocollapse
     * @category dev-mode
     */
    static disableWarning?: (warningKind: WarningKind) => void;
    /**
     * Adds an initializer function to the class that is called during instance
     * construction.
     *
     * This is useful for code that runs against a `ReactiveElement`
     * subclass, such as a decorator, that needs to do work for each
     * instance, such as setting up a `ReactiveController`.
     *
     * ```ts
     * const myDecorator = (target: typeof ReactiveElement, key: string) => {
     *   target.addInitializer((instance: ReactiveElement) => {
     *     // This is run during construction of the element
     *     new MyController(instance);
     *   });
     * }
     * ```
     *
     * Decorating a field will then cause each instance to run an initializer
     * that adds a controller:
     *
     * ```ts
     * class MyElement extends LitElement {
     *   @myDecorator foo;
     * }
     * ```
     *
     * Initializers are stored per-constructor. Adding an initializer to a
     * subclass does not add it to a superclass. Since initializers are run in
     * constructors, initializers will run in order of the class hierarchy,
     * starting with superclasses and progressing to the instance's class.
     *
     * @nocollapse
     */
    static addInitializer(initializer: Initializer): void;
    static _initializers?: Initializer[];
    /**
     * Maps attribute names to properties; for example `foobar` attribute to
     * `fooBar` property. Created lazily on user subclasses when finalizing the
     * class.
     * @nocollapse
     */
    private static __attributeToPropertyMap;
    /**
     * Marks class as having been finalized, which includes creating properties
     * from `static properties`, but does *not* include all properties created
     * from decorators.
     * @nocollapse
     */
    protected static finalized: true | undefined;
    /**
     * Memoized list of all element properties, including any superclass
     * properties. Created lazily on user subclasses when finalizing the class.
     *
     * @nocollapse
     * @category properties
     */
    static elementProperties: PropertyDeclarationMap;
    /**
     * User-supplied object that maps property names to `PropertyDeclaration`
     * objects containing options for configuring reactive properties. When
     * a reactive property is set the element will update and render.
     *
     * By default properties are public fields, and as such, they should be
     * considered as primarily settable by element users, either via attribute or
     * the property itself.
     *
     * Generally, properties that are changed by the element should be private or
     * protected fields and should use the `state: true` option. Properties
     * marked as `state` do not reflect from the corresponding attribute
     *
     * However, sometimes element code does need to set a public property. This
     * should typically only be done in response to user interaction, and an event
     * should be fired informing the user; for example, a checkbox sets its
     * `checked` property when clicked and fires a `changed` event. Mutating
     * public properties should typically not be done for non-primitive (object or
     * array) properties. In other cases when an element needs to manage state, a
     * private property set with the `state: true` option should be used. When
     * needed, state properties can be initialized via public properties to
     * facilitate complex interactions.
     * @nocollapse
     * @category properties
     */
    static properties: PropertyDeclarations;
    /**
     * Memoized list of all element styles.
     * Created lazily on user subclasses when finalizing the class.
     * @nocollapse
     * @category styles
     */
    static elementStyles: Array<CSSResultOrNative>;
    /**
     * Array of styles to apply to the element. The styles should be defined
     * using the {@linkcode css} tag function, via constructible stylesheets, or
     * imported from native CSS module scripts.
     *
     * Note on Content Security Policy:
     *
     * Element styles are implemented with `<style>` tags when the browser doesn't
     * support adopted StyleSheets. To use such `<style>` tags with the style-src
     * CSP directive, the style-src value must either include 'unsafe-inline' or
     * `nonce-<base64-value>` with `<base64-value>` replaced be a server-generated
     * nonce.
     *
     * To provide a nonce to use on generated `<style>` elements, set
     * `window.litNonce` to a server-generated nonce in your page's HTML, before
     * loading application code:
     *
     * ```html
     * <script>
     *   // Generated and unique per request:
     *   window.litNonce = 'a1b2c3d4';
     * </script>
     * ```
     * @nocollapse
     * @category styles
     */
    static styles?: CSSResultGroup;
    /**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     * @category attributes
     */
    static get observedAttributes(): string[];
    private __instanceProperties?;
    /**
     * Creates a property accessor on the element prototype if one does not exist
     * and stores a {@linkcode PropertyDeclaration} for the property with the
     * given options. The property setter calls the property's `hasChanged`
     * property option or uses a strict identity check to determine whether or not
     * to request an update.
     *
     * This method may be overridden to customize properties; however,
     * when doing so, it's important to call `super.createProperty` to ensure
     * the property is setup correctly. This method calls
     * `getPropertyDescriptor` internally to get a descriptor to install.
     * To customize what properties do when they are get or set, override
     * `getPropertyDescriptor`. To customize the options for a property,
     * implement `createProperty` like this:
     *
     * ```ts
     * static createProperty(name, options) {
     *   options = Object.assign(options, {myOption: true});
     *   super.createProperty(name, options);
     * }
     * ```
     *
     * @nocollapse
     * @category properties
     */
    static createProperty(name: PropertyKey, options?: PropertyDeclaration): void;
    /**
     * Returns a property descriptor to be defined on the given named property.
     * If no descriptor is returned, the property will not become an accessor.
     * For example,
     *
     * ```ts
     * class MyElement extends LitElement {
     *   static getPropertyDescriptor(name, key, options) {
     *     const defaultDescriptor =
     *         super.getPropertyDescriptor(name, key, options);
     *     const setter = defaultDescriptor.set;
     *     return {
     *       get: defaultDescriptor.get,
     *       set(value) {
     *         setter.call(this, value);
     *         // custom action.
     *       },
     *       configurable: true,
     *       enumerable: true
     *     }
     *   }
     * }
     * ```
     *
     * @nocollapse
     * @category properties
     */
    protected static getPropertyDescriptor(name: PropertyKey, key: string | symbol, options: PropertyDeclaration): PropertyDescriptor | undefined;
    /**
     * Returns the property options associated with the given property.
     * These options are defined with a `PropertyDeclaration` via the `properties`
     * object or the `@property` decorator and are registered in
     * `createProperty(...)`.
     *
     * Note, this method should be considered "final" and not overridden. To
     * customize the options for a given property, override
     * {@linkcode createProperty}.
     *
     * @nocollapse
     * @final
     * @category properties
     */
    static getPropertyOptions(name: PropertyKey): PropertyDeclaration<unknown, unknown>;
    static [Symbol.metadata]: object & Record<PropertyKey, unknown>;
    /**
     * Initializes static own properties of the class used in bookkeeping
     * for element properties, initializers, etc.
     *
     * Can be called multiple times by code that needs to ensure these
     * properties exist before using them.
     *
     * This method ensures the superclass is finalized so that inherited
     * property metadata can be copied down.
     * @nocollapse
     */
    private static __prepare;
    /**
     * Finishes setting up the class so that it's ready to be registered
     * as a custom element and instantiated.
     *
     * This method is called by the ReactiveElement.observedAttributes getter.
     * If you override the observedAttributes getter, you must either call
     * super.observedAttributes to trigger finalization, or call finalize()
     * yourself.
     *
     * @nocollapse
     */
    protected static finalize(): void;
    /**
     * Options used when calling `attachShadow`. Set this property to customize
     * the options for the shadowRoot; for example, to create a closed
     * shadowRoot: `{mode: 'closed'}`.
     *
     * Note, these options are used in `createRenderRoot`. If this method
     * is customized, options should be respected if possible.
     * @nocollapse
     * @category rendering
     */
    static shadowRootOptions: ShadowRootInit;
    /**
     * Takes the styles the user supplied via the `static styles` property and
     * returns the array of styles to apply to the element.
     * Override this method to integrate into a style management system.
     *
     * Styles are deduplicated preserving the _last_ instance in the list. This
     * is a performance optimization to avoid duplicated styles that can occur
     * especially when composing via subclassing. The last item is kept to try
     * to preserve the cascade order with the assumption that it's most important
     * that last added styles override previous styles.
     *
     * @nocollapse
     * @category styles
     */
    protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative>;
    /**
     * Node or ShadowRoot into which element DOM should be rendered. Defaults
     * to an open shadowRoot.
     * @category rendering
     */
    readonly renderRoot: HTMLElement | DocumentFragment;
    /**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */
    private static __attributeNameForProperty;
    private __updatePromise;
    /**
     * True if there is a pending update as a result of calling `requestUpdate()`.
     * Should only be read.
     * @category updates
     */
    isUpdatePending: boolean;
    /**
     * Is set to `true` after the first update. The element code cannot assume
     * that `renderRoot` exists before the element `hasUpdated`.
     * @category updates
     */
    hasUpdated: boolean;
    /**
     * Properties that should be reflected when updated.
     */
    private __reflectingProperties?;
    /**
     * Name of currently reflecting property
     */
    private __reflectingProperty;
    /**
     * Set of controllers.
     */
    private __controllers?;
    constructor();
    /**
     * Internal only override point for customizing work done when elements
     * are constructed.
     */
    private __initialize;
    /**
     * Registers a `ReactiveController` to participate in the element's reactive
     * update cycle. The element automatically calls into any registered
     * controllers during its lifecycle callbacks.
     *
     * If the element is connected when `addController()` is called, the
     * controller's `hostConnected()` callback will be immediately called.
     * @category controllers
     */
    addController(controller: ReactiveController): void;
    /**
     * Removes a `ReactiveController` from the element.
     * @category controllers
     */
    removeController(controller: ReactiveController): void;
    /**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */
    private __saveInstanceProperties;
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     *
     * @return Returns a node into which to render.
     * @category rendering
     */
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    /**
     * On first connection, creates the element's renderRoot, sets up
     * element styling, and enables updating.
     * @category lifecycle
     */
    connectedCallback(): void;
    /**
     * Note, this method should be considered final and not overridden. It is
     * overridden on the element instance with a function that triggers the first
     * update.
     * @category updates
     */
    protected enableUpdating(_requestedUpdate: boolean): void;
    /**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     * @category lifecycle
     */
    disconnectedCallback(): void;
    /**
     * Synchronizes property values when attributes change.
     *
     * Specifically, when an attribute is set, the corresponding property is set.
     * You should rarely need to implement this callback. If this method is
     * overridden, `super.attributeChangedCallback(name, _old, value)` must be
     * called.
     *
     * See [using the lifecycle callbacks](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks)
     * on MDN for more information about the `attributeChangedCallback`.
     * @category attributes
     */
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
    private __propertyToAttribute;
    /**
     * Requests an update which is processed asynchronously. This should be called
     * when an element should update based on some state not triggered by setting
     * a reactive property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored.
     *
     * @param name name of requesting property
     * @param oldValue old value of requesting property
     * @param options property options to use instead of the previously
     *     configured options
     * @param initial whether this call is for the initial value of the property.
     *     Initial values do not reflect to an attribute.
     * @category updates
     */
    requestUpdate(name?: PropertyKey, oldValue?: unknown, options?: PropertyDeclaration): void;
    /**
     * Sets up the element to asynchronously update.
     */
    private __enqueueUpdate;
    /**
     * Schedules an element update. You can override this method to change the
     * timing of updates by returning a Promise. The update will await the
     * returned Promise, and you should resolve the Promise to allow the update
     * to proceed. If this method is overridden, `super.scheduleUpdate()`
     * must be called.
     *
     * For instance, to schedule updates to occur just before the next frame:
     *
     * ```ts
     * override protected async scheduleUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.scheduleUpdate();
     * }
     * ```
     * @category updates
     */
    protected scheduleUpdate(): void | Promise<unknown>;
    /**
     * Performs an element update. Note, if an exception is thrown during the
     * update, `firstUpdated` and `updated` will not be called.
     *
     * Call `performUpdate()` to immediately process a pending update. This should
     * generally not be needed, but it can be done in rare cases when you need to
     * update synchronously.
     *
     * @category updates
     */
    protected performUpdate(): void;
    /**
     * Invoked before `update()` to compute values needed during the update.
     *
     * Implement `willUpdate` to compute property values that depend on other
     * properties and are used in the rest of the update process.
     *
     * ```ts
     * willUpdate(changedProperties) {
     *   // only need to check changed properties for an expensive computation.
     *   if (changedProperties.has('firstName') || changedProperties.has('lastName')) {
     *     this.sha = computeSHA(`${this.firstName} ${this.lastName}`);
     *   }
     * }
     *
     * render() {
     *   return html`SHA: ${this.sha}`;
     * }
     * ```
     *
     * @category updates
     */
    protected willUpdate(_changedProperties: PropertyValues): void;
    private __markUpdated;
    /**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * To await additional asynchronous work, override the `getUpdateComplete`
     * method. For example, it is sometimes useful to await a rendered element
     * before fulfilling this Promise. To do this, first await
     * `super.getUpdateComplete()`, then any subsequent state.
     *
     * @return A promise of a boolean that resolves to true if the update completed
     *     without triggering another update.
     * @category updates
     */
    get updateComplete(): Promise<boolean>;
    /**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     * ```ts
     * class MyElement extends LitElement {
     *   override async getUpdateComplete() {
     *     const result = await super.getUpdateComplete();
     *     await this._myChild.updateComplete;
     *     return result;
     *   }
     * }
     * ```
     *
     * @return A promise of a boolean that resolves to true if the update completed
     *     without triggering another update.
     * @category updates
     */
    protected getUpdateComplete(): Promise<boolean>;
    /**
     * Controls whether or not `update()` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * @param _changedProperties Map of changed properties with old values
     * @category updates
     */
    protected shouldUpdate(_changedProperties: PropertyValues): boolean;
    /**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * @param _changedProperties Map of changed properties with old values
     * @category updates
     */
    protected update(_changedProperties: PropertyValues): void;
    /**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     * @category updates
     */
    protected updated(_changedProperties: PropertyValues): void;
    /**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * ```ts
     * firstUpdated() {
     *   this.renderRoot.getElementById('my-text-area').focus();
     * }
     * ```
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     * @category updates
     */
    protected firstUpdated(_changedProperties: PropertyValues): void;
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

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
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Contains types that are part of the unstable debug API.
 *
 * Everything in this API is not stable and may change or be removed in the future,
 * even on patch releases.
 */
declare namespace LitUnstable {
    /**
     * When Lit is running in dev mode and `window.emitLitDebugLogEvents` is true,
     * we will emit 'lit-debug' events to window, with live details about the update and render
     * lifecycle. These can be useful for writing debug tooling and visualizations.
     *
     * Please be aware that running with window.emitLitDebugLogEvents has performance overhead,
     * making certain operations that are normally very cheap (like a no-op render) much slower,
     * because we must copy data and dispatch events.
     */
    namespace DebugLog {
        type Entry = TemplatePrep | TemplateInstantiated | TemplateInstantiatedAndUpdated | TemplateUpdating | BeginRender | EndRender | CommitPartEntry | SetPartValue;
        interface TemplatePrep {
            kind: 'template prep';
            template: Template;
            strings: TemplateStringsArray;
            clonableTemplate: HTMLTemplateElement;
            parts: TemplatePart[];
        }
        interface BeginRender {
            kind: 'begin render';
            id: number;
            value: unknown;
            container: HTMLElement | DocumentFragment;
            options: RenderOptions | undefined;
            part: ChildPart | undefined;
        }
        interface EndRender {
            kind: 'end render';
            id: number;
            value: unknown;
            container: HTMLElement | DocumentFragment;
            options: RenderOptions | undefined;
            part: ChildPart;
        }
        interface TemplateInstantiated {
            kind: 'template instantiated';
            template: Template | CompiledTemplate;
            instance: TemplateInstance;
            options: RenderOptions | undefined;
            fragment: Node;
            parts: Array<Part | undefined>;
            values: unknown[];
        }
        interface TemplateInstantiatedAndUpdated {
            kind: 'template instantiated and updated';
            template: Template | CompiledTemplate;
            instance: TemplateInstance;
            options: RenderOptions | undefined;
            fragment: Node;
            parts: Array<Part | undefined>;
            values: unknown[];
        }
        interface TemplateUpdating {
            kind: 'template updating';
            template: Template | CompiledTemplate;
            instance: TemplateInstance;
            options: RenderOptions | undefined;
            parts: Array<Part | undefined>;
            values: unknown[];
        }
        interface SetPartValue {
            kind: 'set part';
            part: Part;
            value: unknown;
            valueIndex: number;
            values: unknown[];
            templateInstance: TemplateInstance;
        }
        type CommitPartEntry = CommitNothingToChildEntry | CommitText | CommitNode | CommitAttribute | CommitProperty | CommitBooleanAttribute | CommitEventListener | CommitToElementBinding;
        interface CommitNothingToChildEntry {
            kind: 'commit nothing to child';
            start: ChildNode;
            end: ChildNode | null;
            parent: Disconnectable | undefined;
            options: RenderOptions | undefined;
        }
        interface CommitText {
            kind: 'commit text';
            node: Text;
            value: unknown;
            options: RenderOptions | undefined;
        }
        interface CommitNode {
            kind: 'commit node';
            start: Node;
            parent: Disconnectable | undefined;
            value: Node;
            options: RenderOptions | undefined;
        }
        interface CommitAttribute {
            kind: 'commit attribute';
            element: Element;
            name: string;
            value: unknown;
            options: RenderOptions | undefined;
        }
        interface CommitProperty {
            kind: 'commit property';
            element: Element;
            name: string;
            value: unknown;
            options: RenderOptions | undefined;
        }
        interface CommitBooleanAttribute {
            kind: 'commit boolean attribute';
            element: Element;
            name: string;
            value: boolean;
            options: RenderOptions | undefined;
        }
        interface CommitEventListener {
            kind: 'commit event listener';
            element: Element;
            name: string;
            value: unknown;
            oldListener: unknown;
            options: RenderOptions | undefined;
            removeListener: boolean;
            addListener: boolean;
        }
        interface CommitToElementBinding {
            kind: 'commit to element binding';
            element: Element;
            value: unknown;
            options: RenderOptions | undefined;
        }
    }
}
/**
 * Used to sanitize any value before it is written into the DOM. This can be
 * used to implement a security policy of allowed and disallowed values in
 * order to prevent XSS attacks.
 *
 * One way of using this callback would be to check attributes and properties
 * against a list of high risk fields, and require that values written to such
 * fields be instances of a class which is safe by construction. Closure's Safe
 * HTML Types is one implementation of this technique (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * The TrustedTypes polyfill in API-only mode could also be used as a basis
 * for this technique (https://github.com/WICG/trusted-types).
 *
 * @param node The HTML node (usually either a #text node or an Element) that
 *     is being written to. Note that this is just an exemplar node, the write
 *     may take place against another instance of the same class of node.
 * @param name The name of an attribute or property (for example, 'href').
 * @param type Indicates whether the write that's about to be performed will
 *     be to a property or a node.
 * @return A function that will sanitize this class of writes.
 */
type SanitizerFactory = (node: Node, name: string, type: 'property' | 'attribute') => ValueSanitizer;
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
type HTMLTemplateResult = TemplateResult<typeof HTML_RESULT>;
type SVGTemplateResult = TemplateResult<typeof SVG_RESULT>;
interface CompiledTemplateResult {
    ['_$litType$']: CompiledTemplate;
    values: unknown[];
}
interface CompiledTemplate extends Omit<Template, 'el'> {
    el?: HTMLTemplateElement;
    h: TemplateStringsArray;
}
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * The `html` tag returns a description of the DOM to render as a value. It is
 * lazy, meaning no work is done until the template is rendered. When rendering,
 * if a template comes from the same expression as a previously rendered result,
 * it's efficiently updated instead of replaced.
 */
declare const html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult<1>;
/**
 * Interprets a template literal as an SVG fragment that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const rect = svg`<rect width="10" height="10"></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * The `svg` *tag function* should only be used for SVG fragments, or elements
 * that would be contained **inside** an `<svg>` HTML element. A common error is
 * placing an `<svg>` *element* in a template tagged with the `svg` tag
 * function. The `<svg>` element is an HTML element and should be used within a
 * template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an SVG fragment from the
 * `render()` method, as the SVG fragment will be contained within the element's
 * shadow root and thus cannot be used within an `<svg>` HTML element.
 */
declare const svg: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult<2>;
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
declare function resolveDirective(part: ChildPart | AttributePart | ElementPart, value: unknown, parent?: DirectiveParent, attributeIndex?: number): unknown;

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
/**
 * A top-level `ChildPart` returned from `render` that manages the connected
 * state of `AsyncDirective`s created throughout the tree below it.
 */
interface RootPart extends ChildPart {
    /**
     * Sets the connection state for `AsyncDirective`s contained within this root
     * ChildPart.
     *
     * lit-html does not automatically monitor the connectedness of DOM rendered;
     * as such, it is the responsibility of the caller to `render` to ensure that
     * `part.setConnected(false)` is called before the part object is potentially
     * discarded, to ensure that `AsyncDirective`s have a chance to dispose of
     * any resources being held. If a `RootPart` that was previously
     * disconnected is subsequently re-connected (and its `AsyncDirective`s should
     * re-connect), `setConnected(true)` should be called.
     *
     * @param isConnected Whether directives within this tree should be connected
     * or not
     */
    setConnected(isConnected: boolean): void;
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
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports  mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
declare const _$LH: {
    _boundAttributeSuffix: string;
    _marker: string;
    _markerMatch: string;
    _HTML_RESULT: number;
    _getTemplateHtml: (strings: TemplateStringsArray, type: ResultType) => [TrustedHTML, Array<string>];
    _TemplateInstance: typeof TemplateInstance;
    _isIterable: (value: unknown) => value is Iterable<unknown>;
    _resolveDirective: typeof resolveDirective;
    _ChildPart: typeof ChildPart;
    _AttributePart: typeof AttributePart;
    _BooleanAttributePart: typeof BooleanAttributePart;
    _EventPart: typeof EventPart;
    _PropertyPart: typeof PropertyPart;
    _ElementPart: typeof ElementPart;
};
/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 *
 * This example renders the text "Hello, Zoe!" inside a paragraph tag, appending
 * it to the container `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = "Zoe";
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Any [renderable
 *   value](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   typically a {@linkcode TemplateResult} created by evaluating a template tag
 *   like {@linkcode html} or {@linkcode svg}.
 * @param container A DOM container to render to. The first render will append
 *   the rendered value to the container, and subsequent renders will
 *   efficiently update the rendered value if the same result type was
 *   previously rendered there.
 * @param options See {@linkcode RenderOptions} for options documentation.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
 */
declare const render: {
    (value: unknown, container: HTMLElement | DocumentFragment, options?: RenderOptions): RootPart;
    setSanitizer: (newSanitizer: SanitizerFactory) => void;
    createSanitizer: SanitizerFactory;
    _testOnlyClearSanitizerFactoryDoNotCallOrElse: () => void;
};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Contains types that are part of the unstable debug API.
 *
 * Everything in this API is not stable and may change or be removed in the future,
 * even on patch releases.
 */
declare namespace Unstable {
    /**
     * When Lit is running in dev mode and `window.emitLitDebugLogEvents` is true,
     * we will emit 'lit-debug' events to window, with live details about the update and render
     * lifecycle. These can be useful for writing debug tooling and visualizations.
     *
     * Please be aware that running with window.emitLitDebugLogEvents has performance overhead,
     * making certain operations that are normally very cheap (like a no-op render) much slower,
     * because we must copy data and dispatch events.
     */
    namespace DebugLog {
        type Entry = LitUnstable.DebugLog.Entry | ReactiveUnstable.DebugLog.Entry;
    }
}
/**
 * Base element class that manages element properties and attributes, and
 * renders a lit-html template.
 *
 * To define a component, subclass `LitElement` and implement a
 * `render` method to provide the component's template. Define properties
 * using the {@linkcode LitElement.properties properties} property or the
 * {@linkcode property} decorator.
 */
declare class LitElement extends ReactiveElement {
    static ['_$litElement$']: boolean;
    /**
     * @category rendering
     */
    readonly renderOptions: RenderOptions;
    private __childPart;
    /**
     * @category rendering
     */
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * @param changedProperties Map of changed properties with old values
     * @category updates
     */
    protected update(changedProperties: PropertyValues): void;
    /**
     * Invoked when the component is added to the document's DOM.
     *
     * In `connectedCallback()` you should setup tasks that should only occur when
     * the element is connected to the document. The most common of these is
     * adding event listeners to nodes external to the element, like a keydown
     * event handler added to the window.
     *
     * ```ts
     * connectedCallback() {
     *   super.connectedCallback();
     *   addEventListener('keydown', this._handleKeydown);
     * }
     * ```
     *
     * Typically, anything done in `connectedCallback()` should be undone when the
     * element is disconnected, in `disconnectedCallback()`.
     *
     * @category lifecycle
     */
    connectedCallback(): void;
    /**
     * Invoked when the component is removed from the document's DOM.
     *
     * This callback is the main signal to the element that it may no longer be
     * used. `disconnectedCallback()` should ensure that nothing is holding a
     * reference to the element (such as event listeners added to nodes external
     * to the element), so that it is free to be garbage collected.
     *
     * ```ts
     * disconnectedCallback() {
     *   super.disconnectedCallback();
     *   window.removeEventListener('keydown', this._handleKeydown);
     * }
     * ```
     *
     * An element may be re-connected after being disconnected.
     *
     * @category lifecycle
     */
    disconnectedCallback(): void;
    /**
     * Invoked on each update to perform rendering tasks. This method may return
     * any value renderable by lit-html's `ChildPart` - typically a
     * `TemplateResult`. Setting properties inside this method will *not* trigger
     * the element to update.
     * @category rendering
     */
    protected render(): unknown;
}
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports  mangled in the
 * client side code, we export a _$LE object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-html, since this module re-exports all of lit-html.
 *
 * @private
 */
declare const _$LE: {
    _$attributeToProperty: (el: LitElement, name: string, value: string | null) => void;
    _$changedProperties: (el: LitElement) => any;
};

/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * A boolean that will be `true` in server environments like Node, and `false`
 * in browser environments. Note that your server environment or toolchain must
 * support the `"node"` export condition for this to be `true`.
 *
 * This can be used when authoring components to change behavior based on
 * whether or not the component is executing in an SSR context.
 */
declare const isServer = false;

export { AttributePart, BooleanAttributePart, CSSResult, CSSResultArray, CSSResultGroup, CSSResultOrNative, ChildPart, CompiledTemplate, CompiledTemplateResult, ComplexAttributeConverter, DirectiveParent, Disconnectable, ElementPart, EventPart, HTMLTemplateResult, HasChanged, Initializer, LitElement, LitUnstable, Part, PropertyDeclaration, PropertyDeclarations, PropertyPart, PropertyValueMap, PropertyValues, ReactiveController, ReactiveControllerHost, ReactiveElement, ReactiveUnstable, RenderOptions, RootPart, SVGTemplateResult, SanitizerFactory, TemplateInstance, TemplateResult, Unstable, ValueSanitizer, WarningKind, _$LE, _$LH, adoptStyles, css, defaultConverter, getCompatibleStyle, html, isServer, noChange, notEqual, nothing, render, supportsAdoptingStyleSheets, svg, unsafeCSS };
