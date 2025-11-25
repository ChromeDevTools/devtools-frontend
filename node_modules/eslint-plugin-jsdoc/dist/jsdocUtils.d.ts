export type Integer = number;
export type ESTreeOrTypeScriptNode = import("./utils/hasReturnValue.js").ESTreeOrTypeScriptNode;
export type ParserMode = "jsdoc" | "typescript" | "closure" | "permissive";
export type ParamCommon = undefined | string | {
    name: Integer;
    restElement: boolean;
} | {
    isRestProperty: boolean | undefined;
    name: string;
    restElement: boolean;
} | {
    name: string;
    restElement: boolean;
};
export type ParamNameInfo = ParamCommon | [string | undefined, (FlattendRootInfo & {
    annotationParamName?: string;
})] | NestedParamInfo;
export type FlattendRootInfo = {
    hasPropertyRest: boolean;
    hasRestElement: boolean;
    names: string[];
    rests: boolean[];
};
export type NestedParamInfo = [string, (string[] | ParamInfo[])];
export type ParamInfo = ParamCommon | [string | undefined, (FlattendRootInfo & {
    annotationParamName?: string;
})] | NestedParamInfo;
/**
 * Given a nested array of property names, reduce them to a single array,
 * appending the name of the root element along the way if present.
 */
export type FlattenRoots = (params: ParamInfo[], root?: string | undefined) => FlattendRootInfo;
export type Reporter = {
    report: (descriptor: import("eslint").Rule.ReportDescriptor) => void;
};
export type DefaultContexts = true | string[];
export type TagNamePreference = {
    [key: string]: false | string | {
        message: string;
        replacement?: string;
    };
};
export type PathDoesNotBeginWith = (name: string, otherPathName: string) => boolean;
/**
 * @param {string} name
 * @returns {(otherPathName: string) => boolean}
 */
export function comparePaths(name: string): (otherPathName: string) => boolean;
/**
 * Since path segments may be unquoted (if matching a reserved word,
 * identifier or numeric literal) or single or double quoted, in either
 * the `@param` or in source, we need to strip the quotes to give a fair
 * comparison.
 * @param {string} str
 * @returns {string}
 */
export function dropPathSegmentQuotes(str: string): string;
/**
 * @typedef {true|string[]} DefaultContexts
 */
/**
 * Checks user option for `contexts` array, defaulting to
 * contexts designated by the rule. Returns an array of
 * ESTree AST types, indicating allowable contexts.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {DefaultContexts|undefined} defaultContexts
 * @param {{
 *   contexts?: import('./iterateJsdoc.js').Context[]
 * }} settings
 * @returns {(string|import('./iterateJsdoc.js').ContextObject)[]}
 */
export function enforcedContexts(context: import("eslint").Rule.RuleContext, defaultContexts: DefaultContexts | undefined, settings: {
    contexts?: import("./iterateJsdoc.js").Context[];
}): (string | import("./iterateJsdoc.js").ContextObject)[];
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {import('eslint').Rule.Node|null} node
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('json-schema').JSONSchema4} schema
 * @returns {boolean}
 */
export function exemptSpeciaMethods(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, node: import("eslint").Rule.Node | null, context: import("eslint").Rule.RuleContext, schema: import("json-schema").JSONSchema4): boolean;
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {(tag: import('@es-joy/jsdoccomment').JsdocTagWithInline) => boolean} filter
 * @returns {import('@es-joy/jsdoccomment').JsdocTagWithInline[]}
 */
export function filterTags(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, filter: (tag: import("@es-joy/jsdoccomment").JsdocTagWithInline) => boolean): import("@es-joy/jsdoccomment").JsdocTagWithInline[];
/**
 * @typedef {undefined|string|{
 *   name: Integer,
 *   restElement: boolean
 * }|{
 *   isRestProperty: boolean|undefined,
 *   name: string,
 *   restElement: boolean
 * }|{
 *   name: string,
 *   restElement: boolean
 * }} ParamCommon
 */
/**
 * @typedef {ParamCommon|[string|undefined, (FlattendRootInfo & {
 *   annotationParamName?: string,
 * })]|NestedParamInfo} ParamNameInfo
 */
/**
 * @typedef {{
 *   hasPropertyRest: boolean,
 *   hasRestElement: boolean,
 *   names: string[],
 *   rests: boolean[],
 * }} FlattendRootInfo
 */
/**
 * @typedef {[string, (string[]|ParamInfo[])]} NestedParamInfo
 */
/**
 * @typedef {ParamCommon|
 * [string|undefined, (FlattendRootInfo & {
 *   annotationParamName?: string
 * })]|
 * NestedParamInfo} ParamInfo
 */
/**
 * Given a nested array of property names, reduce them to a single array,
 * appending the name of the root element along the way if present.
 * @callback FlattenRoots
 * @param {ParamInfo[]} params
 * @param {string} [root]
 * @returns {FlattendRootInfo}
 */
/** @type {FlattenRoots} */
export const flattenRoots: FlattenRoots;
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {string} tagName
 * @param {(
 *   matchingJsdocTag: import('@es-joy/jsdoccomment').JsdocTagWithInline,
 *   targetTagName: string
 * ) => void} arrayHandler
 * @param {object} cfg
 * @param {import('eslint').Rule.RuleContext} [cfg.context]
 * @param {ParserMode} [cfg.mode]
 * @param {import('./iterateJsdoc.js').Report} [cfg.report]
 * @param {TagNamePreference} [cfg.tagNamePreference]
 * @param {boolean} [cfg.skipReportingBlockedTag]
 * @returns {void}
 */
export function forEachPreferredTag(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, tagName: string, arrayHandler: (matchingJsdocTag: import("@es-joy/jsdoccomment").JsdocTagWithInline, targetTagName: string) => void, { context, mode, report, skipReportingBlockedTag, tagNamePreference, }?: {
    context?: import("eslint").Rule.RuleContext | undefined;
    mode?: ParserMode | undefined;
    report?: import("./iterateJsdoc.js").Report | undefined;
    tagNamePreference?: TagNamePreference | undefined;
    skipReportingBlockedTag?: boolean | undefined;
}): void;
/**
 * Get all tags, inline tags and inline tags in tags
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @returns {(import('comment-parser').Spec|
 *   import('@es-joy/jsdoccomment').JsdocInlineTagNoType & {
 *     line?: number | undefined; column?: number | undefined;
 *   })[]}
 */
export function getAllTags(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline): (import("comment-parser").Spec | (import("@es-joy/jsdoccomment").JsdocInlineTagNoType & {
    line?: number | undefined;
    column?: number | undefined;
}))[];
/**
 * @param {import('./iterateJsdoc.js').Context[]} contexts
 * @param {import('./iterateJsdoc.js').CheckJsdoc} checkJsdoc
 * @param {import('@es-joy/jsdoccomment').CommentHandler} [handler]
 * @returns {import('eslint').Rule.RuleListener}
 */
export function getContextObject(contexts: import("./iterateJsdoc.js").Context[], checkJsdoc: import("./iterateJsdoc.js").CheckJsdoc, handler?: import("@es-joy/jsdoccomment").CommentHandler): import("eslint").Rule.RuleListener;
/**
 * @param {ESTreeOrTypeScriptNode|null} functionNode
 * @param {boolean} [checkDefaultObjects]
 * @param {boolean} [ignoreInterfacedParameters]
 * @throws {Error}
 * @returns {ParamNameInfo[]}
 */
export function getFunctionParameterNames(functionNode: ESTreeOrTypeScriptNode | null, checkDefaultObjects?: boolean, ignoreInterfacedParameters?: boolean): ParamNameInfo[];
/**
 * @param {import('eslint').SourceCode|{
 *   text: string
 * }} sourceCode
 * @returns {string}
 */
export function getIndent(sourceCode: import("eslint").SourceCode | {
    text: string;
}): string;
/**
 * Get all inline tags and inline tags in tags
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @returns {(import('comment-parser').Spec|
 *   import('@es-joy/jsdoccomment').JsdocInlineTagNoType & {
 *     line?: number | undefined; column?: number | undefined;
 *   })[]}
 */
export function getInlineTags(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline): (import("comment-parser").Spec | (import("@es-joy/jsdoccomment").JsdocInlineTagNoType & {
    line?: number | undefined;
    column?: number | undefined;
}))[];
/**
 * Gets all names of the target type, including those that refer to a path, e.g.
 * `foo` or `foo.bar`.
 * @param {import('comment-parser').Block} jsdoc
 * @param {string} targetTagName
 * @returns {{
 *   idx: Integer,
 *   name: string,
 *   type: string
 * }[]}
 */
export function getJsdocTagsDeep(jsdoc: import("comment-parser").Block, targetTagName: string): {
    idx: Integer;
    name: string;
    type: string;
}[];
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {{
 *   tagName: string,
 *   context?: import('eslint').Rule.RuleContext,
 *   mode?: ParserMode,
 *   report?: import('./iterateJsdoc.js').Report
 *   tagNamePreference?: TagNamePreference
 *   skipReportingBlockedTag?: boolean,
 *   allowObjectReturn?: boolean,
 *   defaultMessage?: string,
 * }} cfg
 * @returns {string|undefined|false|{
 *   message: string;
 *   replacement?: string|undefined;
 * }|{
 *   blocked: true,
 *   tagName: string
 * }}
 */
export function getPreferredTagName(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, { allowObjectReturn, context, tagName, defaultMessage, mode, report, skipReportingBlockedTag, tagNamePreference, }: {
    tagName: string;
    context?: import("eslint").Rule.RuleContext;
    mode?: ParserMode;
    report?: import("./iterateJsdoc.js").Report;
    tagNamePreference?: TagNamePreference;
    skipReportingBlockedTag?: boolean;
    allowObjectReturn?: boolean;
    defaultMessage?: string;
}): string | undefined | false | {
    message: string;
    replacement?: string | undefined;
} | {
    blocked: true;
    tagName: string;
};
/**
 * @typedef {{
 *   report: (descriptor: import('eslint').Rule.ReportDescriptor) => void
 * }} Reporter
 */
/**
 * @param {string} name
 * @param {ParserMode|undefined} mode
 * @param {TagNamePreference} tagPreference
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {string|false|{
 *   message: string;
 *   replacement?: string|undefined;
 * }}
 */
export function getPreferredTagNameSimple(name: string, mode: ParserMode | undefined, tagPreference?: TagNamePreference, context?: import("eslint").Rule.RuleContext): string | false | {
    message: string;
    replacement?: string | undefined;
};
/**
 * @param {string} regexString
 * @param {string} [requiredFlags]
 * @returns {RegExp}
 */
export function getRegexFromString(regexString: string, requiredFlags?: string): RegExp;
/**
 * @param {import('comment-parser').Spec} tg
 * @param {boolean} [returnArray]
 * @returns {string[]|string}
 */
export function getTagDescription(tg: import("comment-parser").Spec, returnArray?: boolean): string[] | string;
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {string} tagName
 * @returns {import('comment-parser').Spec[]}
 */
export function getTags(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, tagName: string): import("comment-parser").Spec[];
/**
 * @typedef {{
 *   [key: string]: false|string|
 *     {message: string, replacement?: string}
 * }} TagNamePreference
 */
/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {ParserMode|undefined} mode
 * @param {import('comment-parser').Spec[]} tags
 * @returns {{
 *   tagsWithNames: import('comment-parser').Spec[],
 *   tagsWithoutNames: import('comment-parser').Spec[]
 * }}
 */
export function getTagsByType(context: import("eslint").Rule.RuleContext, mode: ParserMode | undefined, tags: import("comment-parser").Spec[]): {
    tagsWithNames: import("comment-parser").Spec[];
    tagsWithoutNames: import("comment-parser").Spec[];
};
/**
 * @param {ParserMode} mode
 * @param {import('./iterateJsdoc.js').StructuredTags} structuredTags
 * @returns {import('./getDefaultTagStructureForMode.js').TagStructure}
 */
export function getTagStructureForMode(mode: ParserMode, structuredTags: import("./iterateJsdoc.js").StructuredTags): import("./getDefaultTagStructureForMode.js").TagStructure;
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {string[]} targetTagNames
 * @returns {boolean}
 */
export function hasATag(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, targetTagNames: string[]): boolean;
/**
 * @param {ESTreeOrTypeScriptNode} functionNode
 * @returns {Integer}
 */
export function hasParams(functionNode: ESTreeOrTypeScriptNode): Integer;
/**
 * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
 * @param {string} targetTagName
 * @returns {boolean}
 */
export function hasTag(jsdoc: import("./iterateJsdoc.js").JsdocBlockWithInline, targetTagName: string): boolean;
/**
 * Checks if a node has a throws statement.
 * @param {ESTreeOrTypeScriptNode|null|undefined} node
 * @param {boolean} [innerFunction]
 * @returns {boolean}
 */
export function hasThrowValue(node: ESTreeOrTypeScriptNode | null | undefined, innerFunction?: boolean): boolean;
/**
 * Checks if a node has a return statement. Void return does not count.
 * @param {ESTreeOrTypeScriptNode} node
 * @param {boolean} [checkYieldReturnValue]
 * @returns {boolean}
 */
export function hasYieldValue(node: ESTreeOrTypeScriptNode, checkYieldReturnValue?: boolean): boolean;
/**
 * @param {import('eslint').Rule.Node|null} node
 * @returns {boolean}
 */
export function isConstructor(node: import("eslint").Rule.Node | null): boolean;
/**
 * @param {import('eslint').Rule.Node|null} node
 * @returns {boolean}
 */
export function isGetter(node: import("eslint").Rule.Node | null): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function isNameOrNamepathDefiningTag(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function isNamepathOrUrlReferencingTag(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function isNamepathReferencingTag(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {import('eslint').Rule.Node|null} node
 * @returns {boolean}
 */
export function isSetter(node: import("eslint").Rule.Node | null): boolean;
/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {ParserMode|undefined} mode
 * @param {string} name
 * @param {string[]} definedTags
 * @returns {boolean}
 */
export function isValidTag(context: import("eslint").Rule.RuleContext, mode: ParserMode | undefined, name: string, definedTags: string[]): boolean;
/**
 * Checks if the JSDoc comment has an undefined type.
 * @param {import('comment-parser').Spec|null|undefined} tag
 *   the tag which should be checked.
 * @param {ParserMode} mode
 * @returns {boolean}
 *   true in case a defined type is undeclared; otherwise false.
 */
export function mayBeUndefinedTypeTag(tag: import("comment-parser").Spec | null | undefined, mode: ParserMode): boolean;
/**
 * @param {import('./iterateJsdoc.js').StructuredTags} structuredTags
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {void}
 */
export function overrideTagStructure(structuredTags: import("./iterateJsdoc.js").StructuredTags, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): void;
/**
 * @param {string} tag
 */
/**
 * Parses GCC Generic/Template types
 * @see {@link https://github.com/google/closure-compiler/wiki/Generic-Types}
 * @see {@link https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#template}
 * @param {import('comment-parser').Spec} tag
 * @returns {string[]}
 */
export function parseClosureTemplateTag(tag: import("comment-parser").Spec): string[];
/**
 * @callback PathDoesNotBeginWith
 * @param {string} name
 * @param {string} otherPathName
 * @returns {boolean}
 */
/** @type {PathDoesNotBeginWith} */
export const pathDoesNotBeginWith: PathDoesNotBeginWith;
/**
 * @param {import('@es-joy/jsdoccomment').JsdocBlockWithInline} jsdoc
 * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
 * @param {import('jsdoc-type-pratt-parser').RootResult} parsedType
 * @param {string} indent
 * @param {string} typeBracketSpacing
 */
export function rewireByParsedType(jsdoc: import("@es-joy/jsdoccomment").JsdocBlockWithInline, tag: import("@es-joy/jsdoccomment").JsdocTagWithInline, parsedType: import("jsdoc-type-pratt-parser").RootResult, indent: string, typeBracketSpacing?: string): void;
/**
 * @param {ParserMode} mode
 * @returns {void}
 */
export function setTagStructure(mode: ParserMode): void;
export const strictNativeTypes: string[];
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function tagMightHaveEitherTypeOrNamePosition(tag: string, tagMap: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function tagMightHaveName(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function tagMightHaveNameOrNamepath(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function tagMightHaveNamepath(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean}
 */
export function tagMightHaveNamePosition(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean|string}
 */
export function tagMightHaveTypePosition(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean | string;
/**
 * @param {import('comment-parser').Spec} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean|undefined}
 */
export function tagMissingRequiredTypeOrNamepath(tag: import("comment-parser").Spec, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean | undefined;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean|undefined}
 */
export function tagMustHaveNamePosition(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean | undefined;
/**
 * @param {string} tag
 * @param {import('./getDefaultTagStructureForMode.js').TagStructure} tagMap
 * @returns {boolean|undefined}
 */
export function tagMustHaveTypePosition(tag: string, tagMap?: import("./getDefaultTagStructureForMode.js").TagStructure): boolean | undefined;
export { hasReturnValue, hasValueOrExecutorHasNonEmptyResolveValue } from "./utils/hasReturnValue.js";
//# sourceMappingURL=jsdocUtils.d.ts.map