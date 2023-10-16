"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CspError = exports.isHash = exports.HASH_PATTERN = exports.STRICT_HASH_PATTERN = exports.isNonce = exports.NONCE_PATTERN = exports.STRICT_NONCE_PATTERN = exports.isUrlScheme = exports.isKeyword = exports.isDirective = exports.Version = exports.FETCH_DIRECTIVES = exports.Directive = exports.TrustedTypesSink = exports.Keyword = exports.Csp = void 0;
const finding_1 = require("./finding");
class Csp {
    constructor() {
        this.directives = {};
    }
    clone() {
        const clone = new Csp();
        for (const [directive, directiveValues] of Object.entries(this.directives)) {
            if (directiveValues) {
                clone.directives[directive] = [...directiveValues];
            }
        }
        return clone;
    }
    convertToString() {
        let cspString = '';
        for (const [directive, directiveValues] of Object.entries(this.directives)) {
            cspString += directive;
            if (directiveValues !== undefined) {
                for (let value, i = 0; (value = directiveValues[i]); i++) {
                    cspString += ' ';
                    cspString += value;
                }
            }
            cspString += '; ';
        }
        return cspString;
    }
    getEffectiveCsp(cspVersion, optFindings) {
        const findings = optFindings || [];
        const effectiveCsp = this.clone();
        const directive = effectiveCsp.getEffectiveDirective(Directive.SCRIPT_SRC);
        const values = this.directives[directive] || [];
        const effectiveCspValues = effectiveCsp.directives[directive];
        if (effectiveCspValues &&
            (effectiveCsp.policyHasScriptNonces() ||
                effectiveCsp.policyHasScriptHashes())) {
            if (cspVersion >= Version.CSP2) {
                if (values.includes(Keyword.UNSAFE_INLINE)) {
                    arrayRemove(effectiveCspValues, Keyword.UNSAFE_INLINE);
                    findings.push(new finding_1.Finding(finding_1.Type.IGNORED, 'unsafe-inline is ignored if a nonce or a hash is present. ' +
                        '(CSP2 and above)', finding_1.Severity.NONE, directive, Keyword.UNSAFE_INLINE));
                }
            }
            else {
                for (const value of values) {
                    if (value.startsWith('\'nonce-') || value.startsWith('\'sha')) {
                        arrayRemove(effectiveCspValues, value);
                    }
                }
            }
        }
        if (effectiveCspValues && this.policyHasStrictDynamic()) {
            if (cspVersion >= Version.CSP3) {
                for (const value of values) {
                    if (!value.startsWith('\'') || value === Keyword.SELF ||
                        value === Keyword.UNSAFE_INLINE) {
                        arrayRemove(effectiveCspValues, value);
                        findings.push(new finding_1.Finding(finding_1.Type.IGNORED, 'Because of strict-dynamic this entry is ignored in CSP3 and above', finding_1.Severity.NONE, directive, value));
                    }
                }
            }
            else {
                arrayRemove(effectiveCspValues, Keyword.STRICT_DYNAMIC);
            }
        }
        if (cspVersion < Version.CSP3) {
            delete effectiveCsp.directives[Directive.REPORT_TO];
            delete effectiveCsp.directives[Directive.WORKER_SRC];
            delete effectiveCsp.directives[Directive.MANIFEST_SRC];
            delete effectiveCsp.directives[Directive.TRUSTED_TYPES];
            delete effectiveCsp.directives[Directive.REQUIRE_TRUSTED_TYPES_FOR];
        }
        return effectiveCsp;
    }
    getEffectiveDirective(directive) {
        if (!(directive in this.directives) &&
            exports.FETCH_DIRECTIVES.includes(directive)) {
            return Directive.DEFAULT_SRC;
        }
        return directive;
    }
    getEffectiveDirectives(directives) {
        const effectiveDirectives = new Set(directives.map((val) => this.getEffectiveDirective(val)));
        return [...effectiveDirectives];
    }
    policyHasScriptNonces() {
        const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
        const values = this.directives[directiveName] || [];
        return values.some((val) => isNonce(val));
    }
    policyHasScriptHashes() {
        const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
        const values = this.directives[directiveName] || [];
        return values.some((val) => isHash(val));
    }
    policyHasStrictDynamic() {
        const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
        const values = this.directives[directiveName] || [];
        return values.includes(Keyword.STRICT_DYNAMIC);
    }
}
exports.Csp = Csp;
var Keyword;
(function (Keyword) {
    Keyword["SELF"] = "'self'";
    Keyword["NONE"] = "'none'";
    Keyword["UNSAFE_INLINE"] = "'unsafe-inline'";
    Keyword["UNSAFE_EVAL"] = "'unsafe-eval'";
    Keyword["WASM_EVAL"] = "'wasm-eval'";
    Keyword["WASM_UNSAFE_EVAL"] = "'wasm-unsafe-eval'";
    Keyword["STRICT_DYNAMIC"] = "'strict-dynamic'";
    Keyword["UNSAFE_HASHED_ATTRIBUTES"] = "'unsafe-hashed-attributes'";
    Keyword["UNSAFE_HASHES"] = "'unsafe-hashes'";
    Keyword["REPORT_SAMPLE"] = "'report-sample'";
    Keyword["BLOCK"] = "'block'";
    Keyword["ALLOW"] = "'allow'";
})(Keyword = exports.Keyword || (exports.Keyword = {}));
var TrustedTypesSink;
(function (TrustedTypesSink) {
    TrustedTypesSink["SCRIPT"] = "'script'";
})(TrustedTypesSink = exports.TrustedTypesSink || (exports.TrustedTypesSink = {}));
var Directive;
(function (Directive) {
    Directive["CHILD_SRC"] = "child-src";
    Directive["CONNECT_SRC"] = "connect-src";
    Directive["DEFAULT_SRC"] = "default-src";
    Directive["FONT_SRC"] = "font-src";
    Directive["FRAME_SRC"] = "frame-src";
    Directive["IMG_SRC"] = "img-src";
    Directive["MEDIA_SRC"] = "media-src";
    Directive["OBJECT_SRC"] = "object-src";
    Directive["SCRIPT_SRC"] = "script-src";
    Directive["SCRIPT_SRC_ATTR"] = "script-src-attr";
    Directive["SCRIPT_SRC_ELEM"] = "script-src-elem";
    Directive["STYLE_SRC"] = "style-src";
    Directive["STYLE_SRC_ATTR"] = "style-src-attr";
    Directive["STYLE_SRC_ELEM"] = "style-src-elem";
    Directive["PREFETCH_SRC"] = "prefetch-src";
    Directive["MANIFEST_SRC"] = "manifest-src";
    Directive["WORKER_SRC"] = "worker-src";
    Directive["BASE_URI"] = "base-uri";
    Directive["PLUGIN_TYPES"] = "plugin-types";
    Directive["SANDBOX"] = "sandbox";
    Directive["DISOWN_OPENER"] = "disown-opener";
    Directive["FORM_ACTION"] = "form-action";
    Directive["FRAME_ANCESTORS"] = "frame-ancestors";
    Directive["NAVIGATE_TO"] = "navigate-to";
    Directive["REPORT_TO"] = "report-to";
    Directive["REPORT_URI"] = "report-uri";
    Directive["BLOCK_ALL_MIXED_CONTENT"] = "block-all-mixed-content";
    Directive["UPGRADE_INSECURE_REQUESTS"] = "upgrade-insecure-requests";
    Directive["REFLECTED_XSS"] = "reflected-xss";
    Directive["REFERRER"] = "referrer";
    Directive["REQUIRE_SRI_FOR"] = "require-sri-for";
    Directive["TRUSTED_TYPES"] = "trusted-types";
    Directive["REQUIRE_TRUSTED_TYPES_FOR"] = "require-trusted-types-for";
    Directive["WEBRTC"] = "webrtc";
})(Directive = exports.Directive || (exports.Directive = {}));
exports.FETCH_DIRECTIVES = [
    Directive.CHILD_SRC, Directive.CONNECT_SRC, Directive.DEFAULT_SRC,
    Directive.FONT_SRC, Directive.FRAME_SRC, Directive.IMG_SRC,
    Directive.MANIFEST_SRC, Directive.MEDIA_SRC, Directive.OBJECT_SRC,
    Directive.SCRIPT_SRC, Directive.SCRIPT_SRC_ATTR, Directive.SCRIPT_SRC_ELEM,
    Directive.STYLE_SRC, Directive.STYLE_SRC_ATTR, Directive.STYLE_SRC_ELEM,
    Directive.WORKER_SRC
];
var Version;
(function (Version) {
    Version[Version["CSP1"] = 1] = "CSP1";
    Version[Version["CSP2"] = 2] = "CSP2";
    Version[Version["CSP3"] = 3] = "CSP3";
})(Version = exports.Version || (exports.Version = {}));
function isDirective(directive) {
    return Object.values(Directive).includes(directive);
}
exports.isDirective = isDirective;
function isKeyword(keyword) {
    return Object.values(Keyword).includes(keyword);
}
exports.isKeyword = isKeyword;
function isUrlScheme(urlScheme) {
    const pattern = new RegExp('^[a-zA-Z][+a-zA-Z0-9.-]*:$');
    return pattern.test(urlScheme);
}
exports.isUrlScheme = isUrlScheme;
exports.STRICT_NONCE_PATTERN = new RegExp('^\'nonce-[a-zA-Z0-9+/_-]+[=]{0,2}\'$');
exports.NONCE_PATTERN = new RegExp('^\'nonce-(.+)\'$');
function isNonce(nonce, strictCheck) {
    const pattern = strictCheck ? exports.STRICT_NONCE_PATTERN : exports.NONCE_PATTERN;
    return pattern.test(nonce);
}
exports.isNonce = isNonce;
exports.STRICT_HASH_PATTERN = new RegExp('^\'(sha256|sha384|sha512)-[a-zA-Z0-9+/]+[=]{0,2}\'$');
exports.HASH_PATTERN = new RegExp('^\'(sha256|sha384|sha512)-(.+)\'$');
function isHash(hash, strictCheck) {
    const pattern = strictCheck ? exports.STRICT_HASH_PATTERN : exports.HASH_PATTERN;
    return pattern.test(hash);
}
exports.isHash = isHash;
class CspError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.CspError = CspError;
function arrayRemove(arr, item) {
    if (arr.includes(item)) {
        const idx = arr.findIndex(elem => item === elem);
        arr.splice(idx, 1);
    }
}
//# sourceMappingURL=csp.js.map