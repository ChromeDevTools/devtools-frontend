/**
 * @fileoverview CSP definitions and helper functions.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Finding } from './finding.js';
/**
 * Content Security Policy object.
 * List of valid CSP directives:
 *  - http://www.w3.org/TR/CSP2/#directives
 *  - https://www.w3.org/TR/upgrade-insecure-requests/
 */
export declare class Csp {
    directives: Record<string, string[] | undefined>;
    /**
     * Clones a CSP object.
     * @return clone of parsedCsp.
     */
    clone(): Csp;
    /**
     * Converts this CSP back into a string.
     * @return CSP string.
     */
    convertToString(): string;
    /**
     * Returns CSP as it would be seen by a UA supporting a specific CSP version.
     * @param cspVersion CSP.
     * @param optFindings findings about ignored directive values will be added
     *     to this array, if passed. (e.g. CSP2 ignores 'unsafe-inline' in
     *     presence of a nonce or a hash)
     * @return The effective CSP.
     */
    getEffectiveCsp(cspVersion: Version, optFindings?: Finding[]): Csp;
    /**
     * Returns default-src if directive is a fetch directive and is not present in
     * this CSP. Otherwise the provided directive is returned.
     * @param directive CSP.
     * @return The effective directive.
     */
    getEffectiveDirective(directive: string): string;
    /**
     * Returns the passed directives if present in this CSP or default-src
     * otherwise.
     * @param directives CSP.
     * @return The effective directives.
     */
    getEffectiveDirectives(directives: string[]): string[];
    /**
     * Checks if this CSP is using nonces for scripts.
     * @return true, if this CSP is using script nonces.
     */
    policyHasScriptNonces(): boolean;
    /**
     * Checks if this CSP is using hashes for scripts.
     * @return true, if this CSP is using script hashes.
     */
    policyHasScriptHashes(): boolean;
    /**
     * Checks if this CSP is using strict-dynamic.
     * @return true, if this CSP is using CSP nonces.
     */
    policyHasStrictDynamic(): boolean;
}
/**
 * CSP directive source keywords.
 */
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
/**
 * CSP directive source keywords.
 */
export declare enum TrustedTypesSink {
    SCRIPT = "'script'"
}
/**
 * CSP v3 directives.
 * List of valid CSP directives:
 *  - http://www.w3.org/TR/CSP2/#directives
 *  - https://www.w3.org/TR/upgrade-insecure-requests/
 *
 */
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
/**
 * CSP v3 fetch directives.
 * Fetch directives control the locations from which resources may be loaded.
 * https://w3c.github.io/webappsec-csp/#directives-fetch
 *
 */
export declare const FETCH_DIRECTIVES: Directive[];
/**
 * CSP version.
 */
export declare enum Version {
    CSP1 = 1,
    CSP2 = 2,
    CSP3 = 3
}
/**
 * Checks if a string is a valid CSP directive.
 * @param directive value to check.
 * @return True if directive is a valid CSP directive.
 */
export declare function isDirective(directive: string): boolean;
/**
 * Checks if a string is a valid CSP keyword.
 * @param keyword value to check.
 * @return True if keyword is a valid CSP keyword.
 */
export declare function isKeyword(keyword: string): boolean;
/**
 * Checks if a string is a valid URL scheme.
 * Scheme part + ":"
 * For scheme part see https://tools.ietf.org/html/rfc3986#section-3.1
 * @param urlScheme value to check.
 * @return True if urlScheme has a valid scheme.
 */
export declare function isUrlScheme(urlScheme: string): boolean;
/**
 * A regex pattern to check nonce prefix and Base64 formatting of a nonce value.
 */
export declare const STRICT_NONCE_PATTERN: RegExp;
/** A regex pattern for checking if nonce prefix. */
export declare const NONCE_PATTERN: RegExp;
/**
 * Checks if a string is a valid CSP nonce.
 * See http://www.w3.org/TR/CSP2/#nonce_value
 * @param nonce value to check.
 * @param strictCheck Check if the nonce uses the base64 charset.
 * @return True if nonce is has a valid CSP nonce.
 */
export declare function isNonce(nonce: string, strictCheck?: boolean): boolean;
/**
 * A regex pattern to check hash prefix and Base64 formatting of a hash value.
 */
export declare const STRICT_HASH_PATTERN: RegExp;
/** A regex pattern to check hash prefix. */
export declare const HASH_PATTERN: RegExp;
/**
 * Checks if a string is a valid CSP hash.
 * See http://www.w3.org/TR/CSP2/#hash_value
 * @param hash value to check.
 * @param strictCheck Check if the hash uses the base64 charset.
 * @return True if hash is has a valid CSP hash.
 */
export declare function isHash(hash: string, strictCheck?: boolean): boolean;
/**
 * Class to represent all generic CSP errors.
 */
export declare class CspError extends Error {
    /**
     * @param message An optional error message.
     */
    constructor(message?: string);
}
