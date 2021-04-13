// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export interface OutputStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export class StringOutputStream implements OutputStream {
  _data: string;
  constructor() {
    this._data = '';
  }

  async write(chunk: string): Promise<void> {
    this._data += chunk;
  }

  async close(): Promise<void> {
  }

  data(): string {
    return this._data;
  }
}
