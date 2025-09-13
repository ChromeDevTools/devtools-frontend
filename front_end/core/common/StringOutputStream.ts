// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface OutputStream {
  write(data: string, endOfFile?: boolean): Promise<void>;
  close(): Promise<void>;
}

export class StringOutputStream implements OutputStream {
  #data: string;
  constructor() {
    this.#data = '';
  }

  async write(chunk: string): Promise<void> {
    this.#data += chunk;
  }

  async close(): Promise<void> {
  }

  data(): string {
    return this.#data;
  }
}
