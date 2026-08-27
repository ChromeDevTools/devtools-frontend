// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class SecurityOrigin {
  #urlOrigin?: string;
  #opaqueUuid?: string;

  private constructor(urlOrigin?: string, opaqueUuid?: string) {
    this.#urlOrigin = urlOrigin;
    this.#opaqueUuid = opaqueUuid;
  }

  static create(urlOrigin: string): SecurityOrigin {
    return new SecurityOrigin(urlOrigin, undefined);
  }

  static createUniqueOpaque(): SecurityOrigin {
    return new SecurityOrigin(undefined, crypto.randomUUID());
  }

  isSameOriginWith(other: SecurityOrigin): boolean {
    if (this.#opaqueUuid || other.#opaqueUuid) {
      return this.#opaqueUuid === other.#opaqueUuid;
    }
    return this.#urlOrigin === other.#urlOrigin && this.#urlOrigin !== undefined;
  }
}
