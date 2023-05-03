// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const noop = (): void => void 0;

export class Logger {
  #log: (...args: unknown[]) => void;
  #time: (label: string) => void;
  #timeEnd: (label: string) => void;

  constructor(level?: 'silent'|'debug') {
    switch (level) {
      case 'silent':
        this.#log = noop;
        this.#time = noop;
        this.#timeEnd = noop;
        break;
      default:
        // eslint-disable-next-line no-console
        this.#log = console.log;
        this.#time = console.time;
        this.#timeEnd = console.timeEnd;
        break;
    }
  }

  log(...args: unknown[]): void {
    this.#log(...args);
  }

  timed<T>(label: string, action: () => T): T {
    this.#time(label);
    const value = action();
    this.#timeEnd(label);
    return value;
  }
}
