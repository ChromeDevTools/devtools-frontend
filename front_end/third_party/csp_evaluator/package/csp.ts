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


import {Finding, Severity, Type} from './finding.js';

/**
 * Content Security Policy object.
 * List of valid CSP directives:
 *  - http://www.w3.org/TR/CSP2/#directives
 *  - https://www.w3.org/TR/upgrade-insecure-requests/
 */
export class Csp {
  directives: Record<string, string[]|undefined> = {};

  /**
   * Clones a CSP object.
   * @return clone of parsedCsp.
   */
  clone(): Csp {
    const clone = new Csp();
    for (const [directive, directiveValues] of Object.entries(
             this.directives)) {
      if (directiveValues) {
        clone.directives[directive] = [...directiveValues];
      }
    }
    return clone;
  }

  /**
   * Converts this CSP back into a string.
   * @return CSP string.
   */
  convertToString(): string {
    let cspString = '';

    for (const [directive, directiveValues] of Object.entries(
             this.directives)) {
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

  /**
   * Returns CSP as it would be seen by a UA supporting a specific CSP version.
   * @param cspVersion CSP.
   * @param optFindings findings about ignored directive values will be added
   *     to this array, if passed. (e.g. CSP2 ignores 'unsafe-inline' in
   *     presence of a nonce or a hash)
   * @return The effective CSP.
   */
  getEffectiveCsp(cspVersion: Version, optFindings?: Finding[]): Csp {
    const findings = optFindings || [];
    const effectiveCsp = this.clone();
    const directive = effectiveCsp.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = this.directives[directive] || [];
    const effectiveCspValues = effectiveCsp.directives[directive];

    if (effectiveCspValues &&
        (effectiveCsp.policyHasScriptNonces() ||
         effectiveCsp.policyHasScriptHashes())) {
      if (cspVersion >= Version.CSP2) {
        // Ignore 'unsafe-inline' in CSP >= v2, if a nonce or a hash is present.
        if (values.includes(Keyword.UNSAFE_INLINE)) {
          arrayRemove(effectiveCspValues, Keyword.UNSAFE_INLINE);
          findings.push(new Finding(
              Type.IGNORED,
              'unsafe-inline is ignored if a nonce or a hash is present. ' +
                  '(CSP2 and above)',
              Severity.NONE, directive, Keyword.UNSAFE_INLINE));
        }
      } else {
        // remove nonces and hashes (not supported in CSP < v2).
        for (const value of values) {
          if (value.startsWith('\'nonce-') || value.startsWith('\'sha')) {
            arrayRemove(effectiveCspValues, value);
          }
        }
      }
    }

    if (effectiveCspValues && this.policyHasStrictDynamic()) {
      // Ignore allowlist in CSP >= v3 in presence of 'strict-dynamic'.
      if (cspVersion >= Version.CSP3) {
        for (const value of values) {
          // Because of 'strict-dynamic' all host-source and scheme-source
          // expressions, as well as the "'unsafe-inline'" and "'self'
          // keyword-sources will be ignored.
          // https://w3c.github.io/webappsec-csp/#strict-dynamic-usage
          if (!value.startsWith('\'') || value === Keyword.SELF ||
              value === Keyword.UNSAFE_INLINE) {
            arrayRemove(effectiveCspValues, value);
            findings.push(new Finding(
                Type.IGNORED,
                'Because of strict-dynamic this entry is ignored in CSP3 and above',
                Severity.NONE, directive, value));
          }
        }
      } else {
        // strict-dynamic not supported.
        arrayRemove(effectiveCspValues, Keyword.STRICT_DYNAMIC);
      }
    }

    if (cspVersion < Version.CSP3) {
      // Remove CSP3 directives from pre-CSP3 policies.
      // https://w3c.github.io/webappsec-csp/#changes-from-level-2
      delete effectiveCsp.directives[Directive.REPORT_TO];
      delete effectiveCsp.directives[Directive.WORKER_SRC];
      delete effectiveCsp.directives[Directive.MANIFEST_SRC];
      delete effectiveCsp.directives[Directive.TRUSTED_TYPES];
      delete effectiveCsp.directives[Directive.REQUIRE_TRUSTED_TYPES_FOR];
    }

    return effectiveCsp;
  }

  /**
   * Returns default-src if directive is a fetch directive and is not present in
   * this CSP. Otherwise the provided directive is returned.
   * @param directive CSP.
   * @return The effective directive.
   */
  getEffectiveDirective(directive: string): string {
    // Only fetch directives default to default-src.
    if (!(directive in this.directives) &&
        FETCH_DIRECTIVES.includes(directive as Directive)) {
      return Directive.DEFAULT_SRC;
    }

    return directive;
  }

  /**
   * Returns the passed directives if present in this CSP or default-src
   * otherwise.
   * @param directives CSP.
   * @return The effective directives.
   */
  getEffectiveDirectives(directives: string[]): string[] {
    const effectiveDirectives =
        new Set(directives.map((val) => this.getEffectiveDirective(val)));
    return [...effectiveDirectives];
  }

  /**
   * Checks if this CSP is using nonces for scripts.
   * @return true, if this CSP is using script nonces.
   */
  policyHasScriptNonces(): boolean {
    const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = this.directives[directiveName] || [];
    return values.some((val) => isNonce(val));
  }

  /**
   * Checks if this CSP is using hashes for scripts.
   * @return true, if this CSP is using script hashes.
   */
  policyHasScriptHashes(): boolean {
    const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = this.directives[directiveName] || [];
    return values.some((val) => isHash(val));
  }

  /**
   * Checks if this CSP is using strict-dynamic.
   * @return true, if this CSP is using CSP nonces.
   */
  policyHasStrictDynamic(): boolean {
    const directiveName = this.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = this.directives[directiveName] || [];
    return values.includes(Keyword.STRICT_DYNAMIC);
  }
}


/**
 * CSP directive source keywords.
 */
export enum Keyword {
  SELF = '\'self\'',
  NONE = '\'none\'',
  UNSAFE_INLINE = '\'unsafe-inline\'',
  UNSAFE_EVAL = '\'unsafe-eval\'',
  WASM_EVAL = '\'wasm-eval\'',
  WASM_UNSAFE_EVAL = '\'wasm-unsafe-eval\'',
  STRICT_DYNAMIC = '\'strict-dynamic\'',
  UNSAFE_HASHED_ATTRIBUTES = '\'unsafe-hashed-attributes\'',
  UNSAFE_HASHES = '\'unsafe-hashes\'',
  REPORT_SAMPLE = '\'report-sample\'',
  BLOCK = '\'block\'',
  ALLOW = '\'allow\'',
}


/**
 * CSP directive source keywords.
 */
export enum TrustedTypesSink {
  SCRIPT = '\'script\''
}


/**
 * CSP v3 directives.
 * List of valid CSP directives:
 *  - http://www.w3.org/TR/CSP2/#directives
 *  - https://www.w3.org/TR/upgrade-insecure-requests/
 *
 */
export enum Directive {
  // Fetch directives
  CHILD_SRC = 'child-src',
  CONNECT_SRC = 'connect-src',
  DEFAULT_SRC = 'default-src',
  FONT_SRC = 'font-src',
  FRAME_SRC = 'frame-src',
  IMG_SRC = 'img-src',
  MEDIA_SRC = 'media-src',
  OBJECT_SRC = 'object-src',
  SCRIPT_SRC = 'script-src',
  SCRIPT_SRC_ATTR = 'script-src-attr',
  SCRIPT_SRC_ELEM = 'script-src-elem',
  STYLE_SRC = 'style-src',
  STYLE_SRC_ATTR = 'style-src-attr',
  STYLE_SRC_ELEM = 'style-src-elem',
  PREFETCH_SRC = 'prefetch-src',

  MANIFEST_SRC = 'manifest-src',
  WORKER_SRC = 'worker-src',

  // Document directives
  BASE_URI = 'base-uri',
  PLUGIN_TYPES = 'plugin-types',
  SANDBOX = 'sandbox',
  DISOWN_OPENER = 'disown-opener',

  // Navigation directives
  FORM_ACTION = 'form-action',
  FRAME_ANCESTORS = 'frame-ancestors',
  NAVIGATE_TO = 'navigate-to',

  // Reporting directives
  REPORT_TO = 'report-to',
  REPORT_URI = 'report-uri',

  // Other directives
  BLOCK_ALL_MIXED_CONTENT = 'block-all-mixed-content',
  UPGRADE_INSECURE_REQUESTS = 'upgrade-insecure-requests',
  REFLECTED_XSS = 'reflected-xss',
  REFERRER = 'referrer',
  REQUIRE_SRI_FOR = 'require-sri-for',
  TRUSTED_TYPES = 'trusted-types',
  // https://github.com/WICG/trusted-types
  REQUIRE_TRUSTED_TYPES_FOR = 'require-trusted-types-for',
  WEBRTC = 'webrtc',
}

/**
 * CSP v3 fetch directives.
 * Fetch directives control the locations from which resources may be loaded.
 * https://w3c.github.io/webappsec-csp/#directives-fetch
 *
 */
export const FETCH_DIRECTIVES: Directive[] = [
  Directive.CHILD_SRC, Directive.CONNECT_SRC, Directive.DEFAULT_SRC,
  Directive.FONT_SRC, Directive.FRAME_SRC, Directive.IMG_SRC,
  Directive.MANIFEST_SRC, Directive.MEDIA_SRC, Directive.OBJECT_SRC,
  Directive.SCRIPT_SRC, Directive.SCRIPT_SRC_ATTR, Directive.SCRIPT_SRC_ELEM,
  Directive.STYLE_SRC, Directive.STYLE_SRC_ATTR, Directive.STYLE_SRC_ELEM,
  Directive.WORKER_SRC
];

/**
 * CSP version.
 */
export enum Version {
  CSP1 = 1,
  CSP2,
  CSP3
}


/**
 * Checks if a string is a valid CSP directive.
 * @param directive value to check.
 * @return True if directive is a valid CSP directive.
 */
export function isDirective(directive: string): boolean {
  return Object.values(Directive).includes(directive as Directive);
}


/**
 * Checks if a string is a valid CSP keyword.
 * @param keyword value to check.
 * @return True if keyword is a valid CSP keyword.
 */
export function isKeyword(keyword: string): boolean {
  return Object.values(Keyword).includes(keyword as Keyword);
}


/**
 * Checks if a string is a valid URL scheme.
 * Scheme part + ":"
 * For scheme part see https://tools.ietf.org/html/rfc3986#section-3.1
 * @param urlScheme value to check.
 * @return True if urlScheme has a valid scheme.
 */
export function isUrlScheme(urlScheme: string): boolean {
  const pattern = new RegExp('^[a-zA-Z][+a-zA-Z0-9.-]*:$');
  return pattern.test(urlScheme);
}


/**
 * A regex pattern to check nonce prefix and Base64 formatting of a nonce value.
 */
export const STRICT_NONCE_PATTERN =
    new RegExp('^\'nonce-[a-zA-Z0-9+/_-]+[=]{0,2}\'$');


/** A regex pattern for checking if nonce prefix. */
export const NONCE_PATTERN = new RegExp('^\'nonce-(.+)\'$');


/**
 * Checks if a string is a valid CSP nonce.
 * See http://www.w3.org/TR/CSP2/#nonce_value
 * @param nonce value to check.
 * @param strictCheck Check if the nonce uses the base64 charset.
 * @return True if nonce is has a valid CSP nonce.
 */
export function isNonce(nonce: string, strictCheck?: boolean): boolean {
  const pattern = strictCheck ? STRICT_NONCE_PATTERN : NONCE_PATTERN;
  return pattern.test(nonce);
}


/**
 * A regex pattern to check hash prefix and Base64 formatting of a hash value.
 */
export const STRICT_HASH_PATTERN =
    new RegExp('^\'(sha256|sha384|sha512)-[a-zA-Z0-9+/]+[=]{0,2}\'$');


/** A regex pattern to check hash prefix. */
export const HASH_PATTERN = new RegExp('^\'(sha256|sha384|sha512)-(.+)\'$');


/**
 * Checks if a string is a valid CSP hash.
 * See http://www.w3.org/TR/CSP2/#hash_value
 * @param hash value to check.
 * @param strictCheck Check if the hash uses the base64 charset.
 * @return True if hash is has a valid CSP hash.
 */
export function isHash(hash: string, strictCheck?: boolean): boolean {
  const pattern = strictCheck ? STRICT_HASH_PATTERN : HASH_PATTERN;
  return pattern.test(hash);
}


/**
 * Class to represent all generic CSP errors.
 */
export class CspError extends Error {
  /**
   * @param message An optional error message.
   */
  constructor(message?: string) {
    super(message);
  }
}

/**
 * Mutate the given array to remove the first instance of the given item
 */
function arrayRemove<T>(arr: T[], item: T): void {
  if (arr.includes(item)) {
    const idx = arr.findIndex(elem => item === elem);
    arr.splice(idx, 1);
  }
}
