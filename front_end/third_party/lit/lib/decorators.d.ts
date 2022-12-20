/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

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
declare type AttributeConverter<Type = unknown, TypeHint = unknown> = ComplexAttributeConverter<Type> | ((value: string | null, type?: TypeHint) => Type);
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
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

declare type Constructor<T> = {
    new (...args: any[]): T;
};
interface ClassDescriptor {
    kind: 'class';
    elements: ClassElement[];
    finisher?: <T>(clazz: Constructor<T>) => void | Constructor<T>;
}
interface ClassElement {
    kind: 'field' | 'method';
    key: PropertyKey;
    placement: 'static' | 'prototype' | 'own';
    initializer?: Function;
    extras?: ClassElement[];
    finisher?: <T>(clazz: Constructor<T>) => void | Constructor<T>;
    descriptor?: PropertyDescriptor;
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
interface InternalPropertyDeclaration<Type = unknown> {
    /**
     * A function that indicates if a property should be considered changed when
     * it is set. The function should take the `newValue` and `oldValue` and
     * return `true` if an update should be requested.
     */
    hasChanged?(value: Type, oldValue: Type): boolean;
}
/**
 * Declares a private or protected reactive property that still triggers
 * updates to the element when it changes. It does not reflect from the
 * corresponding attribute.
 *
 * Properties declared this way must not be used from HTML or HTML templating
 * systems, they're solely for properties internal to the element. These
 * properties may be renamed by optimization tools like closure compiler.
 * @category Decorator
 */
declare function state(options?: InternalPropertyDeclaration): (protoOrDescriptor: Object | ClassElement, name?: PropertyKey | undefined) => any;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * A property decorator which creates a reactive property that reflects a
 * corresponding attribute value. When a decorated property is set
 * the element will update and render. A {@linkcode PropertyDeclaration} may
 * optionally be supplied to configure property features.
 *
 * This decorator should only be used for public fields. As public fields,
 * properties should be considered as primarily settable by element users,
 * either via attribute or the property itself.
 *
 * Generally, properties that are changed by the element should be private or
 * protected fields and should use the {@linkcode state} decorator.
 *
 * However, sometimes element code does need to set a public property. This
 * should typically only be done in response to user interaction, and an event
 * should be fired informing the user; for example, a checkbox sets its
 * `checked` property when clicked and fires a `changed` event. Mutating public
 * properties should typically not be done for non-primitive (object or array)
 * properties. In other cases when an element needs to manage state, a private
 * property decorated via the {@linkcode state} decorator should be used. When
 * needed, state properties can be initialized via public properties to
 * facilitate complex interactions.
 *
 * ```ts
 * class MyElement {
 *   @property({ type: Boolean })
 *   clicked = false;
 * }
 * ```
 * @category Decorator
 * @ExportDecoratedItems
 */
declare function property(options?: PropertyDeclaration): (protoOrDescriptor: Object | ClassElement, name?: PropertyKey) => any;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Allow for custom element classes with private constructors
 */
declare type CustomElementClass = Omit<typeof HTMLElement, 'new'>;
/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * ```js
 * @customElement('my-element')
 * class MyElement extends LitElement {
 *   render() {
 *     return html``;
 *   }
 * }
 * ```
 * @category Decorator
 * @param tagName The tag name of the custom element to define.
 */
declare const customElement: (tagName: string) => (classOrDescriptor: CustomElementClass | ClassDescriptor) => any;

export { InternalPropertyDeclaration, customElement, property, state };
