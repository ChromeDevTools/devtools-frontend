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
export class Finding {
  /**
   * @param type Type of the finding.
   * @param description Description of the finding.
   * @param severity Severity of the finding.
   * @param directive The CSP directive in which the finding occurred.
   * @param value The directive value, if exists.
   */
  constructor(
      public type: Type, public description: string, public severity: Severity,
      public directive: string, public value?: string) {}

  /**
   * Returns the highest severity of a list of findings.
   * @param findings List of findings.
   * @return highest severity of a list of findings.
   */
  static getHighestSeverity(findings: Finding[]): Severity {
    if (findings.length === 0) {
      return Severity.NONE;
    }

    const severities = findings.map((finding) => finding.severity);
    const min = (prev: Severity, cur: Severity) => prev < cur ? prev : cur;
    return severities.reduce(min, Severity.NONE);
  }

  equals(obj: unknown): boolean {
    if (!(obj instanceof Finding)) {
      return false;
    }
    return obj.type === this.type && obj.description === this.description &&
        obj.severity === this.severity && obj.directive === this.directive &&
        obj.value === this.value;
  }
}


/**
 * Finding severities.
 */
export enum Severity {
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
export enum Type {
  // Parser checks
  MISSING_SEMICOLON = 100,
  UNKNOWN_DIRECTIVE,
  INVALID_KEYWORD,
  NONCE_CHARSET = 106,

  // Security cheks
  MISSING_DIRECTIVES = 300,
  SCRIPT_UNSAFE_INLINE,
  SCRIPT_UNSAFE_EVAL,
  PLAIN_URL_SCHEMES,
  PLAIN_WILDCARD,
  SCRIPT_ALLOWLIST_BYPASS,
  OBJECT_ALLOWLIST_BYPASS,
  NONCE_LENGTH,
  IP_SOURCE,
  DEPRECATED_DIRECTIVE,
  SRC_HTTP,

  // Strict dynamic and backward compatibility checks
  STRICT_DYNAMIC = 400,
  STRICT_DYNAMIC_NOT_STANDALONE,
  NONCE_HASH,
  UNSAFE_INLINE_FALLBACK,
  ALLOWLIST_FALLBACK,
  IGNORED,

  // Trusted Types checks
  REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS = 500,

  // Lighthouse checks
  REPORTING_DESTINATION_MISSING = 600,
  REPORT_TO_ONLY,
}
