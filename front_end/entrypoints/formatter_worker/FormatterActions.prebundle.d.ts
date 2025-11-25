export declare const enum FormatterActions {
    FORMAT = "format",
    PARSE_CSS = "parseCSS",
    JAVASCRIPT_SUBSTITUTE = "javaScriptSubstitute",
    JAVASCRIPT_SCOPE_TREE = "javaScriptScopeTree"
}
export declare const enum FormattableMediaTypes {
    APPLICATION_JAVASCRIPT = "application/javascript",
    APPLICATION_JSON = "application/json",
    APPLICATION_MANIFEST_JSON = "application/manifest+json",
    TEXT_CSS = "text/css",
    TEXT_HTML = "text/html",
    TEXT_JAVASCRIPT = "text/javascript"
}
export declare const FORMATTABLE_MEDIA_TYPES: string[];
export interface FormatMapping {
    original: number[];
    formatted: number[];
}
export interface FormatResult {
    content: string;
    mapping: FormatMapping;
}
export declare const enum DefinitionKind {
    NONE = 0,
    LET = 1,
    VAR = 2,
    FIXED = 3
}
export declare const enum ScopeKind {
    BLOCK = 1,
    FUNCTION = 2,
    GLOBAL = 3,
    ARROW_FUNCTION = 4
}
export interface ScopeTreeNode {
    variables: Array<{
        name: string;
        kind: DefinitionKind;
        offsets: number[];
    }>;
    start: number;
    end: number;
    kind: ScopeKind;
    children: ScopeTreeNode[];
}
