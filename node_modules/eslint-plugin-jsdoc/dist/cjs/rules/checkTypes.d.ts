declare const _default: import("eslint").Rule.RuleModule;
export default _default;
/**
 * Iterates strict types to see if any should be added to `invalidTypes` (and
 * the the relevant strict type returned as the new preferred type).
 */
export type CheckNativeTypes = (preferredTypes: import("../iterateJsdoc.js").PreferredTypes, typeNodeName: string, preferred: string | undefined, parentNode: import("jsdoc-type-pratt-parser").NonRootResult | undefined, invalidTypes: (string | false | undefined)[][]) => string | undefined;
