// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';

/**
 * Internal representation of a security origin:
 * - `origin`: A comparable origin string (`<scheme>://<host>[:<port>]` or path-scoped `file://<host>/<path>`).
 * - `opaque`: An isolated opaque origin uniquely identified by a UUID that never matches any other origin.
 */
type InternalOrigin =
    |{readonly type: 'origin', readonly value: string}|{readonly type: 'opaque', readonly uuid: string};

/** Exact string matches that represent an invalid or opaque origin. */
const OPAQUE_EXACT_MATCHES = new Set([
  '',
  'null',
  'undefined',
  'data:',
  'detached',
]);

/** String prefixes for origins that must be treated as opaque (e.g. `about:blank`, `blob:data`). */
const OPAQUE_PREFIXES = [
  'about:',
  'blob:about',
  'blob:data',
  'blob:null',
] as const;

/**
 * Scheme prefixes for imported artifact data (such as HAR archives and performance traces).
 * DevTools isolates imported artifacts into scheme-scoped and host-scoped origins
 * (`imported-har://${host}`, `imported-trace://${host}`). These origins never match live
 * web origins (`https://${host}`) or other artifact schemes.
 */
export const IMPORTED_ORIGIN_PREFIXES: ReadonlySet<string> = new Set([
  'imported-har:',
  'imported-trace:',
]);

function isOpaqueUrlString(url: string): boolean {
  const lower = url.trim().toLowerCase();
  if (OPAQUE_EXACT_MATCHES.has(lower)) {
    return true;
  }
  return OPAQUE_PREFIXES.some(prefix => lower.startsWith(prefix));
}

/**
 * An immutable security origin for an entity in DevTools (such as a document,
 * network request, or storage key).
 *
 * DevTools features that handle user data or execute commands on behalf of the user
 * (such as DevTools AI Assistance and Extensions) must enforce strict origin boundaries
 * to prevent prompt injection and cross-origin data exfiltration.
 *
 * This class serves as the single source of truth for origin comparison and classification:
 *
 * 1. **Standard Origins**: Web URLs (HTTP, HTTPS, WSS) resolve to `<scheme>://<host>[:<port>]`.
 *    Two standard origins are same-origin if their scheme, host, and port match.
 *
 * 2. **File URLs (`file://`)**: In the WHATWG web security model, `file://` URLs are assigned
 *    opaque origins. In DevTools, however, users frequently debug local files (`file:///path/index.html`).
 *    Treating all `file://` URLs as opaque would block the user from inspecting elements or styles within
 *    the same file. Conversely, treating all `file://` URLs as a single shared origin would allow a malicious
 *    local file to traverse into other local files via iframes (b/524362513).
 *    Therefore, DevTools treats `file://` URLs as **path-scoped origins** (`file://<authority><path>`).
 *    `isOpaque()` returns `false` for `file://` URLs, and two `file://` URLs are considered same-origin
 *    only if their full file path and host match exactly.
 *
 * 3. **Imported Artifact Origins (`imported-har:`, `imported-trace:`)**: Custom schemes for imported
 *    recordings (such as HAR archives and performance traces) resolve to `<scheme>//<host>`.
 *    DevTools isolates imported artifact origins from live web pages (`imported-trace://example.com` != `https://example.com`)
 *    and isolates different artifact schemes from each other (`imported-trace://example.com` != `imported-har://example.com`).
 *
 * 4. **Opaque Origins**: Opaque contexts (`data:`, `about:blank`, invalid URLs, or synthetic
 *    opaque origins) are backed by unique UUIDs. An opaque origin never matches any other origin,
 *    even another opaque origin created from the same URL string.
 */
export class SecurityOrigin {
  readonly #origin: InternalOrigin;

  private constructor(origin: InternalOrigin) {
    this.#origin = origin;
  }

  /**
   * Creates a `SecurityOrigin` instance from a raw URL or origin string.
   *
   * - If the URL is determined to be opaque (e.g. `data:`, `about:blank`, empty, `null`),
   *   a new unique opaque origin is returned.
   * - If the URL is an imported artifact scheme (e.g. `imported-har:`, `imported-trace:`),
   *   a scheme-and-host origin (`<scheme>//<host>`) is returned.
   * - If the URL is a `file://` URL, a path-scoped origin (`file://<authority><path>`) is returned.
   * - Otherwise, the standard origin (`<scheme>://<host>[:<port>]`) is extracted and returned.
   *
   * @param rawUrl The raw URL or origin string to evaluate.
   */
  static create(rawUrl: string): SecurityOrigin {
    if (isOpaqueUrlString(rawUrl)) {
      return SecurityOrigin.createUniqueOpaque();
    }

    const importedOrigin = SecurityOrigin.#tryCreateImportedArtifactOrigin(rawUrl);
    if (importedOrigin) {
      return importedOrigin;
    }

    if (rawUrl.toLowerCase().startsWith('file://')) {
      const parsed = Common.ParsedURL.ParsedURL.fromString(rawUrl as Platform.DevToolsPath.UrlString);
      if (!parsed) {
        return SecurityOrigin.createUniqueOpaque();
      }
      const authority = parsed.host + (parsed.port ? ':' + parsed.port : '');
      return new SecurityOrigin({type: 'origin', value: `file://${authority}${parsed.path}`});
    }

    const origin = Common.ParsedURL.ParsedURL.extractOrigin(rawUrl as Platform.DevToolsPath.UrlString);
    if (!origin || isOpaqueUrlString(origin)) {
      return SecurityOrigin.createUniqueOpaque();
    }

    return new SecurityOrigin({type: 'origin', value: origin.toLowerCase()});
  }

  /**
   * Attempts to parse a URL as an imported artifact scheme (such as `imported-har:` or `imported-trace:`).
   *
   * Standard web origins do not match imported artifact origins. If the URL starts with an imported
   * prefix, this helper isolates the origin to `<scheme>//<host>`. If the authority or host is missing,
   * or if the URL cannot be parsed, it returns a unique opaque origin.
   *
   * @param rawUrl The raw URL string to evaluate.
   * @returns A `SecurityOrigin` if the URL matches an imported artifact scheme, or `null` otherwise.
   */
  static #tryCreateImportedArtifactOrigin(rawUrl: string): SecurityOrigin|null {
    const lowerUrl = rawUrl.toLowerCase();
    for (const prefix of IMPORTED_ORIGIN_PREFIXES) {
      if (lowerUrl.startsWith(prefix)) {
        try {
          const parsedUrl = new URL(rawUrl);
          if (!parsedUrl.host) {
            return SecurityOrigin.createUniqueOpaque();
          }
          return new SecurityOrigin({type: 'origin', value: `${parsedUrl.protocol}//${parsedUrl.host.toLowerCase()}`});
        } catch {
          return SecurityOrigin.createUniqueOpaque();
        }
      }
    }
    return null;
  }

  /**
   * Creates a synthetic, unique opaque origin.
   *
   * Useful when an entity (like a sandboxed iframe or detached DOM tree) needs an
   * isolated origin that will never match any other origin in the session.
   */
  static createUniqueOpaque(): SecurityOrigin {
    return new SecurityOrigin({type: 'opaque', uuid: crypto.randomUUID()});
  }

  /**
   * Checks whether this security origin is equivalent to another security origin.
   *
   * - Standard origins return `true` if their scheme, host, and port match.
   * - File origins return `true` if their full file path and host match.
   * - Opaque origins return `true` only if both instances have identical UUIDs.
   * - Passing `null` always returns `false`.
   *
   * @param other The other `SecurityOrigin` to compare with.
   */
  isSameOriginWith(other: SecurityOrigin|null): boolean {
    if (!other) {
      return false;
    }
    if (this.#origin.type === 'opaque' || other.#origin.type === 'opaque') {
      return this.#origin.type === 'opaque' && other.#origin.type === 'opaque' &&
          this.#origin.uuid === other.#origin.uuid;
    }
    return this.#origin.value === other.#origin.value;
  }

  /**
   * Returns whether this origin is opaque.
   *
   * Opaque origins include `data:` URLs, `about:blank`, invalid URLs, and instances
   * created via `createUniqueOpaque()`.
   */
  isOpaque(): boolean {
    return this.#origin.type === 'opaque';
  }

  /**
   * Returns a stable string representation of this origin for identification, storage keys,
   * or debugging logs.
   *
   * - For standard origins, returns the serialized origin string (e.g. `https://example.com:8080`).
   * - For file origins, returns the path-scoped origin (e.g. `file:///path/to/file.html`).
   * - For opaque origins, returns the unique UUID string.
   */
  siteId(): string {
    return this.#origin.type === 'opaque' ? this.#origin.uuid : this.#origin.value;
  }
}
