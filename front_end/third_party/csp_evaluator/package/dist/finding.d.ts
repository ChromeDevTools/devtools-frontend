export declare class Finding {
    type: Type;
    description: string;
    severity: Severity;
    directive: string;
    value?: string | undefined;
    constructor(type: Type, description: string, severity: Severity, directive: string, value?: string | undefined);
    static getHighestSeverity(findings: Finding[]): Severity;
    equals(obj: unknown): boolean;
}
export declare enum Severity {
    HIGH = 10,
    SYNTAX = 20,
    MEDIUM = 30,
    HIGH_MAYBE = 40,
    STRICT_CSP = 45,
    MEDIUM_MAYBE = 50,
    INFO = 60,
    NONE = 100
}
export declare enum Type {
    MISSING_SEMICOLON = 100,
    UNKNOWN_DIRECTIVE = 101,
    INVALID_KEYWORD = 102,
    NONCE_CHARSET = 106,
    MISSING_DIRECTIVES = 300,
    SCRIPT_UNSAFE_INLINE = 301,
    SCRIPT_UNSAFE_EVAL = 302,
    PLAIN_URL_SCHEMES = 303,
    PLAIN_WILDCARD = 304,
    SCRIPT_ALLOWLIST_BYPASS = 305,
    OBJECT_ALLOWLIST_BYPASS = 306,
    NONCE_LENGTH = 307,
    IP_SOURCE = 308,
    DEPRECATED_DIRECTIVE = 309,
    SRC_HTTP = 310,
    STRICT_DYNAMIC = 400,
    STRICT_DYNAMIC_NOT_STANDALONE = 401,
    NONCE_HASH = 402,
    UNSAFE_INLINE_FALLBACK = 403,
    ALLOWLIST_FALLBACK = 404,
    IGNORED = 405,
    REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS = 500,
    REPORTING_DESTINATION_MISSING = 600,
    REPORT_TO_ONLY = 601
}
//# sourceMappingURL=finding.d.ts.map