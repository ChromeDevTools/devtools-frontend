/**
 * @param {JsdocVisitor} iterator
 * @param {RuleConfig} ruleConfig
 * @returns {import('eslint').Rule.RuleModule}
 */
export default function iterateJsdoc(iterator: JsdocVisitor, ruleConfig: RuleConfig): import("eslint").Rule.RuleModule;
export { parseComment } from "@es-joy/jsdoccomment";
export type Integer = number;
export type JsdocBlockWithInline = import("@es-joy/jsdoccomment").JsdocBlockWithInline;
export type ContextObject = {
    disallowName?: string;
    allowName?: string;
    context?: string;
    comment?: string;
    tags?: string[];
    replacement?: string;
    minimum?: Integer;
    message?: string;
    forceRequireReturn?: boolean;
};
export type Context = string | ContextObject;
export type CheckJsdoc = (info: {
    lastIndex?: Integer;
    isFunctionContext?: boolean;
    selector?: string;
    comment?: string;
}, handler: null | ((jsdoc: import("@es-joy/jsdoccomment").JsdocBlockWithInline) => boolean | undefined), node: import("eslint").Rule.Node) => void;
export type ForEachPreferredTag = (tagName: string, arrayHandler: (matchingJsdocTag: import("@es-joy/jsdoccomment").JsdocTagWithInline, targetTagName: string) => void, skipReportingBlockedTag?: boolean | undefined) => void;
export type ReportSettings = (message: string) => void;
export type ParseClosureTemplateTag = (tag: import("comment-parser").Spec) => string[];
export type GetPreferredTagNameObject = (cfg: {
    tagName: string;
}) => string | false | {
    message: string;
    replacement?: string | undefined;
} | {
    blocked: true;
    tagName: string;
};
export type BasicUtils = {
    forEachPreferredTag: ForEachPreferredTag;
    reportSettings: ReportSettings;
    parseClosureTemplateTag: ParseClosureTemplateTag;
    getPreferredTagNameObject: GetPreferredTagNameObject;
    pathDoesNotBeginWith: import("./jsdocUtils.js").PathDoesNotBeginWith;
    isNameOrNamepathDefiningTag: IsNamepathX;
    isNamepathReferencingTag: IsNamepathX;
    isNamepathOrUrlReferencingTag: IsNamepathX;
    tagMightHaveNameOrNamepath: IsNamepathX;
    tagMightHaveName: IsNamepathX;
};
export type IsIteratingFunction = () => boolean;
export type IsVirtualFunction = () => boolean;
export type Stringify = (tagBlock: import("comment-parser").Block, specRewire?: boolean | undefined) => string;
export type ReportJSDoc = (msg: string, tag?: import("comment-parser").Spec | {
    line: Integer;
    column?: Integer;
} | null | undefined, handler?: ((fixer: import("eslint").Rule.RuleFixer) => import("eslint").Rule.Fix | void) | null | undefined, specRewire?: boolean | undefined, data?: undefined | {
    [key: string]: string;
}) => any;
export type GetRegexFromString = (str: string, requiredFlags?: string | undefined) => RegExp;
export type GetTagDescription = (tg: import("comment-parser").Spec, returnArray?: boolean | undefined) => string[] | string;
export type SetTagDescription = (tg: import("comment-parser").Spec, matcher: RegExp, setter: (description: string) => string) => Integer;
export type GetDescription = () => {
    description: string;
    descriptions: string[];
    lastDescriptionLine: Integer;
};
export type SetBlockDescription = (setter: (info: {
    delimiter: string;
    postDelimiter: string;
    start: string;
}, seedTokens: (tokens?: Partial<import("comment-parser").Tokens>) => import("comment-parser").Tokens, descLines: string[], postDelims: string[]) => import("comment-parser").Line[]) => void;
export type SetDescriptionLines = (matcher: RegExp, setter: (description: string) => string) => Integer;
export type ChangeTag = (tag: import("comment-parser").Spec, ...tokens: Partial<import("comment-parser").Tokens>[]) => void;
export type SetTag = (tag: import("comment-parser").Spec & {
    line: Integer;
}, tokens?: Partial<import("comment-parser").Tokens> | undefined) => void;
export type RemoveTag = (tagIndex: Integer, cfg?: {
    removeEmptyBlock?: boolean;
    tagSourceOffset?: Integer;
} | undefined) => void;
export type AddTag = (targetTagName: string, number?: number | undefined, tokens?: Partial<import("comment-parser").Tokens> | undefined) => void;
export type GetFirstLine = () => Integer | undefined;
export type SeedTokens = (tokens?: Partial<import("comment-parser").Tokens> | undefined) => import("comment-parser").Tokens;
/**
 * Sets tokens to empty string.
 */
export type EmptyTokens = (tokens: import("comment-parser").Tokens) => void;
export type AddLine = (sourceIndex: Integer, tokens: Partial<import("comment-parser").Tokens>) => void;
export type AddLines = (tagIndex: Integer, tagSourceOffset: Integer, numLines: Integer) => void;
export type MakeMultiline = () => void;
export type GetFunctionParameterNames = (useDefaultObjectProperties?: boolean | undefined, ignoreInterfacedParameters?: boolean | undefined) => import("./jsdocUtils.js").ParamNameInfo[];
export type HasParams = () => Integer;
export type IsGenerator = () => boolean;
export type IsConstructor = () => boolean;
export type GetJsdocTagsDeep = (tagName: string) => false | {
    idx: Integer;
    name: string;
    type: string;
}[];
export type GetPreferredTagName = (cfg: {
    tagName: string;
    skipReportingBlockedTag?: boolean;
    allowObjectReturn?: boolean;
    defaultMessage?: string;
}) => string | undefined | false | {
    message: string;
    replacement?: string | undefined;
} | {
    blocked: true;
    tagName: string;
};
export type IsValidTag = (name: string, definedTags: string[]) => boolean;
export type HasATag = (names: string[]) => boolean;
export type HasTag = (name: string) => boolean;
export type ComparePaths = (name: string) => (otherPathName: string) => boolean;
export type DropPathSegmentQuotes = (name: string) => string;
export type AvoidDocs = () => boolean;
export type TagMightHaveNamePositionTypePosition = (tagName: string, otherModeMaps?: import("./getDefaultTagStructureForMode.js").TagStructure[] | undefined) => boolean | {
    otherMode: true;
};
export type TagMustHave = (tagName: string, otherModeMaps: import("./getDefaultTagStructureForMode.js").TagStructure[]) => boolean | {
    otherMode: false;
};
export type TagMissingRequiredTypeOrNamepath = (tag: import("comment-parser").Spec, otherModeMaps: import("./getDefaultTagStructureForMode.js").TagStructure[]) => boolean | {
    otherMode: false;
};
export type IsNamepathX = (tagName: string) => boolean;
export type GetTagStructureForMode = (mde: import("./jsdocUtils.js").ParserMode) => import("./getDefaultTagStructureForMode.js").TagStructure;
export type MayBeUndefinedTypeTag = (tag: import("comment-parser").Spec) => boolean;
export type HasValueOrExecutorHasNonEmptyResolveValue = (anyPromiseAsReturn: boolean, allBranches?: boolean | undefined) => boolean;
export type HasYieldValue = () => boolean;
export type HasYieldReturnValue = () => boolean;
export type HasThrowValue = () => boolean;
export type IsAsync = () => boolean | undefined;
export type GetTags = (tagName: string) => import("comment-parser").Spec[];
export type GetPresentTags = (tagList: string[]) => import("@es-joy/jsdoccomment").JsdocTagWithInline[];
export type FilterTags = (filter: (tag: import("@es-joy/jsdoccomment").JsdocTagWithInline) => boolean) => import("@es-joy/jsdoccomment").JsdocTagWithInline[];
export type FilterAllTags = (filter: (tag: (import("comment-parser").Spec | import("@es-joy/jsdoccomment").JsdocInlineTagNoType)) => boolean) => (import("comment-parser").Spec | import("@es-joy/jsdoccomment").JsdocInlineTagNoType)[];
export type getInlineTags = () => (import("comment-parser").Spec | (import("@es-joy/jsdoccomment").JsdocInlineTagNoType & {
    line?: number | undefined;
    column?: number | undefined;
}))[];
export type GetTagsByType = (tags: import("comment-parser").Spec[]) => {
    tagsWithNames: import("comment-parser").Spec[];
    tagsWithoutNames: import("comment-parser").Spec[];
};
export type HasOptionTag = (tagName: string) => boolean;
export type GetClassNode = () => Node | null;
export type GetClassJsdoc = () => null | JsdocBlockWithInline;
export type ClassHasTag = (tagName: string) => boolean;
export type FindContext = (contexts: Context[], comment: string | undefined) => {
    foundContext: Context | undefined;
    contextStr: string;
};
export type Utils = BasicUtils & {
    isIteratingFunction: IsIteratingFunction;
    isIteratingFunctionOrVariable: IsIteratingFunction;
    isVirtualFunction: IsVirtualFunction;
    stringify: Stringify;
    reportJSDoc: ReportJSDoc;
    getRegexFromString: GetRegexFromString;
    getTagDescription: GetTagDescription;
    setTagDescription: SetTagDescription;
    getDescription: GetDescription;
    setBlockDescription: SetBlockDescription;
    setDescriptionLines: SetDescriptionLines;
    changeTag: ChangeTag;
    setTag: SetTag;
    removeTag: RemoveTag;
    addTag: AddTag;
    getFirstLine: GetFirstLine;
    seedTokens: SeedTokens;
    emptyTokens: EmptyTokens;
    addLine: AddLine;
    addLines: AddLines;
    makeMultiline: MakeMultiline;
    flattenRoots: import("./jsdocUtils.js").FlattenRoots;
    getFunctionParameterNames: GetFunctionParameterNames;
    hasParams: HasParams;
    isGenerator: IsGenerator;
    isConstructor: IsConstructor;
    getJsdocTagsDeep: GetJsdocTagsDeep;
    getPreferredTagName: GetPreferredTagName;
    isValidTag: IsValidTag;
    hasATag: HasATag;
    hasTag: HasTag;
    comparePaths: ComparePaths;
    dropPathSegmentQuotes: DropPathSegmentQuotes;
    avoidDocs: AvoidDocs;
    tagMightHaveNamePosition: TagMightHaveNamePositionTypePosition;
    tagMightHaveTypePosition: TagMightHaveNamePositionTypePosition;
    tagMustHaveNamePosition: TagMustHave;
    tagMustHaveTypePosition: TagMustHave;
    tagMissingRequiredTypeOrNamepath: TagMissingRequiredTypeOrNamepath;
    isNameOrNamepathDefiningTag: IsNamepathX;
    isNamepathReferencingTag: IsNamepathX;
    isNamepathOrUrlReferencingTag: IsNamepathX;
    tagMightHaveNameOrNamepath: IsNamepathX;
    tagMightHaveName: IsNamepathX;
    tagMightHaveNamepath: IsNamepathX;
    getTagStructureForMode: GetTagStructureForMode;
    mayBeUndefinedTypeTag: MayBeUndefinedTypeTag;
    hasValueOrExecutorHasNonEmptyResolveValue: HasValueOrExecutorHasNonEmptyResolveValue;
    hasYieldValue: HasYieldValue;
    hasYieldReturnValue: HasYieldReturnValue;
    hasThrowValue: HasThrowValue;
    isAsync: IsAsync;
    getTags: GetTags;
    getPresentTags: GetPresentTags;
    filterTags: FilterTags;
    filterAllTags: FilterAllTags;
    getInlineTags: getInlineTags;
    getTagsByType: GetTagsByType;
    hasOptionTag: HasOptionTag;
    getClassNode: GetClassNode;
    getClassJsdoc: GetClassJsdoc;
    classHasTag: ClassHasTag;
    findContext: FindContext;
};
/**
 * Should use ESLint rule's typing.
 */
export type EslintRuleMeta = import("eslint").Rule.RuleMetaData;
/**
 * A plain object for tracking state as needed by rules across iterations.
 */
export type StateObject = {
    globalTags: boolean;
    hasDuplicates: {
        [key: string]: boolean;
    };
    selectorMap: {
        [selector: string]: {
            [comment: string]: Integer;
        };
    };
    hasTag: {
        [key: string]: boolean;
    };
    hasNonComment: number;
    hasNonCommentBeforeTag: {
        [key: string]: boolean | number;
    };
    foundTypedefValues: string[];
};
/**
 * The Node AST as supplied by the parser.
 */
export type Node = import("eslint").Rule.Node;
export type Report = (message: string, fix?: import("@eslint/core").RuleFixer | null | undefined, jsdocLoc?: {
    line?: Integer;
    column?: Integer;
} | (import("comment-parser").Spec & {
    line?: Integer;
}) | null | undefined, data?: undefined | {
    [key: string]: string;
}) => void;
export type PreferredTypes = {
    [key: string]: false | string | {
        message: string;
        replacement?: false | string;
        skipRootChecking?: boolean;
        unifyParentAndChildTypeChecks?: boolean;
    };
};
export type StructuredTags = {
    [key: string]: {
        name?: "text" | "name-defining" | "namepath-defining" | "namepath-referencing" | false;
        type?: boolean | string[];
        required?: ("name" | "type" | "typeOrNameRequired")[];
    };
};
/**
 * Settings from ESLint types.
 */
export type Settings = {
    maxLines: Integer;
    minLines: Integer;
    tagNamePreference: import("./jsdocUtils.js").TagNamePreference;
    mode: import("./jsdocUtils.js").ParserMode;
    preferredTypes: PreferredTypes;
    structuredTags: StructuredTags;
    contexts?: Context[];
    augmentsExtendsReplacesDocs?: boolean;
    ignoreReplacesDocs?: boolean;
    implementsReplacesDocs?: boolean;
    overrideReplacesDocs?: boolean;
    ignoreInternal?: boolean;
    ignorePrivate?: boolean;
    exemptDestructuredRootsFromChecks?: boolean;
};
export type JSDocSettings = {
    settings?: {
        jsdoc?: {
            ignorePrivate: boolean;
            ignoreInternal: boolean;
            maxLines: Integer;
            minLines: Integer;
            tagNamePreference: import("./jsdocUtils.js").TagNamePreference;
            preferredTypes: PreferredTypes;
            structuredTags: StructuredTags;
            overrideReplacesDocs: boolean;
            ignoreReplacesDocs: boolean;
            implementsReplacesDocs: boolean;
            augmentsExtendsReplacesDocs: boolean;
            exemptDestructuredRootsFromChecks: boolean;
            mode: import("./jsdocUtils.js").ParserMode;
            contexts: Context[];
        };
    };
};
/**
 * Create the report function
 */
export type MakeReport = (context: import("eslint").Rule.RuleContext, commentNode: import("estree").Node) => Report;
export type JsdocVisitorBasic = (arg: {
    context: import("eslint").Rule.RuleContext;
    sourceCode: import("eslint").SourceCode;
    indent?: string;
    info?: {
        comment?: string | undefined;
        lastIndex?: Integer | undefined;
    };
    state?: StateObject;
    globalState?: Map<string, Map<string, string>>;
    jsdoc?: JsdocBlockWithInline;
    jsdocNode?: import("eslint").Rule.Node & {
        range: [number, number];
    };
    node?: Node;
    allComments?: import("estree").Node[];
    report?: Report;
    makeReport?: MakeReport;
    settings: Settings;
    utils: BasicUtils;
}) => void;
export type JsdocVisitor = (arg: {
    context: import("eslint").Rule.RuleContext;
    sourceCode: import("eslint").SourceCode;
    indent: string;
    info: {
        comment?: string | undefined;
        lastIndex?: Integer | undefined;
    };
    state: StateObject;
    globalState: Map<string, Map<string, string>>;
    jsdoc: JsdocBlockWithInline;
    jsdocNode: import("eslint").Rule.Node & {
        range: [number, number];
    };
    node: Node | null;
    allComments?: import("estree").Node[];
    report: Report;
    makeReport?: MakeReport;
    settings: Settings;
    utils: Utils;
}) => void;
export type NonCommentArgs = {
    node: Node;
    state: StateObject;
};
export type RuleConfig = {
    /**
     * ESLint rule meta
     */
    meta: EslintRuleMeta;
    /**
     * Any default contexts
     */
    contextDefaults?: jsdocUtils.DefaultContexts | undefined;
    /**
     * Whether to force a `contexts` check
     */
    contextSelected?: true | undefined;
    /**
     * Modify the rule's context object
     */
    modifyContext?: ((context: import("eslint").Rule.RuleContext) => import("eslint").Rule.RuleContext) | undefined;
    /**
     * Whether to iterate all JSDoc blocks by default
     * regardless of context
     */
    iterateAllJsdocs?: true | undefined;
    /**
     * Whether to check `@private` blocks (normally exempted)
     */
    checkPrivate?: true | undefined;
    /**
     * Whether to check `@internal` blocks (normally exempted)
     */
    checkInternal?: true | undefined;
    /**
     * Whether to iterates over all JSDoc blocks regardless of attachment
     */
    checkFile?: true | undefined;
    /**
     * Whether to avoid relying on settings for global contexts
     */
    nonGlobalSettings?: true | undefined;
    /**
     * Whether to disable the tracking of visited comment nodes (as
     * non-tracked may conduct further actions)
     */
    noTracking?: true | undefined;
    /**
     * Whether the rule expects contexts to be based on a match option
     */
    matchContext?: true | undefined;
    /**
     * Handler to be executed upon exiting iteration of program AST
     */
    exit?: ((args: {
        context: import("eslint").Rule.RuleContext;
        state: StateObject;
        settings: Settings;
        utils: BasicUtils;
    }) => void) | undefined;
    /**
     * Handler to be executed if rule wishes
     * to be supplied nodes without comments
     */
    nonComment?: ((nca: NonCommentArgs) => void) | undefined;
};
/**
 * @typedef {{
 *   [key: string]: false|string|{
 *     message: string,
 *     replacement?: false|string
 *     skipRootChecking?: boolean
 *     unifyParentAndChildTypeChecks?: boolean
 *   }
 * }} PreferredTypes
 */
/**
 * @typedef {{
 *   [key: string]: {
 *     name?: "text"|"name-defining"|"namepath-defining"|"namepath-referencing"|false,
 *     type?: boolean|string[],
 *     required?: ("name"|"type"|"typeOrNameRequired")[]
 *   }
 * }} StructuredTags
 */
/**
 * Settings from ESLint types.
 * @typedef {{
 *   maxLines: Integer,
 *   minLines: Integer,
 *   tagNamePreference: import('./jsdocUtils.js').TagNamePreference,
 *   mode: import('./jsdocUtils.js').ParserMode,
 *   preferredTypes: PreferredTypes,
 *   structuredTags: StructuredTags,
 *   contexts?: Context[],
 *   augmentsExtendsReplacesDocs?: boolean,
 *   ignoreReplacesDocs?: boolean,
 *   implementsReplacesDocs?: boolean,
 *   overrideReplacesDocs?: boolean,
 *   ignoreInternal?: boolean,
 *   ignorePrivate?: boolean,
 *   exemptDestructuredRootsFromChecks?: boolean,
 * }} Settings
 */
/**
 * @typedef {{
 *   settings?: {
 *     jsdoc?: {
 *       ignorePrivate: boolean,
 *       ignoreInternal: boolean,
 *       maxLines: Integer,
 *       minLines: Integer,
 *       tagNamePreference: import('./jsdocUtils.js').TagNamePreference,
 *       preferredTypes: PreferredTypes,
 *       structuredTags: StructuredTags,
 *       overrideReplacesDocs: boolean,
 *       ignoreReplacesDocs: boolean,
 *       implementsReplacesDocs: boolean,
 *       augmentsExtendsReplacesDocs: boolean,
 *       exemptDestructuredRootsFromChecks: boolean,
 *       mode: import('./jsdocUtils.js').ParserMode,
 *       contexts: Context[],
 *     }
 *   }
 * }} JSDocSettings
 */
/**
 * @param {import('eslint').Rule.RuleContext & JSDocSettings} context
 * @returns {Settings|false}
 */
export function getSettings(context: import("eslint").Rule.RuleContext & JSDocSettings): Settings | false;
import * as jsdocUtils from './jsdocUtils.js';
//# sourceMappingURL=iterateJsdoc.d.ts.map