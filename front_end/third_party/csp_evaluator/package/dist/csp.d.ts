import { Finding } from './finding';
export declare class Csp {
    directives: Record<string, string[] | undefined>;
    clone(): Csp;
    convertToString(): string;
    getEffectiveCsp(cspVersion: Version, optFindings?: Finding[]): Csp;
    getEffectiveDirective(directive: string): string;
    getEffectiveDirectives(directives: string[]): string[];
    policyHasScriptNonces(): boolean;
    policyHasScriptHashes(): boolean;
    policyHasStrictDynamic(): boolean;
}
export declare enum Keyword {
    SELF = "'self'",
    NONE = "'none'",
    UNSAFE_INLINE = "'unsafe-inline'",
    UNSAFE_EVAL = "'unsafe-eval'",
    WASM_EVAL = "'wasm-eval'",
    WASM_UNSAFE_EVAL = "'wasm-unsafe-eval'",
    STRICT_DYNAMIC = "'strict-dynamic'",
    UNSAFE_HASHED_ATTRIBUTES = "'unsafe-hashed-attributes'",
    UNSAFE_HASHES = "'unsafe-hashes'",
    REPORT_SAMPLE = "'report-sample'",
    BLOCK = "'block'",
    ALLOW = "'allow'"
}
export declare enum TrustedTypesSink {
    SCRIPT = "'script'"
}
export declare enum Directive {
    CHILD_SRC = "child-src",
    CONNECT_SRC = "connect-src",
    DEFAULT_SRC = "default-src",
    FONT_SRC = "font-src",
    FRAME_SRC = "frame-src",
    IMG_SRC = "img-src",
    MEDIA_SRC = "media-src",
    OBJECT_SRC = "object-src",
    SCRIPT_SRC = "script-src",
    SCRIPT_SRC_ATTR = "script-src-attr",
    SCRIPT_SRC_ELEM = "script-src-elem",
    STYLE_SRC = "style-src",
    STYLE_SRC_ATTR = "style-src-attr",
    STYLE_SRC_ELEM = "style-src-elem",
    PREFETCH_SRC = "prefetch-src",
    MANIFEST_SRC = "manifest-src",
    WORKER_SRC = "worker-src",
    BASE_URI = "base-uri",
    PLUGIN_TYPES = "plugin-types",
    SANDBOX = "sandbox",
    DISOWN_OPENER = "disown-opener",
    FORM_ACTION = "form-action",
    FRAME_ANCESTORS = "frame-ancestors",
    NAVIGATE_TO = "navigate-to",
    REPORT_TO = "report-to",
    REPORT_URI = "report-uri",
    BLOCK_ALL_MIXED_CONTENT = "block-all-mixed-content",
    UPGRADE_INSECURE_REQUESTS = "upgrade-insecure-requests",
    REFLECTED_XSS = "reflected-xss",
    REFERRER = "referrer",
    REQUIRE_SRI_FOR = "require-sri-for",
    TRUSTED_TYPES = "trusted-types",
    REQUIRE_TRUSTED_TYPES_FOR = "require-trusted-types-for",
    WEBRTC = "webrtc"
}
export declare const FETCH_DIRECTIVES: Directive[];
export declare enum Version {
    CSP1 = 1,
    CSP2 = 2,
    CSP3 = 3
}
export declare function isDirective(directive: string): boolean;
export declare function isKeyword(keyword: string): boolean;
export declare function isUrlScheme(urlScheme: string): boolean;
export declare const STRICT_NONCE_PATTERN: RegExp;
export declare const NONCE_PATTERN: RegExp;
export declare function isNonce(nonce: string, strictCheck?: boolean): boolean;
export declare const STRICT_HASH_PATTERN: RegExp;
export declare const HASH_PATTERN: RegExp;
export declare function isHash(hash: string, strictCheck?: boolean): boolean;
export declare class CspError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=csp.d.ts.map