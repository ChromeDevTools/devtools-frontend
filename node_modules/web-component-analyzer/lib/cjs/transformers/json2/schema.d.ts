/**
 * This file comes from the following PR with a proposed JSON schema:
 * https://github.com/webcomponents/custom-elements-json/pull/9
 */
/**
 * The top-level interface of a custom-elements.json file.
 *
 * custom-elements.json documents all the elements in a single npm package,
 * across all modules within the package. Elements may be exported from multiple
 * modules with re-exports, but as a rule, elements in this file should be
 * included once in the "canonical" module that they're exported from.
 */
export interface PackageDoc {
    version: string;
    /**
     * An array of the modules this package contains.
     */
    modules: Array<ModuleDoc>;
}
export interface ModuleDoc {
    path: string;
    /**
     * A markdown summary suitable for display in a listing.
     */
    summary?: string;
    /**
     * A markdown description of the module.
     */
    description?: string;
    exports?: Array<ExportDoc>;
}
export type ExportDoc = ClassDoc | FunctionDoc | VariableDoc | CustomElementDefinitionDoc;
/**
 * A reference to an export of a module.
 *
 * All references are required to be publically accessible, so the canonical
 * representation of a refernce it the export it's available from.
 */
export interface Reference {
    name: string;
    package?: string;
    module?: string;
}
export interface CustomElementDoc extends ClassDoc {
    tagName: string;
    /**
     * The attributes that this element is known to understand.
     */
    attributes?: AttributeDoc[];
    /** The events that this element fires. */
    events?: EventDoc[];
    /**
     * The shadow dom content slots that this element accepts.
     */
    slots?: SlotDoc[];
    cssProperties?: CSSPropertyDoc[];
    cssParts?: CSSPartDoc[];
    demos?: Demo[];
}
export interface CustomElementDefinitionDoc {
    kind: "definition";
    name: string;
    declaration: Reference;
}
export interface AttributeDoc {
    name: string;
    /**
     * A markdown description for the attribute.
     */
    description?: string;
    /**
     * The type that the attribute will be serialized/deserialized as.
     */
    type?: string;
    /**
     * The default value of the attribute, if any.
     *
     * As attributes are always strings, this is the actual value, not a human
     * readable description.
     */
    defaultValue?: string;
    /**
     * The name of the field this attribute is associated with, if any.
     */
    fieldName?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface EventDoc {
    name: string;
    /**
     * A markdown description of the event.
     */
    description?: string;
    /**
     * The type of the event object that's fired.
     *
     * If the event type is built-in, this is a string, e.g. `Event`,
     * `CustomEvent`, `KeyboardEvent`. If the event type is an event class defined
     * in a module, the reference to it.
     */
    type?: Reference | string;
    /**
     * If the event is a CustomEvent, the type of `detail` field.
     */
    detailType?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface SlotDoc {
    /**
     * The slot name, or the empty string for an unnamed slot.
     */
    name: string;
    /**
     * A markdown description of the slot.
     */
    description?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface CSSPropertyDoc {
    name: string;
    description?: string;
    type?: string;
    default?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface CSSPartDoc {
    name: string;
    description?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface ClassDoc {
    kind: "class";
    /**
     * The class name, or `undefined` if the class is anonymous.
     */
    name?: string;
    /**
     * A markdown summary suitable for display in a listing.
     * TODO: restrictions on markdown/markup. ie, no headings, only inline
     *       formatting?
     */
    summary?: string;
    /**
     * A markdown description of the class.
     */
    description?: string;
    superclass?: Reference;
    mixins?: Array<Reference>;
    members?: Array<ClassMember>;
}
export type ClassMember = FieldDoc | MethodDoc;
export interface FieldDoc {
    kind: "field";
    name: string;
    static?: boolean;
    /**
     * A markdown summary suitable for display in a listing.
     * TODO: restrictions on markdown/markup. ie, no headings, only inline
     *       formatting?
     */
    summary?: string;
    /**
     * A markdown description of the field.
     */
    description?: string;
    default?: string;
    privacy?: Privacy;
    type?: string;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
export interface MethodDoc extends FunctionLike {
    kind: "method";
    static?: boolean;
    /**
     * A reference to the class or mixin that declared this property.
     */
    inheritedFrom?: Reference;
}
/**
 * TODO: tighter definition of mixin:
 *  - Should it only accept a single argument?
 *  - Should it not extend ClassDoc so it doesn't has a superclass?
 *  - What's TypeScript's exact definition?
 */
export interface MixinDoc extends ClassDoc {
}
export interface VariableDoc {
    kind: "variable";
    name: string;
    /**
     * A markdown summary suitable for display in a listing.
     */
    summary?: string;
    /**
     * A markdown description of the class.
     */
    description?: string;
    type?: string;
}
export interface FunctionDoc extends FunctionLike {
    kind: "function";
}
export interface Parameter {
    name: string;
    type?: string;
    description?: string;
}
export interface FunctionLike {
    name: string;
    /**
     * A markdown summary suitable for display in a listing.
     */
    summary?: string;
    /**
     * A markdown description of the class.
     */
    description?: string;
    parameters?: Array<Parameter>;
    return?: {
        type?: string;
        description?: string;
    };
    privacy?: Privacy;
    type?: string;
}
export type Privacy = "public" | "private" | "protected";
export interface Demo {
    /**
     * A markdown description of the demo.
     */
    description?: string;
    /**
     * Relative URL of the demo if it's published with the package. Absolute URL
     * if it's hosted.
     */
    url: string;
}
//# sourceMappingURL=schema.d.ts.map