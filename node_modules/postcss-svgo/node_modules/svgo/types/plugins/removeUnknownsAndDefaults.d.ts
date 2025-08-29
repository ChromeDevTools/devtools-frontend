/**
 * @typedef RemoveUnknownsAndDefaultsParams
 * @property {boolean=} unknownContent
 * @property {boolean=} unknownAttrs
 * @property {boolean=} defaultAttrs
 * @property {boolean=} defaultMarkupDeclarations
 *   If to remove XML declarations that are assigned their default value. XML
 *   declarations are the properties in the `<?xml … ?>` block at the top of the
 *   document.
 * @property {boolean=} uselessOverrides
 * @property {boolean=} keepDataAttrs
 * @property {boolean=} keepAriaAttrs
 * @property {boolean=} keepRoleAttr
 */
export const name: "removeUnknownsAndDefaults";
export const description: "removes unknown elements content and attributes, removes attrs with default values";
/**
 * Remove unknown elements content and attributes,
 * remove attributes with default values.
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveUnknownsAndDefaultsParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveUnknownsAndDefaultsParams>;
export type RemoveUnknownsAndDefaultsParams = {
    unknownContent?: boolean | undefined;
    unknownAttrs?: boolean | undefined;
    defaultAttrs?: boolean | undefined;
    /**
     *   If to remove XML declarations that are assigned their default value. XML
     *   declarations are the properties in the `<?xml … ?>` block at the top of the
     *   document.
     */
    defaultMarkupDeclarations?: boolean | undefined;
    uselessOverrides?: boolean | undefined;
    keepDataAttrs?: boolean | undefined;
    keepAriaAttrs?: boolean | undefined;
    keepRoleAttr?: boolean | undefined;
};
