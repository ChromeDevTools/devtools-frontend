/**
 * @fileoverview Based on https://www.w3.org/TR/SVG11/intro.html#Definitions.
 */
/**
 * @type {Readonly<Record<string, Set<string>>>}
 */
export const elemsGroups: Readonly<Record<string, Set<string>>>;
/**
 * Elements where adding or removing whitespace may affect rendering, metadata,
 * or semantic meaning.
 *
 * @see https://developer.mozilla.org/docs/Web/HTML/Element/pre
 * @type {Readonly<Set<string>>}
 */
export const textElems: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 */
export const pathElems: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, Set<string>>>}
 * @see https://www.w3.org/TR/SVG11/intro.html#Definitions
 */
export const attrsGroups: Readonly<Record<string, Set<string>>>;
/**
 * @type {Readonly<Record<string, Record<string, string>>>}
 */
export const attrsGroupsDefaults: Readonly<Record<string, Record<string, string>>>;
/**
 * @type {Readonly<Record<string, { safe?: Set<string>; unsafe?: Set<string> }>>}
 * @see https://www.w3.org/TR/SVG11/intro.html#Definitions
 */
export const attrsGroupsDeprecated: Readonly<Record<string, {
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
export const elems: Readonly<Record<string, {
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
export const editorNamespaces: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/linking.html#processingIRI
 */
export const referencesProps: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/propidx.html
 */
export const inheritableAttrs: Readonly<Set<string>>;
/**
 * @type {Readonly<Set<string>>}
 */
export const presentationNonInheritableGroupAttrs: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, string>>}
 * @see https://www.w3.org/TR/SVG11/single-page.html#types-ColorKeywords
 */
export const colorsNames: Readonly<Record<string, string>>;
/**
 * @type {Readonly<Record<string, string>>}
 */
export const colorsShortNames: Readonly<Record<string, string>>;
/**
 * @type {Readonly<Set<string>>}
 * @see https://www.w3.org/TR/SVG11/single-page.html#types-DataTypeColor
 */
export const colorsProps: Readonly<Set<string>>;
/**
 * @type {Readonly<Record<string, Set<string>>>}
 * @see https://developer.mozilla.org/docs/Web/CSS/Pseudo-classes
 */
export const pseudoClasses: Readonly<Record<string, Set<string>>>;
