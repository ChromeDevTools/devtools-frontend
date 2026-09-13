/**
 * @fileoverview Based on https://www.w3.org/TR/SVG11/intro.html#Definitions.
 */
/**
 * @type {Readonly<Record<string, Set<string>>>}
 */
export declare const elemsGroups: Readonly<Record<string, Set<string>>>;
/**
 * Elements where adding or removing whitespace may affect rendering, metadata,
 * or semantic meaning.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre
 * @type {Readonly<Set<string>>}
 */
export declare const textElems: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 */
export declare const pathElems: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, Set<string>>>}
 * @see https://www.w3.org/TR/SVG11/intro.html#Definitions
 */
export declare const attrsGroups: Readonly<Record<string, Set<string>>>;
/**
 * @type {Readonly<Record<string, Record<string, string>>>}
 */
export declare const attrsGroupsDefaults: Readonly<Record<string, Record<string, string>>>;
/**
 * @type {Readonly<Record<string, { safe?: Set<string>; unsafe?: Set<string> }>>}
 * @see https://www.w3.org/TR/SVG11/intro.html#Definitions
 */
export declare const attrsGroupsDeprecated: Readonly<Record<string, {
    safe?: Set<string>;
    unsafe?: Set<string>;
}>>;
/**
 * @type {Readonly<Record<string, {
 *   attrsGroups: Set<string>,
 *   attrs?: Set<string>,
 *   defaults?: Record<string, string>,
 *   deprecated?: {
 *     safe?: Set<string>,
 *     unsafe?: Set<string>,
 *   },
 *   contentGroups?: Set<string>,
 *   content?: Set<string>,
 * }>>}
 * @see https://www.w3.org/TR/SVG11/eltindex.html
 */
export declare const elems: Readonly<Record<string, {
    attrsGroups: Set<string>;
    attrs?: Set<string>;
    defaults?: Record<string, string>;
    deprecated?: {
        safe?: Set<string>;
        unsafe?: Set<string>;
    };
    contentGroups?: Set<string>;
    content?: Set<string>;
}>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://wiki.inkscape.org/wiki/index.php/Inkscape-specific_XML_attributes
 */
export declare const editorNamespaces: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/linking.html#processingIRI
 */
export declare const referencesProps: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/propidx.html
 */
export declare const inheritableAttrs: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 */
export declare const presentationNonInheritableGroupAttrs: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, string>>}
 * @see https://www.w3.org/TR/SVG11/single-page.html#types-ColorKeywords
 */
export declare const colorsNames: Readonly<Record<string, string>>;
/**
 * @type {Readonly<Record<string, string>>}
 */
export declare const colorsShortNames: Readonly<Record<string, string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/single-page.html#types-DataTypeColor
 */
export declare const colorsProps: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, Set<string>>>}
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
 */
export declare const pseudoClasses: Readonly<Record<string, Set<string>>>;
