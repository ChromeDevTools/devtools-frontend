/**
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
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
/**
 * A CSP Finding is returned by a CSP check and can either reference a directive
 * value or a directive. If a directive value is referenced opt_index must be
 * provided.
 * @unrestricted
 */
export declare class Finding {
    type: Type;
    description: string;
    severity: Severity;
    directive: string;
    value?: string | undefined;
    /**
     * @param type Type of the finding.
     * @param description Description of the finding.
     * @param severity Severity of the finding.
     * @param directive The CSP directive in which the finding occurred.
     * @param value The directive value, if exists.
     */
    constructor(type: Type, description: string, severity: Severity, directive: string, value?: string | undefined);
    /**
     * Returns the highest severity of a list of findings.
     * @param findings List of findings.
     * @return highest severity of a list of findings.
     */
    static getHighestSeverity(findings: Finding[]): Severity;
    equals(obj: unknown): boolean;
}
/**
 * Finding severities.
 */
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
/**
 * Finding types for evluator checks.
 */
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
