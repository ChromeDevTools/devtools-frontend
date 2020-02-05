// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class Issue {
  constructor(code) {
    this._code = code;
  }

  get code() {
    return this._code;
  }

  static create(code) {
    return new Issue(code);
  }
}
